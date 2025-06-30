'use strict';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import {BatterySetWidget} from './batterySetWidget.js';
import {ToggleButtonsSet} from './toggleButtonsSet.js';

const [major] = Config.PACKAGE_VERSION.split('.');
const shellVersion = Number.parseInt(major);
const boxLayoutProps = shellVersion >= 48
    ? {orientation: Clutter.Orientation.VERTICAL} : {vertical: true};

export const PopupMenuWidget = GObject.registerClass({
}, class PopupMenuWidget extends PopupMenu.PopupBaseMenuItem {
    constructor(panelButton, gIcon, path, alias, widgetInfo, showCheckBox, dataHandler) {
        super();
        this.add_style_class_name('bbm-popup-menu');
        this._panelButton = panelButton;
        this._settings = panelButton._settings;
        this._gIcon = gIcon;
        this._path = path;
        this._dataHandler = dataHandler;
        const config = this._dataHandler.getConfig();
        this._showCheckBox = showCheckBox;
        const theme = St.ThemeContext.get_for_stage(global.stage);
        const scaleFactor = theme.scaleFactor * 16;
        const batteryIconSize = scaleFactor * 2;
        const vbox = new St.BoxLayout({...boxLayoutProps, x_expand: true});
        this.add_child(vbox);
        const titleHbox = new St.BoxLayout({x_expand: true});
        vbox.add_child(titleHbox);

        const modelLabel = new St.Label({style_class: 'bbm-panel-label-model'});
        modelLabel.text = alias;
        titleHbox.add_child(modelLabel);
        if (this._showCheckBox) {
            this._checkBox = new St.Icon({
                style_class: 'popup-menu-ornament bbm-panel-icon-check',
                icon_name: 'ornament-check-symbolic',
            });
            titleHbox.add_child(this._checkBox);
        }

        const infoHbox = new St.BoxLayout({style_class: 'bbm-panel-hbox', x_expand: true});
        vbox.add_child(infoHbox);

        this._modelIcon = new St.Icon({
            style_class: 'bbm-panel-icon',
            icon_size: 56,
            y_expand: true,
        });
        infoHbox.add_child(this._modelIcon);
        this._modelIcon.gicon = gIcon(`bbm-art-${config.albumArtIcon}.png`);
        this._batteryBox =  new St.BoxLayout({x_expand: true});
        infoHbox.add_child(this._batteryBox);
        const startBin = new St.Bin({style_class: 'bbm-panel-start-bin'});
        this._batteryBox.add_child(startBin);

        this._batterySetWidget = new BatterySetWidget(
            batteryIconSize, widgetInfo, this._dataHandler);
        this._batteryBox.add_child(this._batterySetWidget);

        const set1buttons = [
            config.set1Button1Icon,
            config.set1Button2Icon,
            config.set1Button3Icon,
            config.set1Button4Icon,
        ];
        const button1Enabled = set1buttons.filter(icon => icon != null).length >= 2;

        const set2buttons = [
            config.set2Button1Icon,
            config.set2Button2Icon,
            config.set2Button3Icon,
            config.set2Button4Icon,
        ];
        const button2Enabled = set2buttons.filter(icon => icon != null).length >= 2;

        this._buttonsEnabled = button1Enabled || button2Enabled;

        if (this._buttonsEnabled) {
            this._buttonBox = new St.BoxLayout(
                {style_class: 'bbm-panel-button-box', x_expand: true});
            vbox.add_child(this._buttonBox);

            this._set1ToggleButtons = new ToggleButtonsSet(gIcon, false, this._dataHandler);
            this._buttonBox.add_child(this._set1ToggleButtons);

            this._set2ToggleButtons = new ToggleButtonsSet(gIcon, true, this._dataHandler);
            this._buttonBox.add_child(this._set2ToggleButtons);
        }

        if (this._showCheckBox) {
            this.updateCheckBox();
            this.connectObject('activate', () => {
                if (this._panelButton.getMenuCount() > 1)
                    this._settings.set_string('default-selected-path', this._path);
            }, this);
        }

        this._updateVisibility();

        this._dataHandler.connectObject(
            'configuration-changed', () => {
                this._batterySetWidget.destroy();
                this._batterySetWidget = new BatterySetWidget(
                    batteryIconSize, widgetInfo, true, this._dataHandler);
                this._batteryBox.add_child(this._batterySetWidget);
                const albumArtIcon = this._dataHandler.getConfig().albumArtIcon;
                this._modelIcon.gicon = this._gIcon(`bbm-art-${albumArtIcon}.png`);
            },
            'properties-changed', () => {
                if (this._buttonsEnabled)
                    this._updateVisibility();
            },
            this
        );
    }

    _updateVisibility() {
        const toggle1Visible = this._dataHandler.getProps().toggle1Visible;
        const toggle2Visible = this._dataHandler.getProps().toggle2Visible;

        if (toggle1Visible || toggle2Visible)
            this._buttonBox?.show();
        else
            this._buttonBox?.hide();

        if (toggle1Visible)
            this._set1ToggleButtons?.show();
        else
            this._set1ToggleButtons?.hide();

        if (toggle2Visible)
            this._set2ToggleButtons?.show();
        else
            this._set2ToggleButtons?.hide();
    }

    updateCheckBox() {
        if (this._showCheckBox) {
            if (this._panelButton.getMenuCount() > 1) {
                this._checkBox.visible =
                    this._path === this._settings.get_string('default-selected-path');
            } else {
                this._checkBox.visible = false;
            }
        }
    }

    updateAlias(alias) {
        this._modelLabel.text = alias;
    }
});
