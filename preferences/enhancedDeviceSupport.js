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

        const airpodsLabel = _('AirPods/Beats');
        const basLabel = _('Battery Service (BAS)');

        this._row_enhanced_device_support.subtitle =
            `${_('Enables advanced features and custom UI elements:')
            }\n- ${airpodsLabel
            }\n- ${basLabel}`;

        this._enable_enhanced_device_mode.connect('notify::active', () => {
            this._updateHoverDelaySensitivity();
        });
    }
});
