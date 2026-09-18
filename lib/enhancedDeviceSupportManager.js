'use strict';
import GObject from 'gi://GObject';

import {getBluezDeviceProxy} from './bluezDeviceProxy.js';
import {DbusClient} from './dbusClient.js';
import {isBudsLink, DeviceTypeBudsLink} from './devices/budslink/companionDevices.js';
import {GattBasDevices, isGattBas, DeviceTypeGattBas} from './devices/gattBas/gattBasDevices.js';

export const EnhancedDeviceSupportManager = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_EnhancedDeviceSupportManager',
}, class EnhancedDeviceSupportManager extends GObject.Object {
    _init(toggle) {
        super._init();
        this._toggle = toggle;
        this._settings = toggle.settings;
        this._extPath = toggle.extPath;
        this._deviceMap = new Map();
        this._companionMap = new Map();
    }

    updateDeviceMapCb(path, dataHandler, alias = null) {
        if (this._deviceMap.has(path)) {
            const deviceProps = this._deviceMap.get(path);
            deviceProps.dataHandler = dataHandler;
            if (alias)
                deviceProps.alias = alias;
            this._deviceMap.set(path, deviceProps);
            this._toggle.sync();
        }
    }

    onDeviceSync(path, connected, icon, alias) {
        let deviceProps = this._deviceMap.get(path);
        const compdev = this._companionMap.get(path);
        if (!deviceProps) {
            deviceProps = {
                type: compdev ? compdev.DeviceTypeBudsLink : null,
                connected,
                dataHandler: compdev ? compdev.dataHandler : null,
                deviceIcon: icon,
                enhancedDevice: null,
                alias: compdev ? compdev.dataHandler : alias,
            };
            this._deviceMap.set(path, deviceProps);
        } else {
            if (deviceProps.connected && !connected)
                this._destroyEnhancedDevice(path);

            deviceProps.connected = connected;
        }

        const bluezDeviceProxy = getBluezDeviceProxy(path);
        const uuids = bluezDeviceProxy.UUIDs ?? [];
        const modalias = bluezDeviceProxy.Modalias ?? '';

        const deviceModes = [
            {
                enabled: this._toggle.companionEnabled && this._toggle.isBudsLinkInstalled,
                check: isBudsLink,
                type: DeviceTypeBudsLink,
            },
            {
                enabled: this._toggle.gattBasEnabled,
                check: isGattBas,
                type: DeviceTypeGattBas,
            },
        ];

        for (const mode of deviceModes) {
            if (!mode.enabled)
                continue;

            const supported = mode.check(uuids, modalias);

            if (supported) {
                deviceProps.type = mode.type;
                break;
            }
        }

        return deviceProps;
    }

    updateEnhancedDevicesInstance() {
        for (const [path, deviceProps] of this._deviceMap.entries()) {
            if (deviceProps.type && deviceProps.connected && !deviceProps.enhancedDevice) {
                if (deviceProps.type === DeviceTypeBudsLink) {
                    if (!this._dbusClient)
                        this._initializeDbus();
                } else if (deviceProps.type === DeviceTypeGattBas) {
                    deviceProps.enhancedDevice =
                        new GattBasDevices(this._settings, path, deviceProps.deviceIcon,
                            this.updateDeviceMapCb.bind(this));
                }
            } else if (!deviceProps.connected && deviceProps.enhancedDevice) {
                this._destroyEnhancedDevice(path);
            }
        }

        let hasConnectedBudsLinkDevice = false;

        for (const deviceProps of this._deviceMap.values()) {
            if (deviceProps.type === DeviceTypeBudsLink && deviceProps.connected) {
                hasConnectedBudsLinkDevice = true;
                break;
            }
        }

        if (this._dbusClient) {
            if (hasConnectedBudsLinkDevice && !this._dbusServiceHeld) {
                this._dbusClient.holdService();
                this._dbusServiceHeld = true;
            } else if (!hasConnectedBudsLinkDevice && this._dbusServiceHeld) {
                this._dbusClient.releaseService();
                this._dbusServiceHeld = false;
            }
        }
    }

    _convertBudsLinkPathToBluezPath(path) {
        return path.replace('/io/github/maniacx/BudsLink/Devices/', '/org/bluez/');
    }

    _initializeDbus() {
        this._dbusClient = new DbusClient();

        this._deviceAddedId = this._dbusClient.connect('device-added', (_, path, device) => {
            const bluezPath = this._convertBudsLinkPathToBluezPath(path);
            this._companionMap.set(bluezPath, device);
            this.updateDeviceMapCb(bluezPath, device.dataHandler, device.alias);
        });

        this._deviceRemovedId = this._dbusClient.connect('device-removed', (_, path) => {
            const bluezPath = this._convertBudsLinkPathToBluezPath(path);
            this._companionMap.delete(bluezPath);
            this._destroyEnhancedDevice(bluezPath);
        });

        this._serviceVanishedId = this._dbusClient.connect('service-vanished', () => {
            this._clearCompanionDevices();
        });
    }

    _clearCompanionDevices() {
        for (const [path, deviceProps] of this._deviceMap) {
            if (this._companionMap.has(path)) {
                deviceProps.type = DeviceTypeBudsLink;
                deviceProps.dataHandler = null;
                this._deviceMap.set(path, deviceProps);
            }
        }

        this._companionMap.clear();
        this._toggle.sync();
    }

    _destroyDbusClient() {
        if (this._dbusClient) {
            this._dbusClient.releaseService();
            if (this._deviceAddedId) {
                this._dbusClient.disconnect(this._deviceAddedId);
                this._deviceAddedId = null;
            }

            if (this._deviceRemovedId) {
                this._dbusClient.disconnect(this._deviceRemovedId);
                this._deviceRemovedId = null;
            }

            if (this._serviceVanishedId) {
                this._dbusClient.disconnect(this._serviceVanishedId);
                this._serviceVanishedId = null;
            }
            this._clearCompanionDevices();
            this._dbusClient?.destroy();
            this._dbusClient = null;
        }
    }

    _destroyEnhancedDevice(path) {
        if (!this._deviceMap.has(path))
            return;

        const deviceProps = this._deviceMap.get(path);
        deviceProps.dataHandler = null;
        deviceProps.enhancedDevice?.destroy();
        deviceProps.enhancedDevice = null;
        this._toggle.sync();
    }

    _removedEnhancedDevice(path) {
        if (!this._deviceMap.has(path))
            return;

        this._destroyEnhancedDevice(path);
        this._deviceMap.delete(path);
    }

    destroy() {
        this._destroyDbusClient();

        const paths = Array.from(this._deviceMap.keys());
        for (const path of paths)
            this._removedEnhancedDevice(path);
    }
});
