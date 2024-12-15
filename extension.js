'use strict';
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const BlutoothToggle = Me.imports.lib.bluetoothToggle;

function init() {
    ExtensionUtils.initTranslations(Me.metadata.uuid);
    return new BluetoothBatteryMeterExtenstion();
}

class BluetoothBatteryMeterExtenstion {
    // Bluetooth quicks settings menu are accessible when the session is locked.
    // Therefore unlock-dialog session mode is used.
    enable() {
        this._settings = ExtensionUtils.getSettings();
        this._btBatteryMeter = new BlutoothToggle.BluetoothBatteryMeter(this._settings, Me.path);
    }

    disable() {
        this._btBatteryMeter.destroy();
        this._btBatteryMeter = null;
        this._settings = null;
    }
}

