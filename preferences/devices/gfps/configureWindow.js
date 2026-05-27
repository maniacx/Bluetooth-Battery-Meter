'use strict';
import Adw from 'gi://Adw';
import GObject from 'gi://GObject';

import {
    supportedAudioSingleIcons, supportedAudioDualIcons, supportedCaseIcons
} from '../../../lib/widgets/iconGroups.js';
import {IconSelectorWidget} from './../../widgets/iconSelectorWidget.js';
import {GfpsModelList} from '../../../lib/devices/gfps/gfpsConfig.js';

export const ConfigureWindow = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_GfpsConfigureWindow',
}, class ConfigureWindow extends Adw.Window {
    _init(settings, mac, devicePath, parentWindow, _, modal = false) {
        super._init({
            default_width: 650,
            default_height: 650,
            width_request: 320,
            height_request: 100,
            modal,
            transient_for: parentWindow ?? null,
        });

        this._settings = settings;
        this._devicePath = devicePath;

        const pathsString = this._settings.get_strv('gfps-list').map(JSON.parse);
        this._settingsItems = pathsString.find(info => info.path === devicePath);

        if (!this._settingsItems)
            return;

        this.title = this._settingsItems.alias;

        this._modelData =
            GfpsModelList.find(m => m.modelId === this._settingsItems.modelid) || GfpsModelList[0];

        const toolViewBar = new Adw.ToolbarView();
        const headerBar = new Adw.HeaderBar({
            decoration_layout: ':close',
            show_end_title_buttons: true,
        });
        this._page = new Adw.PreferencesPage();

        toolViewBar.add_top_bar(headerBar);
        toolViewBar.set_content(this._page);
        this.set_content(toolViewBar);

        const iconList = this._modelData.batteryLR ? supportedAudioDualIcons
            : supportedAudioSingleIcons;

        let caseIconList = [];
        let initialCaseIcon = '';
        if (this._modelData.batteryCase) {
            caseIconList = supportedCaseIcons;
            initialCaseIcon = this._settingsItems['case'];
        }

        const iconSelector = new IconSelectorWidget({
            gtxt: _,
            grpTitle: _('Icon'),
            rowTitle: _('Select Icon'),
            rowSubtitle: _('Select the icon used for the indicator and quick menu'),
            iconList,
            initialIcon: this._settingsItems['icon'],
            caseIconList,
            initialCaseIcon,
            mac,
            fw: this._settingsItems['fw-version'],
        });

        iconSelector.connect('notify::selected-icon', () => {
            this._updateGsettings('icon', iconSelector.selected_icon);
        });

        if (this._modelData.batteryCase) {
            iconSelector.connect('notify::selected-case-icon', () => {
                this._updateGsettings('case', iconSelector.selected_case_icon);
            });
        }

        this._page.add(iconSelector);

        const settingSignalId = this._settings.connect('changed::gfps-list', () => {
            const updatedList = this._settings.get_strv('gfps-list').map(JSON.parse);
            this._settingsItems = updatedList.find(info => info.path === devicePath);
            if (!this._settingsItems)
                return;

            this.title = this._settingsItems.alias;
        });

        this.connect('close-request', () => {
            if (settingSignalId && this._settings)
                this._settings.disconnect(settingSignalId);

            this._settings = null;
            return false;
        });
    }

    _updateGsettings(key, value) {
        const pairedDevice = this._settings.get_strv('gfps-list');
        const existingPathIndex =
            pairedDevice.findIndex(item => JSON.parse(item).path === this._devicePath);
        if (existingPathIndex !== -1) {
            const existingItem = JSON.parse(pairedDevice[existingPathIndex]);
            existingItem[key] = value;
            pairedDevice[existingPathIndex] = JSON.stringify(existingItem);
            this._settings.set_strv('gfps-list', pairedDevice);
        }
    }
});
