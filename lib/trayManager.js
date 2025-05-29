'use strict';
import GObject from 'gi://GObject';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as MessageList from 'resource:///org/gnome/shell/ui/messageList.js';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import {TrayMessage} from './widgets/trayMessage.js';

const [major] = Config.PACKAGE_VERSION.split('.');
const shellVersion = Number.parseInt(major);

export const TrayManager = GObject.registerClass(
class TrayManager extends GObject.Object {
    _init(gIcon, widgetInfo) {
        super._init();
        try {
            if (shellVersion <= 47)
                this._mediaSection = Main.panel.statusArea.dateMenu._messageList._mediaSection;
            else
                this._messageView = Main.panel.statusArea.dateMenu._messageList._messageView;
        } catch {
            return;
        }

        this._gIcon = gIcon;
        this._widgetInfo = widgetInfo;
        this._deviceMap = new Map();
    }

    addDevice(path, alias, dataHandler) {
        let messageWidget = null;
        if (this._deviceMap.has(path))
            return messageWidget;
        let messageArgs;
        if (shellVersion <= 45) {
            messageArgs = ['', ''];
        } else {
            const source  = new MessageList.Source(
                {title: _(alias), icon: this._gIcon('bbm-logo-symbolic.svg')});
            messageArgs = [source, '', ''];
        }
        messageWidget = new TrayMessage(
            messageArgs, this._gIcon, alias, this._widgetInfo, dataHandler);

        if (shellVersion <= 47)
            this._mediaSection.addMessage(messageWidget, true);
        else
            this._messageView._addMessageAtIndex(messageWidget, 0);

        this._deviceMap.set(path, messageWidget);
        return messageWidget;
    }

    removeDevice(path) {
        if (this._deviceMap.has(path)) {
            let messageWidget = this._deviceMap.get(path);

            if (shellVersion <= 47)
                this._mediaSection?.removeMessage(messageWidget, true);
            else
                this._messageView?._removeMessage(messageWidget);

            messageWidget = null;
            this._deviceMap.delete(path);
        }
    }

    destroy() {
        if (shellVersion <= 47) {
            this._deviceMap.forEach(messageWidget => {
                this._mediaSection?.removeMessage(messageWidget, true);
                messageWidget = null;
            });
        } else {
            this._deviceMap.forEach(messageWidget => {
                this._messageView?._removeMessage(messageWidget);
                messageWidget = null;
            });
        }
        this._deviceMap.clear();
    }
});


