'use strict';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import * as Helper from './enhancedDeviceSupportHelper.js';
import {Notifier} from './notifier.js';
import {AirpodsDevice} from './airpods/airpodsDevice.js';
import * as AirpodsHelper from './airpods/airpodsHelper.js';
import {GattBasDevices} from './gattBas/gattBasDevices.js';
import * as GattBasHelper from './gattBas/gattBasHelper.js';

const SCRIPTVERSION = 'BBM0.002';

function createConfig() {
    // Assigning batteryIcon/setButtons a name(string) enables it.
    // commonIcon: St.Drawing vector name for indicator widget in indicatorVectorImages
    //             Also for svg icon for panel button.
    //              (`bbm-${config.commonIcon}-symbolic.svg`) in folder
    //             ${extensions directory}/icons/hicolor/scalable/actions
    // battery*Icon: St.Drawing vector name for circular widget  in circularBatteryVectorImages
    // battery*ShowOnDisconnect: false: Hide the circular battery widget when disconnected
    //                           true: Shows the circular battery widget
    //                                  when disconnected with disconnect icon
    // set1Button*Icon: First toggle set, accepts svg icon name located at
    //                  ${extensions directory}/icons/hicolor/scalable/actions
    // set1Button*Icon: Second toggle set, accepts svg icon name located a
    //                  ${extensions directory}/icons/hicolor/scalable/actions
    // panelButtonLabelFixed: Position of bat1/2 label relative to the icon
    //                        true: position bat1 : left, bat2 : right. if bat1/2 = 0 display '...'
    //                        false; if bat2 = 0, bat1 : right. else bat1 : left, bat2: right.

    return {
        commonIcon: null,
        albumArtIcon: null,
        battery1Icon: null,
        battery2Icon: null,
        battery3Icon: null,
        battery1ShowOnDisconnect: false,
        battery2ShowOnDisconnect: false,
        battery3ShowOnDisconnect: false,
        set1Button1Icon: null,
        set1Button2Icon: null,
        set1Button3Icon: null,
        set2Button1Icon: null,
        set2Button2Icon: null,
        set2Button3Icon: null,
        panelButtonLabelFixed: true,
    };
}

function createProperties() {
    // battery*Level: accepted value 0 - 100. displays level on circular widget
    // battery*Status: accepted value : 'charging', 'discharging', 'disconnected'
    // toggle*State: accepted value: 0 - 3
    //               0: no buttons active,
    //               1: button1 is active, other inactive
    //               2: button2 is active, other inactive
    //               3: button3 is active, other inactive
    // toggleVisible: accepted value: 0 - 3
    //               0: Boths toggle-set displayed
    //               1: toggle-set 1 hidden , toggle-set2 displayed
    //               2: toggle-set 1 displayed , toggle-set2 hidden
    //               3: Boths toggle-set hidden
    return {
        battery1Level: 0,
        battery2Level: 0,
        battery3Level: 0,
        battery1Status: 'not-reported',
        battery2Status: 'not-reported',
        battery3Status: 'not-reported',
        toggle1State: 0,
        toggle2State: 0,
        toggleVisible: 0,
    };
}

const ServiceStatus = {
    UNKNOWN: 0,
    RUNNING: 1,
    UNAVAILABLE: 2,
};

export const EnhancedDeviceSupportManager = GObject.registerClass({
}, class EnhancedDeviceSupportManager extends GObject.Object {
    _init(toggle) {
        super._init();
        this._toggle = toggle;
        this._settings = toggle._settings;
        this._deviceMap = new Map();
        this._extensionPath = toggle._extensionPath;
        this._scriptStartupInProgress = false;
        this._scriptResourcesUnavailable = false;
        this._versionDiffCount = 2;
        this._serviceRunning = ServiceStatus.UNKNOWN;
        this._notifier = new Notifier(this._toggle.gIcon, this._toggle._extuuid);
        this._initialize();

        this._toggle._bluetoothToggle._client.connectObject(
            'notify::active', () => {
                this._active = this._toggle._bluetoothToggle._client.active;
                if (!this._active)
                    this._delayedStopDbusServiceScript();
            },
            this
        );
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
            const bluezDeviceProps =
                new Helper.BluezDeviceProxy(Gio.DBus.system, 'org.bluez', path);
            const UUIDs = bluezDeviceProps.UUIDs;
            /* ----- Add device variant here _______ */
            const deviceModes = [
                {
                    enabled: this._toggle.airpodsEnabled,
                    check: AirpodsHelper.checkForAirPods,
                    type: 'airpods',
                },
                {
                    enabled: this._toggle.gattBasEnabled,
                    check: GattBasHelper.checkForGattBasDevices,
                    type: 'gatt-bas',
                },
            ];
            /* ------------------------------------- */
            for (const mode of deviceModes) {
                if (!mode.enabled)
                    continue;

                const isEnhancedDevice = mode.check(UUIDs);
                if (isEnhancedDevice) {
                    deviceProps.type = mode.type;
                    break;
                }
            }
        }
        this._deviceMap.set(path, deviceProps);
        if (connected && deviceProps.type && deviceProps.dataHandler === null)
            this._startDbusServiceScript();

        const returnProps = {...deviceProps};
        delete returnProps.connected;
        delete returnProps.enhancedDevice;
        delete returnProps.deviceIcon;
        return returnProps;
    }

    async updateEnhancedDevicesInstance() {
        for (const [path, deviceProps] of this._deviceMap.entries()) {
            if (this._serviceRunning === ServiceStatus.RUNNING && deviceProps.type !== null &&
                deviceProps.connected && !deviceProps.enhancedDevice) {
                // eslint-disable-next-line no-await-in-loop
                await Helper.addDevice(
                    this._managerProxy, path, deviceProps.type);
                const config = createConfig();
                const props = createProperties();
                /* ----- Add device variant here _______ */
                if (deviceProps.type === 'airpods') {
                    deviceProps.enhancedDevice =
                    new AirpodsDevice(this._settings, path,
                        config, props, this.updateDeviceMapCb.bind(this));
                } else if (deviceProps.type === 'gatt-bas') {
                    deviceProps.enhancedDevice =
                    new GattBasDevices(this._settings, path, deviceProps.deviceIcon,
                        config, props, this.updateDeviceMapCb.bind(this));
                }
                /* ------------------------------------- */
            } else if (!deviceProps.connected && deviceProps.enhancedDevice) {
                deviceProps.enhancedDevice?.destroy();
                deviceProps.enhancedDevice = null;
            }
        }
    }

    _initialize() {
        this._watchId = Helper.watchServiceStatus(
            () => this._serviceAdded(),
            () => this._serviceRemoved()
        );
    }

    _serviceAdded() {
        this._serviceRunning = ServiceStatus.RUNNING;
        this._scriptStartupInProgress = false;
        this._onServiceStatusUpdate();
    }

    _serviceRemoved() {
        this._serviceRunning = ServiceStatus.UNAVAILABLE;
        this._onServiceRemoved();
        this._toggle.sync();
    }

    async _onServiceStatusUpdate() {
        if (!this._managerProxy) {
            this._managerProxy = await Helper.initManagerProxy();
            if (!this._managerProxy)
                return;

            const version = this._managerProxy.get_cached_property('Version').unpack();
            if (version !== SCRIPTVERSION) {
                this._restartScript();
                return;
            }
            this._managerProxy.connectObject(
                'g-signal', (proxy, senderName, signalName, parameters) => {
                    if (signalName === 'DeviceRemoved') {
                        const path = parameters.deep_unpack();
                        this._removedEnhancedDevice(path);
                    }
                },
                this
            );
            this.updateEnhancedDevicesInstance();
        }
    }

    async _restartScript() {
        await this.stopDbusServiceScript();
        await this._wait3sec();
        this._versionDiffCount--;
        if (this._versionDiffCount > 0)
            this._startDbusServiceScript();
        else
            log('Bluetooth-Battery-Meter: Script Version not compatible');
    }

    async _startDbusServiceScript() {
        if (this._serviceRunning !== ServiceStatus.UNAVAILABLE)
            return;

        if (this._scriptResourcesUnavailable)
            return;

        if (this._scriptStartupInProgress)
            return;
        this._scriptStartupInProgress = true;
        if (!Helper.isPythonInstalled()) {
            this._scriptResourcesUnavailable = true;
            this._notifier?.notifyPythonNotInstalled();
            this._scriptStartupInProgress = false;
            return;
        }

        const resourceDir = `${this._extensionPath}/resources`;
        // Run the environment checker script via Gio.Subprocess
        // to detect import or compatibility issues and notify the user.
        const pyCheckPath = `${resourceDir}/pycheck.py`;
        const results = await Helper.isPythonEnvironmentCompatible(pyCheckPath);

        if (results.includes('available')) {
            // Launch the main script, which hosts a D-Bus service and manages its own lifecycle.
            //
            // The script exits automatically when:
            //  * no devices are added/available for 20 seconds
            //  * the extension is disabled and remains off for more than 3 seconds
            //
            // This "fire-and-forget" behavior is intentional. It avoids having to tear down
            // sockets or D-Bus connections during extension state transitioning while rebasing.
            //
            // The only case where the extension actively shuts down the script via D-Bus
            // is when the Bluetooth adapter is turned off.
            const mainScriptPath = `${resourceDir}/bluetooth_battery_meter.py`;
            const command = `python3 ${mainScriptPath}`;
            GLib.spawn_command_line_async(command);
        } else {
            this._scriptResourcesUnavailable = true;
            this._scriptStartupInProgress = false;
            this._notifier?.notifyPythonIssues(results);
        }
    }

    async _delayedStopDbusServiceScript() {
        if (this._serviceRunning === ServiceStatus.RUNNING) {
            await this._wait3sec();
            if (!this._active)
                this.stopDbusServiceScript();
        }
    }

    async stopDbusServiceScript() {
        if (this._managerProxy)
            await Helper.shutdownService(this._managerProxy);
        this._managerProxy?.disconnectObject(this);
        this._managerProxy = null;
    }

    async _wait3sec() {
        if (this._delayTimerId)
            return;

        await new Promise(resolve => {
            this._delayTimerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 3, () => {
                resolve();
                this._delayTimerId = null;
                return GLib.SOURCE_REMOVE;
            });
        });
    }

    _removedEnhancedDevice(path) {
        if (this._deviceMap.has(path)) {
            const deviceProps = this._deviceMap.get(path);
            deviceProps.dataHandler = null;
            deviceProps?.enhancedDevice?.destroy();
            deviceProps.enhancedDevice = null;
        }
    }

    _onServiceRemoved() {
        this._managerProxy?.disconnectObject(this);
        this._managerProxy = null;
        this._deviceMap.forEach(deviceProps => {
            deviceProps.dataHandler = null;
            deviceProps?.enhancedDevice?.destroy();
            deviceProps.enhancedDevice = null;
        });
    }

    destroy() {
        if (this._delayTimerId)
            GLib.source_remove(this._delayTimerId);
        this._delayTimerId = null;
        if (this._watchId)
            Helper.unwatchServiceStatus(this._watchId);
        this._watchId = null;
        this._onServiceRemoved();
        this._notifier?.destroy();
        this._notifier = null;
    }
});
