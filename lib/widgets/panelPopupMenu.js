'use strict';
import Atk from 'gi://Atk';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {PopupMenuWidget} from './popupMenuWidget.js';

export const PanelPopupMenu = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_PanelPopupMenu',
}, class PanelPopupMenu extends PopupMenu.PopupSubMenuMenuItem {
    _init(settings, gIcon, path, alias, widgetInfo, showPinButton, dataHandler) {
        super._init(alias, true);
        this.style = 'min-width: 15em;';
        this._gIcon = gIcon;
        this.icon.gicon = gIcon(`bbm-${dataHandler.getConfig().commonIcon}-symbolic.svg`);
        this._popupItem = new PopupMenuWidget(
            settings, gIcon, path, alias, widgetInfo, showPinButton, dataHandler);
        this.menu.addMenuItem(this._popupItem);

        this.menu.open = animate => {
            this._menuOpen(animate);
        };
        this.menu.close = animate => {
            this._menuClose(animate);
        };
    }

    updatePinButton() {
        this._popupItem?.updatePinButton();
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

        const targetAngle = this.menu.actor.text_direction === Clutter.TextDirection.RTL ? -90 : 90;

        const duration = animate ? 250 : 0;

        this.translation_y = 0;
        this.menu.actor.translation_y = 0;
        this.ease({translation_y: 6, duration, mode: Clutter.AnimationMode.EASE_OUT_EXPO});

        const [, naturalHeight] = this.menu.actor.get_preferred_height(-1);
        this.menu.actor.height = 0;
        this.menu.actor.ease({
            height: naturalHeight,
            margin_bottom: 6 * 2,
            translation_y: 6,
            duration,
            mode: Clutter.AnimationMode.EASE_OUT_EXPO,
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

        const duration = animate ? 250 : 0;

        this.translation_y = 6;
        this.menu.actor.translation_y = 6;
        this.ease({translation_y: 0, duration, mode: Clutter.AnimationMode.EASE_OUT_EXPO});

        this.menu.actor.ease({
            height: 0,
            margin_bottom: 0,
            translation_y: 0,
            duration,
            mode: Clutter.AnimationMode.EASE_OUT_EXPO,
            onComplete: () => {
                this.menu.actor.hide();
                this.menu.actor.set_height(-1);
                this.remove_style_pseudo_class('checked');
            },
        });
        this.menu._arrow.ease({
            rotation_angle_z: 0,
            duration,
            mode: Clutter.AnimationMode.EASE_OUT_EXPO,
        });
    }
});

