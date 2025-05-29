"""
Pre-run environment checker for bluetooth_battery_meter.py.

The bluetooth_battery_meter.py script manages its own lifecycle, so the extension
launches it using GLib.spawn_command_line_async(), allowing it to persist or be
reaped independently of the extension.

This checker runs beforehand using Gio.Subprocess to verify Python environment
compatibility. It lets the extension notify the user of issues and avoid running
the main script on unsupported systems.

It verifies:
* Python >= 3.11              → 'version-incompatible'
* socket.AF_BLUETOOTH         → 'socket-missing'
* gi.repository.Gio, GLib     → 'pyobject-missing'

Prints 'available' if all checks pass, else a comma-separated list of errors.
"""

import sys
# Skip caching
sys.dont_write_bytecode = True  # pylint: disable=wrong-import-position

failed = []
version = sys.version_info
if version.major < 3 or (version.major == 3 and version.minor <= 11):
    failed.append("version-incompatible")

try:
    import socket
    if not hasattr(socket, "AF_BLUETOOTH"):
        raise ImportError
except ImportError:
    failed.append("socket-missing")

try:
    from gi.repository import Gio, GLib, GObject
except ImportError:
    failed.append("pyobject-missing")

print(",".join(failed) if failed else "available")
