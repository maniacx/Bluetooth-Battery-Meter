'use strict';
const {Gtk} = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const {General} = Me.imports.preferences.general;
const {About} = Me.imports.preferences.about;


function fillPreferencesWindow(window) {
    const iconTheme = Gtk.IconTheme.get_for_display(window.get_display());
    const iconsDirectory = Me.dir.get_child('icons').get_path();
    iconTheme.add_search_path(iconsDirectory);

    const settings = ExtensionUtils.getSettings();
    window.set_default_size(650, 700);
    window.add(new General(settings));
    window.add(new About(Me));
}

function init() {
    ExtensionUtils.initTranslations(Me.metadata.uuid);
}
