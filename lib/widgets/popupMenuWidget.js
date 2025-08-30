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

export const PopupMenuWidgetBox = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_PopupMenuWidgetBox',
}, class PopupMenuWidgetBox extends St.BoxLayout {
    _init(settings, gIcon, path, alias, widgetInfo, colorInfo, headerButtons, dataHandler) {
        super._init({...boxLayoutProps, x_expand: true, style_class: 'bbm-popup-menu-box'});
        this._settings = settings;
        this._gIcon = gIcon;
        this._dataHandler = dataHandler;
        this._config = this._dataHandler.getConfig();
        this._showExpandButton = headerButtons.expand;
        this._showBtPairButton = headerButtons.btPair;
        this._showPinButton = headerButtons.pin;
        this._showSettingsButton = this._config.showSettingsButton;

        const theme = St.ThemeContext.get_for_stage(global.stage);
        const scaleFactor = theme.scaleFactor * 16;
        const batteryIconSize = scaleFactor * 2;

        const titleHbox = new St.BoxLayout({style_class: 'bbm-popup-titlebox', x_expand: true});
        this.add_child(titleHbox);

        const modelLabel = new St.Label({
            style_class: 'bbm-popup-title',
            y_align: Clutter.ActorAlign.CENTER,
        });
        modelLabel.text = alias;
        titleHbox.add_child(modelLabel);

        let headerButton;
        if (this._showExpandButton || this._showBtPairButton ||
                this._showPinButton || this._showSettingsButton) {
            const spacer = new St.Bin({x_expand: true, style_class: 'bbm-popupmenu-expander'});
            titleHbox.add_child(spacer);
            const focusBorderColor = adjustOpacityToRgba(colorInfo.accentColor, 0.65);
            this._styleBgOpacity50 = `background-color: ${colorGreyOpacity(0.50)};`;
            this._styleBgOpacity40 = `background-color: ${colorGreyOpacity(0.40)};`;
            this._styleBorderRegular = 'border: 2px solid transparent;';
            this._styleBorderSolid = `border: 2px solid ${focusBorderColor};`;

            headerButton = () => {
                const icon = new St.Icon({style_class: 'bbm-header-icon'});
                const button = new St.Button({
                    style_class: 'bbm-header-button',
                    can_focus: true,
                    y_align: Clutter.ActorAlign.CENTER,
                    child: icon,
                });
                button.icon = icon;
                return button;
            };
        }

        if (this._showPinButton) {
            this._pinButton = headerButton();
            titleHbox.add_child(this._pinButton);
            this._isSelectedDevice =
                    this._settings.get_string('default-selected-path') === path;

            this._settings.connectObject('changed::default-selected-path', () => {
                this._isSelectedDevice =
                        this._settings.get_string('default-selected-path') === path;
                this.updatePinButton();
            }, this);

            this._pinButton.connectObject('clicked', () => {
                if (!this._isSelectedDevice)
                    this._settings.set_string('default-selected-path', path);
            }, this);

            this.updatePinButton();
            this._captureButtonEvents(this._pinButton);
        }

        if (this._showSettingsButton) {
            this._settingsButton = headerButton();
            titleHbox.add_child(this._settingsButton);
            this._settingsButton.icon.gicon = this._gIcon('bbm-settings-symbolic.svg');

            this._settingsButton.connectObject('clicked', () => {
                this._dataHandler.emitUIAction('settingsButtonClicked', 0);
            }, this);

            this._captureButtonEvents(this._settingsButton);
        }

        if (this._showExpandButton) {
            this.expandButton = headerButton();
            this.expandButton.icon.icon_name = 'pan-up-symbolic';
            titleHbox.add_child(this.expandButton);
            this._captureButtonEvents(this.expandButton);
        }

        if (this._showBtPairButton) {
            this.btPairButton = headerButton();
            titleHbox.add_child(this.btPairButton);
            this._captureButtonEvents(this.btPairButton);
        }

        const infoHbox = new St.BoxLayout({x_expand: true});
        this.add_child(infoHbox);

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
            batteryIconSize, widgetInfo, this._dataHandler);
        this._batteryBox.add_child(this._batterySetWidget);

        const button1Enabled = this._config.toggle1Button1Icon && this._config.toggle1Button2Icon;
        const button2Enabled = this._config.toggle2Button1Icon && this._config.toggle2Button2Icon;

        if (button1Enabled) {
            this._menuSeparator1 = new St.Widget({
                style_class: 'bbm-menu-separator',
                x_expand: true,
            });
            this.add_child(this._menuSeparator1);

            this._set1ToggleButtons =
                new ToggleButtonsSet(this._gIcon, colorInfo, false, this._dataHandler);
            this.add_child(this._set1ToggleButtons);

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
                const optionBox = new OptionsBox(this._gIcon, colorInfo, this._dataHandler);
                this.add_child(optionBox);
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

            this.add_child(this._menuSeparator2);

            this._set2ToggleButtons =
                new ToggleButtonsSet(this._gIcon, widgetInfo, true, this._dataHandler);

            this.add_child(this._set2ToggleButtons);

            this._set2ToggleButtons.bind_property('visible',
                this._menuSeparator2, 'visible',
                GObject.BindingFlags.SYNC_CREATE);
        }

        this._updateVisibility();

        this._dataHandler.connectObject(
            'configuration-changed', () => {
                this._batterySetWidget.destroy();
                this._batterySetWidget = new BatterySetWidget(
                    batteryIconSize, widgetInfo, this._dataHandler);
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

    _captureButtonEvents(button) {
        this._updateButtonStyle(button);

        button.connectObject(
            'clicked', () => {
                this._updateButtonStyle(button);
            },
            'notify::hover', () => {
                this._updateButtonStyle(button);
            },
            'key-focus-in', () => {
                this._updateButtonStyle(button);
            },
            'key-focus-out', () => {
                this._updateButtonStyle(button);
            },
            this
        );
    }

    _updateButtonStyle(button) {
        let bgStyle = '';
        let borderStyle = '';

        if (button.hover)
            bgStyle = this._styleBgOpacity50;
        else
            bgStyle = this._styleBgOpacity40;

        if (button.has_key_focus())
            borderStyle = `${this._styleBorderSolid}`;
        else
            borderStyle = `${this._styleBorderRegular}`;

        button.set_style(`${bgStyle} ${borderStyle}`);
    }

    updatePinButton() {
        if (this._showPinButton && this._pinButton) {
            const gioIcon =  this._isSelectedDevice ? this._gIcon('bbm-pinned-symbolic.svg')
                : this._gIcon('bbm-pin-symbolic.svg');

            this._pinButton.icon.gicon = gioIcon;
        }
    }
});

export const PopupMenuWidget = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_PopupMenuWidget',
}, class PopupMenuWidget extends PopupMenu.PopupBaseMenuItem {
    _init(settings, gIcon, path, alias, widgetInfo, dataHandler) {
        super._init({activate: false, hover: false, can_focus: false});
        this.add_style_class_name('bbm-popup-menu');
        this._settings = settings;
        this._gIcon = gIcon;
        this._path = path;
        this._alias = alias;
        this._widgetInfo = widgetInfo;
        this._dataHandler = dataHandler;

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
        const colorInfo = {
            isDarkMode: this._widgetInfo.isDarkMode,
            accentColor: this._widgetInfo.accentColor,
            foregroundColor: themeNode.get_foreground_color(),
        };

        const headerButtons = {pin: false, btPair: false, expand: false};
        const box = new PopupMenuWidgetBox(this._settings, this._gIcon, this._path, this._alias,
            this._widgetInfo, colorInfo, headerButtons, this._dataHandler);
        this.add_child(box);
    }
});
