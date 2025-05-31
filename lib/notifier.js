'use strict';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

const NotificationDestroyedReason = MessageTray.NotificationDestroyedReason;
const Urgency = MessageTray.Urgency;

const [major] = Config.PACKAGE_VERSION.split('.');
const shellVersion = Number.parseInt(major);

export class Notifier {
    constructor(gIcon) {
        this._gIcon = gIcon;
        this._name = _('Bluetooth Battery Meter');
    }

    _notify(msg) {
        const notifyIcon = this._gIcon('bbm-logo-symbolic.svg');
        const notifyTitle = shellVersion <= 45 ? this._name : _('Bluetooth Battery Meter Error');

        if (shellVersion <= 45)
            this._source = new MessageTray.Source(this._name);
        else
            this._source = new MessageTray.Source({title: this._name, icon: notifyIcon});

        Main.messageTray.add(this._source);

        if (this._notification)
            this._notification.destroy(NotificationDestroyedReason.REPLACED);

        if (shellVersion <= 45) {
            this._notification = new MessageTray.Notification(
                this._source, notifyTitle, msg, {gicon: notifyIcon});
            this._notification.setTransient(true);
        } else {
            this._notification = new MessageTray.Notification({
                source: this._source, title: notifyTitle, body: msg, isTransient: true,
            });
        }

        this._notification.urgency = Urgency.CRITICAL; ;
        if (shellVersion <= 45)
            this._source.showNotification(this._notification);
        else
            this._source.addNotification(this._notification);
    }

    notifyPythonNotInstalled() {
        const incompatibleInfo = _('Python 3 is not installed or not found in PATH.');
        const incompatibleAction = _('Please install Python 3.11 or ' +
                'ensure it is accessible from the command line.');
        this._notify(`${incompatibleInfo} ${incompatibleAction}`);
    }

    notifyPythonIssues(issues) {
        const messages = [];

        if (issues.includes('version-incompatible'))
            messages.push(`- ${_('Python version is below 3.11')}`);

        if (issues.includes('socket-missing'))
            messages.push(`- ${_('Python Bluetooth socket not available')}`);

        if (issues.includes('pyobject-missing'))
            messages.push(`- ${_('PyGObject (gi.repository) is not available.')}`);

        const joined = messages.join('\n');
        this._notify(_('Python environment issues:\n\n%s').format(joined));
    }

    _removeActiveNofications() {
        if (this._notification)
            this._notification.destroy(NotificationDestroyedReason.SOURCE_CLOSED);
        this._notification = null;
    }

    destroy() {
        this._removeActiveNofications();
    }
}
