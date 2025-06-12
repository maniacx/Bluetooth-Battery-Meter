"""
AppleDevice Class: Airpods / Beats module for Bluetooth battery meter service to provide,
battery information, ANC and Convesational awareness on device that support it.

Credits:
https://github.com/steam3d/MagicPodsCore
steam3d for reverse battery reporting , ANC control

https://github.com/kavishdevar/librepods
kavishdevar for Conversation awarness

"""
import asyncio
import json
import logging
from enum import Enum, IntEnum
from gi.repository import GLib
from helpers import SocketHandler, unwrap

SOCKET_PROTOCOL = "L2CAP"
PSM = 0x1001
MODEL_DB = {
    "2002": {"battery_type": 3, "anc_supported": False, "awareness_supported": False},
    "200F": {"battery_type": 3, "anc_supported": False, "awareness_supported": False},
    "2013": {"battery_type": 3, "anc_supported": False, "awareness_supported": False},
    "2019": {"battery_type": 3, "anc_supported": False, "awareness_supported": False},
    "201B": {"battery_type": 3, "anc_supported": True, "awareness_supported": True},
    "200E": {"battery_type": 3, "anc_supported": True, "awareness_supported": True},
    "2014": {"battery_type": 3, "anc_supported": True, "awareness_supported": True},
    "2024": {"battery_type": 3, "anc_supported": True, "awareness_supported": True},
    "200A": {"battery_type": 1, "anc_supported": True, "awareness_supported": False},
    "201F": {"battery_type": 1, "anc_supported": True, "awareness_supported": False},
    "2012": {"battery_type": 3, "anc_supported": True, "awareness_supported": False},
    "2005": {"battery_type": 1, "anc_supported": False, "awareness_supported": False},
    "2010": {"battery_type": 1, "anc_supported": False, "awareness_supported": False},
    "2006": {"battery_type": 1, "anc_supported": False, "awareness_supported": False},
    "2003": {"battery_type": 1, "anc_supported": False, "awareness_supported": False},
    "2009": {"battery_type": 1, "anc_supported": False, "awareness_supported": False},
    "200B": {"battery_type": 3, "anc_supported": False, "awareness_supported": False},
    "200C": {"battery_type": 1, "anc_supported": False, "awareness_supported": False},
    "200D": {"battery_type": 1, "anc_supported": False, "awareness_supported": False},
    "2017": {"battery_type": 1, "anc_supported": True, "awareness_supported": False},
    "2011": {"battery_type": 3, "anc_supported": False, "awareness_supported": False},
    "2016": {"battery_type": 3, "anc_supported": False, "awareness_supported": False},
}


class BatteryType(IntEnum):
    """Enumeration of battery types for Apple devices."""
    SINGLE = 0x01
    RIGHT = 0x02
    LEFT = 0x04
    CASE = 0x08


class BatteryChargingStatus(IntEnum):
    """Enumeration of battery charging statuses."""
    CHARGING = 0x01
    DISCHARGING = 0x02
    DISCONNECTED = 0x04
    # 0x00 = undefined, assumed as discharging
    # 0x03 = undefined, assumed as discharging


class EarDetection(IntEnum):
    """Enumeration of Ear Detection."""
    IN_EAR = 0x00
    OUT_EAR = 0x01
    IN_CASE = 0x02


class ANCMode(IntEnum):
    """Enumeration of Active Noise Cancellation modes."""
    ANC_OFF = 0x01
    ANC_ON = 0x02
    TRANSPARENCY = 0x03
    ADAPTIVE = 0x04


class ConversationAwarenessMode(IntEnum):
    """Enumeration of conversation awareness modes."""
    OFF = 0x02
    ON = 0x01


class PacketConstants(bytes, Enum):
    """Constants representing command and response packet structures."""
    SETTINGS = b"\x09\x00"
    PREFIX = b"\x04\x00\x04\x00"
    SUFFIX = b"\x00\x00\x00"

    HANDSHAKE = b"\x00\x00\x04\x00\x01\x00\x02\x00\x00\x00\x00\x00\x00\x00\x00\x00"
    SET_SPECIFIC_FEATURES = PREFIX + b"\x4d\x00\xff\x00\x00\x00\x00\x00\x00\x00"
    REQUEST_NOTIFICATIONS = PREFIX + b"\x0f\x00\xff\xff\xff\xff"

    NOISE_CANCELLATION_HEADER = PREFIX + SETTINGS + b"\x0d"
    NOISE_CANCELLATION_OFF = NOISE_CANCELLATION_HEADER + b"\x01" + SUFFIX
    NOISE_CANCELLATION_ON = NOISE_CANCELLATION_HEADER + b"\x02" + SUFFIX
    NOISE_CANCELLATION_TRANSPARENCY = NOISE_CANCELLATION_HEADER + b"\x03" + SUFFIX
    NOISE_CANCELLATION_ADAPTIVE = NOISE_CANCELLATION_HEADER + b"\x04" + SUFFIX

    CONVERSATION_AWARENESS_HEADER = PREFIX + SETTINGS + b"\x28"
    CONVERSATION_AWARENESS_OFF = CONVERSATION_AWARENESS_HEADER + b"\x02" + SUFFIX
    CONVERSATION_AWARENESS_ON = CONVERSATION_AWARENESS_HEADER + b"\x01" + SUFFIX

    HANDSHAKE_ACK = b"\x01\x00\x04\x00"
    FEATURES_ACK = b"\x04\x00\x04\x00\x2b\x00"
    BATTERY_STATUS_NOTIFICATION = b"\x04\x00\x04\x00\x04\x00"
    CONVERSATION_AWARENESS_DATA = PREFIX + b"\x4b\x00\x02\x00\x01"
    EAR_DETECTION_PREFIX = PREFIX + b"\x06\x00"


class AirpodsDevice(SocketHandler):
    """
    Represents an Apple AirPods device for reporting battery status and
    controlling ANC mode via Bluetooth L2CAP socket.
    """

    def __init__(self, manager, loop, device_path, device_bluez_proxy, callbacks=None):
        super().__init__(manager, loop, device_path)
        identifier = "".join(device_path.split("_")[-3:])
        self.logger = logging.getLogger(f"{self.__class__.__name__}-{identifier}")
        self.logger.debug("AppleDevice init device_path= %s", device_path)
        self.device_bluez_proxy = device_bluez_proxy
        self.bluez_signal_sub_id = None
        self.model_init = False
        self.battery_props = None
        self.in_ear = False
        self.anc_mode = None
        self.awareness_mode = None
        self.bud1_state = None
        self.bud2_state = None
        self.awareness_attenuated = False
        self.ear_status = {
            "bud1-inear-status": "unknown",
            "bud2-inear-status": "unknown"}
        self.awareness_status = {"awareness-active": False}

        self.callbacks = callbacks

        modalias = self.check_modalias()
        if not modalias:
            self.bluez_signal_sub_id = self.device_bluez_proxy.connect(
                "g-properties-changed", self._on_bluez_properties_changed)
        else:
            self.check_model(modalias)

    def check_modalias(self):
        """Return Modalias if available, may be missing initially."""
        modalias_raw = self.device_bluez_proxy.get_cached_property("Modalias")
        modalias = unwrap(modalias_raw)
        self.logger.debug("Modalias : %s", modalias)
        return modalias

    # pylint: disable=unused-argument
    def _on_bluez_properties_changed(self, interface, changed, invalidated_properties):
        """Watch for Modalias appearing after initial connection."""
        props = unwrap(changed)
        self.logger.debug("PropertiesChanged: %s", props)

        if "Modalias" in props:
            modalias = props["Modalias"]
            self.logger.debug("Modalias on properties_changed: %s", modalias)
            if modalias and not self.model_init:
                self.logger.info("Services resolved, starting object manager scan")
                self.check_model(modalias)

    def check_model(self, modalias):
        """Check if model supported"""
        self.model_init = True

        if self.bluez_signal_sub_id and self.device_bluez_proxy:
            self.device_bluez_proxy.disconnect(self.bluez_signal_sub_id)
        self.bluez_signal_sub_id = None

        model_supported = self.initialize_model(modalias)
        if not model_supported:
            self.logger.warning(
                "Unsupported device, skipping connection: %s",
                self.device_path)
            return

        # Initiate socket from socket handler
        self.start(SOCKET_PROTOCOL, PSM)

    def extract_model(self, modalias):
        """Extract Model (PID) from Modalias"""
        prefix = "v004Cp"
        suffix = "d"
        try:
            start = modalias.index(prefix) + len(prefix)
            end = modalias.index(suffix, start)
            return modalias[start:end].upper()
        except ValueError:
            return None

    def initialize_model(self, modalias):
        """Convert path to mac and initialize model properties from MODEL_DB."""
        self.logger.debug("Initialize model")

        model = self.extract_model(modalias)
        if not model:
            return False

        info = MODEL_DB.get(model)
        if not info:
            self.logger.warning("Model not found in MODEL_DB: %s", model)
            return False

        self.battery_type = info.get("battery_type", 1)
        self.anc_supported = info.get("anc_supported", False)
        self.awareness_supported = info.get("awareness_supported", False)

        self.logger.debug("Address = %s", self.mac_address)
        self.logger.debug("Product ID: %s", model)
        self.logger.debug("Battery_type:  %s", self.battery_type)
        self.logger.debug("Anc_supported:  %s", self.anc_supported)
        self.logger.debug("Conversation_awareness_supported:  %s", self.awareness_supported)
        device_info = {"pid": model}
        self.callbacks["update_device_info"](json.dumps(device_info))
        return True

    def parse_response(self, data):
        """Parse the incoming data response and dispatch to appropriate handler."""
        if logging.getLogger().isEnabledFor(logging.DEBUG):
            self.logger.debug("Parse_response data : %s", data.hex())

        if data.startswith(PacketConstants.HANDSHAKE_ACK):
            self.logger.debug("Parse HANDSHAKE_ACK")
            self.ack_event.set()
            return

        if data.startswith(PacketConstants.FEATURES_ACK):
            self.logger.debug("Parse FEATURES_ACK")
            return

        if len(data) == 22 and data.startswith(
                PacketConstants.BATTERY_STATUS_NOTIFICATION):
            self.parse_battery_status(data)
            return

        if data.startswith(PacketConstants.EAR_DETECTION_PREFIX):
            self.parse_ear_detection(data)
            return

        if (self.anc_supported and len(data) == 11
                and data.startswith(PacketConstants.NOISE_CANCELLATION_HEADER)):
            self.parse_anc_status(data)
            return

        if (self.awareness_supported and len(data) == 11
                and data.startswith(PacketConstants.CONVERSATION_AWARENESS_HEADER)):
            self.parse_awareness_status(data)
            return

        if (self.awareness_supported and len(data) == 10
                and data.startswith(PacketConstants.CONVERSATION_AWARENESS_DATA)):
            self.parse_awareness_data(data)
            return

    def parse_battery_status(self, data):
        """Parse and update battery status from device response."""
        self.logger.debug("Parse battery status")
        battery_count = data[6]
        if battery_count < 1 or battery_count > 3:
            return

        if battery_count > 1 and self.battery_type == 1:
            self.logger.warning("Verify your model and correct its MODEL_DB")
            return

        props = {}
        start = 7
        for _ in range(battery_count):
            try:
                btype = BatteryType(data[start])
                level = max(0, min(data[start + 2], 100))
            except ValueError:
                start += 5
                continue

            try:
                status = BatteryChargingStatus(data[start + 3]).name
            except ValueError:
                # For unknown values, assumed as discharging
                status = "DISCHARGING"

            if btype in (BatteryType.SINGLE, BatteryType.LEFT):
                props["battery1Level"] = level
                props["battery1Status"] = status.lower()
            elif btype == BatteryType.RIGHT:
                props["battery2Level"] = level
                props["battery2Status"] = status.lower()
            elif btype == BatteryType.CASE:
                props["battery3Level"] = level
                props["battery3Status"] = status.lower()
            start += 5
            self.logger.info("Battery props changes: %s", props)
            self.callbacks["update_battery_props"](json.dumps(props))

    def send_combined_custom_message(self):
        message = {**self.ear_status}
        if self.awareness_supported:
            message.update(self.awareness_status)
        self.callbacks["update_custom_message"](json.dumps(message))

    def parse_ear_detection(self, data):
        """Parse and update ear detection from device response."""
        self.logger.debug("Parse ear detection")
        visible_mode = 0
        in_ear = False
        try:
            bud1_state = EarDetection(data[6]).name
            bud2_state = EarDetection(data[7]).name
            in_ear = False

            if bud1_state == "IN_EAR" or bud2_state == "IN_EAR":
                in_ear = True

            self.logger.info("Earbuds in ear: %s", in_ear)

            if not in_ear:
                if self.awareness_supported:
                    visible_mode = 3
                else:
                    visible_mode = 1
            self.logger.debug("Toggle visiblitly: %s", visible_mode)
            self.callbacks["update_toggle_visible"](visible_mode)
            self.in_ear = in_ear

            if self.bud1_state != bud1_state or self.bud2_state != bud2_state:
                self.ear_status = {
                    "bud1-inear-status": bud1_state.lower().replace("_", "-"),
                    "bud2-inear-status": bud2_state.lower().replace("_", "-")
                }
                self.send_combined_custom_message()
        except ValueError:
            pass

    def parse_anc_status(self, data):
        """Parse and update ANC (Active Noise Cancellation) mode from device response."""
        self.logger.debug("Parse anc status")
        try:
            toggle1_state = 0
            mode = ANCMode(data[7])
            self.logger.info("Emitted anc mode: %s", mode)

            if mode == ANCMode.ANC_ON:
                toggle1_state = 1
            elif mode == ANCMode.TRANSPARENCY:
                toggle1_state = 2
            elif mode == ANCMode.ADAPTIVE:
                toggle1_state = 3
            self.logger.info("Toggle1 state changed = %d", toggle1_state)
            self.callbacks["update_toggle1_state"](toggle1_state)
        except ValueError:
            pass

    def parse_awareness_status(self, data):
        """Parse and update conversation awareness mode from device response."""
        self.logger.debug("Parse awarnesss status")
        try:
            toggle2_state = 0
            mode = ConversationAwarenessMode(data[7])
            if mode == ConversationAwarenessMode.ON:
                toggle2_state = 1
            elif mode == ConversationAwarenessMode.OFF:
                toggle2_state = 2
            self.logger.info("Toggle2 state changed = %d", toggle2_state)
            self.callbacks["update_toggle2_state"](toggle2_state)
        except ValueError:
            pass

    def parse_awareness_data(self, data):
        """Parse and update conversation awareness trigger level from device response."""
        self.logger.debug("Parse awarnesss data")
        level = data[9]
        self.logger.info("Emitted awarness data: %s", level)
        if 1 <= level <= 9:
            attenuated = level <= 2
            if self.awareness_attenuated != attenuated:
                self.awareness_attenuated = attenuated
                self.awareness_status = {"awareness-active": attenuated}
                self.send_combined_custom_message()

    def request_status(self, information):
        """Request the current status for specified information type."""
        self.logger.warning("Airpods doesn't support RequestStatus  %s", information)
        return GLib.Variant("(s)", ("unsupported",))

    def set_device_command(self, command):
        """Set the device command based on the JSON input."""
        try:
            command_data = json.loads(command)
        except json.JSONDecodeError:
            self.logger.warning("Invalid JSON format: %s", command)
            return

        if len(command_data) != 1:
            self.logger.warning(
                "Expected exactly one group in the command, but got: %s",
                command_data)
            return

        group, value = list(command_data.items())[0]

        if group == "toggle1-activated":
            if value == 1:
                mode = PacketConstants.NOISE_CANCELLATION_ON
            elif value == 2:
                mode = PacketConstants.NOISE_CANCELLATION_TRANSPARENCY
            elif value == 3:
                mode = PacketConstants.NOISE_CANCELLATION_ADAPTIVE

        elif group == "toggle2-activated":
            if value == 1:
                mode = PacketConstants.CONVERSATION_AWARENESS_ON
            elif value == 2:
                mode = PacketConstants.CONVERSATION_AWARENESS_OFF
            # Conversation awareness does not send response when toggled
            # To switch button state piggy back the value
            self.callbacks["update_toggle2_state"](value)
        else:
            self.logger.warning("Invalid group: %s", group)
            return

        asyncio.run_coroutine_threadsafe(self.send_command(mode), self.loop)

    def _extract_messages(self, response: bytes) -> list[bytes]:
        """Extracts individual packets using markers"""
        messages = []
        i = 0
        start_marker = PacketConstants.PREFIX
        special_marker = PacketConstants.HANDSHAKE_ACK

        while i < len(response):
            if response[i:i + 4] == special_marker:
                messages.append(special_marker)
                i += 4
                continue

            if response[i:i + 4] == start_marker:
                next_start = response.find(start_marker, i + 4)
                if next_start == -1:
                    messages.append(response[i:])
                    break
                messages.append(response[i:next_start])
                i = next_start
            else:
                next_start = response.find(start_marker, i)
                if next_start == -1:
                    messages.append(response[i:])
                    break
                messages.append(response[i:next_start])
                i = next_start

        return messages

    def process_data(self, data: bytes):
        """Hook for subclass to parse/handle data stream."""
        messages = self._extract_messages(data)
        for msg in messages:
            if msg:
                self.parse_response(msg)

    async def post_connect_initialization(self):
        """Initialzation using handshake packets after socket connection is established"""
        self.ack_event.clear()
        self.writer.write(PacketConstants.HANDSHAKE)
        await self.writer.drain()
        self.logger.info("Handshake command sent")
        await self.ack_event.wait()

        if self.awareness_supported:
            self.writer.write(PacketConstants.SET_SPECIFIC_FEATURES)
            self.logger.info("Specific feature command sent")
            await self.writer.drain()

        await asyncio.sleep(0.25)
        self.writer.write(PacketConstants.REQUEST_NOTIFICATIONS)
        self.logger.info("Request Notification")
        await self.writer.drain()

    def on_destroy(self):
        """Clean up AirPods-specific resources."""
        if self.bluez_signal_sub_id and self.device_bluez_proxy:
            self.device_bluez_proxy.disconnect(self.bluez_signal_sub_id)
        self.bluez_signal_sub_id = None
