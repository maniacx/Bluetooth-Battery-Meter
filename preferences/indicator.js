'use strict';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export const  Indicator = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_Indicator',
    Template: GLib.Uri.resolve_relative(
        import.meta.url, '../ui/indicator.ui', GLib.UriFlags.NONE
    ),
    InternalChildren: [
        'hide_bluetooth_indicator',
        'indicator_type',
        'panel_indicator_mode_group',
        'panel_button_indicator_mode',
        'indicator_settings_group',
        'enable_multi_indicator_mode',
        'on_hover_group',
        'enable_hover_on_mode',
        'hover_delay_spinrow',
        'enable_tooltips',
    ],
}, class Indicator extends Adw.PreferencesPage {
    constructor(settings) {
        super({});
        this._settings = settings;

        settings.bind(
            'hide-bluetooth-indicator',
            this._hide_bluetooth_indicator,
            'selected',
            Gio.SettingsBindFlags.DEFAULT
        );
        settings.bind(
            'indicator-type',
            this._indicator_type,
            'selected',
            Gio.SettingsBindFlags.DEFAULT
        );
        settings.bind(
            'panel-button-single-indicator',
            this._panel_button_indicator_mode,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        settings.bind(
            'enable-multi-indicator-mode',
            this._enable_multi_indicator_mode,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        settings.bind(
            'enable-on-hover-mode',
            this._enable_hover_on_mode,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        settings.bind(
            'enable-tooltip',
            this._enable_tooltips,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );

        settings.connect('changed::indicator-type', () => {
            this._updateVisibility();
        });

        settings.connect('changed::panel-button-single-indicator', () => {
            this._updateVisibility();
        });

        this._hover_delay_spinrow.connect('notify::value', spinrow => {
            settings.set_int('on-hover-delay', Math.round(spinrow.value * 1000));
        });

        settings.connect('changed::on-hover-delay', () => {
            this._hover_delay_spinrow.set_value(settings.get_int('on-hover-delay') / 1000);
        });
        this._hover_delay_spinrow.set_value(settings.get_int('on-hover-delay') / 1000);

        this._updateVisibility();
    }

    _updateVisibility() {
        const indicatorType = this._settings.get_int('indicator-type');
        const systemIndicatorEnabled =  indicatorType === 1;
        const panelButtonEnabled =  indicatorType === 2;
        this._on_hover_group.visible = systemIndicatorEnabled;
        this._panel_indicator_mode_group.visible = panelButtonEnabled;
        this._indicator_settings_group.visible = systemIndicatorEnabled ||
            panelButtonEnabled && !this._panel_button_indicator_mode.active;
    }
});

