'use strict';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {ServiceVersion} from '../lib/serviceVersion.js';

const BUDSLINK_BUS_NAME = 'io.github.maniacx.BudsLink';
const BUDSLINK_OBJECT_PATH = '/io/github/maniacx/BudsLink';
const BUDSLINK_INTERFACE = 'io.github.maniacx.BudsLink.DeviceManager';


export const  BudsLinkCompanion = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_BudsLinkCompanion',
    Template: GLib.Uri.resolve_relative(
        import.meta.url, '../ui/budslinkCompanion.ui', GLib.UriFlags.NONE
    ),
    InternalChildren: [
        'intro',
        'enable_companion',
        'install_status',
        'hide_background',
        'flathub_link',
        'documentation_link',
    ],
}, class BudsLinkCompanion extends Adw.PreferencesPage {
    constructor(settings) {
        super({});
        this._deviceItems = new Map();

        settings.bind(
            'enable-companion',
            this._enable_companion,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );

        settings.bind(
            'hide-budslink-background-apps',
            this._hide_background,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );

        /* eslint-disable max-len */
        const introSubtitle = _(
            'Install BudsLink from Flathub to monitor battery levels for multiple devices and access advanced controls such as noise control, equalizer, and gestures, when supported by the device'
        );
        /* eslint-enable max-len */

        const supportedDevicesLabel = _('Currently supported earbuds and headbands are:');

        const supportedDevices = [
            _('AirPods'),
            _('Beats'),
            _('Sony'),
            _('Samsung Galaxy Buds'),
            _('Nothing / CMF'),
            _('Bose'),
            _('Sennheiser'),
            _('Redmi / Xiaomi'),
        ].map(device => `• ${device}`).join('\n');

        this._intro.subtitle = `${introSubtitle}\n${supportedDevicesLabel}\n${supportedDevices}`;

        this._installedStatus = this._addStatus('bbm-check-round-symbolic',
            _('Installed'), ['success']);
        this._updateExtStatus = this._addStatus('bbm-warning-symbolic',
            _('Update Extension'), ['warning']);
        this._updateAppStatus = this._addStatus('bbm-warning-symbolic',
            _('Update BudsLink'), ['warning']);
        this._notInstalledStatus = this._addStatus('bbm-error-round-symbolic',
            _('Not Installed'), ['error']);

        this._refreshButton = new Gtk.Button({
            icon_name: 'bbm-refresh-symbolic',
            tooltip_text: _('Refresh'),
            css_classes: ['flat'],
            valign: Gtk.Align.CENTER,
            vexpand: false,
            visible: false,
        });

        this._refreshButton.connect('clicked', () => {
            this._updateSuffixButton();
        });

        this._install_status.add_suffix(this._installedStatus);
        this._install_status.add_suffix(this._updateExtStatus);
        this._install_status.add_suffix(this._updateAppStatus);
        this._install_status.add_suffix(this._notInstalledStatus);
        this._install_status.add_suffix(this._refreshButton);
        this._updateSuffixButton();
        this._watchBus();

        this._assignURL(this._flathub_link,
            'https://flathub.org/en/apps/io.github.maniacx.BudsLink');
        this._assignURL(this._documentation_link,
            'https://maniacx.github.io/BudsLink');
    }

    _assignURL(row, link) {
        row.set_tooltip_text(link);
        row.connect('activated', () => {
            Gio.AppInfo.launch_default_for_uri_async(link, null, null, null);
        });
    }

    _addStatus(icon, label, css) {
        const box = new Gtk.Box({
            spacing: 6,
            css_classes: css,
            valign: Gtk.Align.CENTER,
            vexpand: false,
            visible: false,
        });

        box.append(new Gtk.Image({
            icon_name: icon,
        }));

        box.append(new Gtk.Label({
            label,
        }));

        return box;
    }


    async _updateSuffixButton() {
        const service = await this._getServiceVersion();

        this._installedStatus.visible = service === ServiceVersion;
        this._notInstalledStatus.visible = service === null;
        this._refreshButton.visible = service === null;

        if (service && service !== ServiceVersion) {
            if (service > ServiceVersion)
                this._updateExtStatus.visible = true;
            else
                this._updateAppStatus.visible = true;
        }
    }

    async _getServiceVersion() {
        try {
            const result = await Gio.DBus.session.call(
                BUDSLINK_BUS_NAME,
                BUDSLINK_OBJECT_PATH,
                BUDSLINK_INTERFACE,
                'ServiceVersion',
                null,
                new GLib.VariantType('(s)'),
                Gio.DBusCallFlags.NONE,
                -1,
                null
            );

            return result.deepUnpack()[0];
        } catch {
            return null;
        }
    }

    _watchBus() {
        this._watchId = 0;
        this._watchId = Gio.bus_watch_name(
            Gio.BusType.SESSION,
            BUDSLINK_BUS_NAME,
            Gio.BusNameWatcherFlags.NONE,
            () => this._onServiceAppeared(),
            () => this._onServiceVanished()
        );
    }

    _onServiceAppeared() {
        this._updateSuffixButton();
    }

    _onServiceVanished() {
        this._updateSuffixButton();
    }

    destroy() {
        if (this._watchId) {
            Gio.bus_unwatch_name(this._watchId);
            this._watchId = 0;
        }
    }
});

