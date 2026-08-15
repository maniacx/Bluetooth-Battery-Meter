'use strict';
import Adw from 'gi://Adw';
import GObject from 'gi://GObject';

import {supportedAudioDualIcons, supportedCaseIcons} from '../../../lib/widgets/iconGroups.js';
import {IconSelectorWidget} from '../../widgets/iconSelectorWidget.js';

export const ConfigureWindow = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_OnePlusBudsConfigureWindow',
}, class ConfigureWindow extends Adw.Window {
    _init(settings, mac, devicePath, parentWindow, _) {
        super._init({
            default_width: 650,
            default_height: 420,
            modal: true,
            transient_for: parentWindow ?? null,
        });
        this._settings = settings;
        this._devicePath = devicePath;
        this._items = settings.get_strv('oneplus-buds-list').map(JSON.parse);
        this._item = this._items.find(item => item.path === devicePath);
        if (!this._item)
            return;

        this.title = this._item.alias;
        const toolbar = new Adw.ToolbarView();
        toolbar.add_top_bar(new Adw.HeaderBar({decoration_layout: ':close'}));
        const page = new Adw.PreferencesPage();
        toolbar.set_content(page);
        this.set_content(toolbar);

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
        page.add(iconSelector);

        const controls = new Adw.PreferencesGroup({title: _('Device Controls')});
        controls.add(new Adw.ActionRow({
            title: _('Noise Control'),
            subtitle: _('Off, Noise Cancellation levels, Auto, and Transparency are available in Bluetooth Quick Settings while connected.'),
        }));
        page.add(controls);
    }

    _update(key, value) {
        const index = this._items.findIndex(item => item.path === this._devicePath);
        if (index === -1)
            return;
        this._items[index][key] = value;
        this._settings.set_strv('oneplus-buds-list', this._items.map(JSON.stringify));
    }
});
