'use strict';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import {BatterySetWidget} from './batterySetWidget.js';
import {ToggleButtonsSet} from './toggleButtonsSet.js';
import {OptionsBox} from './optionsBox.js';
import {adjustOpacityToRgba, colorGreyOpacity} from './colorHelpers.js';

const [major] = Config.PACKAGE_VERSION.split('.');
const shellVersion = Number.parseInt(major);
const boxLayoutProps = shellVersion >= 48
    ? {orientation: Clutter.Orientation.VERTICAL} : {vertical: true};

export const PopupMenuWidget = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_PopupMenuWidget',
}, class PopupMenuWidget extends PopupMenu.PopupBaseMenuItem {
    _init(settings, gIcon, path, alias, widgetInfo, showPinButton, dataHandler) {
        super._init({
            activate: false,
            hover: false,
            can_focus: false,
        });
        this.add_style_class_name('bbm-popup-menu');
        this._settings = settings;
        this._gIcon = gIcon;
        this._path = path;
        this._alias = alias;
        this._widgetInfo = widgetInfo;
        this._dataHandler = dataHandler;
        this._config = this._dataHandler.getConfig();
        this._showPinButton = showPinButton;
        this._colorInfo = {isDarkMode: widgetInfo.isDarkMode, accentColor: widgetInfo.accentColor};

        const themeNode = this.peek_theme_node();
        if (themeNode === null) {
            this.connectObject('style-changed', () => {
                const isStaged = this.get_stage();
                if (isStaged) {
                    this.disconnectObject(this);
                    this._finalizeWidget(this.peek_theme_node());
                }
            }, this);
        } else {
            this._finalizeWidget(themeNode);
        }
    }

    _finalizeWidget(themeNode) {
        this._colorInfo.foregroundColor = themeNode.get_foreground_color();
        const theme = St.ThemeContext.get_for_stage(global.stage);
        const scaleFactor = theme.scaleFactor * 16;
        const batteryIconSize = scaleFactor * 2;
        const vbox = new St.BoxLayout({...boxLayoutProps, x_expand: true});
        this.add_child(vbox);
        const titleHbox = new St.BoxLayout({x_expand: true});
        vbox.add_child(titleHbox);

        const modelLabel = new St.Label({style_class: 'bbm-panel-label-model'});
        modelLabel.text = this._alias;
        titleHbox.add_child(modelLabel);
        if (this._showPinButton) {
            const pinSpacer = new St.Bin({x_expand: true});
            this._pinIcon = new St.Icon({
                style_class: 'bbm-pin-icon',
            });
            this._pinButton = new St.Button({
                style_class: 'bbm-pin-button',
                y_expand: false,
                can_focus: true,
                y_align: Clutter.ActorAlign.CENTER,
            });
            this._pinButton.child = this._pinIcon;
            titleHbox.add_child(pinSpacer);
            titleHbox.add_child(this._pinButton);
            this._addStylePinButton();
        }

        const infoHbox = new St.BoxLayout({x_expand: true});
        vbox.add_child(infoHbox);

        this._modelIcon = new St.Icon({
            style_class: 'bbm-panel-icon',
            icon_size: 56,
            y_expand: true,
        });
        infoHbox.add_child(this._modelIcon);
        this._modelIcon.gicon = this._gIcon(`bbm-art-${this._config.albumArtIcon}.png`);
        this._batteryBox =  new St.BoxLayout({x_expand: true});
        infoHbox.add_child(this._batteryBox);
        const startBin = new St.Bin({style_class: 'bbm-panel-start-bin'});
        this._batteryBox.add_child(startBin);

        this._batterySetWidget = new BatterySetWidget(
            batteryIconSize, this._widgetInfo, this._dataHandler);
        this._batteryBox.add_child(this._batterySetWidget);

        const button1Enabled = this._config.toggle1Button1Icon && this._config.toggle1Button2Icon;
        const button2Enabled = this._config.toggle2Button1Icon && this._config.toggle2Button2Icon;

        if (button1Enabled) {
            this._menuSeparator1 = new St.Widget({
                style_class: 'bbm-menu-separator',
                x_expand: true,
            });
            vbox.add_child(this._menuSeparator1);

            this._set1ToggleButtons =
                new ToggleButtonsSet(this._gIcon, this._colorInfo, false, this._dataHandler);
            vbox.add_child(this._set1ToggleButtons);

            this._set1ToggleButtons.bind_property('visible',
                this._menuSeparator1, 'visible',
                GObject.BindingFlags.SYNC_CREATE);

            const boxes = [
                this._config.optionsBox1,
                this._config.optionsBox2,
                this._config.optionsBox3,
                this._config.optionsBox4,
            ];

            const hasAnyOptions = boxes.some(arr => arr.length > 0);
            if (hasAnyOptions) {
                const optionBox = new OptionsBox(this._gIcon, this._colorInfo, this._dataHandler);
                vbox.add_child(optionBox);
                this._set1ToggleButtons.bind_property('visible',
                    optionBox, 'visible',
                    GObject.BindingFlags.SYNC_CREATE);
            }
        }

        if (button2Enabled) {
            this._menuSeparator2 = new St.Widget({
                style_class: 'bbm-menu-separator',
                x_expand: true,
            });

            vbox.add_child(this._menuSeparator2);

            this._set2ToggleButtons =
                new ToggleButtonsSet(this._gIcon, this._widgetInfo, true, this._dataHandler);

            vbox.add_child(this._set2ToggleButtons);

            this._set2ToggleButtons.bind_property('visible',
                this._menuSeparator2, 'visible',
                GObject.BindingFlags.SYNC_CREATE);
        }

        this._updateVisibility();

        this._dataHandler.connectObject(
            'configuration-changed', () => {
                this._batterySetWidget.destroy();
                this._batterySetWidget = new BatterySetWidget(
                    batteryIconSize, this._widgetInfo, true, this._dataHandler);
                this._batteryBox.add_child(this._batterySetWidget);
                const albumArtIcon = this._dataHandler.getConfig().albumArtIcon;
                this._modelIcon.gicon = this._gIcon(`bbm-art-${albumArtIcon}.png`);
            },
            'properties-changed', () => {
                if (button1Enabled || button2Enabled)
                    this._updateVisibility();
            },
            this
        );
    }

    _updateVisibility() {
        const toggle1Visible = this._dataHandler.getProps().toggle1Visible;
        const toggle2Visible = this._dataHandler.getProps().toggle2Visible;

        if (toggle1Visible)
            this._set1ToggleButtons?.show();
        else
            this._set1ToggleButtons?.hide();

        if (toggle2Visible)
            this._set2ToggleButtons?.show();
        else
            this._set2ToggleButtons?.hide();
    }

    updateAlias(alias) {
        this._modelLabel.text = alias;
    }

    _addStylePinButton() {
        this.updatePinButton();
        const focusBorderColor = adjustOpacityToRgba(this._colorInfo.accentColor, 0.65);
        this._styleBgOpacity50 = `background-color: ${colorGreyOpacity(0.50)};`;
        this._styleBgOpacity40 = `background-color: ${colorGreyOpacity(0.40)};`;
        this._styleBorderRegular = 'border: 2px solid transparent;';
        this._styleBorderSolid = `border: 2px solid ${focusBorderColor};`;
        this._updatePinBtnStyle();

        this._pinButton.connectObject(
            'clicked', () => {
                if (!this._pinButton.checked)
                    this._settings.set_string('default-selected-path', this._path);
            },
            'notify::hover', () => {
                this._updatePinBtnStyle();
            },
            'key-focus-in', () => {
                this._hasFocus = true;
                this._updatePinBtnStyle();
            },
            'key-focus-out', () => {
                this._hasFocus = false;
                this._updatePinBtnStyle();
            },
            this
        );
    }

    _updatePinBtnStyle() {
        let bgStyle = '';
        let borderStyle = '';

        if (this._pinButton.hover)
            bgStyle = this._styleBgOpacity50;
        else
            bgStyle = this._styleBgOpacity40;

        if (this._hasFocus)
            borderStyle = `${this._styleBorderSolid}`;
        else
            borderStyle = `${this._styleBorderRegular}`;

        this._pinButton.set_style(`${bgStyle} ${borderStyle}`);
    }

    updatePinButton() {
        if (this._showPinButton && this._pinIcon) {
            const isSelectedDevice =
                    this._path === this._settings.get_string('default-selected-path');

            this._pinIcon.gicon =  isSelectedDevice ? this._gIcon('bbm-pinned-symbolic.svg')
                : this._gIcon('bbm-pin-symbolic.svg');

            this._pinButton.checked = isSelectedDevice;
        }
    }
});
