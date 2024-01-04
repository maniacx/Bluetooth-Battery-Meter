'use strict';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

export const  General = GObject.registerClass({
    GTypeName: 'BBM_General',
    Template: GLib.Uri.resolve_relative(import.meta.url, '../ui/general.ui', GLib.UriFlags.NONE),
    InternalChildren: [
        'enable_battery_indicator',
        'enable_battery_level_icon',
        'enable_battery_level_text',
        'swap_icon_text',
        'swap_icon_text_row',
    ],
}, class Apple extends Adw.PreferencesPage {
    constructor(settings) {
        super({});
        this._settings = settings;

        this._settings.bind(
            'enable-battery-indicator',
            this._enable_battery_indicator,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );
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
        this._settings.connect('changed::enable-battery-level-icon', () => this._setRowSensitivity());
        this._settings.connect('changed::enable-battery-level-text', () => this._setRowSensitivity());
        this._setRowSensitivity();
    }

    _setRowSensitivity() {
        this._swap_icon_text_row.sensitive = this._settings.get_boolean('enable-battery-level-text') &&
            this._settings.get_boolean('enable-battery-level-icon');
    }
});
