"""
D-Bus service backend for the GNOME Bluetooth Battery Meter extension.
BluetoothBatteryMeterManager Class: Manages D-Bus connections and device lifecycle.
Device Class: Exposes a device's battery and state info over D-Bus and handles updates.
"""

import sys
# Skip caching
sys.dont_write_bytecode = True  # pylint: disable=wrong-import-position
errors = []

import logging
import asyncio
import threading
from gi.repository import Gio, GLib, GObject

from device_airpods import AirpodsDevice
from device_gattbas import GattBasDevice
from helpers import PrintLogHandler, ShutdownHandler, MonitorExtensionState, unwrap


SCRIPT_VERSION = "BBM0.003"

# Automatically shut down the script 3 seconds after the GNOME extension
# {UUID} is disabled.
SHUTDOWN_WHEN_EXTENSION_DISABLED = True

# Automatically shut down the script after 30 seconds if no Bluetooth
# devices are added.
ENABLE_SHUTDOWN_TIMER = True

# Enable debug-level logging for development and troubleshooting.
ENABLE_LOGGING_DEBUG = False

GLIB_LOOP = None
EVENT_LOOP = None
MANAGER = None
MONITOR_EXTENSION = None

BUS_NAME = "com.github.maniacx.BluetoothBatteryMeter"
OBJECT_PATH = "/com/github/maniacx/BluetoothBatteryMeter"
MANAGER_INTERFACE_NAME = "com.github.maniacx.BluetoothBatteryMeter.Manager"
DEVICE_INTERFACE_NAME = "com.github.maniacx.BluetoothBatteryMeter.Device"

MANAGER_INTROSPECTION_XML = f"""
<node>
  <interface name="{MANAGER_INTERFACE_NAME}">
    <method name="AddDevice">
      <arg direction="in" name="device_path" type="s"/>
      <arg direction="in" name="device_type" type="s"/>
    </method>
    <method name="ShutdownService"/>
    <property name="Version" type="s" access="read"/>
    <signal name="DeviceRemoved">
      <arg name="device_path" type="s"/>
    </signal>
  </interface>
</node>
"""


DEVICE_INTROSPECTION_XML = """
<node>
  <interface name="com.github.maniacx.BluetoothBatteryMeter.Device">
    <method name="RequestStatus">
      <arg name="information" type="s" direction="in"/>
      <arg name="response" type="s" direction="out"/>
    </method>
    <method name="SetDeviceCommand">
      <arg name="command" type="s" direction="in"/>
    </method>
    <property name="DeviceInfo" type="s" access="read"/>
    <property name="BatteryInfo" type="s" access="read"/>
    <property name="Toggle1State" type="u" access="read"/>
    <property name="Toggle2State" type="u" access="read"/>
    <property name="ToggleVisible" type="u" access="read"/>
    <property name="CustomMessage" type="s" access="read"/>
  </interface>
</node>
"""


class Device(GObject.Object):
    """ Handles Dbus methods and properties for device. """

    def __init__(self, manager, device_path, device_type):
        super().__init__()
        identifier = "".join(device_path.split("_")[-3:])
        self.logger = logging.getLogger(f"{self.__class__.__name__}-{identifier}")
        self.logger.info(
            "Device init called with path %s", device_path)
        self.manager = manager
        self.loop = manager.loop
        system_bus = manager.system_bus
        self.connection = manager.connection
        self.device = None
        self.device_path = device_path
        self.pending_props = {}
        self.emit_scheduled = False
        self.emit_delay_ms = 100
        self.interface_name = DEVICE_INTERFACE_NAME
        self.introspection = Gio.DBusNodeInfo.new_for_xml(DEVICE_INTROSPECTION_XML)
        self.intf_info = self.introspection.lookup_interface(self.interface_name)

        self._device_info = "unknown"
        self._battery_info = "unknown"
        self._toggle1_state = 0
        self._toggle2_state = 0
        self._toggle_visible = 0
        self._custom_message = "unknown"

        self.registration_id = self.connection.register_object(
            device_path,
            self.intf_info,
            self._on_method_call,
            self._on_get_property,
            None
        )
        GObject.type_register(Device)

        self.device_bluez_proxy = Gio.DBusProxy.new_sync(
            system_bus,
            Gio.DBusProxyFlags.NONE,
            None,
            "org.bluez",
            device_path,
            "org.bluez.Device1",
            None
        )

        self.bluez_signal_sub_id = self.device_bluez_proxy.connect(
            "g-properties-changed", self._on_bluez_properties_changed)

        callbacks = {
            "update_device_info": self.update_device_info,
            "update_battery_props": self.update_battery_props,
            "update_toggle1_state": self.update_toggle1_state,
            "update_toggle2_state": self.update_toggle2_state,
            "update_toggle_visible": self.update_toggle_visible,
            "update_custom_message": self.update_custom_message
        }

        if device_type == "airpods":
            self.device = AirpodsDevice(
                manager,
                self.loop,
                device_path,
                self.device_bluez_proxy,
                callbacks
            )
        elif device_type == "gatt-bas":
            self.device = GattBasDevice(
                device_path,
                self.device_bluez_proxy,
                callbacks
            )

    # pylint: disable=unused-argument
    def _on_bluez_properties_changed(self, interface, changed, invalidated_properties):
        props = unwrap(changed)
        self.logger.debug("PropertiesChanged %s", props)

        if "Connected" in props:
            connected = props["Connected"]
            self.logger.debug("Connected = %s", connected)
            if not connected:
                self.logger.debug("Device disconnected, removing %s", self.device_path)
                self.manager.loop.call_soon_threadsafe(
                    asyncio.create_task,
                    self.manager.remove_device_by_path(self.device_path)
                )

    # pylint: disable=unused-argument
    def _on_method_call(self, connection, sender, object_path,
                        interface_name, method_name, parameters, invocation):
        """Handles incoming D-Bus method calls for the specified interface."""
        if interface_name != self.interface_name:
            return

        if method_name == "RequestStatus":
            information = unwrap(parameters)
            self.logger.info("RequestStatus method: %s", information)
            value = self.device.request_status(information)
            invocation.return_value(GLib.Variant("(s)", (value,)))
        elif method_name == "SetDeviceCommand":
            command = unwrap(parameters)
            self.logger.info("SetDeviceCommand method: %s", command)
            self.device.set_device_command(command)
            invocation.return_value(None)
        else:
            self.logger.warning("Unhandled method: %s", method_name)

    def update_device_info(self, device_info):
        """Emits the PropertiesChanged on device_info update"""
        if device_info != self._device_info:
            self.logger.info("Updating device_info.")
            self._device_info = device_info
            self.emit_properties_changed(
                {"DeviceInfo": GLib.Variant("s", self._device_info)})

    def update_battery_props(self, props):
        """Emits the PropertiesChanged on battery properties update"""
        if props != self._battery_info:
            self.logger.info("Battery properties changed.")
            self._battery_info = props
            self.emit_properties_changed(
                {"BatteryInfo": GLib.Variant("s", self._battery_info)})

    def update_toggle1_state(self, toggle1_state):
        """Emits the PropertiesChanged on toggle1 button state updates"""
        if toggle1_state != self._toggle1_state:
            self.logger.info("Toggle1State properties changed.")
            self._toggle1_state = toggle1_state
            self.emit_properties_changed(
                {"Toggle1State": GLib.Variant("u", self._toggle1_state)})

    def update_toggle2_state(self, toggle2_state):
        """Emits the PropertiesChanged on toggle2 button state updates"""
        if toggle2_state != self._toggle2_state:
            self.logger.info("Toggle2State properties changed.")
            self._toggle2_state = toggle2_state
            self.emit_properties_changed(
                {"Toggle2State": GLib.Variant("u", self._toggle2_state)})

    def update_toggle_visible(self, toggle_visible):
        """Emits the PropertiesChanged on toggle2 button state updates"""
        if toggle_visible != self._toggle_visible:
            self.logger.info("Toggle2State properties changed.")
            self._toggle_visible = toggle_visible
            self.emit_properties_changed(
                {"ToggleVisible": GLib.Variant("u", self._toggle_visible)})

    def update_custom_message(self, message):
        """Emits the PropertiesChanged on custom message update"""
        if self._custom_message != message:
            self._custom_message = message
            self.emit_properties_changed({
                "CustomMessage": GLib.Variant("s", self._custom_message)
            })

    def emit_properties_changed(self, props: dict):
        """Queue properties for batched emission."""
        for k, v in props.items():
            self.pending_props[k] = v

        if not self.emit_scheduled:
            self.emit_scheduled = True
            GLib.timeout_add(self.emit_delay_ms, self.emit_pending_changes)

    def emit_pending_changes(self):
        """Actually emit the batched PropertiesChanged signal."""

        variant_props = {key: GLib.Variant("v", value)
                         if not isinstance(value, GLib.Variant) else value
                         for key, value in self.pending_props.items()}
        self.logger.debug("Emitting PropertiesChanged: %s", variant_props)

        self.connection.emit_signal(
            destination_bus_name=None,
            object_path=self.device_path,
            interface_name="org.freedesktop.DBus.Properties",
            signal_name="PropertiesChanged",
            parameters=GLib.Variant("(sa{sv}as)", (
                self.interface_name,
                variant_props,
                [],
            ))
        )

        self.pending_props.clear()
        self.emit_scheduled = False
        return False

    def _on_get_property(self, connection, sender,
                         object_path, interface_name, property_name):
        """Returns the value of a requested D-Bus property for the specified interface."""
        if interface_name != self.interface_name:
            return None

        properties = {
            "DeviceInfo": GLib.Variant("s", self._device_info),
            "BatteryInfo": GLib.Variant("s", self._battery_info),
            "Toggle1State": GLib.Variant("u", self._toggle1_state),
            "Toggle2State": GLib.Variant("u", self._toggle2_state),
            "ToggleVisible": GLib.Variant("u", self._toggle_visible),
            "CustomMessage": GLib.Variant("s", self._custom_message),
        }

        return properties.get(property_name)

    async def destroy(self):
        """Unregisters the D-Bus object, unsubscribe signals, calls device destroy function """
        if self.device:
            await self.device.destroy()
        if self.registration_id:
            self.connection.unregister_object(self.registration_id)
            self.registration_id = None
        if self.bluez_signal_sub_id and self.device_bluez_proxy:
            self.device_bluez_proxy.disconnect(self.bluez_signal_sub_id)
        self.bluez_signal_sub_id = None
        self.device_bluez_proxy = None


class BluetoothBatteryMeterManager(GObject.GObject):
    """Manages devices lifecycle, and interaction with D-Bus."""

    def __init__(self, loop, system_bus, request_exit_cb=None):
        super().__init__()
        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.info("BluetoothBatteryMeterManager init ")
        self.loop = loop
        self.system_bus = system_bus
        self.request_exit_cb = request_exit_cb
        self.devices = {}
        self.connection = None
        self._empty_timer_id = None
        if ENABLE_SHUTDOWN_TIMER:
            self.start_empty_timer()

        self._own_name_id = Gio.bus_own_name(
            Gio.BusType.SESSION,
            BUS_NAME,
            Gio.BusNameOwnerFlags.NONE,
            self._on_bus_acquired,
            self._on_name_acquired,
            self._on_name_lost
        )

    def start_empty_timer(self):
        """Schedule a one‑shot 20 s timer to exit if no devices are added."""
        if self._empty_timer_id is None:
            self._empty_timer_id = GLib.timeout_add_seconds(
                20,
                self.on_empty_timeout
            )

    def cancel_empty_timer(self):
        """Cancel the pending no‑device shutdown timer, if any."""
        if self._empty_timer_id is not None:
            GLib.source_remove(self._empty_timer_id)
            self._empty_timer_id = None

    def on_empty_timeout(self):
        """Exit gracefully if still no devices after the 20 s timer."""
        if not self.devices:
            self.logger.warning("No devices within 20 s – exiting.")
            if self.request_exit_cb:
                self.request_exit_cb(0)
        return False

    # pylint: disable=unused-argument
    def _on_bus_acquired(self, connection, name):
        """Handles acquiring the D-Bus connection and registers object."""
        self.logger.debug("Bus acquired.")
        self.connection = connection

        introspection = Gio.DBusNodeInfo.new_for_xml(MANAGER_INTROSPECTION_XML)
        iface_info = introspection.lookup_interface(MANAGER_INTERFACE_NAME)

        connection.register_object(
            OBJECT_PATH,
            iface_info,
            self._on_method_call,
            self._on_get_property,
            None
        )

    # pylint: disable=unused-argument
    def _on_name_acquired(self, connection, name):
        """Handles acquiring the bus name for D-Bus."""
        self.logger.info("Bus name %s acquired.", name)

    # pylint: disable=unused-argument
    def _on_name_lost(self, connection, name):
        """Handles losing the bus name for D-Bus."""
        self.logger.info("Bus name already exist. Terminating duplicate script")
        if self.request_exit_cb:
            self.request_exit_cb(0)

    def _on_method_call(self, connection, sender, object_path,
                        interface_name, method_name, parameters, invocation):
        """Handles D-Bus method calls for adding, removing devices, or shutting down the service."""
        if interface_name != MANAGER_INTERFACE_NAME:
            return

        if method_name == "AddDevice":
            device_path, device_type = unwrap(parameters)
            self.logger.info(
                "AddDevice called: %s, %s",
                device_path,
                device_type,
            )

            if device_path in self.devices:
                self.logger.warning("Device %s already exists.", device_path)
                invocation.return_value(None)
                return

            device = Device(
                self,
                device_path,
                device_type,
            )
            self.devices[device_path] = device
            self.cancel_empty_timer()
            invocation.return_value(None)

        elif method_name == "ShutdownService":
            self.logger.info("Shutdown requested.")
            invocation.return_value(None)

            if self.request_exit_cb:
                GLib.idle_add(self.request_exit_cb, 0)
            else:
                self.logger.error(
                    "Shutdown requested, but no request_exit_cb is set.")

    def _on_get_property(self, connection, sender,
                         object_path, interface_name, property_name):
        """Returns values for exposed D-Bus properties: Version."""
        if property_name == "Version":
            return GLib.Variant("s", SCRIPT_VERSION)
        return None

    async def remove_device_by_path(self, device_path):
        """Removes a device and restarts shutdown timer if needed."""

        if device_path not in self.devices:
            return

        self.logger.info("Called remove_device_by_path: %s", device_path)
        dev = self.devices.pop(device_path, None)
        if dev:
            await dev.destroy()
            self.connection.emit_signal(
                destination_bus_name=None,
                object_path=OBJECT_PATH,
                interface_name=MANAGER_INTERFACE_NAME,
                signal_name="DeviceRemoved",
                parameters=GLib.Variant("(s)", (device_path,))
            )

            if ENABLE_SHUTDOWN_TIMER and not self.devices:
                self.start_empty_timer()

    def cleanup(self):
        """Releases the D-Bus name ownership to clean up the service."""
        if self._own_name_id is not None:
            Gio.bus_unown_name(self._own_name_id)


def main():
    """ main """
    global GLIB_LOOP, EVENT_LOOP, MANAGER, MONITOR_EXTENSION

    log_path = PrintLogHandler.redirect_logging(ENABLE_LOGGING_DEBUG)

    system_bus = Gio.bus_get_sync(Gio.BusType.SYSTEM, None)
    session_bus = Gio.bus_get_sync(Gio.BusType.SESSION, None)

    EVENT_LOOP = asyncio.new_event_loop()
    asyncio.set_event_loop(EVENT_LOOP)

    GLIB_LOOP = GLib.MainLoop()

    MANAGER = BluetoothBatteryMeterManager(EVENT_LOOP, system_bus)

    shutdown_handler = ShutdownHandler(MANAGER, EVENT_LOOP, GLIB_LOOP)

    MANAGER.request_exit_cb = shutdown_handler.request_exit

    def run_event_loop():
        try:
            EVENT_LOOP.run_forever()
        except Exception as e:
            logging.error("MAIN_FN: Asyncio loop error: %s", e)
            EVENT_LOOP.stop()
            shutdown_handler.request_exit(0)

    threading.Thread(target=run_event_loop, daemon=True).start()

    PrintLogHandler.display_status(log_path)

    if SHUTDOWN_WHEN_EXTENSION_DISABLED:
        MONITOR_EXTENSION = MonitorExtensionState(
            session_bus,
            request_exit_cb=shutdown_handler.request_exit
        )

    try:
        GLIB_LOOP.run()
    except KeyboardInterrupt:
        shutdown_handler.request_exit(code=0)


if __name__ == "__main__":
    main()
