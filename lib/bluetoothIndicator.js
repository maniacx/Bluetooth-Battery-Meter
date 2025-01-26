'use strict';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import Pango from 'gi://Pango';
import St from 'gi://St';
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';

import {LevelIconWidget} from './levelIconWidget.js';

export const BluetoothIndicator = GObject.registerClass({
    Properties: {
        'batteryPercentage': GObject.ParamSpec.int('batteryPercentage', '', 'Battery Percentage',
            GObject.ParamFlags.READWRITE, 0, 100, 0),
    },
}, class BluetoothIndicator extends QuickSettings.SystemIndicator {
    constructor(settings, device, indicatorMode, iconType, widgetInfo) {
        super();
        this._settings = settings;
        this._device = device;
        this._indicatorMode = indicatorMode;
        this._iconType = iconType;
        this._widgetInfo = widgetInfo;

        this._indicator = new St.Bin();
        this._indicator.style_class = 'system-status-icon';
        this.add_child(this._indicator);
        this._syncIndicatorsVisible();

        this._indicator.connectObject('notify::visible', () => this._syncIndicatorsVisible(), this);


        this._idleTimerId = GLib.idle_add(GLib.PRIORITY_LOW, () => {
            if (!this._indicator.get_parent())
                return GLib.SOURCE_CONTINUE;
            const node = this._indicator.get_theme_node();
            const [found, iconSize] = node.lookup_length('icon-size', false);
            if (found)
                this._addLevelWidget(iconSize);
            this._idleTimerId = null;
            return GLib.SOURCE_REMOVE;
        });

        this.connectObject('destroy', () => {
            if (this._idleTimerId)
                GLib.source_remove(this._idleTimerId);
            this._idleTimerId = null;
            this._indicator?.destroy();
        }, this);
    }

    _addLevelWidget(iconSize) {
        this._levelWidget = new LevelIconWidget(iconSize, this._indicatorMode, this._iconType, this._widgetInfo);
        this._indicator.set_child(this._levelWidget);

        this._device.bind_property('battery_percentage',
            this, 'batteryPercentage',
            GObject.BindingFlags.SYNC_CREATE);

        if (this._indicatorMode === 1) {
            this._indicator.visible = true;
        } else {
            this._device.bind_property_full('battery_percentage',
                this._indicator, 'visible',
                GObject.BindingFlags.SYNC_CREATE,
                (bind, source) => [true, !(source <= 0)], null);
        }

        this.connectObject('notify::batteryPercentage', () => {
            this._levelWidget?.updateValues(this._device.battery_percentage);
        },
        this);

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

        this._device.bind_property_full('battery_percentage',
            this._percentageLabel, 'text',
            GObject.BindingFlags.SYNC_CREATE,
            (bind, source) => [true, formatter.format(source / 100)], null);

        this._device.bind_property_full('battery_percentage',
            this._percentageLabel, 'visible',
            GObject.BindingFlags.SYNC_CREATE,
            (bind, source) => [true, source > 0 && this._percentageLabelVisible], null);

        this._settings.connectObject('changed::enable-battery-indicator-text', () => {
            this._percentageLabelVisible = this._settings.get_boolean('enable-battery-indicator-text');
            this._percentageLabel.visible = this._percentageLabelVisible && this._device.battery_percentage > 0;
        }, this);

        this._levelWidget.updateValues(this._device.battery_percentage);
    }
});
