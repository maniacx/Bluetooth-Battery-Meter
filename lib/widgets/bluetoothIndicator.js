'use strict';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Pango from 'gi://Pango';
import St from 'gi://St';
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';

import {IndicatorIconWidget} from './indicatorIconWidget.js';

export const BluetoothIndicator = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_BluetoothIndicator',
}, class BluetoothIndicator extends QuickSettings.SystemIndicator {
    _init(manager) {
        super._init();
        this._manager = manager;
        this._settings = manager.settings;
        this._indicatorMode = manager.indicatorMode;
        this._deviceIcon = manager.deviceIcon;
        this._widgetInfo = manager.widgetInfo;
        this._iconSize = null;

        this._indicator = new St.Bin();
        this._indicator.style_class = 'system-status-icon';
        this.add_child(this._indicator);
        this._syncIndicatorsVisible();

        this._indicator.connectObject('notify::visible', () =>
            this._syncIndicatorsVisible(), this);

        const themeNode = this._indicator.peek_theme_node();
        if (themeNode === null) {
            this._indicatorStyleChangeId = this._indicator.connect('style-changed', () => {
                const isStaged = this._indicator.get_stage();
                if (isStaged) {
                    if (this._indicatorStyleChangeId)
                        this._indicator.disconnect(this._indicatorStyleChangeId);
                    this._indicatorStyleChangeId = null;
                    this._getWidgetSize(this._indicator.peek_theme_node());
                }
            });
        } else {
            this._getWidgetSize(themeNode);
        }

        this.connectObject(
            'destroy', () => {
                if (this._indicatorStyleChangeId)
                    this._indicator.disconnect(this._indicatorStyleChangeId);
                this._indicatorStyleChangeId = null;
                this._indicator?.destroy();
            },
            this
        );
    }

    _getWidgetSize(themeNode) {
        const [found, iconSize] = themeNode.lookup_length('icon-size', false);
        if (found)
            this._addLevelWidget(iconSize);
    }

    _addLevelWidget(iconSize) {
        this._levelWidget = new IndicatorIconWidget(this._settings, this._indicator,
            iconSize, this._indicatorMode, this._deviceIcon, this._widgetInfo);
        this._indicator.set_child(this._levelWidget);

        if (this._indicatorMode === 1) {
            this._indicator.visible = true;
        } else {
            this._manager.bind_property_full('batteryPercentage',
                this._indicator, 'visible',
                GObject.BindingFlags.SYNC_CREATE,
                (bind, source) => [true, !(source <= 0)], null);
        }

        this._manager.connectObject(
            'notify::batteryPercentage', () => {
                this._levelWidget?.updateValues(this._manager.batteryPercentage);
            },
            this
        );

        this._percentageLabel = new St.Label({
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        const clutterText = this._percentageLabel.get_clutter_text();
        clutterText.ellipsize = Pango.EllipsizeMode.NONE;
        this.add_child(this._percentageLabel);
        this.add_style_class_name('power-status');
        const formatter = new Intl.NumberFormat(undefined, {style: 'percent'});
        this._percentageLabel.visible = false;
        this._percentageLabelVisible = this._settings.get_boolean('enable-battery-indicator-text');

        this._manager.bind_property_full('batteryPercentage',
            this._percentageLabel, 'text',
            GObject.BindingFlags.SYNC_CREATE,
            (bind, source) => [true, formatter.format(source / 100)], null);

        this._manager.bind_property_full('batteryPercentage',
            this._percentageLabel, 'visible',
            GObject.BindingFlags.SYNC_CREATE,
            (bind, source) => [true, source > 0 && this._percentageLabelVisible], null);

        this._settings.connectObject(
            'changed::enable-battery-indicator-text', () => {
                this._percentageLabelVisible =
                    this._settings.get_boolean('enable-battery-indicator-text');
                this._percentageLabel.visible =
                    this._percentageLabelVisible && this._manager.batteryPercentage > 0;
            },
            this
        );
        this._levelWidget.updateValues(this._manager.batteryPercentage);
    }

    updateProperties(indicatorMode, deviceIcon) {
        this._indicatorMode = indicatorMode;
        this._deviceIcon = deviceIcon;
        this._levelWidget?.updateProperties(indicatorMode, deviceIcon);
    }
});
