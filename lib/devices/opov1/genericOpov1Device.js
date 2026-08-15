'use strict';
import GObject from 'gi://GObject';

import {createConfig, createProperties, DataHandler} from '../../dataHandler.js';
import {buds2to1BatteryLevel, validateProperties} from '../deviceUtils.js';
import {createLogger, getDeviceIdentifier} from '../logger.js';
import {OnePlusBatteryState} from '../oneplusBuds/oneplusBudsProtocol.js';
import {OnePlusBudsSocket} from '../oneplusBuds/oneplusBudsSocket.js';
import {OPOV1_PROFILE_TYPE, OPOV1_UUID} from '../oneplusBuds/oneplusBudsConfig.js';
import {isGenericOPOv1} from './opov1Detector.js';

export const DeviceTypeGenericOPOv1 = 'genericOpov1';
export {isGenericOPOv1};

export const GenericOPOv1Device = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_GenericOPOv1Device',
}, class GenericOPOv1Device extends GObject.Object {
    _init(settings, devicePath, alias, _extPath, profileManager, updateDeviceMapCb) {
        super._init();
        this._settings = settings;
        this._devicePath = devicePath;
        this._updateDeviceMapCb = updateDeviceMapCb;
        this._log = createLogger(`GenericOPOv1-${getDeviceIdentifier(devicePath)}`);
        this._config = createConfig();
        this._config.commonIcon = 'earbuds-stem';
        this._config.albumArtIcon = 'earbuds-stem';
        this._config.battery1Icon = 'earbuds-stem-left';
        this._config.battery2Icon = 'earbuds-stem-right';
        this._config.battery3Icon = 'case-oval';
        this._config.battery1ShowOnDisconnect = true;
        this._config.battery2ShowOnDisconnect = true;
        this._props = createProperties();
        this._state = new OnePlusBatteryState();
        this._saveDeviceSettings(alias);
        this._settingsItem = this._getSettingsItem();
        this._dataHandler = new DataHandler(this._config, this._props);
        updateDeviceMapCb(devicePath, this._dataHandler);
        this._socket = new OnePlusBudsSocket(devicePath, profileManager, {
            type: OPOV1_PROFILE_TYPE, uuid: OPOV1_UUID,
        }, {
            battery: this._updateBattery.bind(this),
        });
        this._socket.startSocket();
        this._settingsHandlerId = this._settings.connect('changed::oneplus-buds-list', () =>
            this._updateSettings());
        this._log.info(`Generic OPOv1 battery profile initialized for ${alias}`);
    }

    _saveDeviceSettings(alias) {
        const defaults = {
            path: this._devicePath,
            alias,
            icon: 'earbuds-stem',
            case: 'case-oval',
            profile: 'generic-opov1',
        };
        const devices = this._settings.get_strv('oneplus-buds-list').map(JSON.parse);
        if (devices.some(device => device.path === this._devicePath)) {
            validateProperties(this._settings, 'oneplus-buds-list', devices, defaults,
                this._devicePath, []);
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
        if (item.icon === this._settingsItem?.icon && item.case === this._settingsItem?.case)
            return;
        this._settingsItem = item;
        this._config.commonIcon = item.icon;
        this._config.albumArtIcon = item.icon;
        this._config.battery1Icon = `${item.icon}-left`;
        this._config.battery2Icon = `${item.icon}-right`;
        this._config.battery3Icon = item.case;
        this._dataHandler?.setConfig(this._config);
    }

    _updateBattery(events) {
        this._props = {...this._props, ...this._state.apply(events)};
        this._props.computedBatteryLevel = buds2to1BatteryLevel(this._props);
        this._dataHandler?.setProps(this._props);
    }

    destroy() {
        if (this._settingsHandlerId)
            this._settings?.disconnect(this._settingsHandlerId);
        this._settingsHandlerId = null;
        this._socket?.destroy();
        this._socket = null;
        this._dataHandler = null;
        this._settingsItem = null;
        this._settings = null;
    }
});
