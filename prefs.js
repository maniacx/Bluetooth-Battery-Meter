'use strict';
const {Gtk} = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const {QuickSettings} = Me.imports.preferences.quickSettings;
const {Indicator} = Me.imports.preferences.indicator;
const {Device} = Me.imports.preferences.device;
const {About} = Me.imports.preferences.about;


function fillPreferencesWindow(window) {
    const iconTheme = Gtk.IconTheme.get_for_display(window.get_display());
    const iconsDirectory = Me.dir.get_child('icons').get_path();
    iconTheme.add_search_path(iconsDirectory);

    const settings = ExtensionUtils.getSettings();
    window.set_default_size(650, 700);
    window.add(new QuickSettings(settings));
    window.add(new Indicator(settings));
    window.add(new Device(settings));
    window.add(new About(Me));
}

function init() {
    ExtensionUtils.initTranslations(Me.metadata.uuid);
}
