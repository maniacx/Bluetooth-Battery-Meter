'use strict';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as BluetoothToggle from './lib/bluetoothToggle.js';

export default class BluetoothBatteryMeterExtension extends Extension {
    // Bluetooth quicks settings menu are accessible when the session is locked.
    // Therefore unlock-dialog session mode is used.
    enable() {
        this._settings = this.getSettings();
        this._btBatteryMeter = new BluetoothToggle.BluetoothBatteryMeter(this, this._settings);
    }

    disable() {
        this._btBatteryMeter.destroy();
        this._btBatteryMeter = null;
        this._settings = null;
    }
}

