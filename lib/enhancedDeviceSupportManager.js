'use strict';
import GObject from 'gi://GObject';

import {getBluezDeviceProxy} from './bluezDeviceProxy.js';
import {ProfileManager} from './devices/profileManager.js';
import {AirpodsDevice, AirpodsUUID} from './devices/airpods/airpodsDevice.js';
import {GattBasDevices, GattBasUUID} from './devices/gattBas/gattBasDevices.js';

export const EnhancedDeviceSupportManager = GObject.registerClass({
}, class EnhancedDeviceSupportManager extends GObject.Object {
    _init(toggle) {
        super._init();
        this._toggle = toggle;
        this._settings = toggle._settings;
        this._deviceMap = new Map();
        this._profileManager = new ProfileManager();
    }

    updateDeviceMapCb(path, dataHandler) {
        if (this._deviceMap.has(path)) {
            const deviceProps = this._deviceMap.get(path);
            deviceProps.dataHandler = dataHandler;
            this._deviceMap.set(path, deviceProps);
            this._toggle.sync();
        }
    }

    onDeviceSync(path, connected, icon, enhancedDeviceConfigChanged) {
        let deviceProps = {
            type: null, connected, dataHandler: null, enhancedDevice: null, deviceIcon: icon,
        };

        if (this._deviceMap.has(path) && !enhancedDeviceConfigChanged) {
            deviceProps = this._deviceMap.get(path);
            if (deviceProps.connected && !connected)
                this._removedEnhancedDevice(path);

            deviceProps.connected = connected;
        } else {
            const bluezDeviceProxy = getBluezDeviceProxy(path);
            const UUIDs = bluezDeviceProxy.UUIDs;

            /* ----- Add device variant here _______ */
            const deviceModes = [
                {
                    enabled: this._toggle.airpodsEnabled,
                    uuid: AirpodsUUID,
                    type: 'airpods',
                },
                {
                    enabled: this._toggle.gattBasEnabled,
                    uuid: GattBasUUID,
                    type: 'gatt-bas',
                },
            ];
            /* ------------------------------------- */
            for (const mode of deviceModes) {
                if (!mode.enabled)
                    continue;

                const isEnhancedDevice = UUIDs.includes(mode.uuid);
                if (isEnhancedDevice) {
                    deviceProps.type = mode.type;
                    break;
                }
            }
        }
        this._deviceMap.set(path, deviceProps);
        return {type: deviceProps.type, dataHandler: deviceProps.dataHandler};
    }


    updateEnhancedDevicesInstance() {
        for (const [path, deviceProps] of this._deviceMap.entries()) {
            if (deviceProps.type && deviceProps.connected && !deviceProps.enhancedDevice) {
                /* ----- Add device variant here _______ */
                if (deviceProps.type === 'airpods') {
                    deviceProps.enhancedDevice =
                        new AirpodsDevice(this._settings, path,
                            this.updateDeviceMapCb.bind(this), this._profileManager);
                } else if (deviceProps.type === 'gatt-bas') {
                    deviceProps.enhancedDevice =
                        new GattBasDevices(this._settings, path, deviceProps.deviceIcon,
                            this.updateDeviceMapCb.bind(this));
                }
                /* ------------------------------------- */
            } else if (!deviceProps.connected && deviceProps.enhancedDevice) {
                deviceProps.enhancedDevice?.destroy();
                deviceProps.enhancedDevice = null;
            }
        }
    }

    _removedEnhancedDevice(path) {
        if (this._deviceMap.has(path)) {
            this._profileManager.deleteFD(path);

            const deviceProps = this._deviceMap.get(path);
            deviceProps.dataHandler = null;
            deviceProps?.enhancedDevice?.destroy();
            deviceProps.enhancedDevice = null;
            const deviceType = deviceProps.type;

            this._deviceMap.delete(path);

            let lastDeviceType = true;
            for (const props of this._deviceMap.values()) {
                if (props.type === deviceType) {
                    lastDeviceType = false;
                    break;
                }
            }
            if (lastDeviceType)
                this._profileManager.unregisterProfile(deviceType);
        }
    }

    destroy() {
        const paths = Array.from(this._deviceMap.keys());
        for (const path of paths)
            this._removedEnhancedDevice(path);

        this._profileManager = null;
    }
});
