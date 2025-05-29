"""
GattBasDevice Class: BAS module for Bluetooth battery meter service to provide,
battery information, via GATT Battery Service.
"""

import json
import logging
from gi.repository import Gio, GLib
from helpers import unwrap

# BlueZ constants
BLUEZ_BUS_NAME = "org.bluez"
BLUEZ_ROOT_PATH = "/"
BLUEZ_GATT_CHARACTERISTIC = "org.bluez.GattCharacteristic1"
BLUEZ_GATT_DESCRIPTOR = "org.bluez.GattDescriptor1"

# GATT UUIDs
UUID_CHAR_BATTERY_LEVEL = "00002a19-0000-1000-8000-00805f9b34fb"
UUID_CHAR_PRESENTATION_FORMAT = "00002904-0000-1000-8000-00805f9b34fb"

# CPF-based groups for assignment
BAT1_GROUP = {"Front", "Top", "Upper", "Main", "Inside", "Left", "Internal"}
BAT2_GROUP = {"Back", "Bottom", "Lower", "Backup", "Auxiliary",
              "Supplementary", "Outside", "Right", "External"}


class GattBasDevice:
    """
    Get Battery level using BAS (Bluez Battery Service).
    """

    def __init__(self, device_path, device_bluez_proxy, callbacks=None):
        """Initialize device with D-Bus path and optional callbacks."""
        identifier = "".join(device_path.split("_")[-3:])
        self.logger = logging.getLogger(f"{self.__class__.__name__}-{identifier}")
        self.logger.info("Initializing GattBasDevice for %s", device_path)
        self.device_path = device_path
        self.device_bluez_proxy = device_bluez_proxy
        self.bluez_signal_sub_id = None
        self.callbacks = callbacks
        self.connection = Gio.bus_get_sync(Gio.BusType.SYSTEM, None)
        self.battery_init = False
        self.char_info = {}
        self.battprops = {}

        services_resolved = self.check_services_resolved()
        if not services_resolved:
            self.bluez_signal_sub_id = self.device_bluez_proxy.connect(
                "g-properties-changed", self._on_bluez_properties_changed)
        else:
            self._init_battery_characteristics()

    def check_services_resolved(self):
        """Check if discovery services are resolved. Need for GATT devices"""
        resolve = self.device_bluez_proxy.get_cached_property("ServicesResolved")
        services_resolved = unwrap(resolve) is True
        self.logger.info("Check services resolved : %s", services_resolved)
        return services_resolved

    # pylint: disable=unused-argument
    def _on_bluez_properties_changed(self, interface, changed, invalidated_properties):
        props = unwrap(changed)
        self.logger.debug("PropertiesChanged: %s", props)

        if "ServicesResolved" in props:
            resolved = props["ServicesResolved"]
            self.logger.debug("ServicesResolved on properties_changed: %s", resolved)
            if resolved and not self.battery_init:
                self.logger.info("Services resolved, starting object manager scan")
                self._init_battery_characteristics()

    def _init_battery_characteristics(self):
        """Scan for battery characteristics and start notifications."""
        self.battery_init = True

        if self.bluez_signal_sub_id and self.device_bluez_proxy:
            self.device_bluez_proxy.disconnect(self.bluez_signal_sub_id)
        self.bluez_signal_sub_id = None

        self.logger.debug("Scanning for battery characteristics on %s", self.device_path)

        object_manager = Gio.DBusProxy.new_sync(
            self.connection,
            Gio.DBusProxyFlags.NONE,
            None,
            BLUEZ_BUS_NAME,
            BLUEZ_ROOT_PATH,
            "org.freedesktop.DBus.ObjectManager",
            None
        )

        raw_managed = object_manager.call_sync(
            "GetManagedObjects",
            None,
            Gio.DBusCallFlags.NONE,
            -1,
            None
        )

        managed = unwrap(raw_managed)

        for path, char_iface in managed.items():
            if not path.startswith(self.device_path):
                continue

            char = char_iface.get(BLUEZ_GATT_CHARACTERISTIC)
            if not char or unwrap(char.get("UUID")) != UUID_CHAR_BATTERY_LEVEL:
                continue

            cpf_name = None
            for dpath, desc_iface in managed.items():
                if not dpath.startswith(path):
                    continue

                desc = desc_iface.get(BLUEZ_GATT_DESCRIPTOR)
                if not desc or unwrap(
                        desc.get("UUID")) != UUID_CHAR_PRESENTATION_FORMAT:
                    continue

                proxy_desc = Gio.DBusProxy.new_sync(
                    self.connection, Gio.DBusProxyFlags.NONE, None,
                    BLUEZ_BUS_NAME, dpath, BLUEZ_GATT_DESCRIPTOR, None)
                arr = unwrap(proxy_desc.call_sync(
                    "ReadValue", GLib.Variant("(a{sv})", ({},)),
                    Gio.DBusCallFlags.NONE, -1, None))
                cpf = (arr[5] | (arr[6] << 8)) if len(arr) >= 7 else None
                cpf_name = self._cpf_to_name(cpf)
                break

            proxy = Gio.DBusProxy.new_sync(
                self.connection, Gio.DBusProxyFlags.NONE, None,
                BLUEZ_BUS_NAME, path, BLUEZ_GATT_CHARACTERISTIC, None)
            sig_id = proxy.connect("g-properties-changed", self._on_properties_changed)

            self.char_info[path] = {"proxy": proxy, "sig_id": sig_id, "cpf": cpf_name}

            self.logger.debug("Starting notifications for %s", path)
            proxy.call(
                "StartNotify", None, Gio.DBusCallFlags.NONE,
                -1, None,
                self._make_start_notify_cb(path),
                None)

    def _make_start_notify_cb(self, path):
        """Return callback to handle StartNotify completion."""

        # pylint: disable=unused-argument
        def cb(proxy, result, *args):
            try:
                proxy.call_finish(result)
            except Exception as e:
                self.logger.warning("StartNotify failed for %s: %s", path, e)
                return

            self.logger.debug(
                "StartNotify successful for %s, reading initial value", path)
            proxy.call(
                "ReadValue", GLib.Variant("(a{sv})", ({},)),
                Gio.DBusCallFlags.NONE, -1, None,
                self._make_read_cb(path), None)
        return cb

    def _make_read_cb(self, path):
        """Return callback to handle initial ReadValue result."""
        # pylint: disable=unused-argument
        def cb(proxy, result, *args):
            try:
                res = proxy.call_finish(result)
                arr = unwrap(res)
            except Exception as e:
                self.logger.warning("ReadValue failed for %s: %s", path, e)
                return
            level = arr[0] if arr else None
            self._update_level(path, level)
        return cb

    # pylint: disable=unused-argument
    def _on_properties_changed(self, proxy, changed, invalidated):
        """Handle GATT characteristic Value changes."""
        props = unwrap(changed).get("Value")
        if props is None:
            return
        arr = unwrap(props)
        level = arr[0] if arr else None
        path = proxy.get_object_path()
        self.logger.info("Battery level changed for %s: %s", path, level)
        self._update_level(path, level)

    def _update_level(self, path, level):
        """Update stored battery level based on cpf and trigger callback."""
        self.battprops[path] = level

        items = list(self.char_info.items())
        items.sort(key=lambda item: (
            0 if item[1]["cpf"] in BAT1_GROUP else
            1 if item[1]["cpf"] in BAT2_GROUP else
            2
        ))
        props = {}
        for idx, (p, _) in enumerate(items, start=1):
            if idx > 3:
                break
            props[f"battery{idx}Level"] = self.battprops.get(p)

        self.logger.info("Updated battery props: %s", props)
        self.callbacks["update_battery_props"](json.dumps(props))

    def _cpf_to_name(self, cpf):
        """Convert CPF value to human-readable name."""
        names = {0x0100: "Front", 0x0101: "Back",
                 0x0102: "Top", 0x0103: "Bottom",
                 0x0104: "Upper", 0x0105: "Lower",
                 0x0106: "Main", 0x0107: "Backup",
                 0x0108: "Auxiliary", 0x0109: "Supplementary",
                 0x010B: "Inside", 0x010C: "Outside",
                 0x010D: "Left", 0x010E: "Right",
                 0x010F: "Internal", 0x0110: "External"}
        return names.get(cpf)

    async def destroy(self):
        """Stop all battery notifications and clean up."""
        self.logger.debug("Destroying GattBasDevice for %s", self.device_path)
        for _, info in self.char_info.items():
            proxy = info["proxy"]
            sig_id = info.get("sig_id")
            if sig_id is not None:
                proxy.disconnect(sig_id)

        if self.bluez_signal_sub_id and self.device_bluez_proxy:
            self.device_bluez_proxy.disconnect(self.bluez_signal_sub_id)
        self.bluez_signal_sub_id = None

        self.char_info.clear()
        self.battprops.clear()
        self.callbacks.clear()
