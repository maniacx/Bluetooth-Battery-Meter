'use strict';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import {getBluezDeviceProxy} from './bluezDeviceProxy.js';
import {ProfileManager} from './devices/profileManager.js';
import {AirpodsDevice, isAirpods, DeviceTypeAirpods} from './devices/airpods/airpodsDevice.js';
import {
    SonyDevice, isSonyV1, isSonyV2, DeviceTypeSonyV1, DeviceTypeSonyV2
} from './devices/sony/sonyDevice.js';
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
        this._profileManager = new ProfileManager();
        this._createDesktopIconFiles();
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
            const uuids = bluezDeviceProxy.UUIDs;

            /* ----- Add device variant here _______ */
            const deviceModes = [
                {
                    enabled: this._toggle.airpodsEnabled,
                    check: isAirpods,
                    type: DeviceTypeAirpods,
                },
                {
                    enabled: this._toggle.sonyEnabled,
                    check: isSonyV1,
                    type: DeviceTypeSonyV1,
                },
                {
                    enabled: this._toggle.sonyEnabled,
                    check: isSonyV2,
                    type: DeviceTypeSonyV2,
                },
                {
                    enabled: this._toggle.gattBasEnabled,
                    check: isGattBas,
                    type: DeviceTypeGattBas,
                },
            ];
            /* ------------------------------------- */
            for (const mode of deviceModes) {
                if (!mode.enabled)
                    continue;

                const {supported, bluezProps} = mode.check(bluezDeviceProxy, uuids);

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
                if (deviceProps.type === DeviceTypeAirpods) {
                    deviceProps.enhancedDevice =
                        new AirpodsDevice(this._settings, path, deviceProps.alias, this._extPath,
                            this._profileManager, this.updateDeviceMapCb.bind(this));
                } else if (deviceProps.type === DeviceTypeSonyV1 ||
                        deviceProps.type === DeviceTypeSonyV2) {
                    deviceProps.enhancedDevice =
                        new SonyDevice(this._settings, path, deviceProps.alias,  this._extPath,
                            this._profileManager, this.updateDeviceMapCb.bind(this));
                } else if (deviceProps.type === DeviceTypeGattBas) {
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

    _ensureFileCopied(sourcePath, targetPath) {
        const source = Gio.File.new_for_path(sourcePath);
        const target = Gio.File.new_for_path(targetPath);

        try {
            if (target.query_exists(null)) {
                const fileType =
                    target.query_file_type(Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
                if (fileType === Gio.FileType.SYMBOLIC_LINK) {
                    // Removing previously installed symlink
                    target.delete(null);
                } else {
                    return;
                }
            }

            source.copy(target, Gio.FileCopyFlags.NONE, null, null);
        } catch {
            // Do nothing
        }
    }

    _createDesktopIconFiles() {
        const homeDir = GLib.get_home_dir();
        const appDir = `${homeDir}/.local/share/applications`;
        const iconDir = `${homeDir}/.local/share/icons`;
        const sourceDesktopFile = `${this._extPath}/script/moreSettings.desktop`;
        const targetDesktopFile =
            `${appDir}/com.github.maniacx.Bluetooth-Battery-Meter-More-Settings.desktop`;

        const sourceIconFile = `${this._extPath}/icons/hicolor/scalable/actions/bbm-logo.svg`;
        const targetIconFile = `${iconDir}/bluetooth-battery-meter-maniacx-github-logo.svg`;
        GLib.mkdir_with_parents(appDir, 0o755);
        GLib.mkdir_with_parents(iconDir, 0o755);
        this._ensureFileCopied(sourceDesktopFile, targetDesktopFile);
        this._ensureFileCopied(sourceIconFile, targetIconFile);
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
    }
});
