'use strict';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
import GObject from 'gi://GObject';
import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const  CustomizeRow = GObject.registerClass({
}, class CustomizeRow extends Adw.ActionRow {
    constructor(settings, level) {
        super({});
        this.title = _('Assign color for %d – %d%%').format(level - 10, level);
        this.subtitle = _('Set color for the battery level range of %d – %d%%')
            .format(level - 10, level);

        const major = Gtk.get_major_version();
        const minor = Gtk.get_minor_version();

        let colorButton;
        let signalEmitted;
        if (major > 4 || major === 4 && minor >= 10) {
            signalEmitted = 'notify::rgba';
            const colorDialog = new Gtk.ColorDialog({
                with_alpha: false,
            });
            colorButton = new Gtk.ColorDialogButton({
                dialog: colorDialog,
            });
        } else {
            signalEmitted = 'color-set';
            colorButton = new Gtk.ColorButton();
        }

        colorButton.valign = Gtk.Align.CENTER;
        colorButton.halign = Gtk.Align.END;
        const entry = new Gtk.Entry({
            valign: Gtk.Align.CENTER,
            halign: Gtk.Align.END,
            max_length: 7,
        });

        this.add_suffix(colorButton);
        this.add_suffix(entry);

        const props = `color-${level}`;
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
            settings.set_string(props, hexColor);
        });

        entry.connect('changed', () => {
            const text = entry.get_text().trim();
            if (isValidHexColor(text)) {
                settings.set_string(props, text);
                const rgba = hexToRgba(text);
                colorButton.set_rgba(rgba);
            }
        });

        settings.connect(`changed::${props}`, () => {
            const color = settings.get_string(props);
            entry.set_placeholder_text(color);
            const rgba = hexToRgba(color);
            colorButton.set_rgba(rgba);
        });

        const color = settings.get_string(props);
        entry.set_placeholder_text(color);
        const rgba = hexToRgba(color);
        colorButton.set_rgba(rgba);
    }
});

export const  Indicator = GObject.registerClass({
    GTypeName: 'BBM_Indicator',
    Template: GLib.Uri.resolve_relative(
        import.meta.url, '../ui/indicator.ui', GLib.UriFlags.NONE
    ),
    InternalChildren: [
        'enable_battery_indicator',
        'enable_battery_indicator_text',
        'hide_bluetooth_indicator',
        'indicator_size',
        'level_indicator_type',
        'level_indicator_color',
        'customize_color_group',
    ],
}, class Indicator extends Adw.PreferencesPage {
    constructor(settings) {
        super({});

        settings.bind(
            'enable-battery-indicator',
            this._enable_battery_indicator,
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
            'hide-bluetooth-indicator',
            this._hide_bluetooth_indicator,
            'selected',
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
            'level-indicator-color',
            this._level_indicator_color,
            'selected',
            Gio.SettingsBindFlags.DEFAULT
        );

        settings.connect('changed::level-indicator-color', () => {
            this._customize_color_group.visible = settings.get_int('level-indicator-color') === 2;
        });

        this._customize_color_group.visible = settings.get_int('level-indicator-color') === 2;

        for (let i = 100; i >= 10; i -= 10) {
            const row = new CustomizeRow(settings, i);
            this._customize_color_group.add(row);
        }
    }
});
