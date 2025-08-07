'use strict';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import {Slider} from 'resource:///org/gnome/shell/ui/slider.js';

import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import {adjustOpacityToRgba} from './colorHelpers.js';

const [major] = Config.PACKAGE_VERSION.split('.');
const shellVersion = Number.parseInt(major);
const boxLayoutProps = shellVersion >= 48
    ? {orientation: Clutter.Orientation.VERTICAL} : {vertical: true};

export const SliderBin = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_SliderBin',
}, class SliderBin extends St.BoxLayout {
    _init(gIcon, colorInfo, dataHandler, id) {
        super._init({
            style_class: 'bbm-box',
            ...boxLayoutProps, x_expand: true,
        });

        const focusBorderColor = adjustOpacityToRgba(colorInfo.accentColor, 0.65);
        const config = dataHandler.getConfig();

        const menuSeparator = new St.Widget({
            style_class: 'bbm-option-menu-separator',
            x_align: Clutter.ActorAlign.CENTER,
        });
        this.add_child(menuSeparator);

        const sliderLabel = new St.Label({
            x_expand: true,
            style_class: 'bbm-subtitle-label',
            x_align: Clutter.ActorAlign.CENTER,
        });
        const title = config[`box${id}SliderTitle`];
        if (!title)
            console.log(`Bluetooth-Battery-Meter: Title for Slider in option-box${id} not defined`);

        sliderLabel.text = title;
        this.add_child(sliderLabel);

        const pluslabel = new St.Label({style: 'padding: 4px', x_align: Clutter.ActorAlign.END});
        pluslabel.text = '+';
        const minuslabel = new St.Label({style: 'padding: 4px', x_align: Clutter.ActorAlign.START});
        minuslabel.text = '-';

        const slider = new Slider(0);
        const sliderBin = new St.Bin({
            child: slider,
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'bbm-slider-bin',
        });

        const hbox = new St.BoxLayout({});
        hbox.add_child(minuslabel);
        hbox.add_child(sliderBin);
        hbox.add_child(pluslabel);
        this.add_child(hbox);

        slider.value = dataHandler.props[`box${id}SliderValue`] / 100;

        slider.connectObject(
            'key-focus-in', () => {
                sliderBin.set_style(`border: 2px solid ${focusBorderColor}`);
            },
            'key-focus-out', () => {
                sliderBin.set_style('border: 2px solid transparent;');
            },
            'notify::value', () => {
                if (slider._dragging)
                    dataHandler.emitUIAction(`box${id}SliderValue`, slider.value * 100);
            },
            this
        );

        dataHandler.connectObject('properties-changed', () => {
            slider.value = dataHandler.props[`box${id}SliderValue`] / 100;
        }, this);
    }
});

