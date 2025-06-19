'use strict';
import GObject from 'gi://GObject';
import * as Helper from '../enhancedDeviceSupportHelper.js';
import {AirpodsModelList} from './airpodsConfig.js';
import {MediaController} from '../mediaController.js';

export const AirpodsUUID = '74ec2172-0bad-4d01-8f77-997b2be0722a';

export const AirpodsDevice = GObject.registerClass({
}, class AirpodsDevice extends GObject.Object {
    _init(settings, path, config, props, updateDeviceMapCb) {
        super._init();
        this._settings = settings;
        this._path = path;
        this._props = props;
        this._config = config;
        this._inEar = false;
        this.updateDeviceMapCb = updateDeviceMapCb;
        this._battInfoRecieved = false;
        this._outputIsA2dp = false;
        this._initialize();
    }

    async _initialize() {
        try {
            this._deviceProxy = await Helper.deviceProxy(this._path);
            if (!this._deviceProxy)
                return;

            this._startConfiguration();
            this._deviceProxy.connectObject(
                'g-properties-changed', (proxy, changedProps) => {
                    if (this._battInfoRecieved) {
                        if (changedProps.lookup_value('BatteryInfo', null))
                            this._updateBatteryInfo();

                        if (this._conversationAwarenessMode &&
                                        !!changedProps.lookup_value('Toggle1State', null))
                            this._updateToggle1State();

                        if (this._conversationAwarenessSupported &&
                                        !!changedProps.lookup_value('Toggle2State', null))
                            this._updateToggle2State();

                        if (changedProps.lookup_value('CustomMessage', null))
                            this._updateCustomMessage();
                    } else {
                        this._startConfiguration();
                    }
                },
                this
            );
        } catch (e) {
            console.log(`Bluetooth-Battery-Meter: ${e}`);
        }
    }

    _startConfiguration() {
        if (!this._deviceProxy)
            return;

        const deviceInfoRaw = this._deviceProxy.get_cached_property('DeviceInfo').unpack();
        if (!deviceInfoRaw || deviceInfoRaw === 'unknown')
            return;

        const deviceInfo = JSON.parse(deviceInfoRaw);
        const model = deviceInfo.pid;
        if (!model)
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
        const modelData = AirpodsModelList.find(m => m.key === model);
        this._ancSupported = modelData.ancSupported;
        this._conversationAwarenessMode = 'off';
        this._conversationAwarenessSupported = modelData.awarenessSupported;
        this._config.commonIcon = modelData.budsIcon;
        this._config.albumArtIcon = modelData.albumArtIcon;
        this._config.battery1ShowOnDisconnect = true;
        this._config.battery2ShowOnDisconnect = true;

        const pathsString = this._settings.get_strv('airpods-list').map(JSON.parse);
        if (!pathsString || pathsString.length === 0)
            this._addConfigToSettings();
        else if (!pathsString.some(device => device.path === this._path))
            this._addConfigToSettings();


        if (modelData.batteryType !== 1) {
            this._config.battery1Icon = `${modelData.budsIcon}-left`;
            this._config.battery2Icon = `${modelData.budsIcon}-right`;
            this._config.battery3Icon = `${modelData.case}`;
        } else {
            this._config.battery1Icon = modelData.budsIcon;
        }

        if (this._ancSupported) {
            this._props.toggle1State =
                this._deviceProxy.get_cached_property('Toggle1State').unpack();
            this._config.set1Button1Icon = 'bbm-anc-symbolic.svg';
            this._config.set1Button2Icon = 'bbm-transperancy-symbolic.svg';
            if (modelData.adaptiveSupported)
                this._config.set1Button3Icon = 'bbm-adaptive-symbolic.svg';
        }

        if (this._conversationAwarenessSupported) {
            this._props.toggle2State =
                this._deviceProxy.get_cached_property('Toggle2State').unpack();
            this._config.set2Button1Icon = 'bbm-ca-on-symbolic.svg';
            this._config.set2Button2Icon = 'bbm-ca-off-symbolic.svg';
        }

        this.dataHandler = new Helper.DataHandler(this._config, this._props,
            this.set1ButtonClicked.bind(this), this.set2ButtonClicked.bind(this));

        this.updateDeviceMapCb(this._path, this.dataHandler);

        this._updateControllerConfigs();
        this._updateCustomMessage();
        this._updatetoggleVisibility();

        this._settings.connectObject('changed::airpods-list', () =>
            this._updateControllerConfigs(), this);
    }

    _addConfigToSettings() {
        const item = {
            'path': this._path,
            'alias': '',
            'icon': this._config.commonIcon,
            'ca-supported': this._conversationAwarenessSupported,
            'in-ear-control-enabled': true,
            'ca-volume': 20,
        };
        this._settings.set_strv('airpods-list', [JSON.stringify(item)]);
    }

    _updateControllerConfigs() {
        const pathsString = this._settings.get_strv('airpods-list').map(JSON.parse);
        const existingPathIndex = pathsString.findIndex(item => item.path === this._path);
        if (existingPathIndex !== -1) {
            const existingItem = pathsString[existingPathIndex];
            this._inEarControl = existingItem['in-ear-control-enabled'];
            this._caVolume = existingItem['ca-volume'] / 100;
            this._mediaController?.updateConfig(this._inEarControl, this._caVolume);

            const enableMediaController =
                this._inEarControl || this._conversationAwarenessSupported;
            if (enableMediaController && !this._mediaController) {
                this._mediaController =
                    new MediaController(this._path, this._inEarControl, this._caVolume);
                this._mediaController.connectObject(
                    'notify::output-is-a2dp', () => {
                        this._outputIsA2dp = this._mediaController.output_is_a2dp;
                        this._updatetoggleVisibility();
                    },
                    this
                );
                this._outputIsA2dp = this._mediaController.output_is_a2dp;
            } else if (!enableMediaController) {
                this._mediaController?.disconnectObject(this);
                this._mediaController?.destroy();
                this._mediaController = null;
            }
        }
    }

    set1ButtonClicked(index) {
        if (!this._deviceProxy)
            return;
        const command = JSON.stringify({'toggle1-activated': index});
        Helper.setDeviceCommand(this._deviceProxy, command);
    }

    set2ButtonClicked(index) {
        if (!this._deviceProxy)
            return;
        const command = JSON.stringify({'toggle2-activated': index});
        Helper.setDeviceCommand(this._deviceProxy, command);
    }

    _updateBatteryInfo() {
        if (!this._deviceProxy)
            return;
        const rawBattInfo = this._deviceProxy.get_cached_property('BatteryInfo').unpack();
        const battInfo = rawBattInfo && JSON.parse(rawBattInfo);
        this._props = {...this._props, ...battInfo};
        this.dataHandler?.setProps(this._props);
    }

    _updateToggle1State() {
        if (!this._deviceProxy)
            return;
        this._props.toggle1State =
            this._deviceProxy.get_cached_property('Toggle1State').unpack();
        this.dataHandler?.setProps(this._props);
    }

    _updateToggle2State() {
        if (!this._deviceProxy)
            return;
        this._props.toggle2State =
            this._deviceProxy.get_cached_property('Toggle2State').unpack();
        this.dataHandler?.setProps(this._props);
    }

    _updatetoggleVisibility() {
        let toggleVisible = 3;
        if (this._inEar && this._ancSupported) {
            const showANC = true;
            const showCA = this._conversationAwarenessSupported && this._outputIsA2dp;

            if (showANC && showCA)
                toggleVisible = 0;
            else if (!showANC && showCA)
                toggleVisible = 1;
            else if (showANC && !showCA)
                toggleVisible = 2;
        }

        this._props.toggleVisible = toggleVisible;
        this.dataHandler?.setProps(this._props);
    }

    _updateCustomMessage() {
        if (!this._deviceProxy)
            return;
        const raw = this._deviceProxy.get_cached_property('CustomMessage').unpack();
        let message;
        try {
            message = JSON.parse(raw);
        } catch  {
            return;
        }

        const attenuated = message?.['awareness-active'];
        if (attenuated !== null && attenuated !== undefined && this._attenuated !== attenuated) {
            this._attenuated = attenuated;
            this._mediaController?.lowerAirpodsVolume(attenuated);
        }

        const bud1InearStatus = message?.['bud1-inear-status'];
        const bud2InearStatus = message?.['bud2-inear-status'];

        if (bud2InearStatus && bud2InearStatus) {
            const inEar = bud1InearStatus === 'in-ear' || bud2InearStatus === 'in-ear';
            if (inEar !== this._inEar) {
                this._inEar = inEar;
                if (this._inEar)
                    this._mediaController?.changeActivePlayerState('play');
                else
                    this._mediaController?.changeActivePlayerState('pause');

                this._updatetoggleVisibility();
            }
        }
    }

    destroy() {
        this.dataHandler = null;
        this._mediaController?.disconnectObject(this);
        this._mediaController?.destroy();
        this._mediaController = null;
        this._deviceProxy?.disconnectObject(this);
        this._deviceProxy = null;
        this._battInfoRecieved = false;
    }
});
