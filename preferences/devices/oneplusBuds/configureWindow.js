'use strict';
import Adw from 'gi://Adw';
import GObject from 'gi://GObject';

import {ANC_MODES} from '../../../lib/devices/oneplusBuds/oneplusBudsConfig.js';
import {supportedAudioDualIcons, supportedCaseIcons} from '../../../lib/widgets/iconGroups.js';
import {DropDownRowWidget} from '../../widgets/dropDownRowWidget.js';
import {IconSelectorWidget} from '../../widgets/iconSelectorWidget.js';

export const ConfigureWindow = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_OnePlusBudsConfigureWindow',
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

        // Keep the window responsive in the same way as other earbud configuration pages.
        this._isCompactMode = false;
        this._breakpointCompact = new Adw.Breakpoint({
            condition: Adw.BreakpointCondition.parse('max-width: 500px'),
        });
        this._breakpointExpanded = new Adw.Breakpoint({
            condition: Adw.BreakpointCondition.parse('min-width: 550px'),
        });
        this.add_breakpoint(this._breakpointCompact);
        this.add_breakpoint(this._breakpointExpanded);
        this._breakpointCompact.connect('apply', () => {
            this._isCompactMode = true;
        });
        this._breakpointExpanded.connect('apply', () => {
            this._isCompactMode = false;
        });

        this._settings = settings;
        this._devicePath = devicePath;
        this._items = settings.get_strv('oneplus-buds-list').map(JSON.parse);
        this._item = this._items.find(item => item.path === devicePath);
        if (!this._item)
            return;

        this.title = this._item.alias;
        const toolbarView = new Adw.ToolbarView();
        const headerBar = new Adw.HeaderBar({
            decoration_layout: ':close',
            show_end_title_buttons: true,
        });
        this._page = new Adw.PreferencesPage();
        toolbarView.add_top_bar(headerBar);
        toolbarView.set_content(this._page);
        this.set_content(toolbarView);

        const iconSelector = new IconSelectorWidget({
            gtxt: _,
            grpTitle: _('Icon'),
            rowTitle: _('Select Icon'),
            rowSubtitle: _('Select the icon used for the indicator and quick menu'),
            iconList: supportedAudioDualIcons,
            initialIcon: this._item.icon,
            caseIconList: supportedCaseIcons,
            initialCaseIcon: this._item.case,
            mac,
            fw: '',
        });
        iconSelector.connect('notify::selected-icon', () =>
            this._update('icon', iconSelector.selected_icon));
        iconSelector.connect('notify::selected-case-icon', () =>
            this._update('case', iconSelector.selected_case_icon));
        this._page.add(iconSelector);

        const controls = new Adw.PreferencesGroup({title: _('Device Controls')});
        const modeLabels = {
            off: _('Off'),
            'noise-high': _('Noise Cancellation: High'),
            'noise-medium': _('Noise Cancellation: Medium'),
            'noise-low': _('Noise Cancellation: Low'),
            'auto-medium': _('Noise Cancellation: Auto'),
            transparency: _('Transparency'),
        };
        this._noiseControl = new DropDownRowWidget({
            title: _('Noise Control'),
            subtitle: _('Applies to connected earbuds and is also available in Bluetooth Quick Settings.'),
            options: ANC_MODES.map(mode => modeLabels[mode.name]),
            values: ANC_MODES.map(mode => mode.index),
            initialValue: this._item['noise-mode'] ?? 5,
        });
        this._noiseControl.connect('notify::selected-item', () =>
            this._update('noise-mode', this._noiseControl.selected_item));
        controls.add(this._noiseControl);
        this._page.add(controls);

        this._settingsHandlerId = settings.connect('changed::oneplus-buds-list', () =>
            this._syncSettings());
        this.connect('close-request', () => {
            if (this._settingsHandlerId && this._settings)
                this._settings.disconnect(this._settingsHandlerId);
            this._settingsHandlerId = null;
            this._settings = null;
            return false;
        });
    }

    _update(key, value) {
        if (!this._settings)
            return;
        const index = this._items.findIndex(item => item.path === this._devicePath);
        if (index === -1)
            return;
        this._items[index][key] = value;
        this._settings.set_strv('oneplus-buds-list', this._items.map(JSON.stringify));
    }

    _syncSettings() {
        this._items = this._settings.get_strv('oneplus-buds-list').map(JSON.parse);
        this._item = this._items.find(item => item.path === this._devicePath);
        if (!this._item)
            return;

        this.title = this._item.alias;
        this._noiseControl.selected_item = this._item['noise-mode'] ?? 5;
    }
});
