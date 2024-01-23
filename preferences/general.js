'use strict';
const {Adw, Gio, GLib, GObject} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const gettextDomain = Me.metadata['gettext-domain'];
const Gettext = imports.gettext.domain(gettextDomain);
const _ = Gettext.gettext;

var General = GObject.registerClass({
    GTypeName: 'BBM_General',
    Template: `file://${GLib.build_filenamev([Me.path, 'ui', 'general.ui'])}`,
    InternalChildren: [
        'enable_battery_indicator',
        'enable_battery_level_icon',
        'enable_battery_level_text',
        'swap_icon_text',
        'swap_icon_text_row',
    ],
}, class General extends Adw.PreferencesPage {
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
        const status = this._settings.get_boolean('enable-battery-level-text') && this._settings.get_boolean('enable-battery-level-icon');
        this._swap_icon_text_row.sensitive = status;
        if (!status)
            this._settings.set_boolean('swap-icon-text', false);
    }
});
