'use strict';
import Gtk from 'gi://Gtk';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {General} from './preferences/general.js';
import {About} from './preferences/about.js';

export default class BluetoothBatteryMeterPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const iconTheme = Gtk.IconTheme.get_for_display(window.get_display());
        const iconsDirectory = this.dir.get_child('icons').get_path();
        iconTheme.add_search_path(iconsDirectory);

        const settings = this.getSettings();
        window.set_default_size(650, 700);
        window.add(new General(settings));
        window.add(new About(this));
    }
}
