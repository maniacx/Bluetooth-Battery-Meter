'use strict';
import Gio from 'gi://Gio';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as BluetoothToggle from './lib/bluetoothToggle.js';

Gio._promisify(Gio.DBusProxy, 'new');
Gio._promisify(Gio.DBusProxy, 'new_for_bus');
Gio._promisify(Gio.DBusProxy.prototype, 'call');
Gio._promisify(Gio.DBusConnection.prototype, 'call');
Gio._promisify(Gio.InputStream.prototype, 'read_bytes_async');
Gio._promisify(Gio.OutputStream.prototype, 'write_all_async');

export default class BluetoothBatteryMeterExtension extends Extension {
    // Bluetooth quicks settings menu are accessible when the session is locked.
    // Therefore unlock-dialog session mode is used.
    enable() {
        this._settings = this.getSettings();
        this._btBatteryMeter =
            new BluetoothToggle.BluetoothBatteryMeter(this._settings, this.path, this.uuid);
    }

    disable() {
        this._btBatteryMeter.destroy();
        this._btBatteryMeter = null;
        this._settings = null;
    }
}

