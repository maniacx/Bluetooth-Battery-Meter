'use strict';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export const  EnhancedDeviceSupport = GObject.registerClass({
    GTypeName: 'BBM_EnhancedDeviceSupport',
    Template: GLib.Uri.resolve_relative(
        import.meta.url, '../ui/enhancedDeviceSupport.ui', GLib.UriFlags.NONE
    ),
    InternalChildren: [
        'row_enhanced_device_support',
        'enable_enhanced_device_mode',
        'enable_panel_button_mode',
        'enable_hover_on_mode',
        'enable_multi_indicator_mode',
        'hover_delay_spinrow',
        'circle_widget_color',
    ],
}, class EnhancedDeviceSupport extends Adw.PreferencesPage {
    constructor(settings, extensionPath) {
        super({});
        this._extensionPath = extensionPath;
        settings.bind(
            'enable-enhanced-device-mode',
            this._enable_enhanced_device_mode,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );

        settings.bind(
            'enable-panel-button-mode',
            this._enable_panel_button_mode,
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
            'circle-widget-color',
            this._circle_widget_color,
            'selected',
            Gio.SettingsBindFlags.DEFAULT
        );

        const airpodsLabel = _('AirPods/Beats');
        const basLabel = _('Battery Service (BAS)');

        this._row_enhanced_device_support.subtitle =
            `${_('Enables advanced features and custom UI elements:')
            }\n- ${airpodsLabel
            }\n- ${basLabel}`;

        this._enable_enhanced_device_mode.connect('notify::active', () => {
            this._updateHoverDelaySensitivity();
        });
        this._enable_hover_on_mode.connect('notify::active', () => {
            this._updateHoverDelaySensitivity();
        });

        this._hover_delay_spinrow.set_value(settings.get_int('on-hover-delay') / 1000);

        this._hover_delay_spinrow.connect('notify::value', spinrow => {
            settings.set_int('on-hover-delay', Math.round(spinrow.value * 1000));
        });

        settings.connect('changed::on-hover-delay', () => {
            this._hover_delay_spinrow.set_value(settings.get_int('on-hover-delay') / 1000);
        });
    }

    _updateHoverDelaySensitivity() {
        const extendedModeEnabled = this._enable_enhanced_device_mode.active;
        const hoverModeEnabled = this._enable_hover_on_mode.active;
        this._hover_delay_spinrow.sensitive = extendedModeEnabled && hoverModeEnabled;
    }
});
