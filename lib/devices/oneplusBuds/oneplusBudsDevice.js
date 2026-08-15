'use strict';
import GObject from 'gi://GObject';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import {createConfig, createProperties, DataHandler} from '../../dataHandler.js';
import {buds2to1BatteryLevel, validateProperties} from '../deviceUtils.js';
import {createLogger, getDeviceIdentifier} from '../logger.js';
import {
    ANC_MODES, DeviceTypeOnePlusBuds, isOnePlusBuds, OnePlusBudsProfile,
} from './oneplusBudsConfig.js';
import {OnePlusBatteryState} from './oneplusBudsProtocol.js';
import {OnePlusBudsSocket} from './oneplusBudsSocket.js';

export const OnePlusBudsDevice = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_OnePlusBudsDevice',
}, class OnePlusBudsDevice extends GObject.Object {
    _init(settings, devicePath, alias, _extPath, profileManager, updateDeviceMapCb) {
        super._init();
        this._devicePath = devicePath;
        this._settings = settings;
        this._updateDeviceMapCb = updateDeviceMapCb;
        this._log = createLogger(`OnePlusBudsDevice-${getDeviceIdentifier(devicePath)}`);
        this._config = createConfig();
        this._config.commonIcon = 'earbuds-stem';
        this._config.albumArtIcon = 'earbuds-stem';
        this._config.battery1Icon = 'earbuds-stem-left';
        this._config.battery2Icon = 'earbuds-stem-right';
        this._config.battery3Icon = 'case-oval';
        this._config.battery1ShowOnDisconnect = true;
        this._config.battery2ShowOnDisconnect = true;
        this._config.toggle1Title = _('Noise Control');
        this._config.toggle1Button1Icon = 'bbm-anc-off-symbolic.svg';
        this._config.toggle1Button1Name = _('Off');
        this._config.toggle1Button2Icon = 'bbm-anc-on-symbolic.svg';
        this._config.toggle1Button2Name = _('Noise Cancellation');
        this._config.toggle1Button3Icon = 'bbm-transperancy-symbolic.svg';
        this._config.toggle1Button3Name = _('Transparency');
        this._config.optionsBox1 = ['radio-button'];
        this._config.box1RadioTitle = _('Noise Cancellation Level');
        this._config.box1RadioButton = [_('High'), _('Medium'), _('Low'), _('Auto')];
        this._props = createProperties();
        this._props.toggle1Visible = true;
        this._state = new OnePlusBatteryState();
        this._saveDeviceSettings(alias);
        this._settingsItem = this._getSettingsItem();
        this._noiseMode = this._settingsItem?.['noise-mode'];
        this._socket = new OnePlusBudsSocket(devicePath, profileManager, OnePlusBudsProfile, {
            battery: this._updateBattery.bind(this),
            anc: this._updateAnc.bind(this),
            ancError: this._onAncError.bind(this),
        });
        this._socket.startSocket();
        this._settingsHandlerId = this._settings.connect('changed::oneplus-buds-list', () =>
            this._updateSettings());
        this._log.info(`Initialized confirmed OnePlus profile for ${alias}`);
    }

    _saveDeviceSettings(alias) {
        const defaults = {
            path: this._devicePath,
            alias,
            icon: 'earbuds-stem',
            case: 'case-oval',
            profile: 'oneplus-buds-pro-3',
        };
        const devices = this._settings.get_strv('oneplus-buds-list').map(JSON.parse);
        if (devices.some(device => device.path === this._devicePath)) {
            validateProperties(this._settings, 'oneplus-buds-list', devices, defaults,
                this._devicePath, ['noise-mode']);
            return;
        }
        devices.push(defaults);
        this._settings.set_strv('oneplus-buds-list', devices.map(JSON.stringify));
    }

    _getSettingsItem() {
        return this._settings.get_strv('oneplus-buds-list').map(JSON.parse)
            .find(item => item.path === this._devicePath);
    }

    _updateSettings() {
        const item = this._getSettingsItem();
        if (!item)
            return;

        if (item.icon !== this._settingsItem?.icon || item.case !== this._settingsItem?.case) {
            this._config.commonIcon = item.icon;
            this._config.albumArtIcon = item.icon;
            this._config.battery1Icon = `${item.icon}-left`;
            this._config.battery2Icon = `${item.icon}-right`;
            this._config.battery3Icon = item.case;
            this._dataHandler?.setConfig(this._config);
        }

        const noiseMode = item['noise-mode'];
        this._settingsItem = item;
        if (noiseMode === this._noiseMode || !ANC_MODES.some(mode => mode.index === noiseMode))
            return;

        this._noiseMode = noiseMode;
        this._socket.setNoiseMode(noiseMode);
    }

    _updateBattery(events) {
        const update = this._state.apply(events);
        this._props = {...this._props, ...update};
        this._props.computedBatteryLevel = buds2to1BatteryLevel(this._props);
        if (!this._dataHandler && Object.values(this._state.components).some(c => c.level !== null)) {
            this._dataHandler = new DataHandler(this._config, this._props);
            this._updateDeviceMapCb(this._devicePath, this._dataHandler);
            this._dataHandlerId = this._dataHandler.connect('ui-action', (_object, action, value) => {
                this._onUiAction(action, value);
            });
        }
        this._dataHandler?.setProps(this._props);
    }

    _onUiAction(action, value) {
        let mode = null;
        if (action === 'toggle1State') {
            if (value === 1)
                mode = 3;
            else if (value === 2)
                mode = this._props.box1RadioButtonState ?
                    [4, 5, 6, 7][this._props.box1RadioButtonState - 1] : 5;
            else if (value === 3)
                mode = 8;
        } else if (action === 'box1RadioButtonState') {
            mode = [4, 5, 6, 7][value - 1] ?? null;
        }
        if (mode === null || !ANC_MODES.some(item => item.index === mode))
            return;
        this._socket.setNoiseMode(mode);
    }

    _updateAnc(protocolIndex) {
        const toggleByMode = {3: 1, 4: 2, 5: 2, 6: 2, 7: 2, 8: 3};
        const radioByMode = {4: 1, 5: 2, 6: 3, 7: 4};
        const toggle = toggleByMode[protocolIndex];
        if (!toggle)
            return;
        this._props.toggle1State = toggle;
        this._props.optionsBoxVisible = toggle === 2 ? 1 : 0;
        if (radioByMode[protocolIndex])
            this._props.box1RadioButtonState = radioByMode[protocolIndex];
        this._saveNoiseMode(protocolIndex);
        this._dataHandler?.setProps(this._props);
    }

    _saveNoiseMode(protocolIndex) {
        const items = this._settings.get_strv('oneplus-buds-list').map(JSON.parse);
        const index = items.findIndex(item => item.path === this._devicePath);
        if (index === -1 || items[index]['noise-mode'] === protocolIndex)
            return;
        // The device response is authoritative for both preferences and Quick Settings.
        items[index]['noise-mode'] = protocolIndex;
        this._settings.set_strv('oneplus-buds-list', items.map(JSON.stringify));
    }

    _onAncError(reason) {
        this._log.info(`OnePlus ANC transaction failed: ${reason}`);
    }

    destroy() {
        if (this._settingsHandlerId)
            this._settings?.disconnect(this._settingsHandlerId);
        this._settingsHandlerId = null;
        this._socket?.destroy();
        this._socket = null;
        if (this._dataHandlerId)
            this._dataHandler?.disconnect(this._dataHandlerId);
        this._dataHandlerId = null;
        this._dataHandler = null;
        this._settingsItem = null;
        this._settings = null;
    }
});

export {DeviceTypeOnePlusBuds, isOnePlusBuds};
