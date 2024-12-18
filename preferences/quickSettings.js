'use strict';
const {Adw, Gio, GLib, GObject} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const gettextDomain = Me.metadata['gettext-domain'];
const Gettext = imports.gettext.domain(gettextDomain);
const _ = Gettext.gettext;

var QuickSettings = GObject.registerClass({
    GTypeName: 'BBM_QuickSettings',
    Template: `file://${GLib.build_filenamev([Me.path, 'ui', 'quickSettings.ui'])}`,
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
        this._row_note_experimental_features.set_title(
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
