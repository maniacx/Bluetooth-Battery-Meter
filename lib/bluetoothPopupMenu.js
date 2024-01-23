'use strict';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

export const BluetoothDeviceItem = GObject.registerClass({
    Properties: {
        'batteryPercentage': GObject.ParamSpec.string('batteryPercentage', '', '',
            GObject.ParamFlags.READWRITE,
            null),
    },
}, class BluetoothDeviceItem extends PopupMenu.PopupBaseMenuItem {
    constructor(device, client, extensionObj, supportedIcons, showBatteryPercentage, showBatteryIcon, swapIconText) {
        super({
            style_class: 'bt-device-item',
        });
        this._device = device;
        this._client = client;
        this._extensionObj = extensionObj;
        this._iconSupported = supportedIcons.includes(this._device.icon);
        this._showBatteryPercentage = showBatteryPercentage;
        this._showBatteryIcon = showBatteryIcon;
        this._swapIconText = swapIconText;

        this._icon = new St.Icon({
            style_class: 'popup-menu-icon',
        });
        this.add_child(this._icon);

        this._label = new St.Label({
            x_expand: true,
        });
        this.add_child(this._label);

        if (this._swapIconText) {
            this._displayBatteryLevelIcon();
            this._displayBatteryLevelTextPercentage();
        } else {
            this._displayBatteryLevelTextPercentage();
            this._displayBatteryLevelIcon();
        }

        this._pairIcon = new St.Icon({
            style_class: 'popup-menu-icon',
        });
        this.add_child(this._pairIcon);

        this._device.bind_property('connectable',
            this, 'visible',
            GObject.BindingFlags.SYNC_CREATE);

        this._device.bind_property('icon',
            this._icon, 'icon-name',
            GObject.BindingFlags.SYNC_CREATE);

        this._device.bind_property('alias',
            this._label, 'text',
            GObject.BindingFlags.SYNC_CREATE);

        this._device.bind_property('battery_percentage',
            this, 'batteryPercentage',
            GObject.BindingFlags.SYNC_CREATE);

        this._device.bind_property_full('connected',
            this, 'accessible_name',
            GObject.BindingFlags.SYNC_CREATE,
            (bind, source) => [true, source ? _('Disconnect') : _('Connect')],
            null);

        this._assignPairingIcon(false);

        this.activate = __ => {
            this._toggleConnected().catch(logError);
        };

        this._device.connectObject(
            'notify::connected', () => {
                this._assignPairingIcon(false);
            },
            this
        );

        this.connectObject('destroy', () => {
            if (this._iconChangeTimerId)
                GLib.source_remove(this._iconChangeTimerId);
            this._iconChangeTimerId = null;
            if (this._idleTimerId)
                GLib.source_remove(this._idleTimerId);
            this._idleTimerId = null;
        }, this);
    }

    _displayBatteryLevelTextPercentage() {
        if (this._showBatteryPercentage && this._iconSupported) {
            this._batteryPercentageLabel = new St.Label({text: '100%'});
            this.add_child(this._batteryPercentageLabel);
            if (this._idleTimerId)
                GLib.source_remove(this._idleTimerId);
            this._idleTimerId = GLib.idle_add(GLib.PRIORITY_LOW, () => {
                if (!this._batteryPercentageLabel.get_parent())
                    return GLib.SOURCE_CONTINUE;
                if (this._swapIconText) {
                    this._batteryPercentageLabel.set_width(this._batteryPercentageLabel.get_width());
                    this._batteryPercentageLabel.style_class = 'bbm-bt-percentage-label';
                }
                this._batteryPercentageLabel.text = '';
                this._bindLabel();
                return GLib.SOURCE_REMOVE;
            });
        }
    }

    _bindLabel() {
        this._device.bind_property_full('battery_percentage',
            this._batteryPercentageLabel, 'visible',
            GObject.BindingFlags.SYNC_CREATE,
            (bind, source) => [true, source > 0], null);

        this._device.bind_property_full('battery_percentage',
            this._batteryPercentageLabel, 'text',
            GObject.BindingFlags.SYNC_CREATE,
            (bind, source) => [true, `${source}%`], null);

        this._idleTimerId = null;
    }

    _displayBatteryLevelIcon() {
        if (this._showBatteryIcon && this._iconSupported) {
            this._batteryIcon = new St.Icon({
                style_class: 'popup-menu-icon',
            });
            this.add_child(this._batteryIcon);

            this._device.bind_property_full('battery_percentage',
                this._batteryIcon, 'visible',
                GObject.BindingFlags.SYNC_CREATE,
                (bind, source) => [true, source > 0], null);

            this._device.bind_property_full('battery_percentage',
                this._batteryIcon, 'icon-name',
                GObject.BindingFlags.SYNC_CREATE,
                (bind, source) => [true, source <= 0 ? '' : `battery-level-${10 * Math.floor(source / 10)}-symbolic`],
                null);
        }
    }

    async _toggleConnected() {
        this._assignPairingIcon(true, this._device.connected);
        await this._client.toggleDevice(this._device);
        this._assignPairingIcon(false);
    }

    _assignPairingIcon(toggleActivated, connected) {
        if (toggleActivated) {
            if (this._iconChangeTimerId)
                GLib.source_remove(this._iconChangeTimerId);
            this._counter = 4;
            this._iconChangeTimerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
                this._pairIcon?.set_gicon(connected ? this._getIcon(`bbm-bluetooth-disconnecting-${this._counter}-symbolic`)
                    : this._getIcon(`bbm-bluetooth-connecting-${this._counter}-symbolic`));
                this._counter = this._counter <= 1 ? 4 : this._counter - 1;
                return GLib.SOURCE_CONTINUE;
            });
        } else {
            if (this._iconChangeTimerId)
                GLib.source_remove(this._iconChangeTimerId);
            this._iconChangeTimerId = null;
            if (this._device.connected) {
                this._pairIcon?.set_gicon(this._getIcon('bbm-bluetooth-connected-symbolic'));
                this._pairIcon?.add_style_class_name('shell-link');
            } else {
                this._pairIcon?.set_gicon(this._getIcon('bbm-bluetooth-disconnecting-1-symbolic'));
                this._pairIcon?.remove_style_class_name('shell-link');
            }
        }
    }

    _getIcon(iconName) {
        return Gio.icon_new_for_string(`${this._extensionObj.path}/icons/hicolor/scalable/actions/${iconName}.svg`);
    }
});


