'use strict';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {AirpodsModelList} from '../lib/devices/airpods/airpodsConfig.js';

const  ConfigureWindow = GObject.registerClass({
}, class ConfigureWindow extends Adw.Window {
    _init(settings, mac, deviceItem, pathInfo, parentWindow) {
        super._init({
            title: pathInfo.alias,
            default_width: 580,
            default_height: 600,
            modal: true,
            transient_for: parentWindow,
        });

        const modelData = AirpodsModelList.find(m => m.key === pathInfo.model);

        const toolViewBar = new Adw.ToolbarView();

        const headerBar = new Adw.HeaderBar({
            decoration_layout: 'icon:close',
            show_end_title_buttons: true,
        });

        const page = new Adw.PreferencesPage();

        toolViewBar.add_top_bar(headerBar);
        toolViewBar.set_content(page);
        this.set_content(toolViewBar);

        const aliasGroup = new Adw.PreferencesGroup({
            title: `MAC: ${mac}`,
        });

        page.add(aliasGroup);

        const inEarSettingsGroup = new Adw.PreferencesGroup({
            title: _('Playback Behavior'),
        });

        const inEarSettingsRow = new Adw.ActionRow({
            title: _('Pause when device is not worn'),
            subtitle: _('Pause playback when the device is removed,' +
                    'resume when it is put back on'),
        });

        const inEarSettingsSwitch = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
        });

        inEarSettingsSwitch.active = pathInfo.inEarControl;
        inEarSettingsSwitch.connect('notify::active', () => {
            const pairedDevice = settings.get_strv('airpods-list');
            const existingPathIndex =
                pairedDevice.findIndex(item => JSON.parse(item).path === pathInfo.path);
            if (existingPathIndex !== -1) {
                const existingItem = JSON.parse(pairedDevice[existingPathIndex]);
                existingItem['in-ear-control-enabled'] = inEarSettingsSwitch.active;
                pairedDevice[existingPathIndex] = JSON.stringify(existingItem);
                settings.set_strv('airpods-list', pairedDevice);
            }
        });
        inEarSettingsRow.add_suffix(inEarSettingsSwitch);
        inEarSettingsGroup.add(inEarSettingsRow);
        page.add(inEarSettingsGroup);

        if (modelData.awarenessSupported) {
            const awarnessVolumeGroup = new Adw.PreferencesGroup({
                title: _('Volume Level'),
            });

            const adjustment = new Gtk.Adjustment({
                lower: 0,
                upper: 50,
                step_increment: 1,
                page_increment: 10,
                value: pathInfo.caVolume,
            });

            const awarnessVolumeRow = new Adw.SpinRow({
                title: _('Conversation awareness volume limit'),
                subtitle: _('Limits media volume to this percentage during conversation.' +
            ' Note: No change if current volume is below this level.'),
                adjustment,
                numeric: true,
            });

            awarnessVolumeRow.connect('notify::value', () => {
                const pairedDevice = settings.get_strv('airpods-list');
                const existingPathIndex =
                pairedDevice.findIndex(item => JSON.parse(item).path === pathInfo.path);
                if (existingPathIndex !== -1) {
                    const existingItem = JSON.parse(pairedDevice[existingPathIndex]);
                    existingItem['ca-volume'] = awarnessVolumeRow.value;
                    pairedDevice[existingPathIndex] = JSON.stringify(existingItem);
                    settings.set_strv('airpods-list', pairedDevice);
                }
            });

            awarnessVolumeGroup.add(awarnessVolumeRow);
            page.add(awarnessVolumeGroup);
        }

        if (modelData.adaptiveSupported) {
            const adaptiveLevelGroup = new Adw.PreferencesGroup({
                title: _('Customize Adaptive Audio'),
            });

            const adaptiveLevelRow = new Adw.ActionRow({
                title: _('Customize Adaptive Audio'),
                subtitle: _('Customize Adaptive Audio to allow more or less noise'),
            });

            const slider = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0, 100, 5);
            slider.margin_start = 50;
            slider.margin_end = 50;
            slider.margin_top = 4;
            slider.margin_bottom = 4;
            slider.add_mark(0, Gtk.PositionType.BOTTOM, _('Less'));
            slider.add_mark(50, Gtk.PositionType.BOTTOM, _('Default'));
            slider.add_mark(100, Gtk.PositionType.BOTTOM, _('More'));

            const adaptiveLevelSliderRow = new Adw.ActionRow();
            adaptiveLevelSliderRow.child = slider;

            slider.set_value(pathInfo.adaptiveLevel);

            slider.connect('value-changed', () => {
                const roundedValue = Math.round(slider.get_value() / 5) * 5;
                log(` emit value ${roundedValue}`);
                const pairedDevice = settings.get_strv('airpods-list');
                const existingPathIndex =
                pairedDevice.findIndex(item => JSON.parse(item).path === pathInfo.path);
                if (existingPathIndex !== -1) {
                    const existingItem = JSON.parse(pairedDevice[existingPathIndex]);
                    if (existingItem['adaptive-level'] !== roundedValue) {
                        existingItem['adaptive-level'] = roundedValue;
                        pairedDevice[existingPathIndex] = JSON.stringify(existingItem);
                        settings.set_strv('airpods-list', pairedDevice);
                    }
                }
            });

            adaptiveLevelGroup.add(adaptiveLevelRow);
            adaptiveLevelGroup.add(adaptiveLevelSliderRow);
            page.add(adaptiveLevelGroup);
        }
    }
}
);

const  DeviceItem = GObject.registerClass({
}, class DeviceItem extends Adw.ActionRow {
    constructor(settings, deviceItem, pathInfo) {
        super({});
        this._settings = settings;
        this._pathInfo = pathInfo;
        this._macAddress = this._pathToMacAddress(pathInfo.path);

        this._icon = new Gtk.Image({
            icon_name: `bbm-${this._pathInfo.icon}-symbolic`,
        });

        this._customiseButton = new Gtk.Button({
            icon_name: 'bbm-settings-symbolic',
            tooltip_text: _('Configure device.'),
            valign: Gtk.Align.CENTER,
        });

        this._customiseButton.connect('clicked', () => {
            const parentWindow = this._customiseButton.get_ancestor(Gtk.Window);
            const configureWindow =
                new ConfigureWindow(settings, this._macAddress, deviceItem,
                    this._pathInfo, parentWindow);
            configureWindow.present();
        });

        const airpodsLabel = _('AirPods/Beats');
        this._deleteButton = new Gtk.Button({
            icon_name: 'user-trash-symbolic',
            tooltip_text: _('The button is available after disabling %s mode').format(airpodsLabel),
            css_classes: ['destructive-action'],
            valign: Gtk.Align.CENTER,
        });

        this._deleteButton.connect('clicked', () => {
            const pairedDevices = settings.get_strv('airpods-list');
            const existingPathIndex = pairedDevices.findIndex(entry => {
                const parsedEntry = JSON.parse(entry);
                return parsedEntry.path === pathInfo.path;
            });

            if (existingPathIndex !== -1) {
                pairedDevices.splice(existingPathIndex, 1);
                settings.set_strv('airpods-list', pairedDevices);
            }
            this.get_parent().remove(this);
            deviceItem.delete(pathInfo.path);
        });

        const box = new Gtk.Box({spacing: 16});
        box.append(this._customiseButton);
        box.append(this._deleteButton);
        this.add_prefix(this._icon);
        this.add_suffix(box);

        this.updateProperites(pathInfo);
    }

    updateProperites(pathInfo) {
        this._pathInfo = pathInfo;
        this.title = pathInfo.alias;
        this.subtitle = this._macAddress;
        this._deleteButton.sensitive = !this._settings.get_boolean('enable-airpods-device');
    }

    _pathToMacAddress(path) {
        const indexMacAddress = path.indexOf('dev_') + 4;
        const macAddress = path.substring(indexMacAddress);
        return macAddress.replace(/_/g, ':');
    }
});


export const  Airpods = GObject.registerClass({
    GTypeName: 'BBM_Airpods',
    Template: GLib.Uri.resolve_relative(
        import.meta.url, '../ui/airpods.ui', GLib.UriFlags.NONE
    ),
    InternalChildren: [
        'row_airpods_device',
        'enable_airpods_device',
        'airpods_group',
        'no_airpods_paired_row',
    ],
}, class Airpods extends Adw.PreferencesPage {
    constructor(settings) {
        super({});
        this._settings = settings;
        this._deviceItems = new Map();
        this._attemptOnce  = 1;

        settings.bind(
            'enable-airpods-device',
            this._enable_airpods_device,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );

        this._createDevices();
        this._settings.connect('changed::enable-airpods-device', () => this._createDevices());
        this._settings.connect('changed::airpods-list', () => this._createDevices());
    }

    _createDevices() {
        const pathsString = this._settings.get_strv('airpods-list').map(JSON.parse);
        if (!pathsString || pathsString.length === 0) {
            this._no_airpods_paired_row.visible  = true;
            return;
        }
        this._no_airpods_paired_row.visible  = false;
        for (const info of pathsString) {
            const pathInfo = {
                path: info['path'],
                model: info['model'],
                icon: info['icon'],
                alias: info['alias'],
                inEarControl: info['in-ear-control-enabled'],
                caVolume: info['ca-volume'],
                adaptiveLevel: info['adaptive-level'],
            };
            if (!pathInfo.alias && this._attemptOnce > 0) {
                const pathsDeviceString = this._settings.get_strv('device-list').map(JSON.parse);
                if (!pathsDeviceString || pathsDeviceString.length === 0) {
                    return;
                } else {
                    const existingPathIndex =
                    pathsDeviceString.findIndex(item => item.path === pathInfo.path);
                    if (existingPathIndex !== -1) {
                        const existingItem = pathsDeviceString[existingPathIndex];
                        pathInfo.alias = existingItem.alias;
                        const currentItem = pathsString.find(item => item.path === pathInfo.path);
                        currentItem.alias = pathInfo.alias;
                        this._settings.set_strv('airpods-list',
                            pathsString.map(obj => JSON.stringify(obj)));
                        this._attemptOnce--;
                    }
                }
            }
            if (this._deviceItems.has(pathInfo.path)) {
                const row = this._deviceItems.get(pathInfo.path);
                row.updateProperites(pathInfo);
            } else {
                const deviceItem = new DeviceItem(this._settings, this._deviceItems, pathInfo);
                this._deviceItems.set(pathInfo.path, deviceItem);
                this._airpods_group.add(deviceItem);
            }
        }
    }
});

