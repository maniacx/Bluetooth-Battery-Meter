'use strict';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export const About = GObject.registerClass({
    GTypeName: 'BBM_About',
    Template: GLib.Uri.resolve_relative(import.meta.url, '../ui/about.ui', GLib.UriFlags.NONE),
    InternalChildren: [
        'stack',
        'extension_icon_image',
        'extension_name_label',
        'developer_name_label',
        'extension_version',
        'license_content',
        'copyright_content',
        'row_readme',
        'row_bug_report',
        'row_translation',
        'row_sources',
        'row_license',
        'button_back_legal',
        'box_legal',
        'label_legal',
    ],
}, class About extends Adw.PreferencesPage {
    constructor(extensionObject) {
        super({});

        const extensionIcon = 'bbm-logo';
        const developerName = 'maniacx@github.com';
        const copyrightYear = _('2024');
        const licenseName = _('GNU General Public License, version 3 or later');
        const licenseLink = 'https://www.gnu.org/licenses/gpl-3.0.html';

        this._extension_icon_image.icon_name = extensionIcon;
        this._extension_name_label.label = extensionObject.metadata.name;
        this._extension_version.label = extensionObject.metadata.version.toString();
        this._developer_name_label.label = developerName;
        this._copyright_content.label = _('© %s %s').format(copyrightYear, developerName);
        this._license_content.label = _('This application comes with absolutely no warranty. See the <a href="%s">%s</a> for details.').format(licenseLink, licenseName);

        this._linkPage('activated', this._row_license, 'page_legal');
        this._linkPage('clicked', this._button_back_legal, 'page_main');

        this._assignURL(this._row_readme, 'https://github.com/maniacx/Bluetooth-Battery-Meter#bluetooth-battery-meter-extension-for-gnome-shell');
        this._assignURL(this._row_bug_report, 'https://github.com/maniacx/Bluetooth-Battery-Meter/issues');
        this._assignURL(this._row_sources, 'https://github.com/maniacx/Bluetooth-Battery-Meter');
        this._assignURL(this._row_translation, 'https://github.com/maniacx/Bluetooth-Battery-Meter#translation');
    }

    _linkPage(signal, widget, page) {
        widget.connect(signal, () => {
            this._stack.set_visible_child_name(page);
        });
    }

    _assignURL(row, link) {
        row.set_tooltip_text(link);
        row.connect('activated', () => {
            Gio.AppInfo.launch_default_for_uri_async(link, null, null, null);
        });
    }
});
