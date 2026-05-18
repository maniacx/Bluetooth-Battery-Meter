'use strict';

import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import {createLogger} from '../logger.js';
import {buds2to1BatteryLevel, validateProperties, launchConfigureWindow} from '../deviceUtils.js';
import {createConfig, createProperties, DataHandler} from '../../dataHandler.js';
import {PixelBudsSocket} from './pixelBudsSocket.js';
import {PixelBudsModelList, DeviceTypePixelBuds, PixelBudsUUID, ANCMode} from './pixelBudsConfig.js';

export const DeviceTypePixelBudsStr = 'pixelBuds';

export function isPixelBuds(bluezDeviceProxy, uuids) {
    const bluezProps = [];
    const supported = uuids.includes(PixelBudsUUID) ? 'yes' : 'no';
    return {supported, bluezProps};
}

export const PixelBudsDevice = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_PixelBudsDevice',
}, class PixelBudsDevice extends GObject.Object {
    _init(settings, devicePath, alias, extPath, profileManager, updateDeviceMapCb, initialCaseLevel = 0, initialCaseStatus = 'disconnected', updateCaseBatteryCb = null) {
        super._init();
        const identifier = devicePath.slice(-2);
        const tag = `PixelBudsDevice-${identifier}`;
        this._log = createLogger(tag);
        this._log.info('------------------- PixelBudsDevice init -------------------');
        this._settings = settings;
        this._devicePath = devicePath;
        this._alias = alias;
        this._extPath = extPath;
        this.updateDeviceMapCb = updateDeviceMapCb;
        this._updateCaseBatteryCb = updateCaseBatteryCb;

        this._config = createConfig();
        this._props = createProperties();

        this._callbacks = {
            updateBatteryProps: this.updateBatteryProps.bind(this),
            updateNoiseControl: this.updateNoiseControl.bind(this),
            initialCaseLevel,
            initialCaseStatus,
            saveCaseBattery: (level, status) => {
                this._updateCaseBatteryCb?.(this._devicePath, level, status);
            }
        };

        const profile = {type: DeviceTypePixelBuds, uuid: PixelBudsUUID};

        this._pixelBudsSocket = new PixelBudsSocket(
            this._devicePath,
            profileManager,
            profile,
            this._callbacks
        );

        // Immediately initialize mock-up model structure for Pixel Buds Pro
        this.modelIntialized(PixelBudsModelList[0]);
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

        const devicesList = this._settings.get_strv('pixel-buds-list').map(JSON.parse);

        if (devicesList.length === 0 ||
                !devicesList.some(device => device.path === this._devicePath)) {
            this._addPropsToSettings(devicesList);
        } else {
            validateProperties(this._settings, 'pixel-buds-list', devicesList,
                this._defaultsDeviceSettings, this._devicePath);
        }

        this._updateInitialValues();
        this._monitorPixelBudsListGsettings(true);
        this._updateIcons();
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
        this._settings.set_strv('pixel-buds-list', devicesList.map(JSON.stringify));
    }

    _updateInitialValues() {
        const devicesList = this._settings.get_strv('pixel-buds-list').map(JSON.parse);
        const existingPathIndex = devicesList.findIndex(item => item.path === this._devicePath);
        if (existingPathIndex === -1)
            return;

        this._settingsItems = devicesList[existingPathIndex];
        this._commonIcon = this._settingsItems['icon'];

        if (this._modelData.batteryCase)
            this._caseIcon = this._settingsItems['case'];
    }

    _updateGsettingsProps() {
        const devicesList = this._settings.get_strv('pixel-buds-list').map(JSON.parse);
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

    _monitorPixelBudsListGsettings(monitor) {
        if (monitor) {
            this._settings?.connectObject('changed::pixel-buds-list', () =>
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
        this._config.toggle1Title = _('Noise Control');

        // GFPS 3 ANC states: Adaptive, Transparency, Noise Cancellation
        this._config.toggle1Button1Icon = 'bbm-adaptive-symbolic.svg';
        this._config.toggle1Button1Name = _('Adaptive');

        this._config.toggle1Button2Icon = 'bbm-transperancy-symbolic.svg';
        this._config.toggle1Button2Name = _('Transparency');

        this._config.toggle1Button3Icon = 'bbm-anc-on-symbolic.svg';
        this._config.toggle1Button3Name = _('Noise Cancellation');

        this._ancToggleMap = {
            1: ANCMode.ADAPTIVE,
            2: ANCMode.TRANSPARENCY,
            3: ANCMode.ANC_ON
        };
    }

    _startConfiguration() {
        this._props.toggle1Visible = true;
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
        let toggleIndex = 0;
        if (mode === ANCMode.ADAPTIVE || mode === ANCMode.OFF) toggleIndex = 1;
        else if (mode === ANCMode.TRANSPARENCY) toggleIndex = 2;
        else if (mode === ANCMode.ANC_ON) toggleIndex = 3;

        this._props.toggle1State = toggleIndex;
        this.dataHandler?.setProps(this._props);
    }

    _toggle1ButtonClicked(index) {
        const byte = this._ancToggleMap[index];
        if (byte !== undefined) {
            this._pixelBudsSocket.sendAncState(byte);
        }
    }

    _settingsButtonClicked() {
        launchConfigureWindow(this._devicePath, 'pixelBuds', this._extPath, null);
    }

    destroy() {
        this._monitorPixelBudsListGsettings(false);
        this.dataHandler?.disconnectObject(this);
        this._pixelBudsSocket?.destroy();
        this._pixelBudsSocket = null;
    }
});
