'use strict';
import Adw from 'gi://Adw';
import GObject from 'gi://GObject';

import {
    supportedAudioDualIcons, supportedCaseIcons
} from '../../../lib/widgets/iconGroups.js';
import {IconSelectorWidget} from './../../widgets/iconSelectorWidget.js';
import {EqualizerWidget} from './../../widgets/equalizerWidget.js';
import {DropDownRowWidget} from './../../widgets/dropDownRowWidget.js';
import {
    EqPreset, EqPresetBands, eqPresetForBands
} from '../../../lib/devices/googleBuds/googleBudsConfig.js';

export const ConfigureWindow = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_GoogleBudsConfigureWindow',
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

        const pathsString = this._settings.get_strv('google-buds-list').map(JSON.parse);
        this._settingsItems = pathsString.find(info => info.path === devicePath);
        if (!this._settingsItems)
            return;

        this.title = this._settingsItems.alias;

        const toolViewBar = new Adw.ToolbarView();
        const headerBar = new Adw.HeaderBar({
            decoration_layout: ':close',
            show_end_title_buttons: true,
        });
        const page = new Adw.PreferencesPage();

        toolViewBar.add_top_bar(headerBar);
        toolViewBar.set_content(page);
        this.set_content(toolViewBar);

        const iconSelector = new IconSelectorWidget({
            gtxt: _,
            grpTitle: _('Icon'),
            rowTitle: _('Select Icon'),
            rowSubtitle: _('Select the icon used for the indicator and quick menu'),
            iconList: supportedAudioDualIcons,
            initialIcon: this._settingsItems['icon'] || 'earbuds',
            caseIconList: supportedCaseIcons,
            initialCaseIcon: this._settingsItems['case'] || 'case-oval',
            mac,
            fw: this._settingsItems['fw-version'] || '',
        });

        iconSelector.connect('notify::selected-icon', () => {
            this._updateGsettings('icon', iconSelector.selected_icon);
        });

        iconSelector.connect('notify::selected-case-icon', () => {
            this._updateGsettings('case', iconSelector.selected_case_icon);
        });

        page.add(iconSelector);

        const eqGroup = new Adw.PreferencesGroup({title: _('Equalizer')});
        page.add(eqGroup);

        this._volumeEqSwitch = new Adw.SwitchRow({
            title: _('Volume EQ'),
        });
        this._volumeEqSwitch.active = this._settingsItems['volume-eq'];
        this._volumeEqSwitch.connect('notify::active', () => {
            this._updateGsettings('volume-eq', this._volumeEqSwitch.active);
        });
        eqGroup.add(this._volumeEqSwitch);

        const presetLabels = {
            [EqPreset.DEFAULT]: _('Default'),
            [EqPreset.HEAVY_BASS]: _('Heavy bass'),
            [EqPreset.LIGHT_BASS]: _('Light bass'),
            [EqPreset.BALANCED]: _('Balanced'),
            [EqPreset.VOCAL_BOOST]: _('Vocal boost'),
            [EqPreset.CLARITY]: _('Clarity'),
            [EqPreset.LAST_SAVED]: _('Last saved'),
            [EqPreset.CUSTOM]: _('Custom'),
        };
        const presetValues = [
            EqPreset.DEFAULT,
            EqPreset.HEAVY_BASS,
            EqPreset.LIGHT_BASS,
            EqPreset.BALANCED,
            EqPreset.VOCAL_BOOST,
            EqPreset.CLARITY,
            EqPreset.LAST_SAVED,
            EqPreset.CUSTOM,
        ];
        const initialPreset = this._settingsItems['eq-preset'] ??
            this._eqPresetForCurrentEq();

        this._eqPresetDropdown = new DropDownRowWidget({
            title: _('Equalizer Preset'),
            options: presetValues.map(preset => presetLabels[preset]),
            values: presetValues,
            initialValue: initialPreset,
        });

        this._eqPresetDropdown.connect('notify::selected-item', () => {
            const preset = this._eqPresetDropdown.selected_item;
            this._updateGsettings('eq-preset', preset);

            if (preset === EqPreset.CUSTOM)
                return;

            const bands = preset === EqPreset.LAST_SAVED
                ? this._settingsItems['eq-last-saved'] : EqPresetBands[preset];
            this._eq.setValues(bands);
            this._updateGsettings('eq-custom', bands);
        });

        eqGroup.add(this._eqPresetDropdown);

        this._equalizerCustomRow = new Adw.ActionRow({
            title: _('Custom Equalizer'),
        });

        const eqFreqs = [
            _('Low Bass'),
            _('Bass'),
            _('Mid'),
            _('Treble'),
            _('Upper Treble'),
        ];

        this._eq = new EqualizerWidget(eqFreqs, this._settingsItems['eq-custom'], 6);
        this._eq.connect('eq-changed', (_widget, values) => {
            this._eqPresetDropdown.selected_item = EqPreset.CUSTOM;
            this._updateGsettings('eq-preset', EqPreset.CUSTOM);
            this._updateGsettings('eq-custom', values);
        });

        this._equalizerCustomRow.set_child(this._eq);
        eqGroup.add(this._equalizerCustomRow);

        const settingSignalId = this._settings.connect('changed::google-buds-list', () => {
            const updatedList = this._settings.get_strv('google-buds-list').map(JSON.parse);
            this._settingsItems = updatedList.find(info => info.path === devicePath);
            if (!this._settingsItems)
                return;

            this.title = this._settingsItems.alias;
            this._volumeEqSwitch.active = this._settingsItems['volume-eq'];
            this._eqPresetDropdown.selected_item = this._settingsItems['eq-preset'] ??
                this._eqPresetForCurrentEq();
            this._eq.setValues(this._settingsItems['eq-custom']);
        });

        this.connect('close-request', () => {
            this._eq?.destroy();
            this._eq = null;

            if (settingSignalId && this._settings)
                this._settings.disconnect(settingSignalId);

            this._settings = null;

            return false;
        });
    }

    _updateGsettings(key, value) {
        const pairedDevice = this._settings.get_strv('google-buds-list');
        const existingPathIndex =
                pairedDevice.findIndex(item => JSON.parse(item).path === this._devicePath);
        if (existingPathIndex !== -1) {
            const existingItem = JSON.parse(pairedDevice[existingPathIndex]);
            existingItem[key] = value;
            pairedDevice[existingPathIndex] = JSON.stringify(existingItem);
            this._settings.set_strv('google-buds-list', pairedDevice);
        }
    }

    _eqPresetForCurrentEq() {
        const staticPreset = eqPresetForBands(this._settingsItems['eq-custom']);
        if (staticPreset !== EqPreset.CUSTOM)
            return staticPreset;

        if (JSON.stringify(this._settingsItems['eq-custom']) ===
                JSON.stringify(this._settingsItems['eq-last-saved']))
            return EqPreset.LAST_SAVED;


        return EqPreset.CUSTOM;
    }
});
