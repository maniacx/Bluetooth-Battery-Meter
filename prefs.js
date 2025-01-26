'use strict';
import Gtk from 'gi://Gtk';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {QuickSettings} from './preferences/quickSettings.js';
import {Indicator} from './preferences/indicator.js';
import {Device} from './preferences/device.js';
import {UpowerDevices} from './preferences/upowerDevices.js';
import {About} from './preferences/about.js';

export default class BluetoothBatteryMeterPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const iconTheme = Gtk.IconTheme.get_for_display(window.get_display());
        const iconsDirectory = this.dir.get_child('icons').get_path();
        iconTheme.add_search_path(iconsDirectory);

        const settings = this.getSettings();
        window.set_default_size(650, 700);
        window.add(new QuickSettings(settings));
        window.add(new Indicator(settings));
        window.add(new Device(settings));
        window.add(new UpowerDevices(settings));
        window.add(new About(this));
    }
}
