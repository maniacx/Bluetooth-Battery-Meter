'use strict';
import Adw from 'gi://Adw';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import {AirpodsModelList} from '../lib/devices/airpods/airpodsConfig.js';

export const  ConfigureWindow = GObject.registerClass({
}, class ConfigureWindow extends Adw.Window {
    _init(settings, mac, devicePath, parentWindow, _) {
        const pathsString = settings.get_strv('airpods-list').map(JSON.parse);
        const pathInfo = pathsString.find(info => info.path === devicePath);

        super._init({
            title: pathInfo.alias,
            default_width: 580,
            default_height: 600,
            modal: true,
            transient_for: parentWindow ?? null,
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

        inEarSettingsSwitch.active = pathInfo['in-ear-control-enabled'];
        inEarSettingsRow.add_suffix(inEarSettingsSwitch);
        inEarSettingsGroup.add(inEarSettingsRow);
        page.add(inEarSettingsGroup);

        inEarSettingsSwitch.connect('notify::active', () => {
            const pairedDevice = settings.get_strv('airpods-list');
            const existingPathIndex =
                pairedDevice.findIndex(item => JSON.parse(item).path === devicePath);
            if (existingPathIndex !== -1) {
                const existingItem = JSON.parse(pairedDevice[existingPathIndex]);
                existingItem['in-ear-control-enabled'] = inEarSettingsSwitch.active;
                pairedDevice[existingPathIndex] = JSON.stringify(existingItem);
                settings.set_strv('airpods-list', pairedDevice);
            }
        });

        if (modelData.awarenessSupported) {
            const awarnessVolumeGroup = new Adw.PreferencesGroup({
                title: _('Volume Level'),
            });

            const adjustment = new Gtk.Adjustment({
                lower: 0,
                upper: 50,
                step_increment: 1,
                page_increment: 10,
                value: pathInfo['ca-volume'],
            });

            const awarnessVolumeRow = new Adw.SpinRow({
                title: _('Conversation awareness volume limit'),
                subtitle: _('Limits media volume to this percentage during conversation.' +
            ' Note: No change if current volume is below this level.'),
                adjustment,
                numeric: true,
            });

            awarnessVolumeGroup.add(awarnessVolumeRow);
            page.add(awarnessVolumeGroup);

            awarnessVolumeRow.connect('notify::value', () => {
                const pairedDevice = settings.get_strv('airpods-list');
                const existingPathIndex =
                pairedDevice.findIndex(item => JSON.parse(item).path === devicePath);
                if (existingPathIndex !== -1) {
                    const existingItem = JSON.parse(pairedDevice[existingPathIndex]);
                    existingItem['ca-volume'] = awarnessVolumeRow.value;
                    pairedDevice[existingPathIndex] = JSON.stringify(existingItem);
                    settings.set_strv('airpods-list', pairedDevice);
                }
            });

            this._settingsSignal = settings.connect('changed::airpods-list', () => {
                const updatedList = settings.get_strv('airpods-list').map(JSON.parse);
                const updatedInfo = updatedList.find(info => info.path === devicePath);
                if (updatedInfo) {
                    this.title = updatedInfo.alias;
                    inEarSettingsSwitch.active = updatedInfo['in-ear-control-enabled'];
                    if (modelData.awarenessSupported)
                        adjustment.value = updatedInfo['ca-volume'];
                }
            });
        }
    }
}
);


