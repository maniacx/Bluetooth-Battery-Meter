'use strict';
import Atk from 'gi://Atk';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Graphene from 'gi://Graphene';
import St from 'gi://St';
import * as BoxPointer from 'resource:///org/gnome/shell/ui/boxpointer.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import {PopupMenuWidget} from './popupMenuWidget.js';
import {adjustOpacityToRgba, colorGreyOpacity} from './colorHelpers.js';

export const BluetoothPopupSubMenuItem = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_BluetoothPopupSubMenuItem',
}, class BluetoothPopupSubMenuItem extends PopupMenu.PopupSubMenuMenuItem {
    _init(manager, device, qsLevelEnabled, deviceIcon) {
        super._init('', true);
        this.can_focus = false;
        this._manager = manager;
        this._toggle = manager._toggle;
        this._settings = this._toggle._settings;
        this._client = this._toggle._bluetoothToggle._client;
        this._gIcon = this._toggle.gIcon;
        this._connectedColor = this._toggle.connectedColor;
        this._disconnectedColor = null;
        this._device = device;
        this._iconType = deviceIcon;
        this._qsLevelEnabled = qsLevelEnabled;
        this._dataHandler = null;

        const themeNode = this.peek_theme_node();
        if (themeNode === null) {
            this._backgroundStyleChangeId = this.connect('style-changed', () => {
                const isStaged = this.get_stage();
                if (isStaged) {
                    if (this._backgroundStyleChangeId)
                        this.disconnect(this._backgroundStyleChangeId);
                    this._backgroundStyleChangeId = null;
                    this._buildUI(this.peek_theme_node());
                }
            });
        } else {
            this._buildUI(themeNode);
        }
    }

    _buildUI(themeNode) {
        this._disconnectedColor = themeNode.get_foreground_color();
        this._icon = new St.Icon({
            style_class: 'popup-menu-icon',
        });

        const focusBorderColor = adjustOpacityToRgba(this._manager._widgetInfo.accentColor, 0.65);
        this._styleBgOpacity20 = `background-color: ${colorGreyOpacity(0.20)};`;
        this._styleBgOpacity40 = `background-color: ${colorGreyOpacity(0.40)};`;
        this._styleBgOpacity90 = `background-color: ${colorGreyOpacity(0.85)};`;
        this._styleBgOpacity95 = `background-color: ${colorGreyOpacity(0.95)};`;
        this._styleBorderTransparent = 'border: 2px solid transparent;';
        this._styleBorderSolid = `border: 2px solid ${focusBorderColor};`;

        this.icon.gicon = this._gIcon(`bbm-${this._iconType}-symbolic.svg`);

        this._triangleButton =
            new St.Button({style_class: 'bbm-bt-menu-button', can_focus: true});
        this.replace_child(this._triangleBin, this._triangleButton);
        this._triangleButton.child = this._triangleBin;
        this._triangle.rotation_angle_z = 90;
        this._triangle.pivot_point = new Graphene.Point({x: 0.5, y: 0.5});
        this._triangleButton.visible = false;

        if (this._manager._dataHandler)
            this.setDataHandler(this._manager._dataHandler);

        this._pairIcon = new St.Icon({icon_size: 12});
        this._connectionButton =
            new St.Button({style_class: 'bbm-bt-menu-button', can_focus: true});
        this._connectionButton.child = this._pairIcon;
        this.add_child(this._connectionButton);

        this._device.bind_property('connectable',
            this, 'visible',
            GObject.BindingFlags.SYNC_CREATE);

        this._device.bind_property('alias',
            this.label, 'text',
            GObject.BindingFlags.SYNC_CREATE);

        this._device.bind_property_full('connected',
            this, 'accessible_name',
            GObject.BindingFlags.SYNC_CREATE,
            (bind, source) => [true, source ? _('Disconnect') : _('Connect')],
            null);


        this._assignPairingIcon(false);

        this.activate = __ => {};

        this._connectionButton.connectObject('clicked', () => {
            this._toggleConnected().catch(logError);
        }, this);

        this._triangleButton.connectObject('clicked', () => {
            this._setOpenState(!this._getOpenState());
        }, this);

        this._device.connectObject(
            'notify::connected', () => {
                this._assignPairingIcon(false);
                if (!this._device.connected && this._dataHandler) {
                    this._menuClose(BoxPointer.PopupAnimation.NONE);
                    this._triangleButton.visible = false;
                    this._dataHandler = null;
                    this._popupItem?.destroy();
                    this._popupItem = null;
                }
            },
            this
        );

        this.connectObject('destroy', () => {
            if (this._iconChangeTimerId)
                GLib.source_remove(this._iconChangeTimerId);
            this._iconChangeTimerId = null;
            if (this._backgroundStyleChangeId)
                this.disconnect(this._backgroundStyleChangeId);
            this._backgroundStyleChangeId = null;
        }, this);

        this.menu.open = animate => {
            this._menuOpen(animate);
        };
        this.menu.close = animate => {
            this._menuClose(animate);
        };

        this._capturePsuedoEvents(this._triangleButton);
        this._capturePsuedoEvents(this._connectionButton);
        this._updateStyle(this._triangleButton);
        this._updateStyle(this._connectionButton);
    }

    vfunc_key_press_event(event) {
        return PopupMenu.PopupMenuItem.prototype.vfunc_key_press_event.call(this, event);
    }

    _capturePsuedoEvents(widget) {
        widget.connectObject(
            'clicked', () => {
                this._updateStyle(widget);
            },
            'notify::checked', () => {
                this._updateStyle(widget);
            },
            'notify::hover', () => {
                this._updateStyle(widget);
            },
            'key-focus-in', () => {
                widget._hasFocus = true;
                this._updateStyle(widget);
            },
            'key-focus-out', () => {
                widget._hasFocus = false;
                this._updateStyle(widget);
            },
            this
        );
    }

    _updateStyle(widget) {
        let style = '';

        if (widget.checked && widget.hover)
            style += `${this._styleBgOpacity95} ${this._styleBorderTransparent}`;
        else if (widget.checked)
            style += `${this._styleBgOpacity90} ${this._styleBorderTransparent}`;
        else if (widget.hover)
            style += `${this._styleBgOpacity40} ${this._styleBorderTransparent}`;
        else
            style += `${this._styleBgOpacity20} ${this._styleBorderTransparent}`;


        if (widget._hasFocus)
            style += `${this._styleBorderSolid}`;
        else
            style += this._styleBorderTransparent;

        widget.set_style(style.trim());
    }

    updateProperties(qsLevelEnabled, deviceIcon) {
        /*        this._qsLevelEnabled = qsLevelEnabled;
        if (this._showBatteryIcon && this._batteryIcon) {
            this._batteryIcon.visible =
                this._qsLevelEnabled && this._manager.batteryPercentage > 0;
        }
        if (this._showBatteryPercentage && this._batteryPercentageLabel) {
            this._batteryPercentageLabel.visible =
                this._qsLevelEnabled && this._manager.batteryPercentage > 0;
        }*/
        if (this._iconType !== deviceIcon) {
            this._iconType = deviceIcon;
            this._icon?.set_gicon(this._gIcon(`bbm-${this._iconType}-symbolic.svg`));
        }
    }

    async _toggleConnected() {
        this._assignPairingIcon(true);
        await this._client.toggleDevice(this._device);
        this._assignPairingIcon(false);
    }

    _assignPairingIcon(toggleActivated) {
        if (toggleActivated) {
            if (this._iconChangeTimerId)
                GLib.source_remove(this._iconChangeTimerId);
            this._counter = 4;
            if (!this._device.connected)
                this._pairIcon?.set_style(`color: ${this._connectedColor};`);
            else
                this._pairIcon?.set_style(`color: ${this._disconnectedColor};`);

            const connected = this._device.connected;
            this._iconChangeTimerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
                this._pairIcon?.set_gicon(connected
                    ? this._gIcon(`bbm-bluetooth-disconnecting-${this._counter}-symbolic.svg`)
                    : this._gIcon(`bbm-bluetooth-connecting-${this._counter}-symbolic.svg`));
                this._counter = this._counter <= 1 ? 4 : this._counter - 1;
                return GLib.SOURCE_CONTINUE;
            });
        } else {
            if (this._iconChangeTimerId)
                GLib.source_remove(this._iconChangeTimerId);
            this._iconChangeTimerId = null;
            if (this._device.connected) {
                this._pairIcon?.set_gicon(this._gIcon('bbm-bluetooth-connected-symbolic.svg'));
                this._pairIcon?.set_style(`color: ${this._connectedColor};`);
            } else {
                this._pairIcon?.set_gicon(
                    this._gIcon('bbm-bluetooth-disconnecting-1-symbolic.svg'));
                this._pairIcon?.set_style(`color: ${this._disconnectedColor};`);
            }
        }
    }

    setDataHandler(dataHandler) {
        if (this._triangleButton && this._device.connected) {
            this._triangleButton.visible = true;
            if (!this._popupItem) {
                this._popupItem = new PopupMenuWidget(this._settings, this._gIcon,
                    this._device.get_object_path(), this._device.alias,
                    this._manager._widgetInfo, false, dataHandler);

                this.menu.addMenuItem(this._popupItem);
            }
        }
        this._dataHandler = dataHandler;
    }

    updateAlias(alias) {
        this._popupItem?.updateAlias?.(alias);
    }

    _subMenuOpenStateChanged(menu, open) {
        if (open) {
            this.add_style_pseudo_class('open');
            this._getTopMenu()._setOpenedSubMenu(this.menu);
            this.add_accessible_state(Atk.StateType.EXPANDED);
        } else {
            this.remove_style_pseudo_class('open');
            this._getTopMenu()._setOpenedSubMenu(null);
            this.remove_accessible_state(Atk.StateType.EXPANDED);
        }
    }

    _menuOpen(animate) {
        if (this.menu.isOpen)
            return;

        if (this.menu.isEmpty())
            return;

        this.menu.isOpen = true;
        this.menu.emit('open-state-changed', true);

        this.menu.actor.show();

        this.add_style_pseudo_class('checked');

        const targetAngle = this.menu.actor.text_direction === Clutter.TextDirection.RTL ? 90 : -90;

        const duration = animate ? 120 : 0;

        this.translation_y = 0;
        this.menu.actor.translation_y = 0;
        this.ease({translation_y: 6, duration, mode: Clutter.AnimationMode.LINEAR});

        const [, naturalHeight] = this.menu.actor.get_preferred_height(-1);
        this.menu.actor.height = 0;
        this.menu.actor.ease({
            height: naturalHeight,
            margin_bottom: 6 * 2,
            translation_y: 6,
            duration,
            mode: Clutter.AnimationMode.LINEAR,
            onComplete: () => this.menu.actor.set_height(-1),
        });
        this.menu._arrow.ease({
            rotation_angle_z: targetAngle,
            duration,
            mode: Clutter.AnimationMode.EASE_OUT_EXPO,
        });
    }

    _menuClose(animate) {
        if (!this.menu.isOpen)
            return;

        this.menu.isOpen = false;
        this.menu.emit('open-state-changed', false);

        if (this.menu._activeMenuItem)
            this.menu._activeMenuItem.active = false;

        const duration = animate ? 120 : 0;
        const targetAngle = this.menu.actor.text_direction === Clutter.TextDirection.RTL ? -90 : 90;

        this.translation_y = 6;
        this.menu.actor.translation_y = 6;
        this.ease({translation_y: 0, duration, mode: Clutter.AnimationMode.LINEAR});

        this.menu.actor.ease({
            height: 0,
            margin_bottom: 0,
            translation_y: 0,
            duration,
            mode: Clutter.AnimationMode.LINEAR,
            onComplete: () => {
                this.menu.actor.hide();
                this.menu.actor.set_height(-1);
                this.remove_style_pseudo_class('checked');
            },
        });
        this.menu._arrow.ease({
            rotation_angle_z: targetAngle,
            duration,
            mode: Clutter.AnimationMode.EASE_OUT_EXPO,
        });
    }
});


