'use strict';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

export const ToggleButtonsSet = GObject.registerClass(
class ToggleButtonsSet extends St.Bin {
    _init(gIcon, isSecondSet, dataHandler, params = {}) {
        super._init({
            style_class: 'bbm-toggle-bin', y_expand: false,
            x_align: Clutter.ActorAlign.CENTER, ...params,
        });
        this._gIcon = gIcon;
        this._isSecondSet = isSecondSet;
        this._dataHandler = dataHandler;
        const config = this._dataHandler.getConfig();
        const props = this._dataHandler.getProps();
        this._icon1 = this._isSecondSet ? config.set2Button1Icon : config.set1Button1Icon;
        this._icon2 = this._isSecondSet ? config.set2Button2Icon : config.set1Button2Icon;
        this._icon3 = this._isSecondSet ? config.set2Button3Icon : config.set1Button3Icon;
        this._icon4 = this._isSecondSet ? config.set2Button4Icon : config.set1Button4Icon;
        this._buttonEnabledIndex = this._isSecondSet ? props.toggle2State : props.toggle1State;
        this._opacityLow = 'background-color: rgba(255, 255, 255, 0.1);';
        this._opacityNone = 'background-color: rgba(255, 255, 255, 0);';

        if (this._icon1 && this._icon2)
            this._buildWidget();
    }

    _buildWidget() {
        const box = new St.BoxLayout({x_expand: true, y_expand: false});

        this._button1 = new St.Button({
            style_class: 'bbm-toggle-button',
            y_expand: false,
        });

        const button1Icon = new St.Icon({
            style_class: 'popup-menu-icon',
            y_expand: false,
            gicon: this._gIcon(this._icon1),
        });

        this._button1.child = button1Icon;
        box.add_child(this._button1);

        this._seperator1 = new St.Widget({
            style_class: 'bbm-separator',
            y_expand: false,
            x_expand: false,
        });

        this._button2 = new St.Button({
            style_class: 'bbm-toggle-button',
            y_expand: false,
        });

        const button2Icon = new St.Icon({
            style_class: 'popup-menu-icon',
            y_expand: false,
            gicon: this._gIcon(this._icon2),
        });

        box.add_child(this._seperator1);
        this._button2.child = button2Icon;
        box.add_child(this._button2);

        if (this._icon3) {
            this._seperator2 = new St.Widget({
                style_class: 'bbm-separator',
                y_expand: false,
                x_expand: false,
            });

            this._button3 = new St.Button({
                style_class: 'bbm-toggle-button',
                y_expand: false,
            });

            const button3Icon = new St.Icon({
                style_class: 'popup-menu-icon',
                y_expand: false,
                gicon: this._gIcon(this._icon3),
            });

            box.add_child(this._seperator2);
            this._button3.child = button3Icon;
            box.add_child(this._button3);
        }

        if (this._icon4) {
            this._seperator3 = new St.Widget({
                style_class: 'bbm-separator',
                y_expand: false,
                x_expand: false,
            });

            this._button4 = new St.Button({
                style_class: 'bbm-toggle-button',
                y_expand: false,
            });

            const button4Icon = new St.Icon({
                style_class: 'popup-menu-icon',
                y_expand: false,
                gicon: this._gIcon(this._icon4),
            });

            box.add_child(this._seperator3);
            this._button4.child = button4Icon;
            box.add_child(this._button4);
        }

        this.set_child(box);

        this._button1.connectObject(
            'clicked', () => {
                const buttonNumber = 1;
                if (this._isSecondSet)
                    this._dataHandler.set2ButtonClicked(buttonNumber);
                else
                    this._dataHandler.set1ButtonClicked(buttonNumber);
            },
            'notify::hover', () => {
                this._updateSeperator1();
            },
            'notify::checked', () => {
                this._updateSeperator1();
            },
            this
        );

        this._button2.connectObject(
            'clicked', () => {
                const buttonNumber = 2;
                if (this._isSecondSet)
                    this._dataHandler.set2ButtonClicked(buttonNumber);
                else
                    this._dataHandler.set1ButtonClicked(buttonNumber);
            },
            'notify::hover', () => {
                this._updateSeperator1();
                if (this._icon3)
                    this._updateSeperator2();
            },
            'notify::checked', () => {
                this._updateSeperator1();
                if (this._icon3)
                    this._updateSeperator2();
            },
            this
        );


        if (this._icon3) {
            this._button3.connectObject(
                'clicked', () => {
                    const buttonNumber = 3;
                    if (this._isSecondSet)
                        this._dataHandler.set2ButtonClicked(buttonNumber);
                    else
                        this._dataHandler.set1ButtonClicked(buttonNumber);
                },
                'notify::hover', () => {
                    this._updateSeperator2();
                    if (this._icon4)
                        this._updateSeperator3();
                },
                'notify::checked', () => {
                    this._updateSeperator2();
                    if (this._icon4)
                        this._updateSeperator3();
                },
                this
            );
        }

        if (this._icon4) {
            this._button4.connectObject(
                'clicked', () => {
                    const buttonNumber = 4;
                    if (this._isSecondSet)
                        this._dataHandler.set2ButtonClicked(buttonNumber);
                    else
                        this._dataHandler.set1ButtonClicked(buttonNumber);
                },
                'notify::hover', () => {
                    this._updateSeperator3();
                },
                'notify::checked', () => {
                    this._updateSeperator3();
                },
                this
            );
        }

        this._seperator1.set_style(this._opacityLow);
        this._seperator2?.set_style(this._opacityLow);
        this._seperator3?.set_style(this._opacityLow);

        this._setActiveButton(this._buttonEnabledIndex);

        this._dataHandler.connectObject(
            'properties-changed', () => {
                const properties = this._dataHandler.getProps();
                const buttonIndex = this._isSecondSet
                    ? properties.toggle2State : properties.toggle1State;
                this._setActiveButton(buttonIndex);
            },
            this
        );
    }

    _updateSeperator1() {
        if (this._button1.checked || this._button2.checked)
            this._seperator1.set_style(this._opacityNone);
        else if (this._button1.hover || this._button2.hover)
            this._seperator1.set_style(this._opacityNone);
        else
            this._seperator1.set_style(this._opacityLow);
    }

    _updateSeperator2() {
        if (this._button2.checked || this._button3.checked)
            this._seperator2.set_style(this._opacityNone);
        else if (this._button2.hover || this._button3.hover)
            this._seperator2.set_style(this._opacityNone);
        else
            this._seperator2.set_style(this._opacityLow);
    }

    _updateSeperator3() {
        if (this._button3.checked || this._button4.checked)
            this._seperator3.set_style(this._opacityNone);
        else if (this._button3.hover || this._button4.hover)
            this._seperator3.set_style(this._opacityNone);
        else
            this._seperator3.set_style(this._opacityLow);
    }

    _setActiveButton(buttonNumber) {
        const buttons = [this._button1, this._button2, this._button3, this._button4];

        buttons.forEach((button, index) => {
            button?.set_checked(buttonNumber !== 0 && index === buttonNumber - 1);
        });
    }
});

