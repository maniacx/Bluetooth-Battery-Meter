'use strict';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import {CircleBatteryIcon} from './circleBatteryIconWidget.js';

const [major] = Config.PACKAGE_VERSION.split('.');
const shellVersion48Above = Number.parseInt(major) >= 48;
const boxLayoutProps = shellVersion48Above
    ? {orientation: Clutter.Orientation.VERTICAL} : {vertical: true};

export const BatterySetWidget = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_BatterySetWidget',
}, class BatterySetWidget extends St.BoxLayout {
    _init(batteryIconSize, widgetInfo, dataHandler) {
        super._init();
        this._dataHandler = dataHandler;
        this._config = this._dataHandler.getConfig();
        const orientation = {x_align: Clutter.ActorAlign.START, ...boxLayoutProps};
        const boxStyleClass = 'bbm-battery-vertical-widget-box';
        const labelStyleClass = 'bbm-battery-veritcal-widget-label';

        this.add_style_class_name(boxStyleClass);

        if (this._config.battery1Icon) {
            const battery1Box =  new St.BoxLayout({y_align: Clutter.ActorAlign.CENTER});
            this._battery1BatteryBox =  new St.BoxLayout(orientation);
            battery1Box.add_child(this._battery1BatteryBox);
            const battery1VectorPath = this._config.battery1Icon;
            this._battery1BatteryIcon = new CircleBatteryIcon(
                batteryIconSize, battery1VectorPath, widgetInfo);
            this._battery1PercentageLabel = new St.Label({y_align: Clutter.ActorAlign.CENTER});
            this._battery1PercentageLabel.add_style_class_name(labelStyleClass);

            this._battery1BatteryBox.add_child(this._battery1BatteryIcon);
            this._battery1BatteryBox.add_child(this._battery1PercentageLabel);
            this._battery1BatteryIcon.updateValues(0, false);
            this.add_child(battery1Box);
        }

        if (this._config.battery2Icon) {
            const spaceBin1 = new St.Bin({style_class: 'bbm-battery-vertical-space-bin'});
            this.add_child(spaceBin1);
            const battery2Box =  new St.BoxLayout({y_align: Clutter.ActorAlign.CENTER});
            this._battery2BatteryBox =  new St.BoxLayout(orientation);
            battery2Box.add_child(this._battery2BatteryBox);
            const battery2VectorPath = this._config.battery2Icon;
            this._battery2BatteryIcon = new CircleBatteryIcon(
                batteryIconSize, battery2VectorPath, widgetInfo);
            this._battery2PercentageLabel = new St.Label({y_align: Clutter.ActorAlign.CENTER});
            this._battery2PercentageLabel.add_style_class_name(labelStyleClass);
            this._battery2BatteryBox.add_child(this._battery2BatteryIcon);
            this._battery2BatteryBox.add_child(this._battery2PercentageLabel);
            this._battery2BatteryIcon.updateValues(0, false);
            this.add_child(battery2Box);
        }

        if (this._config.battery3Icon) {
            const spaceBin2 = new St.Bin({style_class: 'bbm-battery-vertical-space-bin'});
            this.add_child(spaceBin2);
            const battery3Box =  new St.BoxLayout({y_align: Clutter.ActorAlign.CENTER});
            this._battery3BatteryBox =  new St.BoxLayout(orientation);
            battery3Box.add_child(this._battery3BatteryBox);
            const battery3VectorPath = this._config.battery3Icon;
            this._battery3BatteryIcon = new CircleBatteryIcon(
                batteryIconSize, battery3VectorPath, widgetInfo);
            this._battery3PercentageLabel = new St.Label({y_align: Clutter.ActorAlign.CENTER});
            this._battery3PercentageLabel.add_style_class_name(labelStyleClass);
            this._battery3BatteryBox.add_child(this._battery3BatteryIcon);
            this._battery3BatteryBox.add_child(this._battery3PercentageLabel);
            this._battery3BatteryIcon.updateValues(0, false);
            this.add_child(battery3Box);
        }

        const props = this._dataHandler.getProps();
        this._updateProps(props);

        this._dataHandler.connectObject(
            'properties-changed', () => {
                const properties = this._dataHandler.getProps();
                this._updateProps(properties);
            },
            this
        );
    }

    _updateProps(props) {
        if (this._config.battery1Icon) {
            if (this._config.battery1ShowOnDisconnect ||
                props.battery1Level !== 0 && props.battery1Status !== 'disconnected') {
                this._battery1BatteryIcon.updateValues(props.battery1Level, props.battery1Status);
                this._battery1PercentageLabel.text =
                    props.battery1Level === 0 && this._config.battery1ShowOnDisconnect
                        ? '' : `${props.battery1Level}%`;
                this._battery1BatteryBox.visible = true;
            } else {
                this._battery1BatteryBox.visible = false;
            }
        }

        if (this._config.battery2Icon) {
            if (this._config.battery2ShowOnDisconnect ||
                props.battery2Level !== 0 && props.battery2Status !== 'disconnected') {
                this._battery2BatteryIcon.updateValues(props.battery2Level, props.battery2Status);
                this._battery2PercentageLabel.text =
                    props.battery2Level === 0 && this._config.battery2ShowOnDisconnect
                        ? '' : `${props.battery2Level}%`;
                this._battery2BatteryBox.visible = true;
            } else {
                this._battery2BatteryBox.visible = false;
            }
        }

        if (this._config.battery3Icon) {
            if (this._config.battery3ShowOnDisconnect ||
                props.battery3Level !== 0 && props.battery3Status !== 'disconnected') {
                this._battery3BatteryIcon.updateValues(props.battery3Level, props.battery3Status);
                this._battery3PercentageLabel.text =
                    props.battery3Level === 0 && this._config.battery3ShowOnDisconnect
                        ? '' : `${props.battery3Level}%`;
                this._battery3BatteryBox.visible = true;
            } else {
                this._battery3BatteryBox.visible = false;
            }
        }
    }
});
