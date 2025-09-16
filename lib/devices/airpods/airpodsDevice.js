'use strict';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import {getBluezDeviceProxy} from '../../bluezDeviceProxy.js';
import {createConfig, createProperties, DataHandler} from '../../dataHandler.js';
import {MediaController} from '../mediaController.js';
import {AirpodsSocket} from './airpodsSocket.js';
import {
    AirpodsModelList, ANCMode, AwarenessMode, EarDetection,
    PressSpeedMode, PressDurationMode, VolSwipeLength
} from './airpodsConfig.js';

const AirpodsUUID = '74ec2172-0bad-4d01-8f77-997b2be0722a';
export function isAirpods(bluezDeviceProxy) {
    const bluezProps = ['Modalias'];
    let supported = 'no';

    const UUIDs = bluezDeviceProxy.UUIDs || [];
    if (!UUIDs.includes(AirpodsUUID))
        return {supported, bluezProps};

    const modalias = bluezDeviceProxy.Modalias;
    if (!modalias) {
        supported = 'pending';
        return {supported, bluezProps};
    }

    const regex = /v004Cp([0-9A-Fa-f]{4})d/;
    const match = modalias.match(regex);
    if (!match)
        return {supported, bluezProps};

    const model = match[1].toUpperCase();
    if (AirpodsModelList.some(m => m.key === model))
        supported = 'yes';

    return {supported, bluezProps};
}

export const AirpodsDevice = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_AirpodsDevice',
}, class AirpodsDevice extends GObject.Object {
    _init(settings, devicePath, alias, extPath, profileManager, updateDeviceMapCb) {
        super._init();
        const now = Date.now();
        this._settings = settings;
        this._devicePath = devicePath;
        this._alias = alias;
        this._extPath = extPath;
        this._profileManager = profileManager;
        this.updateDeviceMapCb = updateDeviceMapCb;

        this._config = createConfig();
        this._props = createProperties();
        this._model = null;
        this._inEarControl = true;
        this._budInEar = false;
        this._bothBudsInEar = false;
        this._battInfoRecieved = false;
        this._previousOnDestroyVolume = -1;

        const attStrings = this._settings.get_strv('attenuated-on-destroy-info');
        if (attStrings.length > 0) {
            const {path, timestamp, volume} = JSON.parse(attStrings[0]);
            if (path === this._devicePath && now - timestamp <= 500)
                this._previousOnDestroyVolume = volume;
        }

        this._callbacks = {
            updateBatteryProps: this.updateBatteryProps.bind(this),
            updateAncMode: this.updateAncMode.bind(this),
            updateAdaptiveLevel: this.updateAdaptiveLevel.bind(this),
            updateAwarenessMode: this.updateAwarenessMode.bind(this),
            updateAwarenessData: this.updateAwarenessData.bind(this),
            updateInEarStatus: this.updateInEarStatus.bind(this),

            updatePressSpeed: this.updatePressSpeed.bind(this),
            updatePressDuration: this.updatePressDuration.bind(this),
            updateVolSwipeLength: this.updateVolSwipeLength.bind(this),
            updateVolSwipeMode: this.updateVolSwipeMode.bind(this),
            updateNotificationToneMode: this.updateNotificationToneMode.bind(this),
        };
        this._initialize();
    }

    _initialize() {
        this._bluezDeviceProxy = getBluezDeviceProxy(this._devicePath);
        const modalias = this._bluezDeviceProxy.Modalias;
        const regex = /v004Cp([0-9A-Fa-f]{4})d/;
        const match = modalias.match(regex);
        if (match) {
            this._model = match[1].toUpperCase();
            this._modelData = AirpodsModelList.find(m => m.key === this._model);
            this._batteryType = this._modelData.batteryType;
            this._ancSupported = this._modelData.ancSupported ?? false;
            this._adaptiveSupported = this._modelData.adaptiveSupported ?? false;
            this._awarenessSupported = this._modelData.awarenessSupported ?? false;
            this._pressSpeedDurationSupported =
                        this._modelData.pressSpeedDurationSupported ?? false;
            this._volumeSwipeSupported = this._modelData.volumeSwipeSupported ?? false;
            this._longPressCycleSupported = this._modelData.longPressCycleSupported ?? false;
            this._toneVolumeSupported = this._modelData.toneVolumeSupported ?? false;

            this._config.commonIcon = this._modelData.budsIcon;
            this._config.albumArtIcon = this._modelData.albumArtIcon;
            this._config.battery1ShowOnDisconnect = true;
            this._config.battery2ShowOnDisconnect = true;
            this._config.showSettingsButton = true;

            if (this._modelData.batteryType !== 1) {
                this._config.battery1Icon = `${this._modelData.budsIcon}-left`;
                this._config.battery2Icon = `${this._modelData.budsIcon}-right`;
                this._config.battery3Icon = `${this._modelData.case}`;
            } else {
                this._config.battery1Icon = this._modelData.budsIcon;
            }

            if (this._ancSupported) {
                this._config.toggle1Title = _('Noise Control');
                this._config.toggle1Button1Icon = 'bbm-anc-off-symbolic.svg';
                this._config.toggle1Button1Name = _('ANC Off');

                this._config.toggle1Button2Icon = 'bbm-transperancy-symbolic.svg';
                this._config.toggle1Button2Name = _('Transparency');

                if (this._adaptiveSupported) {
                    this._config.toggle1Button3Icon = 'bbm-adaptive-symbolic.svg';
                    this._config.toggle1Button3Name = _('Adaptive');
                    this._config.optionsBox1 = ['slider'];
                    this._config.box1SliderTitle = _('Ambient Level');
                    this._config.toggle1Button4Icon = 'bbm-anc-on-symbolic.svg';
                    this._config.toggle1Button4Name = _('ANC On');
                } else {
                    this._config.toggle1Button3Icon = 'bbm-anc-on-symbolic.svg';
                    this._config.toggle1Button3Name = _('ANC On');
                }
            }

            if (this._awarenessSupported) {
                this._config.toggle2Title = _('Conversation Awareness');
                this._config.toggle2Button1Icon = 'bbm-ca-on-symbolic.svg';
                this._config.toggle2Button1Name = _('On');
                this._config.toggle2Button2Icon = 'bbm-ca-off-symbolic.svg';
                this._config.toggle2Button2Name = _('Off');
            }

            this._defaultsDeviceSettings = {
                'path': this._devicePath,
                'model': this._model,
                'alias': this._alias,
                'icon': this._config.commonIcon,
                'in-ear-control-enabled': true,
                'ca-volume': 20,
                'lp-applied': true,
                'lp-value': 6,
                'noti-vol': 77,
                'swipe-mode': true,
                'swipe-len': 0,
                'press-speed': 0,
                'press-dur': 0,
            };

            this._initializeProfile();
        }
    }

    _initializeProfile() {
        let fd;
        fd = this._profileManager.getFd(this._devicePath);
        if (fd === -1) {
            this._profileSignalId = this._profileManager.connect(
                'new-connection', (o, path, newFd) => {
                    if (path !== this._devicePath)
                        return;
                    fd = newFd;
                    this._profileManager.disconnect(this._profileSignalId);
                    this._profileSignalId = null;
                    this._startAirpodsSocket(fd);
                }
            );

            this._profileManager.registerProfile('airpods', AirpodsUUID);
        } else {
            this._startAirpodsSocket(fd);
        }
    }

    _startAirpodsSocket(fd) {
        this._airpodsSocket = new AirpodsSocket(
            this._devicePath,
            fd,
            this._modelData,
            this._callbacks);
    }

    _startConfiguration(battInfo) {
        const bat1level = battInfo.battery1Level  ?? 0;
        const bat2level = battInfo.battery2Level  ?? 0;
        const bat3level = battInfo.battery3Level  ?? 0;

        if (bat1level <= 0 && bat2level <= 0 && bat3level <= 0)
            return;

        this._battInfoRecieved = true;
        const pathsString = this._settings.get_strv('airpods-list').map(JSON.parse);
        if (pathsString.length === 0 ||
                !pathsString.some(device => device.path === this._devicePath))
            this._addMediaConfigToSettings(pathsString);
        else
            this._checkProperties(pathsString);

        this.dataHandler = new DataHandler(this._config, this._props);

        this.updateDeviceMapCb(this._devicePath, this.dataHandler);

        this._updateMediaControllerConfigs();
        this._configureMediaController();

        this._monitorAirpodsListGsettings(true);

        this.dataHandler.connectObject(
            'ui-action', (o, command, value) => {
                if (command === 'toggle1State')
                    this._toggle1ButtonClicked(value);

                if (command === 'toggle2State')
                    this._toggle2ButtonClicked(value);

                if (command === 'box1SliderValue')
                    this._setSliderChanged(value);

                if (command === 'settingsButtonClicked')
                    this._settingsButtonClicked();
            },
            this
        );
    }

    _monitorAirpodsListGsettings(monitor) {
        if (monitor) {
            this._settings?.connectObject('changed::airpods-list', () =>
                this._updateMediaControllerConfigs(), this);
        } else {
            this._settings?.disconnectObject(this);
        }
    }

    _addMediaConfigToSettings(pathsString) {
        pathsString.push(this._defaultsDeviceSettings);
        this._settings.set_strv('airpods-list', pathsString.map(JSON.stringify));
    }


    _updateGsettings() {
        this._monitorAirpodsListGsettings(false);

        const currentList = this._settings.get_strv('airpods-list').map(JSON.parse);
        const index = currentList.findIndex(d => d.path === this._devicePath);

        if (index !== -1) {
            currentList[index] = this._settingsItems;
            this._settings.set_strv('airpods-list', currentList.map(JSON.stringify));
        }

        this._monitorAirpodsListGsettings(true);
    }



    _checkProperties(devices) {
        const device = devices.find(d => d.path === this._devicePath);
        if (!device)
            return;

        let changed = false;
        for (const key of Object.keys(device)) {
            if (!(key in this._defaultsDeviceSettings)) {
                delete device[key];
                changed = true;
            }
        }

        for (const [key, value] of Object.entries(this._defaultsDeviceSettings)) {
            if (!(key in device)) {
                device[key] = value;
                changed = true;
            }
        }

        if (changed) {
            this._settings.set_strv('airpods-list',
                devices.map(d => JSON.stringify(d)));
        }
    }

    _updateMediaControllerConfigs() {
        const pathsString = this._settings.get_strv('airpods-list').map(JSON.parse);
        const existingPathIndex = pathsString.findIndex(item => item.path === this._devicePath);

        if (existingPathIndex === -1)
            return;

        this._settingsItems = pathsString[existingPathIndex];
        this._inEarControl = this._settingsItems['in-ear-control-enabled'];

        if (this._awarenessSupported)
            this._caVolume = this._settingsItems['ca-volume'] / 100;

        if (this._lpApplied === undefined)
            this._lpApplied = this._settingsItems['lp-applied'];

        if (this._lpApplied !== this._settingsItems['lp-applied']) {
            this._lpApplied = this._settingsItems['lp-applied'];
            this._setLongpressCycle(this._settingsItems['lp-value']);
        }

        if (this._notiVolume === undefined)
            this._notiVolume = this._settingsItems['noti-vol'];

        if (this._notiVolume !== this._settingsItems['noti-vol']) {
            this._notiVolume = this._settingsItems['noti-vol'];
            this._setNotiVolume(this._notiVolume);
        }

        if (this._swipeMode === undefined)
            this._swipeMode = this._settingsItems['swipe-mode'];

        if (this._swipeMode !== this._settingsItems['swipe-mode']) {
            this._swipeMode = this._settingsItems['swipe-mode'];
            this._setSwipeMode(this._swipeMode);
        }

        if (this._swipeLength === undefined)
            this._swipeLength = this._settingsItems['swipe-len'];

        if (this._swipeLength !== this._settingsItems['swipe-len']) {
            this._swipeLength = this._settingsItems['swipe-len'];
            this._setSwipeLength(this._swipeLength);
        }


        if (this._pressSpeed === undefined)
            this._pressSpeed = this._settingsItems['press-speed'];

        if (this._pressSpeed !== this._settingsItems['press-speed']) {
            this._pressSpeed = this._settingsItems['press-speed'];
            this._setPressSpeed(this._pressSpeed);
        }

        if (this._pressDur === undefined)
            this._pressDur = this._settingsItems['press-dur'];

        if (this._pressDur !== this._settingsItems['press-dur']) {
            this._pressDur = this._settingsItems['press-dur'];
            this._setPressDur(this._pressDur);
        }
    }

    _configureMediaController() {
        const enableMediaController =
                this._inEarControl || this._awarenessSupported;

        if (enableMediaController && !this._mediaController) {
            this._mediaController = new MediaController(this._settings, this._devicePath,
                this._inEarControl, this._caVolume, this._previousOnDestroyVolume);

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
        } else {
            this._mediaController?.updateConfig(this._inEarControl, this._caVolume);
        }
    }

    _updateComputedBatteryLevel(battProps) {
        const bat1 = battProps.battery1Level;
        const bat2 = battProps.battery2Level;
        const status1 = battProps.battery1Status;
        const status2 = battProps.battery2Status;
        const isInvalid = level => level === null || level === undefined || level === 0;
        if (status1 === 'charging' && !isInvalid(bat1) && isInvalid(bat2))
            return bat1;

        if (status2 === 'charging' && !isInvalid(bat2) && isInvalid(bat1))
            return bat2;

        if (status1 === 'charging' && status2 !== 'charging')
            return isInvalid(bat2) ? 0 : bat2;

        if (status2 === 'charging' && status1 !== 'charging')
            return isInvalid(bat1) ? 0 : bat1;

        if (isInvalid(bat1) && isInvalid(bat2))
            return 0;

        if (isInvalid(bat1))
            return bat2;

        if (isInvalid(bat2))
            return bat1;

        return bat1 < bat2 ? bat1 : bat2;
    }

    updateBatteryProps(props) {
        this._props = {...this._props, ...props};

        if (this._batteryType === 1)
            this._props.computedBatteryLevel = props.battery1Level;
        else
            this._props.computedBatteryLevel = this._updateComputedBatteryLevel(props);

        if (!this._battInfoRecieved)
            this._startConfiguration(props);

        this.dataHandler?.setProps(this._props);
    }

    updateAncMode(mode) {
        if (mode === ANCMode.ANC_OFF)
            this._props.toggle1State = 1;
        else if (mode === ANCMode.TRANSPARENCY)
            this._props.toggle1State = 2;
        else if (this._adaptiveSupported && mode === ANCMode.ADAPTIVE)
            this._props.toggle1State = 3;
        else if (this._adaptiveSupported && mode === ANCMode.ANC_ON)
            this._props.toggle1State = 4;
        else if (!this._adaptiveSupported && mode === ANCMode.ANC_ON)
            this._props.toggle1State = 3;

        if (this._adaptiveSupported)
            this._props.optionsBoxVisible = mode === ANCMode.ADAPTIVE ? 1 : 0;

        this.dataHandler?.setProps(this._props);
    }

    updateAdaptiveLevel(level) {
        const inverseLevel = 100 - level;
        this._inverseLevel = inverseLevel;
        this._props.box1SliderValue = inverseLevel;
        this.dataHandler?.setProps(this._props);
    }

    updateAwarenessMode(mode) {
        if (mode === AwarenessMode.ON)
            this._props.toggle2State = 1;
        else if (mode === AwarenessMode.OFF)
            this._props.toggle2State = 2;

        this.dataHandler?.setProps(this._props);
    }

    _updatetoggleVisibility() {
        const toggle1Visible = this._budInEar && this._ancSupported;
        const toggle2Visible =
            this._bothBudsInEar  && this._awarenessSupported && this._outputIsA2dp;

        this._props.toggle1Visible = toggle1Visible;
        this._props.toggle2Visible = toggle2Visible;
        this.dataHandler?.setProps(this._props);
    }

    updateInEarStatus(bud1Status, bud2status) {
        this._bothBudsInEar =
            bud1Status === EarDetection.IN_EAR && bud2status === EarDetection.IN_EAR;

        this._budInEar =
            bud1Status === EarDetection.IN_EAR ||  bud2status === EarDetection.IN_EAR;

        this._updatetoggleVisibility();

        if (this._budInEar)
            this._mediaController?.changeActivePlayerState('play');
        else
            this._mediaController?.changeActivePlayerState('pause');
    }

    updateAwarenessData(attenuated) {
        this._mediaController?.lowerAirpodsVolume(attenuated);
    }

    updateNotificationToneMode(level) {
        this._notiVolume = level;

        if (this._settingsItems) {
            this._settingsItems['noti-vol'] = level;
            this._updateGsettings();
        }
    }

    updateVolSwipeMode(state) {
        this._swipeMode = state;

        if (this._settingsItems) {
            this._settingsItems['swipe-mode'] = state;
            this._updateGsettings();
        }
    }

    updateVolSwipeLength(duration) {
        let index;
        if (duration === VolSwipeLength.DEFAULT)
            index = 0;
        else if (duration === VolSwipeLength.LONGER)
            index = 1;
        else
            index = 2;

        this._swipeLength = index;

        if (this._settingsItems) {
            this._settingsItems['swipe-len'] = index;
            this._updateGsettings();
        }
    }

    updatePressSpeed(speed) {
        let index;
        if (speed === PressSpeedMode.DEFAULT)
            index = 0;
        else if (speed === PressSpeedMode.SLOWER)
            index = 1;
        else
            index = 2;

        this._pressSpeed = index;

        if (this._settingsItems) {
            this._settingsItems['press-speed'] = index;
            this._updateGsettings();
        }
    }

    updatePressDuration(duration) {
        let index;
        if (duration === PressDurationMode.DEFAULT)
            index = 0;
        else if (duration === PressDurationMode.SLOWER)
            index = 1;
        else
            index = 2;

        this._pressDur = index;

        if (this._settingsItems) {
            this._settingsItems['press-dur'] = index;
            this._updateGsettings();
        }
    }

    _toggle1ButtonClicked(index) {
        if (index === 1)
            this._airpodsSocket.setAncMode(ANCMode.ANC_OFF);
        else if (index === 2)
            this._airpodsSocket.setAncMode(ANCMode.TRANSPARENCY);
        else if (this._adaptiveSupported && index === 3)
            this._airpodsSocket.setAncMode(ANCMode.ADAPTIVE);
        else if (this._adaptiveSupported && index === 4)
            this._airpodsSocket.setAncMode(ANCMode.ANC_ON);
        else if (!this._adaptiveSupported && index === 3)
            this._airpodsSocket.setAncMode(ANCMode.ANC_ON);
    }

    _toggle2ButtonClicked(index) {
        if (index === 1)
            this._airpodsSocket.setAwarenessMode(AwarenessMode.ON);
        else if (index === 2)
            this._airpodsSocket.setAwarenessMode(AwarenessMode.OFF);
    }

    _setSliderChanged(level) {
        const inverseLevel = 100 - level;
        if (this._inverseLevel !== inverseLevel) {
            this._inverseLevel = inverseLevel;
            this._airpodsSocket.setAdaptiveLevel(inverseLevel);
        }
    }

    _setLongpressCycle(cyclicValue) {
        this._airpodsSocket.setLongpressCycle(cyclicValue);
    }

    _setNotiVolume(volume) {
        this._airpodsSocket.setNotiVolume(volume);
    }

    _setSwipeMode(state) {
        this._airpodsSocket.setSwipeMode(state);
    }

    _setSwipeLength(index) {
        if (index === 0)
            this._airpodsSocket.setSwipeLength(VolSwipeLength.DEFAULT);
        else if (index === 1)
            this._airpodsSocket.setSwipeLength(VolSwipeLength.LONGER);
        else if (index === 2)
            this._airpodsSocket.setSwipeLength(VolSwipeLength.LONGEST);
    }

    _setPressSpeed(index) {
        if (index === 0)
            this._airpodsSocket.setPressSpeed(PressSpeedMode.DEFAULT);
        else if (index === 1)
            this._airpodsSocket.setPressSpeed(PressSpeedMode.SLOWER);
        else if (index === 2)
            this._airpodsSocket.setPressSpeed(PressSpeedMode.SLOWEST);
    }

    _setPressDur(index) {
        if (index === 0)
            this._airpodsSocket.setPressDur(PressDurationMode.DEFAULT);
        else if (index === 1)
            this._airpodsSocket.setPressDur(PressDurationMode.SHORTER);
        else if (index === 2)
            this._airpodsSocket.setPressDur(PressDurationMode.SHORTEST);
    }

    _settingsButtonClicked() {
        const cmd = `gjs -m ${this._extPath}/script/moreSettings.js` +
            ` --path ${this._devicePath} --type airpods`;
        GLib.spawn_command_line_async(cmd);
    }

    destroy() {
        this._bluezDeviceProxy = null;
        this._airpodsSocket?.destroy();
        this._airpodsSocket = null;
        this.dataHandler = null;
        this._mediaController?.disconnectObject(this);
        this._mediaController?.destroy();
        this._mediaController = null;
        this._battInfoRecieved = false;
    }
});

