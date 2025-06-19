'use strict';
import GObject from 'gi://GObject';
import * as Helper from '../enhancedDeviceSupportHelper.js';
import {supportedCommonIcons} from './gattBasConfig.js';

export const GattBasUUID = '0000180f-0000-1000-8000-00805f9b34fb';

export const GattBasDevices = GObject.registerClass({
}, class GattBasDevices extends GObject.Object {
    _init(settings, path, icon, config, props, updateDeviceMapCb) {
        super._init();
        this._settings = settings;
        this._path = path;
        this._icon = icon;
        this._config = config;
        this._props = props;
        this.updateDeviceMapCb = updateDeviceMapCb;
        this._battInfoRecieved = false;
        this._initialize();
    }

    async _initialize() {
        this._deviceProxy = await Helper.deviceProxy(this._path);
        if (!this._deviceProxy)
            return;

        this._startConfiguration();
        this._deviceProxy.connectObject(
            'g-properties-changed', (proxy, changedProps) => {
                if (this._battInfoRecieved) {
                    if (changedProps.lookup_value('BatteryInfo', null))
                        this._updateBatteryInfo();
                } else {
                    this._startConfiguration();
                }
            },
            this
        );
    }

    _startConfiguration() {
        if (!this._deviceProxy)
            return;
        const rawBattInfo = this._deviceProxy.get_cached_property('BatteryInfo').unpack();

        if (!rawBattInfo || rawBattInfo === 'unknown')
            return;

        const battInfo = JSON.parse(rawBattInfo);
        const bat1level = battInfo.battery1Level  ?? 0;
        const bat2level = battInfo.battery2Level  ?? 0;
        const bat3level = battInfo.battery3Level  ?? 0;

        if (bat1level <= 0 && bat2level <= 0 && bat3level <= 0)
            return;

        this._battInfoRecieved = true;
        this._props = {...this._props, ...battInfo};
        this._config.battery1ShowOnDisconnect = true;
        this._config.panelButtonLabelFixed = false;

        const parsedDevices = this._settings.get_strv('gattbas-list').map(JSON.parse);

        if (!parsedDevices || parsedDevices.length === 0 ||
            !parsedDevices.some(device => device.path === this._path)) {
            const icons = this._validIcons(this._icon);

            this._config.commonIcon = icons.supportedicon;
            this._config.albumArtIcon = icons.albumArtIcon;
            this._config.battery1Icon = icons.supportedicon;
            this._config.battery2Icon = icons.supportedicon;
            this._config.battery3Icon = icons.supportedicon;
            this._addConfigToSettings();
        } else {
            this._loadConfigFromSettings(parsedDevices);
        }

        this._settings.connectObject(
            'changed::gattbas-list', () => {
                const parsedBasDevices = this._settings.get_strv('gattbas-list').map(JSON.parse);
                this._loadConfigFromSettings(parsedBasDevices);
            },
            this
        );

        this.dataHandler = new Helper.DataHandler(this._config, this._props, null, null);

        this.updateDeviceMapCb(this._path, this.dataHandler);
    }

    _addConfigToSettings() {
        const item = {
            'path': this._path,
            'alias': '',
            'icon': this._config.commonIcon,
            'icon-batt1': this._config.battery1Icon,
            'icon-batt2': this._config.battery2Icon,
            'icon-batt3': this._config.battery3Icon,
        };
        this._settings.set_strv('gattbas-list', [JSON.stringify(item)]);
    }

    _loadConfigFromSettings(parsedDevices) {
        const existingItem = parsedDevices.find(device => device.path === this._path);
        if (!existingItem)
            return;
        this._config.commonIcon = existingItem['icon'];
        const albumArtIcon = this._validAlbumArtIcons(existingItem['icon']);
        this._config.albumArtIcon = albumArtIcon;
        this._config.battery1Icon = existingItem['icon-batt1'];
        this._config.battery2Icon = existingItem['icon-batt2'];
        this._config.battery3Icon = existingItem['icon-batt3'];
        this.dataHandler?.setConfig(this._config);
    }


    _updateBatteryInfo() {
        if (!this._deviceProxy)
            return;
        const rawBattInfo = this._deviceProxy.get_cached_property('BatteryInfo').unpack();
        const battInfo = rawBattInfo && JSON.parse(rawBattInfo);
        this._props = {...this._props, ...battInfo};
        this.dataHandler?.setProps(this._props);
    }

    _validAlbumArtIcons(icon) {
        const albumArtIconMap = {
            'audio-speakers3': 'audio-speakers3',
            'headphone1': 'audio-headphones',
            'input-gaming3': 'input-gaming',
            'input-gaming2': 'input-gaming',
            'input-keyboard2': 'input-keyboard',
        };
        return albumArtIconMap[icon] || icon;
    }

    _validIcons(icon) {
        if (supportedCommonIcons.includes(icon)) {
            const iconMap = {
                'phone-apple-iphone-symbolic': 'phone',
                'phone-google-nexus-one': 'phone',
                'phone-samsung-galaxy-s': 'phone',
            };
            const supportedicon = iconMap[icon] || icon;
            const albumArtIcon = this._validAlbumArtIcons(supportedicon);
            return {supportedicon,  albumArtIcon};
        } else {
            return {supportedicon: 'audio-headphones',  albumArtIcon: 'audio-headphones'};
        }
    }


    destroy() {
        this.dataHandler = null;
        this._deviceProxy.disconnectObject(this);
        this._deviceProxy = null;
        this._battInfoRecieved = false;
    }
});
