'use strict';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import * as Helper from '../lib/enhancedDeviceSupportHelper.js';

export const  EnhancedDeviceSupport = GObject.registerClass({
    GTypeName: 'BBM_EnhancedDeviceSupport',
    Template: GLib.Uri.resolve_relative(
        import.meta.url, '../ui/enhancedDeviceSupport.ui', GLib.UriFlags.NONE
    ),
    InternalChildren: [
        'group_incompatible',
        'group_enhanced_device_support',
        'row_enhanced_device_support',
        'enable_enhanced_device_mode',
        'enable_message_tray',
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
        this._group_incompatible.visible = false;
        settings.bind(
            'enable-enhanced-device-mode',
            this._enable_enhanced_device_mode,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        settings.bind(
            'enable-message-tray',
            this._enable_message_tray,
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

        const airpodsLabel = _('Airpods/Beats');
        const basLabel = _('Battery Service (BAS)');

        this._row_enhanced_device_support.subtitle =
            `${_('Enables advanced features via a Python script and custom UI elements:')
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

        this._checkPythonCompatibality();
    }

    _updateHoverDelaySensitivity() {
        const extendedModeEnabled = this._enable_enhanced_device_mode.active;
        const hoverModeEnabled = this._enable_hover_on_mode.active;
        this._hover_delay_spinrow.sensitive = extendedModeEnabled && hoverModeEnabled;
    }

    async _checkPythonCompatibality() {
        this._group_incompatible.visible = false;
        const pythonInstalled = Helper.isPythonInstalled();
        if (!pythonInstalled) {
            this._group_incompatible.visible = true;
            this._group_enhanced_device_support.visible = false;
            const incompatibleTitle = _('Python 3 is not installed or not found in PATH.');
            const incompatibleSubtitle = _('Please install Python 3.11 or ' +
                'ensure it is accessible from the command line.');

            this._group_incompatible.title = incompatibleTitle;
            this._group_incompatible.description = incompatibleSubtitle;
            return;
        }
        const resourceDir = `${this._extensionPath}/resources`;
        const pyCheckPath = `${resourceDir}/pycheck.py`;
        const isPythonComaptible = await Helper.isPythonEnvironmentCompatible(pyCheckPath);
        if (!isPythonComaptible.includes('available')) {
            this._group_incompatible.visible = true;
            this._group_enhanced_device_support.visible = false;

            const messages = [];

            if (isPythonComaptible.includes('version-incompatible'))
                messages.push(`- ${_('Python version is below 3.11')}`);

            if (isPythonComaptible.includes('socket-missing'))
                messages.push(`- ${_('Python Bluetooth socket not available')}`);

            if (isPythonComaptible.includes('pyobject-missing'))
                messages.push(`- ${_('PyGObject (gi.repository) is not available.')}`);

            const joined = messages.join('\n');
            this._group_incompatible.title =
                    _('Python environment issues:\n\n%s').format(joined);
        }
    }
});
