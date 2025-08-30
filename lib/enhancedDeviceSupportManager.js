'use strict';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import {getBluezDeviceProxy} from './bluezDeviceProxy.js';
import {ProfileManager} from './devices/profileManager.js';
import {AirpodsDevice, isAirpods} from './devices/airpods/airpodsDevice.js';
import {GattBasDevices, isGattBas} from './devices/gattBas/gattBasDevices.js';

export const EnhancedDeviceSupportManager = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_EnhancedDeviceSupportManager',
}, class EnhancedDeviceSupportManager extends GObject.Object {
    _init(toggle) {
        super._init();
        this._toggle = toggle;
        this._settings = toggle.settings;
        this._extPath = toggle.extPath;
        this._deviceMap = new Map();
        this._profileManager = new ProfileManager();
        this._createDesktopIconSymlink();
    }

    updateDeviceMapCb(path, dataHandler) {
        if (this._deviceMap.has(path)) {
            const deviceProps = this._deviceMap.get(path);
            deviceProps.dataHandler = dataHandler;
            this._deviceMap.set(path, deviceProps);
            this._toggle.sync();
        }
    }

    onDeviceSync(path, connected, icon, alias) {
        let deviceProps = {
            type: null, connected, dataHandler: null, deviceIcon: icon,
            enhancedDevice: null, pendingDetection: true, bluezId: null,
            bluezProxy: null, alias,
        };

        if (this._deviceMap.has(path)) {
            deviceProps = this._deviceMap.get(path);
            if (deviceProps.connected && !connected)
                this._removedEnhancedDevice(path);

            deviceProps.connected = connected;
        }

        if (deviceProps.pendingDetection) {
            const bluezDeviceProxy = getBluezDeviceProxy(path);

            /* ----- Add device variant here _______ */
            const deviceModes = [
                {
                    enabled: this._toggle.airpodsEnabled,
                    check: isAirpods,
                    type: 'airpods',
                },
                {
                    enabled: this._toggle.gattBasEnabled,
                    check: isGattBas,
                    type: 'gatt-bas',
                },
            ];
            /* ------------------------------------- */
            for (const mode of deviceModes) {
                if (!mode.enabled)
                    continue;

                const {supported, bluezProps} = mode.check(bluezDeviceProxy);

                if (supported === 'pending') {
                    deviceProps.pendingDetection = true;
                    this._waitForBluezProps(path, bluezDeviceProxy, bluezProps, deviceProps);
                    break;
                }

                if (supported === 'yes') {
                    deviceProps.type = mode.type;
                    deviceProps.pendingDetection = false;
                    break;
                }
                deviceProps.pendingDetection = false;
            }
        }
        this._deviceMap.set(path, deviceProps);
        return {
            type: deviceProps.type, dataHandler: deviceProps.dataHandler,
            pendingDetection: deviceProps.pendingDetection,
        };
    }

    _waitForBluezProps(path, bluezDeviceProxy, bluezProps, deviceProps) {
        const allPropsReady = () => {
            return bluezProps.every(prop => {
                const value = bluezDeviceProxy[prop];
                return value !== null && value !== undefined;
            });
        };

        const onPropsChanged = (_iface, changed, _invalidated) => {
            if (!bluezProps.some(prop => prop in changed))
                return;

            if (allPropsReady()) {
                if (this._deviceMap.has(path)) {
                    const props = this._deviceMap.get(path);
                    props.bluezDeviceProxy.disconnect(deviceProps.bluezId);
                    props.bluezId = null;
                    props.bluezDeviceProxy = null;
                } else {
                    deviceProps.bluezDeviceProxy.disconnect(deviceProps.bluezId);
                    deviceProps.bluezId = null;
                    deviceProps.bluezDeviceProxy = null;
                }
                this._toggle.sync();
            }
        };

        deviceProps.bluezId = bluezDeviceProxy.connect('g-properties-changed', onPropsChanged);
        deviceProps.bluezDeviceProxy = bluezDeviceProxy;
    }


    updateEnhancedDevicesInstance() {
        for (const [path, deviceProps] of this._deviceMap.entries()) {
            if (deviceProps.type && deviceProps.connected && !deviceProps.enhancedDevice) {
                /* ----- Add device variant here _______ */
                if (deviceProps.type === 'airpods') {
                    deviceProps.enhancedDevice =
                        new AirpodsDevice(this._settings, path, deviceProps.alias, this._extPath,
                            this._profileManager, this.updateDeviceMapCb.bind(this));
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

    _removeDesktopIconSymlink() {
        const homeDir = GLib.get_home_dir();
        const targetDesktopFile = `${homeDir}/.local/share/applications/` +
            'com.github.maniacx.Bluetooth-Battery-Meter-More-Settings.desktop';
        const targetIconFile = `${homeDir}/.local/share/icons/` +
            'bluetooth-battery-meter-maniacx-github-logo.svg';

        try {
            Gio.File.new_for_path(targetDesktopFile).delete(null);
            Gio.File.new_for_path(targetIconFile).delete(null);
        } catch {
            // Do nothing
        }
    }

    _createDesktopIconSymlink() {
        const homeDir = GLib.get_home_dir();
        const sourceDesktopFile = `${this._extPath}/script/` +
            'moreSettings.desktop';
        const targetDesktopFile = `${homeDir}/.local/share/applications/` +
            'com.github.maniacx.Bluetooth-Battery-Meter-More-Settings.desktop';
        const sourceIconFile = `${this._extPath}/icons/hicolor/scalable/actions/` +
            'bbm-logo.svg';
        const targetIconFile = `${homeDir}/.local/share/icons/` +
            'bluetooth-battery-meter-maniacx-github-logo.svg';

        this._removeDesktopIconSymlink();

        try {
            Gio.File.new_for_path(targetDesktopFile).make_symbolic_link(sourceDesktopFile, null);
            Gio.File.new_for_path(targetIconFile).make_symbolic_link(sourceIconFile, null);
        } catch {
            // Do nothing
        }
    }


    _removedEnhancedDevice(path) {
        if (this._deviceMap.has(path)) {
            this._profileManager.deleteFD(path);

            const deviceProps = this._deviceMap.get(path);
            if (deviceProps.bluezId && deviceProps.bluezDeviceProxy) {
                deviceProps.bluezDeviceProxy.disconnect(deviceProps.bluezId);
                deviceProps.bluezDeviceProxy = null;
                deviceProps.bluezId = null;
            }
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
        this._removeDesktopIconSymlink();
    }
});
