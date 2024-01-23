'use strict';
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Config = imports.misc.config;
const [major] = Config.PACKAGE_VERSION.split('.');
const shellVersion42 = Number.parseInt(major) === 42;

const BlutoothToggle = shellVersion42 ? Me.imports.lib.bluetoothToggle42 : Me.imports.lib.bluetoothToggle;

function init() {
    ExtensionUtils.initTranslations(Me.metadata.uuid);
    return new BluetoothBatteryMeterExtenstion();
}

class BluetoothBatteryMeterExtenstion {
    // Bluetooth quicks settings menu are accessible when the session is locked.
    // Therefore unlock-dialog session mode is used.
    enable() {
        this._settings = ExtensionUtils.getSettings();
        this._btBatteryMeter = new BlutoothToggle.BluetoothBatteryMeter(Me, this._settings);
    }

    disable() {
        this._btBatteryMeter.destroy();
        this._btBatteryMeter = null;
        this._settings = null;
    }
}

