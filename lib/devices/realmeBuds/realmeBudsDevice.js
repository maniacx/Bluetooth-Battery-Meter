'use strict';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import {createLogger} from '../logger.js';
import {validateProperties, launchConfigureWindow} from '../deviceUtils.js';
import {createConfig, createProperties, DataHandler} from '../../dataHandler.js';
import {RealmeBudsSocket} from './realmeBudsSocket.js';

export const DeviceTypeRealmeBuds = 'realmeBuds';

const SerialPortUUID = '00001101-0000-1000-8000-00805f9b34fb';
const RealmeBudsT310Pattern = /realme\s+buds\s+t310/i;

const AncMode = {
    NORMAL: 0x01,
    TRANSPARENCY: 0x02,
    NOISE_CANCELLATION: 0x08,
};

export function isRealmeBuds(bluezDeviceProxy, uuids) {
    const bluezProps = ['Name'];
    let supported = 'no';
    const normalizedUuids = (uuids ?? []).map(uuid => uuid.toLowerCase());

    if (!normalizedUuids.includes(SerialPortUUID))
        return {supported, bluezProps};

    const name = bluezDeviceProxy.Name;
    if (!name) {
        supported = 'pending';
        return {supported, bluezProps};
    }

    if (RealmeBudsT310Pattern.test(name))
        supported = 'yes';

    return {supported, bluezProps};
}

export const RealmeBudsDevice = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_RealmeBudsDevice',
}, class RealmeBudsDevice extends GObject.Object {
    _init(settings, devicePath, alias, extPath, profileManager, updateDeviceMapCb) {
        super._init();
        const identifier = devicePath.slice(-2);
        this._log = createLogger(`RealmeBudsDevice-${identifier}`);
        this._log.info('------------------- RealmeBudsDevice init -------------------');

        this._settings = settings;
        this._devicePath = devicePath;
        this._alias = alias;
        this._extPath = extPath;
        this.updateDeviceMapCb = updateDeviceMapCb;

        this._config = createConfig();
        this._props = createProperties();
        this._commonIcon = 'earbuds-stem';
        this._modelName = 'Realme Buds T310';
        this._ancToggleMap = {
            1: AncMode.NORMAL,
            2: AncMode.NOISE_CANCELLATION,
            3: AncMode.TRANSPARENCY,
        };

        this._createDefaultSettings();

        const devicesList = this._settings.get_strv('realme-buds-list').map(JSON.parse);
        if (devicesList.length === 0 ||
                !devicesList.some(device => device.path === this._devicePath)) {
            this._addPropsToSettings(devicesList);
        } else {
            validateProperties(this._settings, 'realme-buds-list', devicesList,
                this._defaultsDeviceSettings, this._devicePath);
        }

        this._updateInitialValues();
        this._monitorRealmeBudsListGsettings(true);
        this._updateConfig();
        this._startConfiguration();

        const profile = {
            type: DeviceTypeRealmeBuds,
            uuid: SerialPortUUID,
            options: {autoConnect: false},
        };
        this._realmeBudsSocket = new RealmeBudsSocket(
            this._devicePath,
            profileManager,
            profile,
            {ackReceived: this._ackReceived.bind(this)}
        );
    }

    _createDefaultSettings() {
        this._defaultsDeviceSettings = {
            path: this._devicePath,
            name: this._modelName,
            alias: this._alias,
            icon: this._commonIcon,
        };
    }

    _addPropsToSettings(devicesList) {
        devicesList.push(this._defaultsDeviceSettings);
        this._settings.set_strv('realme-buds-list', devicesList.map(JSON.stringify));
    }

    _updateInitialValues() {
        const devicesList = this._settings.get_strv('realme-buds-list').map(JSON.parse);
        const existingPathIndex = devicesList.findIndex(item => item.path === this._devicePath);
        if (existingPathIndex === -1)
            return;

        this._settingsItems = devicesList[existingPathIndex];
        this._commonIcon = this._settingsItems.icon;
    }

    _monitorRealmeBudsListGsettings(monitor) {
        if (monitor) {
            this._settings?.connectObject('changed::realme-buds-list', () =>
                this._updateGsettingsProps(), this);
        } else {
            this._settings?.disconnectObject(this);
        }
    }

    _updateGsettingsProps() {
        const devicesList = this._settings.get_strv('realme-buds-list').map(JSON.parse);
        const existingPathIndex = devicesList.findIndex(item => item.path === this._devicePath);
        if (existingPathIndex === -1)
            return;

        this._settingsItems = devicesList[existingPathIndex];

        const icon = this._settingsItems.icon;
        if (this._commonIcon !== icon) {
            this._commonIcon = icon;
            this._updateConfig();
        }
    }

    _updateConfig() {
        this._config.commonIcon = this._commonIcon;
        this._config.albumArtIcon = this._commonIcon;
        this._config.battery1Icon = this._commonIcon;
        this._config.useBluezBattery = true;
        this._config.alwaysShowIndicator = true;
        this._config.showSettingsButton = true;

        this._config.toggle1Title = _('Noise Control');
        this._config.toggle1Button1Icon = 'bbm-anc-off-symbolic.svg';
        this._config.toggle1Button1Name = _('Off');
        this._config.toggle1Button2Icon = 'bbm-anc-on-symbolic.svg';
        this._config.toggle1Button2Name = _('Noise Cancellation');
        this._config.toggle1Button3Icon = 'bbm-transperancy-symbolic.svg';
        this._config.toggle1Button3Name = _('Transparency');

        this.dataHandler?.setConfig(this._config);
    }

    _startConfiguration() {
        this._props.toggle1Visible = true;
        this.dataHandler = new DataHandler(this._config, this._props);
        this.updateDeviceMapCb(this._devicePath, this.dataHandler);

        this.dataHandler.connectObject(
            'ui-action', (_o, command, value) => {
                if (command === 'toggle1State')
                    this._toggle1ButtonClicked(value);

                if (command === 'settingsButtonClicked')
                    this._settingsButtonClicked();
            },
            this
        );
    }

    _toggle1ButtonClicked(index) {
        const mode = this._ancToggleMap[index];
        if (mode == null)
            return;

        this._props.toggle1State = index;
        this.dataHandler?.setProps(this._props);
        this._realmeBudsSocket?.setNoiseControl(mode);
    }

    _ackReceived() {
        this._log.info('ANC command acknowledged');
    }

    _settingsButtonClicked() {
        this._configureWindowLauncherCancellable = new Gio.Cancellable();
        launchConfigureWindow(this._devicePath, 'realmeBuds', this._extPath,
            this._configureWindowLauncherCancellable);
        this._configureWindowLauncherCancellable = null;
    }

    destroy() {
        this._configureWindowLauncherCancellable?.cancel();
        this._configureWindowLauncherCancellable = null;

        this._realmeBudsSocket?.destroy(true);
        this._realmeBudsSocket = null;
        this.dataHandler?.disconnectObject(this);
        this.dataHandler = null;
        this._settings?.disconnectObject(this);
        this._settings = null;
    }
});
