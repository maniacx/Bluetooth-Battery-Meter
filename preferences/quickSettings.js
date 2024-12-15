'use strict';
const {Adw, Gio, GLib, GObject} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

var QuickSettings = GObject.registerClass({
    GTypeName: 'BBM_QuickSettings',
    Template: `file://${GLib.build_filenamev([Me.path, 'ui', 'quickSettings.ui'])}`,
    InternalChildren: [
        'enable_battery_level_icon',
        'enable_battery_level_text',
        'swap_icon_text',
        'swap_icon_text_row',
        'sort_devices_by_history',
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
    }

    _setRowSensitivity() {
        const status = this._settings.get_boolean('enable-battery-level-text') && this._settings.get_boolean('enable-battery-level-icon');
        this._swap_icon_text_row.sensitive = status;
        if (!status)
            this._settings.set_boolean('swap-icon-text', false);
    }
});
