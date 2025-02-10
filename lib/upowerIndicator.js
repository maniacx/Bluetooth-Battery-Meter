'use strict';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import UPower from 'gi://UPowerGlib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {BluetoothIndicator} from './bluetoothIndicator.js';
import * as Helper from './upowerHelper.js';

const QuickSettingsMenu = Main.panel.statusArea.quickSettings;

const deviceKindMapping = {
    [UPower.DeviceKind.MOUSE]: 'input-mouse',
    [UPower.DeviceKind.KEYBOARD]: 'input-keyboard',
    [UPower.DeviceKind.TOUCHPAD]: 'touchpad',
    [UPower.DeviceKind.GAMING_INPUT]: 'input-gaming',
    [UPower.DeviceKind.PEN]: 'input-tablet',
    [UPower.DeviceKind.MONITOR]: 'video-display',
    [UPower.DeviceKind.PDA]: 'pda',
    [UPower.DeviceKind.PHONE]: 'phone',
    [UPower.DeviceKind.MEDIA_PLAYER]: 'multimedia-player',
    [UPower.DeviceKind.COMPUTER]: 'computer',
    [UPower.DeviceKind.PEN]: 'input-tablet',
    [UPower.DeviceKind.MODEM]: 'modem',
    [UPower.DeviceKind.NETWORK]: 'network-wireless',
    [UPower.DeviceKind.HEADSET]: 'audio-headset',
    [UPower.DeviceKind.SPEAKERS]: 'audio-speakers',
    [UPower.DeviceKind.HEADPHONES]: 'audio-headphones',
    [UPower.DeviceKind.VIDEO]: 'camera-video',
    [UPower.DeviceKind.OTHER_AUDIO]: 'audio-card',
    [UPower.DeviceKind.PRINTER]: 'printer',
    [UPower.DeviceKind.SCANNER]: 'scanner',
    [UPower.DeviceKind.CAMERA]: 'camera-photo',
    [UPower.DeviceKind.WEARABLE]: 'wearable',
};

const UpowerDevice = GObject.registerClass({
    Properties: {
        'battery_percentage': GObject.ParamSpec.int('battery_percentage', '', 'Battery Percentage',
            GObject.ParamFlags.READWRITE, 0, 100, 0),
    },
}, class UpowerDevice extends GObject.Object {
    constructor(upowerClientObj, path) {
        super();
        this._upowerClientObj = upowerClientObj;
        this._path = path;
        this._initializeUPowerDevice();
    }

    async _initializeUPowerDevice() {
        this._deviceCancellable = new Gio.Cancellable();
        [this._proxy, this._proxyId] = await Helper.initDeviceProxy(this._path, this._deviceCancellable, _ => this._sync());
        if (!this._proxy || !this._proxyId || !this._deviceCancellable || this._deviceCancellable.is_cancelled())
            return;
        this._sync();
    }

    _sync() {
        const isPresent = this._proxy.get_cached_property('IsPresent').unpack();
        const model = this._proxy.get_cached_property('Model').unpack();
        const percentage = this._proxy.get_cached_property('Percentage').unpack();
        const state = this._proxy.get_cached_property('State').unpack();
        const isValidBatteryState = state !== UPower.DeviceState.UNKNOWN;

        if (this.battery_percentage !== percentage)
            this.battery_percentage = percentage;

        let indicatorProp = {};
        let indicatorPropUpdated = false;
        if (this._upowerClientObj._deviceList.has(this._path)) {
            indicatorProp = this._upowerClientObj._deviceList.get(this._path);
            if (indicatorProp.model !== model) {
                indicatorProp.model = model;
                indicatorPropUpdated = true;
            }
            if (isValidBatteryState && !indicatorProp.reportsState) {
                indicatorProp.reportsState = true;
                indicatorPropUpdated = true;
            }
        } else {
            const type = this._proxy.get_cached_property('Type').unpack();
            const icon = deviceKindMapping[type] || 'upower-devices';
            indicatorProp = {
                icon,
                model,
                indicatorMode: true,
                reportsState: isValidBatteryState,
            };
            this._upowerClientObj._deviceList.set(this._path, indicatorProp);
            this._upowerClientObj._delayedUpdateDeviceGsettings();
        }

        let indicator;
        if (this._upowerClientObj._deviceIndicators.has(this._path))
            indicator = this._upowerClientObj._deviceIndicators.get(this._path);

        const showIndicator = indicatorProp.indicatorMode && isPresent && (!indicatorProp.reportsState || isValidBatteryState);
        if (showIndicator && !indicator) {
            indicator = new BluetoothIndicator(this._upowerClientObj._settings, this, 2, indicatorProp.icon,
                this._upowerClientObj._widgetInfo);
            QuickSettingsMenu.addExternalIndicator(indicator);
            this._upowerClientObj._deviceIndicators.set(this._path, indicator);
        } else if (!showIndicator && indicator) {
            indicator?.destroy();
            indicator = null;
            this._upowerClientObj._deviceIndicators.delete(this._path);
        }

        if (indicatorPropUpdated) {
            this._upowerClientObj._deviceList.set(this._path, indicatorProp);
            this._upowerClientObj._pushDevicesToGsetting();
        }
    }

    destroy() {
        if (this._proxyId && this._proxy)
            this._proxy.disconnect(this._proxyId);
        if (this._deviceCancellable) {
            this._deviceCancellable.cancel();
            this._deviceCancellable = null;
        }
        this._proxyId = null;
        this._proxy = null;
    }
});

export const UpowerClient = GObject.registerClass({
}, class UpowerClient extends GObject.Object {
    constructor(settings, widgetInfo) {
        super();
        this._settings = settings;
        this._widgetInfo = widgetInfo;
        this._requestedProps = ['PowerSupply', 'NativePath'];
        this._deviceItems = new Map();
        this._deviceIndicators = new Map();
        this._deviceList = new Map();
        this._pullDevicesFromGsetting();
        this._connectSettingsSignal(true);
        this._initializeUpower();
    }

    async _initializeUpower() {
        this._cancellable = new Gio.Cancellable();
        this._dbusProxy = await Helper.initProxy(this._cancellable);
        if (!this._dbusProxy)
            return;

        const devices = await Helper.getDevices(this._dbusProxy, this._cancellable, this._requestedProps);
        if (!this._cancellable || this._cancellable.is_cancelled())
            return;
        this._dbusSignalId = Helper.watchDevices(this._dbusProxy, this._refreshDevices.bind(this));
        for (const dev of devices)
            this._createDevice(dev);
    }

    _createDevice(dev) {
        const path = dev.path;
        const isPowerSupply = dev.properties['PowerSupply'];
        const nativePath = dev.properties['NativePath'];
        if (!isPowerSupply && !nativePath.startsWith('/org/bluez/')) {
            if (this._deviceItems.has(path)) {
                this._deviceItems.get(path)._sync();
            } else {
                const device = new UpowerDevice(this, path);
                this._deviceItems.set(path, device);
            }
        }
    }

    _removeDevice(path) {
        if (this._deviceIndicators.has(path)) {
            this._deviceIndicators.get(path)?.destroy();
            this._deviceIndicators.delete(path);
        }
        if (this._deviceItems.has(path)) {
            this._deviceItems.get(path)?.destroy();
            this._deviceItems.delete(path);
        }
    }

    async _refreshDevices(path, action) {
        if (action === 'add') {
            const device = await Helper.getDeviceProps(path, null, this._requestedProps);
            this._createDevice(device);
        } else if (action === 'remove') {
            this._removeDevice(path);
        }
    }

    _connectSettingsSignal(connect) {
        if (connect) {
            this._settingSignalId = this._settings.connect('changed::upower-device-list', () => {
                this._pullDevicesFromGsetting();
                this._deviceIndicators.forEach(indicator => indicator?.destroy());
                this._deviceIndicators.clear();
                this._deviceItems.forEach(device => device?._sync());
            });
        } else if (this._settingSignalId) {
            this._settings.disconnect(this._settingSignalId);
            this._settingSignalId = null;
        }
    }

    _pullDevicesFromGsetting() {
        this._deviceList.clear();
        const deviceList = this._settings.get_strv('upower-device-list');
        if (deviceList.length !== 0) {
            for (const jsonString of deviceList) {
                const item = JSON.parse(jsonString);
                const path = item.path;
                const indicatorProps = {
                    'icon': item['icon'],
                    'model': item['model'],
                    'indicatorMode': item['indicator-mode'],
                    'reportsState': item['reports-state'],
                };
                this._deviceList.set(path, indicatorProps);
            }
        }
    }

    _pushDevicesToGsetting() {
        const deviceList = [];
        for (const [path, indicatorProps] of this._deviceList) {
            const item = {
                path,
                'icon': indicatorProps.icon,
                'model': indicatorProps.model,
                'indicator-mode': indicatorProps.indicatorMode,
                'reports-state': indicatorProps.reportsState,
            };
            deviceList.push(JSON.stringify(item));
        }
        this._connectSettingsSignal(false);
        this._settings.set_strv('upower-device-list', deviceList);
        this._connectSettingsSignal(true);
    }

    _delayedUpdateDeviceGsettings() {
        if (this._delayedTimerId)
            GLib.source_remove(this._delayedTimerId);
        this._delayedTimerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
            this._pushDevicesToGsetting();
            this._delayedTimerId = null;
            return GLib.SOURCE_REMOVE;
        });
    }

    destroy() {
        if (this._delayedTimerId)
            GLib.source_remove(this._delayedTimerId);
        this._delayedTimerId = null;
        if (this._cancellable) {
            this._cancellable.cancel();
            this._cancellable = null;
        }
        if (this._dbusSignalId && this._dbusProxy)
            this._dbusProxy.disconnect(this._dbusSignalId);
        this._dbusSignalId = null;
        this._dbusProxy = null;
        this._connectSettingsSignal(false);
        if (this._deviceIndicators) {
            this._deviceIndicators.forEach(indicator => indicator?.destroy());
            this._deviceIndicators.clear();
        }
        this._deviceIndicators = null;
        if (this._deviceItems) {
            this._deviceItems.forEach(item => item?.destroy());
            this._deviceItems.clear();
        }
        this._deviceItems = null;
    }
});
