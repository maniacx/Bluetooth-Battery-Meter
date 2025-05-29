'use strict';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import * as MessageList from 'resource:///org/gnome/shell/ui/messageList.js';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import {BatterySetWidget} from './batterySetWidget.js';
import {ToggleButtonsSet} from './toggleButtonsSet.js';

const [major] = Config.PACKAGE_VERSION.split('.');
const shellVersion = Number.parseInt(major);
const boxLayoutProps = shellVersion >= 48
    ? {orientation: Clutter.Orientation.VERTICAL} : {vertical: true};

export const TrayMessage = GObject.registerClass(
class TrayMessage extends MessageList.Message {
    constructor(args, gIcon, alias, widgetInfo, dataHandler) {
        super(...args);
        this._gIcon = gIcon;
        this._dataHandler = dataHandler;
        const config = this._dataHandler.getConfig();
        const theme = St.ThemeContext.get_for_stage(global.stage);
        const scaleFactor = theme.scaleFactor * 16;
        const batteryIconSize = scaleFactor * 2;
        const textBelowIcon = shellVersion >= 46;

        if (shellVersion === 45) {
            this._modelIcon = new St.Icon({icon_size: 56});
            this._modelIcon.gicon = gIcon(`bbm-art-${config.albumArtIcon}.png`);
            this.setIcon(this._modelIcon);
            this._secondaryBin.hide();
            this._closeButton.hide();
        } else {
            this.icon = gIcon(`bbm-art-${config.albumArtIcon}.png`);
            this._header?.expandButton.hide();
            this._header?.closeButton.hide();
        }

        this._mediaControls.get_parent().get_children()[1].hide();
        this._mediaControls.x_expand = true;

        const boxStyle = shellVersion === 45 ? 'bbm-message-45-box' : 'bbm-message-box';
        const box = new St.BoxLayout({style_class: boxStyle,  x_expand: true, y_expand: true});
        this._mediaControls.add_child(box);
        this._deviceInfoBox = new St.BoxLayout(
            {...boxLayoutProps, y_expand: true, x_expand: false});

        const buttonBox =  new St.BoxLayout(
            {...boxLayoutProps, x_align: Clutter.ActorAlign.END, y_expand: false});
        box.add_child(this._deviceInfoBox);
        box.add_child(buttonBox);

        if (shellVersion === 45) {
            const aliasBox =  new St.BoxLayout(
                {y_align: Clutter.ActorAlign.START, x_expand: false, y_expand: true});
            this._deviceInfoBox.add_child(aliasBox);

            this._modelLabel = new St.Label(
                {style_class: 'bbm-message-title', x_align: Clutter.ActorAlign.START});
            aliasBox.add_child(this._modelLabel);
            this._modelLabel.text = alias;
        }

        this._batterySetWidget = new BatterySetWidget(
            batteryIconSize, widgetInfo, textBelowIcon, this._dataHandler);
        this._deviceInfoBox.add_child(this._batterySetWidget);

        const buttonLayoutsProps = shellVersion === 45 ? {} : {x_align: Clutter.ActorAlign.END};

        const set1buttons = [
            config.set1Button1Icon,
            config.set1Button2Icon,
            config.set1Button3Icon,
        ];
        const spacer1Bin = new St.Bin({x_expand: true});
        buttonBox.add_child(spacer1Bin);
        this._set1ToggleButtonsEnabled = set1buttons.filter(button => button !== null).length >= 2;
        if (this._set1ToggleButtonsEnabled) {
            this._set1ToggleButtons = new ToggleButtonsSet(
                gIcon, false, this._dataHandler,
                {...buttonLayoutsProps, x_align: Clutter.ActorAlign.CENTER});
            buttonBox.add_child(this._set1ToggleButtons);
        }

        const set2buttons = [
            config.set2Button1Icon,
            config.set2Button2Icon,
            config.set2Button3Icon,
        ];
        this._set2ToggleButtonsEnabled = set2buttons.filter(button => button !== null).length >= 2;
        if (this._set2ToggleButtonsEnabled) {
            this._set2ToggleButtons = new ToggleButtonsSet(
                gIcon, true, this._dataHandler,
                {...buttonLayoutsProps, x_align: Clutter.ActorAlign.CENTER});
            buttonBox.add_child(this._set2ToggleButtons);
        }
        if (shellVersion === 45) {
            const spacer2Bin = new St.Bin({y_expand: true});
            buttonBox.add_child(spacer2Bin);
        }

        this._updateVisibility();


        this._dataHandler.connectObject(
            'configuration-changed', () => {
                this._batterySetWidget.destroy();
                this._batterySetWidget = new BatterySetWidget(
                    batteryIconSize, widgetInfo, textBelowIcon, this._dataHandler);
                this._deviceInfoBox.add_child(this._batterySetWidget);
                const albumArtIcon = this._dataHandler.getConfig().albumArtIcon;
                if (shellVersion === 45)
                    this._modelIcon.gicon = this._gIcon(`bbm-art-${albumArtIcon}.png`);
                else
                    this.icon = gIcon(`bbm-art-${albumArtIcon}.png`);
            },
            'properties-changed', () => {
                this._updateVisibility();
            },
            this
        );
    }

    _updateVisibility() {
        const visibility = this._dataHandler.getProps().toggleVisible;
        if (visibility === 0) {
            this._set1ToggleButtons?.show();
            this._set2ToggleButtons?.show();
        } else if (visibility === 1) {
            this._set1ToggleButtons?.hide();
            this._set2ToggleButtons?.show();
        } else if (visibility === 2) {
            this._set1ToggleButtons?.show();
            this._set2ToggleButtons?.hide();
        } else if (visibility === 3) {
            this._set1ToggleButtons?.hide();
            this._set2ToggleButtons?.hide();
        }
    }

    updateAlias(alias) {
        if (shellVersion === 45)
            this._modelLabel.text = alias;
    }
});
