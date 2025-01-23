'use strict';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export const  QuickSettings = GObject.registerClass({
    GTypeName: 'BBM_QuickSettings',
    Template: GLib.Uri.resolve_relative(import.meta.url, '../ui/quickSettings.ui', GLib.UriFlags.NONE),
    InternalChildren: [
        'enable_battery_level_icon',
        'enable_battery_level_text',
        'swap_icon_text',
        'swap_icon_text_row',
        'sort_devices_by_history',
        'row_note_experimental_features',
    ],
}, class QuickSettings extends Adw.PreferencesPage {
    constructor(settings) {
        super({});
        this._settings = settings;
        this._settings.bind(
            'enable-battery-level-icon',
            this._enable_battery_level_icon,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        this._settings.bind(
            'enable-battery-level-text',
            this._enable_battery_level_text,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        this._settings.bind(
            'swap-icon-text',
            this._swap_icon_text,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        this._settings.bind(
            'sort-devices-by-history',
            this._sort_devices_by_history,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        this._settings.connect('changed::enable-battery-level-icon', () => this._setRowSensitivity());
        this._settings.connect('changed::enable-battery-level-text', () => this._setRowSensitivity());
        this._setRowSensitivity();
        const link = 'https://maniacx.github.io/Bluetooth-Battery-Meter/#enable-experimental-bluez';
        this._row_note_experimental_features.set_subtitle(
            _('Certain Bluetooth devices do not report battery level until Bluez\'s experimental features are enabled in system. Check <a href="%s">Readme</a> for details.')
    .format(link)
        );
    }

    _setRowSensitivity() {
        const status = this._settings.get_boolean('enable-battery-level-text') && this._settings.get_boolean('enable-battery-level-icon');
        this._swap_icon_text_row.sensitive = status;
        if (!status)
            this._settings.set_boolean('swap-icon-text', false);
    }
});
