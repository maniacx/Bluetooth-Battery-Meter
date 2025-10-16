'use strict';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
import GObject from 'gi://GObject';
import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const  CustomizeRow = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_CustomizeRow',
}, class CustomizeRow extends Adw.ActionRow {
    constructor(settings, level, idx, colorKey) {
        super({});
        this._settings = settings;
        this._idx = idx;
        this.title = _('Assign color for %d – %d%%').format(level - 10, level);
        this.subtitle = _('Set color for the battery level range of %d – %d%%')
            .format(level - 10, level);

        const major = Gtk.get_major_version();
        const minor = Gtk.get_minor_version();

        let colorButton;
        let signalEmitted;
        if (major > 4 || major === 4 && minor >= 10) {
            signalEmitted = 'notify::rgba';
            const colorDialog = new Gtk.ColorDialog({with_alpha: false});
            colorButton = new Gtk.ColorDialogButton({dialog: colorDialog});
        } else {
            signalEmitted = 'color-set';
            colorButton = new Gtk.ColorButton();
        }

        colorButton.valign = Gtk.Align.CENTER;
        colorButton.halign = Gtk.Align.END;
        const entry = new Gtk.Entry({
            valign: Gtk.Align.CENTER,
            halign: Gtk.Align.END, max_length: 7,
        });

        this.add_suffix(colorButton);
        this.add_suffix(entry);

        const isValidHexColor = color => /^#[0-9A-Fa-f]{6}$/.test(color);

        const rgbaToHex = rgba => {
            const r = Math.round(rgba.red * 255).toString(16).padStart(2, '0');
            const g = Math.round(rgba.green * 255).toString(16).padStart(2, '0');
            const b = Math.round(rgba.blue * 255).toString(16).padStart(2, '0');
            return `#${r}${g}${b}`;
        };

        const hexToRgba = hex => {
            const r = parseInt(hex.slice(1, 3), 16) / 255;
            const g = parseInt(hex.slice(3, 5), 16) / 255;
            const b = parseInt(hex.slice(5, 7), 16) / 255;
            return new Gdk.RGBA({red: r, green: g, blue: b, alpha: 1});
        };

        colorButton.connect(signalEmitted, () => {
            const color = colorButton.get_rgba();
            const hexColor = rgbaToHex(color);
            entry.set_placeholder_text(hexColor);
            const colors = settings.get_strv(colorKey);
            colors[this._idx] = hexColor;
            settings.set_strv(colorKey, colors);
        });

        entry.connect('changed', () => {
            const text = entry.get_text().trim();
            if (isValidHexColor(text)) {
                const colors = settings.get_strv(colorKey);
                colors[this._idx] = text;
                settings.set_strv(colorKey, colors);
                colorButton.set_rgba(hexToRgba(text));
            }
        });

        settings.connect('changed::level-indicator-custom-colors', () => {
            const colors = settings.get_strv(colorKey);
            const hex = colors[this._idx] || '#000000';
            entry.set_placeholder_text(hex);
            colorButton.set_rgba(hexToRgba(hex));
        });

        const fallbackColor = this._idx > 1 ? '#15c931' : '#ff7800';
        const initHex = settings.get_strv(colorKey)[this._idx] || fallbackColor;
        entry.set_placeholder_text(initHex);
        colorButton.set_rgba(hexToRgba(initHex));
    }
});

export const  BatteryWidgetSettings = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_BatteryWidgetSettings',
    Template: GLib.Uri.resolve_relative(
        import.meta.url, '../ui/batteryWidgetSettings.ui', GLib.UriFlags.NONE
    ),
    InternalChildren: [
        'indicator_widget_note_row',
        'disable_level_in_icon',
        'enable_battery_indicator_text',
        'level_indicator_type_row',
        'level_indicator_type',
        'level_bar_position_row',
        'level_bar_position',
        'indicator_size',
        'level_indicator_color_row',
        'level_indicator_color',
        'customize_indicator_color_group',
        'circle_widget_color',
        'customize_circle_widget_color_group',
    ],
}, class BatteryWidgetSettings extends Adw.PreferencesPage {
    constructor(settings) {
        super({});
        this._settings = settings;
        settings.bind(
            'disable-level-in-icon',
            this._disable_level_in_icon,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        settings.bind(
            'enable-battery-indicator-text',
            this._enable_battery_indicator_text,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        settings.bind(
            'indicator-size',
            this._indicator_size,
            'value',
            Gio.SettingsBindFlags.DEFAULT
        );
        settings.bind(
            'level-indicator-type',
            this._level_indicator_type,
            'selected',
            Gio.SettingsBindFlags.DEFAULT
        );
        settings.bind(
            'level-bar-position',
            this._level_bar_position,
            'selected',
            Gio.SettingsBindFlags.DEFAULT
        );
        settings.bind(
            'level-indicator-color',
            this._level_indicator_color,
            'selected',
            Gio.SettingsBindFlags.DEFAULT
        );

        settings.bind(
            'circle-widget-color',
            this._circle_widget_color,
            'selected',
            Gio.SettingsBindFlags.DEFAULT
        );

        settings.connect('changed::indicator-type', () => {
            this._updateIndicatorRowVisibility();
        });

        settings.connect('changed::panel-button-single-indicator', () => {
            this._updateIndicatorRowVisibility();
        });

        settings.connect('changed::disable-level-in-icon', () => {
            this._updateIndicatorRowVisibility();
            this._iconOnlyChanged();
        });

        settings.connect('changed::level-indicator-type', () => {
            this._updateIndicatorRowVisibility();
        });

        settings.connect('changed::level-bar-position', () => {
            this._updateIndicatorRowVisibility();
        });

        settings.connect('changed::level-indicator-color', () => {
            this._updateIndicatorRowVisibility();
        });

        settings.connect('changed::circle-widget-color', () => {
            this._customize_circle_widget_color_group.visible =
                        settings.get_int('circle-widget-color') === 2;
        });

        this._customize_circle_widget_color_group.visible =
                        settings.get_int('circle-widget-color') === 2;

        const indicatorColorKey = 'level-indicator-custom-colors';
        const circleWidgetColorKey = 'circle-widget-custom-colors';

        for (let level = 100; level >= 10; level -= 10) {
            const idx = Math.ceil(level / 10) - 1;
            const row = new CustomizeRow(settings, level, idx, indicatorColorKey);
            this._customize_indicator_color_group.add(row);
        }

        for (let level = 100; level >= 10; level -= 10) {
            const idx = Math.ceil(level / 10) - 1;
            const row = new CustomizeRow(settings, level, idx, circleWidgetColorKey);
            this._customize_circle_widget_color_group.add(row);
        }

        this._updateIndicatorRowVisibility();
        this._iconOnlyChanged();
    }

    _iconOnlyChanged() {
        const disableLevelInIcon = this._settings.get_boolean('disable-level-in-icon');
        this._level_indicator_type_row.sensitive = !disableLevelInIcon;
        this._level_bar_position_row.sensitive = !disableLevelInIcon;
        this._indicator_size.sensitive = !disableLevelInIcon;
        this._level_indicator_color_row.sensitive = !disableLevelInIcon;
    }

    _updateIndicatorRowVisibility() {
        const indicatorType = this._settings.get_int('indicator-type');
        const panelSingleIndicator = this._settings.get_boolean('panel-button-single-indicator');
        const settingsVisible = indicatorType === 1 ||
                        indicatorType === 2 && !panelSingleIndicator;

        if (settingsVisible) {
            this._indicator_widget_note_row.visible = false;
            this._disable_level_in_icon.visible = true;
            this._enable_battery_indicator_text.visible = true;
            this._level_indicator_type_row.visible = true;

            this._level_bar_position_row.visible =
                        this._settings.get_int('level-indicator-type') === 0;

            this._indicator_size.visible =
                        this._settings.get_int('level-indicator-type') === 1 ||
                        this._settings.get_int('level-indicator-type') === 0 &&
                        this._settings.get_int('level-bar-position') === 2;

            this._level_indicator_color_row.visible = true;

            this._customize_indicator_color_group.visible =
                this._settings.get_int('level-indicator-color') === 2;
        } else {
            this._indicator_widget_note_row.visible = true;
            this._disable_level_in_icon.visible = false;
            this._enable_battery_indicator_text.visible = false;
            this._level_indicator_type_row.visible = false;
            this._level_bar_position_row.visible = false;
            this._indicator_size.visible = false;
            this._level_indicator_color_row.visible = false;
            this._customize_indicator_color_group.visible = false;
        }
    }
});
