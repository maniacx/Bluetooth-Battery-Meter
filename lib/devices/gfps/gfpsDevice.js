'use strict';

import GObject from 'gi://GObject';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import {createLogger} from '../logger.js';
import {getBluezDeviceProxy} from '../../bluezDeviceProxy.js';
import {buds2to1BatteryLevel, validateProperties, launchConfigureWindow} from '../deviceUtils.js';
import {createConfig, createProperties, DataHandler} from '../../dataHandler.js';
import {GfpsSocket} from './gfpsSocket.js';
import {GfpsModelList, DeviceTypeGfps, GfpsUUID, ANCMode} from './gfpsConfig.js';

export const DeviceTypeGfpsStr = 'gfps';

export function isGfps(bluezDeviceProxy, uuids) {
    const bluezProps = [];
    // Bypass true Google Pixel Buds so that GoogleBudsDevice (libmaestro) handles them
    if (uuids.includes('25e97ff7-24ce-4c4c-8951-f764a708f7b5'))
        return {supported: 'no', bluezProps};
    const supported = uuids.includes(GfpsUUID) ? 'yes' : 'no';
    return {supported, bluezProps};
}

export const GfpsDevice = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_GfpsDevice',
}, class GfpsDevice extends GObject.Object {
    _init(settings, devicePath, alias, extPath, profileManager, updateDeviceMapCb) {
        super._init();
        const identifier = devicePath.slice(-2);
        const tag = `GfpsDevice-${identifier}`;
        this._log = createLogger(tag);
        this._log.info('------------------- GfpsDevice init -------------------');
        this._settings = settings;
        this._devicePath = devicePath;
        this._alias = alias;
        this._extPath = extPath;
        this.updateDeviceMapCb = updateDeviceMapCb;
        this._updateCaseBatteryCb = updateCaseBatteryCb;

        this._config = createConfig();
        this._props = createProperties();

        // Resolve model dynamically based on Name/Alias
        const bluezDeviceProxy = getBluezDeviceProxy(this._devicePath);
        const name = bluezDeviceProxy?.Name || this._alias || '';

        const modelData = GfpsModelList.find(model =>
            model.pattern && model.pattern.test(name)
        ) || GfpsModelList[GfpsModelList.length - 1]; // Fallback to last item (Generic GFPS)

        this._modelData = modelData;

        this._callbacks = {
            updateBatteryProps: this.updateBatteryProps.bind(this),
            updateNoiseControl: this.updateNoiseControl.bind(this),
            initialCaseLevel,
            initialCaseStatus,
            supportsAnc: this._modelData.supportsAnc,
            saveCaseBattery: (level, status) => {
                this._updateCaseBatteryCb?.(this._devicePath, level, status);
            },
        };

        const profile = {type: DeviceTypeGfps, uuid: GfpsUUID};

        this._gfpsSocket = new GfpsSocket(
            this._devicePath,
            profileManager,
            profile,
            this._callbacks
        );

        this.modelIntialized(this._modelData);
    }

    modelIntialized(modelData) {
        this._modelData = modelData;
        this._log.info(`Configuration: ${JSON.stringify(this._modelData, null, 2)}`);

        this._commonIcon = this._modelData.budsIcon;
        this._config.battery1ShowOnDisconnect = true;
        this._config.showSettingsButton = true;

        if (this._modelData.batteryCase)
            this._caseIcon = `${this._modelData.case}`;

        this._createDefaultSettings();

        const devicesList = this._settings.get_strv('gfps-list').map(JSON.parse);

        if (devicesList.length === 0 ||
                !devicesList.some(device => device.path === this._devicePath)) {
            this._addPropsToSettings(devicesList);
        } else {
            validateProperties(this._settings, 'gfps-list', devicesList,
                this._defaultsDeviceSettings, this._devicePath);
        }

        this._updateInitialValues();
        this._monitorGfpsListGsettings(true);
        this._updateIcons();
        if (this._modelData.supportsAnc)
            this._updateAncConfig();
        this._startConfiguration();
    }

    _createDefaultSettings() {
        this._defaultsDeviceSettings = {
            path: this._devicePath,
            modelid: this._modelData.modelId,
            alias: this._alias,
            icon: this._commonIcon,
            'fw-version': '',
            ...this._modelData.batteryCase && {
                'case': this._caseIcon,
            },
        };
    }

    _addPropsToSettings(devicesList) {
        devicesList.push(this._defaultsDeviceSettings);
        this._settings.set_strv('gfps-list', devicesList.map(JSON.stringify));
    }

    _updateInitialValues() {
        const devicesList = this._settings.get_strv('gfps-list').map(JSON.parse);
        const existingPathIndex = devicesList.findIndex(item => item.path === this._devicePath);
        if (existingPathIndex === -1)
            return;

        this._settingsItems = devicesList[existingPathIndex];
        this._commonIcon = this._settingsItems['icon'];

        if (this._modelData.batteryCase)
            this._caseIcon = this._settingsItems['case'];
    }

    _updateGsettingsProps() {
        const devicesList = this._settings.get_strv('gfps-list').map(JSON.parse);
        const existingPathIndex = devicesList.findIndex(item => item.path === this._devicePath);
        if (existingPathIndex === -1)
            return;

        this._settingsItems = devicesList[existingPathIndex];

        const icon = this._settingsItems['icon'];
        if (this._commonIcon !== icon) {
            this._commonIcon = icon;
            this._updateIcons();
        }

        if (this._modelData.batteryCase) {
            const caseIcon = this._settingsItems['case'];
            if (this._caseIcon !== caseIcon) {
                this._caseIcon = caseIcon;
                this._updateIcons();
            }
        }
    }

    _monitorGfpsListGsettings(monitor) {
        if (monitor) {
            this._settings?.connectObject('changed::gfps-list', () =>
                this._updateGsettingsProps(), this);
        } else {
            this._settings?.disconnectObject(this);
        }
    }

    _updateIcons() {
        this._config.commonIcon = this._commonIcon;
        this._config.albumArtIcon = this._commonIcon;

        this._config.battery1ShowOnDisconnect = true;
        this._config.battery1Icon = `${this._commonIcon}-left`;
        this._config.battery2Icon = `${this._commonIcon}-right`;
        this._config.battery2ShowOnDisconnect = true;
        this._config.battery3Icon = this._caseIcon;
        this._config.battery3ShowOnDisconnect = true;

        this.dataHandler?.setConfig(this._config);
    }

    _updateAncConfig() {
        if (!this._modelData.supportsAnc)
            return;

        this._config.toggle1Title = _('Noise Control');

        // Button 1: Off
        this._config.toggle1Button1Icon = 'bbm-anc-off-symbolic.svg';
        this._config.toggle1Button1Name = _('Off');

        // Button 2: Transparency
        this._config.toggle1Button2Icon = 'bbm-transperancy-symbolic.svg';
        this._config.toggle1Button2Name = _('Transparency');

        // Button 3: Adaptive
        this._config.toggle1Button3Icon = 'bbm-adaptive-symbolic.svg';
        this._config.toggle1Button3Name = _('Adaptive');

        // Button 4: Noise Cancellation
        this._config.toggle1Button4Icon = 'bbm-anc-on-symbolic.svg';
        this._config.toggle1Button4Name = _('Noise Cancellation');

        this._ancToggleMap = {
            1: ANCMode.OFF,
            2: ANCMode.TRANSPARENCY,
            3: ANCMode.ADAPTIVE,
            4: ANCMode.ANC_ON,
        };
    }

    _startConfiguration() {
        this._props.toggle1Visible = !!this._modelData.supportsAnc;
        this.dataHandler = new DataHandler(this._config, this._props);
        this.updateDeviceMapCb(this._devicePath, this.dataHandler);

        this.dataHandler.connectObject(
            'ui-action', (o, command, value) => {
                if (command === 'toggle1State')
                    this._toggle1ButtonClicked(value);

                if (command === 'settingsButtonClicked')
                    this._settingsButtonClicked();
            },
            this
        );
    }

    updateBatteryProps(props) {
        this._props = {...this._props, ...props};
        this._props.computedBatteryLevel = buds2to1BatteryLevel(props);
        this.dataHandler?.setProps(this._props);
    }

    updateNoiseControl(mode) {
        if (!this._modelData.supportsAnc)
            return;

        let toggleIndex = 0;
        if (mode === ANCMode.OFF)
            toggleIndex = 1;
        else if (mode === ANCMode.TRANSPARENCY)
            toggleIndex = 2;
        else if (mode === ANCMode.ADAPTIVE)
            toggleIndex = 3;
        else if (mode === ANCMode.ANC_ON)
            toggleIndex = 4;

        this._props.toggle1State = toggleIndex;
        this.dataHandler?.setProps(this._props);
    }

    _toggle1ButtonClicked(index) {
        const byte = this._ancToggleMap[index];
        if (byte !== undefined)
            this._gfpsSocket.sendAncState(byte);
    }

    _settingsButtonClicked() {
        launchConfigureWindow(this._devicePath, 'gfps', this._extPath, null);
    }

    destroy() {
        this._monitorGfpsListGsettings(false);
        this.dataHandler?.disconnectObject(this);
        this._gfpsSocket?.destroy();
        this._gfpsSocket = null;
    }
});
