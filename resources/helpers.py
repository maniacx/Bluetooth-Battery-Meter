"""
SocketHandler Class: Base class for managing async Bluetooth socket I/O.
PrintLogHandler Class: Logs to file and shows startup status in terminal.
ShutdownHandler Class: Coordinates clean and thread-safe service shutdown.
MonitorExtensionState Class: Monitors GNOME extension state via D-Bus.
"""

import asyncio
import os
import sys
import time
import logging
import socket
import threading
from logging.handlers import RotatingFileHandler
from gi.repository import Gio, GLib

TARGET_EXTENSION_UUID = "Bluetooth-Battery-Meter@maniacx.github.com"
EXT_BUS_NAME = "org.gnome.Shell.Extensions"
EXT_OBJ_PATH = "/org/gnome/Shell/Extensions"
EXT_IFACE = "org.gnome.Shell.Extensions"
_status_event = threading.Event()


def unwrap(value):
    """Unwrap GLib.Variant or dicts with variant values."""
    if isinstance(value, GLib.Variant):
        value = value.unpack()

    if isinstance(value, tuple) and len(value) == 1:
        return value[0]

    if isinstance(value, dict):
        return {k: v.unpack() if isinstance(v, GLib.Variant) else v for k, v in value.items()}

    return value


class SocketHandler:
    """ Common socket‑connect/send/receive logic for any L2CAP or RFCOMM """

    def __init__(self, manager, loop, device_path):
        identifier = "".join(device_path.split("_")[-3:])
        self.sockhandler_logger = logging.getLogger(
            f"{self.__class__.__name__}SocketHandler-{identifier}"
        )
        self.manager = manager
        self.loop = loop
        self.device_path = device_path
        self.mac_address = self.extract_mac(device_path)

        self.running = False
        self.sock = None
        self.socket_protocol = None
        self.psm_or_channel = None
        self.reader = None
        self.writer = None
        self.command_queue = None
        self.ack_event = asyncio.Event()

        self._connection_task = None
        self._receiver_task = None
        self._sender_task = None

    def extract_mac(self, path):
        """Extract mac address from path"""
        dev_prefix = "/dev_"
        if dev_prefix in path:
            return path.rsplit(dev_prefix, 1)[-1].replace("_", ":")
        return None

    async def post_connect_initialization(self):
        """Hooks to init connection handshake, auth, notification"""
        raise NotImplementedError

    def process_data(self, data: bytes):
        """Hooks to parse/handle data stream."""
        raise NotImplementedError

    def on_destroy(self):
        """Hooks on destroy."""
        pass

    def start(self, socket_protocol, psm_or_channel):
        """Begin the asyncio connection handshake in the event loop."""
        if socket_protocol not in ("L2CAP", "RFCOMM"):
            self.sockhandler_logger.debug("Invalid socket protocol: %s", socket_protocol)
            return

        if not psm_or_channel:
            self.sockhandler_logger.debug("Invalid psm or channel: %s", psm_or_channel)
            return

        self.socket_protocol = socket_protocol
        self.psm_or_channel = psm_or_channel

        if self.running:
            return

        self.running = True

        def _launch():
            self._connection_task = asyncio.create_task(self._run_connection())

        self.loop.call_soon_threadsafe(_launch)

    async def _run_connection(self):
        """Start the full initializing process with the device."""
        self.command_queue = asyncio.Queue()
        try:
            await self._connect_socket()
            self._receiver_task = asyncio.create_task(self._receive_handler())
            self._sender_task = asyncio.create_task(self._send_handler())

            await self.post_connect_initialization()

            await asyncio.gather(self._receiver_task, self._sender_task)
        except Exception as e:
            self.sockhandler_logger.error("Connection error: %s", e)
        finally:
            self.stop()

    async def _connect_socket(self):
        """Establish a Bluetooth socket connection to the device."""
        self.sockhandler_logger.info("Connecting to device")
        family = socket.AF_BLUETOOTH
        socktype = socket.SOCK_STREAM
        proto = socket.BTPROTO_L2CAP if self.socket_protocol == "L2CAP" else socket.BTPROTO_RFCOMM

        try:
            self.sock = socket.socket(family, socktype, proto)
            self.sock.setblocking(False)
            await self.loop.sock_connect(self.sock, (self.mac_address, self.psm_or_channel))
            self.reader, self.writer = await asyncio.open_connection(sock=self.sock)
            self.sockhandler_logger.debug("Connection established")
        except Exception as e:
            self.sockhandler_logger.error("Error connecting to device: %s", e)
            self.stop()
            raise

    async def _receive_handler(self):
        """Handle receiving data from the device asynchronously."""
        self.sockhandler_logger.debug("Starting receive handler")

        while self.running:
            try:
                data_stream = await self.reader.read(1024)
                if not data_stream:
                    continue

                self.process_data(data_stream)

            except Exception as e:
                self.sockhandler_logger.error("Receive handler stopped: %s", e)
                self.stop()
                break

    async def _send_handler(self):
        """Handle sending data to the device asynchronously."""
        self.sockhandler_logger.debug("Starting send handler")
        while self.running:
            try:
                command = await self.command_queue.get()

                if command is None:
                    break

                self.writer.write(command)
                await self.writer.drain()
            except Exception as e:
                self.sockhandler_logger.error("Error in send handler: %s", e)
                self.stop()
                break

    async def send_command(self, command):
        """Queue a command to be sent asynchronously to the device."""
        try:
            await self.command_queue.put(command)
        except Exception as e:
            self.sockhandler_logger.error("Error queuing command: %s", e)

    def stop(self):
        """Call manager to perform removal of devices and cleanup"""
        self.sockhandler_logger.debug("Bluez connected props called remove_device_by_path with: %s",
                                      self.device_path)
        try:
            self.loop.call_soon_threadsafe(
                asyncio.create_task,
                self.manager.remove_device_by_path(self.device_path)
            )
        except Exception:
            pass

    async def destroy(self):
        """Gracefully stop communication with the device."""
        if not self.running:
            return
        self.sockhandler_logger.info("Stopping device communication")
        self.running = False
        self.callbacks.clear()

        self.on_destroy()

        if (
            self._connection_task
            and not self._connection_task.done()
            and self._connection_task is not asyncio.current_task()
        ):
            self._connection_task.cancel()
            try:
                await self._connection_task
            except asyncio.CancelledError:
                pass

        for task in (getattr(self, "_receiver_task", None),
                     getattr(self, "_sender_task", None)):
            if isinstance(task, asyncio.Task) and not task.done():
                await task.cancel()

        if self.writer:
            try:
                self.writer.close()
                await self.writer.wait_closed()
            except Exception:
                pass
        if hasattr(self, "sock"):
            try:
                self.sock.close()
            except BaseException:
                pass

        self.reader = None

        if self.command_queue:
            try:
                self.command_queue.put_nowait(None)
            except Exception:
                pass
        self.command_queue = None


class PrintLogHandler:
    """Handles logging setup and displays service status info."""
    @staticmethod
    def redirect_logging(enable_debug):
        """Redirect logging to a temp file, max size 1MB."""
        log_path = os.path.join("/tmp", "bluetooth_battery_meter.log")
        handler = RotatingFileHandler(
            log_path,
            maxBytes=1 * 1024 * 1024,
            backupCount=0
        )
        level = logging.DEBUG if enable_debug else logging.INFO
        logging.basicConfig(
            level=level,
            handlers=[handler],
            format="%(asctime)s %(levelname)s: %(name)s: %(message)s"
        )
        return log_path

    @staticmethod
    def display_status(log_path):
        """Display startup info and spinner animation."""
        print("Python script is service for Gnome extension Bluetooth Battery Meter")
        print(f"Logs are stored in {log_path}")
        print("To view realtime logs use:\n")
        print(f"  tail -f {log_path}\n")

        def spinner():
            spinner_chars = "|/-\\"
            idx = 0
            while not _status_event.is_set():
                char = spinner_chars[idx % len(spinner_chars)]
                sys.stdout.write(f"\rService status: Running... {char}")
                sys.stdout.flush()
                idx += 1
                time.sleep(1)

        t = threading.Thread(target=spinner, daemon=True)
        t.start()


class ShutdownHandler:
    """Handles coordinated and thread-safe shutdown of the service."""

    def __init__(self, manager, event_loop, glib_loop):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.manager = manager
        self.event_loop = event_loop
        self.glib_loop = glib_loop

    def request_exit(self, code=0):
        """Schedules a graceful exit on the GLib main loop in a thread-safe manner."""
        asyncio.run_coroutine_threadsafe(self._shutdown_sequence(code),
                                         self.event_loop)
        return False

    async def _shutdown_sequence(self, code):
        """Async cleanup: remove devices in sequence, then stop loops."""
        self.logger.info("Shutting down gracefully.")

        for path in list(self.manager.devices.keys()):
            try:
                self.logger.debug("Removing device %s", path)
                await self.manager.remove_device_by_path(path)
            except Exception:
                pass

        self.manager.cleanup()

        self.event_loop.call_soon_threadsafe(self.event_loop.stop)
        GLib.idle_add(self.glib_loop.quit)
        sys.exit(code)


class MonitorExtensionState:
    """Monitors GNOME Shell extension state via D-Bus."""
    EXTENSION_STATE_ACTIVE = 1

    def __init__(self, session_bus, request_exit_cb):
        """Initialize D-Bus proxy for extension monitoring."""
        self.logger = logging.getLogger(self.__class__.__name__)
        self.session_bus = session_bus
        self._timeout_id = None
        self.request_exit_cb = request_exit_cb

        self._proxy = Gio.DBusProxy.new_sync(
            self.session_bus,
            Gio.DBusProxyFlags.NONE,
            None,
            EXT_BUS_NAME,
            EXT_OBJ_PATH,
            EXT_IFACE,
            None
        )

        self._proxy.connect("g-signal", self._on_signal)
        self._query_initial_state()

    def _query_initial_state(self):
        """Query current state of the target extension."""
        try:
            result_variant = self._proxy.call_sync(
                "GetExtensionInfo",
                GLib.Variant("(s)", [TARGET_EXTENSION_UUID]),
                Gio.DBusCallFlags.NONE,
                -1,
                None
            )
            info_dict = result_variant.unpack()[0]
            self.logger.debug("Extension initial state → %s", info_dict.get("state"))
            self._handle_extension_state(TARGET_EXTENSION_UUID, info_dict)
        except GLib.Error as e:
            self.logger.error("Initial query failed: %s", e)

    # pylint: disable=unused-argument
    def _on_signal(self, proxy, sender_name, signal_name, parameters):
        """Handle D-Bus ExtensionStateChanged signal."""
        if signal_name != "ExtensionStateChanged":
            return
        uuid, info = parameters.unpack()
        self._handle_extension_state(uuid, info)

    def _handle_extension_state(self, uuid, state_dict):
        """Process extension state and start or stop shutdown timer."""
        if uuid != TARGET_EXTENSION_UUID:
            return

        new_state = int(state_dict.get("state"))
        self.logger.debug("ExtensionStateChanged %s → state %s", uuid, new_state)

        if new_state != self.EXTENSION_STATE_ACTIVE:
            if self._timeout_id is None:
                self._timeout_id = GLib.timeout_add_seconds(
                    3, self._exit_if_still_inactive)
        else:
            if self._timeout_id is not None:
                GLib.source_remove(self._timeout_id)
                self._timeout_id = None

    def _exit_if_still_inactive(self):
        """Exit service if extension remains inactive."""
        self.logger.warning(
            "Extension still inactive after timeout. Exiting service.")
        GLib.idle_add(lambda: self.request_exit_cb(0))
        return False
