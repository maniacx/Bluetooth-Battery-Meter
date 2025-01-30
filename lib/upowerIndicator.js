'use strict';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import UPower from 'gi://UPowerGlib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {BluetoothIndicator} from './bluetoothIndicator.js';

const QuickSettingsMenu = Main.panel.statusArea.quickSettings;

const BUS = 'org.freedesktop.UPower';
const U_PATH = '/org/freedesktop/UPower';
const U_IFACE = 'org.freedesktop.UPower';
const U_PROPS = 'org.freedesktop.DBus.Properties';
const UD_IFACE = 'org.freedesktop.UPower.Device';

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

export const UpowerDevice = GObject.registerClass({
    Properties: {
        'battery_percentage': GObject.ParamSpec.int('battery_percentage', '', 'Battery Percentage',
            GObject.ParamFlags.READWRITE, 0, 100, 0),
    },
}, class UpowerDevice extends GObject.Object {
    constructor(upowerClientObj, path) {
        super();
        this._upowerClientObj = upowerClientObj;
        this._path = path;
        this._proxy = new Gio.DBusProxy({
            g_connection: Gio.DBus.system,
            g_flags: Gio.DBusProxyFlags.NONE,
            g_name: BUS,
            g_object_path: path,
            g_interface_name: UD_IFACE,
        });

        this._proxy.init(null);
        this._proxyId = this._proxy.connect('g-properties-changed', () => this._sync());
        this._sync();
    }

    _sync() {
        const isPresent = this._proxy.get_cached_property('IsPresent').unpack();
        const model = this._proxy.get_cached_property('Model').unpack();
        const percentage = this._proxy.get_cached_property('Percentage').unpack();

        if (this.battery_percentage !== percentage)
            this.battery_percentage = percentage;

        let indicatorProp = {};
        let indicatorPropUpdated = false;
        let showIndicator = true;
        if (this._upowerClientObj._deviceList.has(this._path)) {
            indicatorProp = this._upowerClientObj._deviceList.get(this._path);
            if (indicatorProp.isPresent !== isPresent) {
                indicatorProp.isPresent = isPresent;
                indicatorPropUpdated = true;
            }
            if (indicatorProp.model !== model) {
                indicatorProp.model = model;
                indicatorPropUpdated = true;
            }
            showIndicator = indicatorProp.indicatorMode;
        } else {
            const type = this._proxy.get_cached_property('Type').unpack();
            const icon = deviceKindMapping[type] || 'upower-devices';
            indicatorProp = {
                icon,
                model,
                isPresent,
                indicatorMode: true,
            };
            this._upowerClientObj._deviceList.set(this._path, indicatorProp);
            this._upowerClientObj._delayedUpdateDeviceGsettings();
        }

        let indicator;
        if (this._upowerClientObj._deviceIndicators.has(this._path))
            indicator = this._upowerClientObj._deviceIndicators.get(this._path);

        if (isPresent && showIndicator && !indicator) {
            indicator = new BluetoothIndicator(this._upowerClientObj._settings, this, 2, indicatorProp.icon,
                this._upowerClientObj._widgetInfo);
            QuickSettingsMenu.addExternalIndicator(indicator);
            this._upowerClientObj._deviceIndicators.set(this._path, indicator);
        } else if ((!isPresent || !showIndicator) && indicator) {
            indicator?.destory();
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
        this._deviceItems = new Map();
        this._deviceIndicators = new Map();
        this._deviceList = new Map();
        this._pullDevicesFromGsetting();
        this._connectSettingsSignal(true);

        this._dbusProxy = new Gio.DBusProxy({
            g_connection: Gio.DBus.system,
            g_flags: Gio.DBusProxyFlags.NONE,
            g_name: BUS,
            g_object_path: U_PATH,
            g_interface_name: U_IFACE,
        });
        this._dbusProxy.init(null);
        this._enumerateDevicesCancellable = new Gio.Cancellable();
        this._dbusProxy.call('EnumerateDevices', null, Gio.DBusCallFlags.NONE, -1,
            this._enumerateDevicesCancellable, (proxy, result) => {
                try {
                    if (this._enumerateDevicesCancellable === null || this._enumerateDevicesCancellable.is_cancelled())
                        return;
                    const response = proxy.call_finish(result);
                    if (response && response.deep_unpack) {
                        const devices = response.deep_unpack()[0];
                        if (devices || devices.length > 0) {
                            for (const path of devices)
                                this._createDevice(path);
                        }
                        this._connectAddRemoveSignal();
                    }
                } catch (e) {
                    log(`Bluetooth Battery Meter: Could not EnumerateDevices: ${e.message}`);
                }
            });
    }

    _createDevice(path) {
        if (this._deviceItems.has(path)) {
            this._deviceItems.get(path)._sync();
        } else {
            Gio.DBus.system.call(BUS, path, U_PROPS, 'GetAll', new GLib.Variant('(s)', [UD_IFACE]),
                null, Gio.DBusCallFlags.NONE, -1, null, (proxy, result) => {
                    try {
                        const response = proxy.call_finish(result);
                        const [deviceProps] = response.deep_unpack();
                        const isPowerSupply = deviceProps['PowerSupply'].unpack();
                        const nativePath = deviceProps['NativePath'].unpack();
                        if (!isPowerSupply && !nativePath.startsWith('/org/bluez/')) {
                            const device = new UpowerDevice(this, path);
                            this._deviceItems.set(path, device);
                        }
                    } catch (e) {
                        log(`Bluetooth Battery Meter: Could not get properties for ${path}: ${e.message}`);
                    }
                });
        }
    }

    _connectAddRemoveSignal() {
        this._dbusProxyId = this._dbusProxy.connect('g-signal', (proxy, senderName, signalName, parameters) => {
            if (signalName === 'DeviceAdded') {
                const path = parameters.deep_unpack()[0];
                this._createDevice(path);
            } else if (signalName === 'DeviceRemoved') {
                const path = parameters.deep_unpack()[0];
                this._removeDevice(path);
            }
        });
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
                    'isPresent': item['is-present'],
                    'indicatorMode': item['indicator-mode'],
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
                'is-present': indicatorProps.isPresent,
                'indicator-mode': indicatorProps.indicatorMode,
            };
            deviceList.push(JSON.stringify(item));
        }
        this._connectSettingsSignal(false);
        this._settings.set_strv('upower-device-list', deviceList);
        this._connectSettingsSignal(true);
    }

    _addNewDeviceToList(device, deviceIcon) {
        const path = device.get_object_path();
        const indicatorProps = {
            icon: deviceIcon,
            model: device.model,
            isPresent: true,
            indicatorMode: true,
        };
        this._deviceList.set(path, indicatorProps);
        this._pushDevicesToGsetting();
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

    _removeDevice(path) {
        if (this._deviceList.has(path)) {
            const indicatorProps = this._deviceList.get(path);
            indicatorProps.isPresent = false;
            this._deviceList.set(path, indicatorProps);
            this._pushDevicesToGsetting();
        }
        if (this._deviceIndicators.has(path)) {
            this._deviceIndicators.get(path)?.destroy();
            this._deviceIndicators.delete(path);
        }
        if (this._deviceItems.has(path)) {
            this._deviceItems.get(path)?.destroy();
            this._deviceItems.delete(path);
        }
    }

    destroy() {
        if (this._delayedTimerId)
            GLib.source_remove(this._delayedTimerId);
        this._delayedTimerId = null;
        if (this._enumerateDevicesCancellable)
            this._enumerateDevicesCancellable.cancel();
        if (this._dbusProxyId && this._dbusProxy)
            this._dbusProxy.disconnect(this._dbusProxyId);
        this._dbusProxy = null;
        this._connectSettingsSignal(false);
        if (this._deviceIndicators) {
            this._deviceIndicators.forEach(indicator => indicator?.destroy());
            this._deviceIndicators.clear();
        }
        this._deviceIndicators = null;
        if (this._deviceItems) {
            this._deviceItems.forEach(indicator => indicator?.destroy());
            this._deviceItems.clear();
        }
        this._deviceItems = null;
    }
});
