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
        this._dataHandler = dataHandler;
        const config = this._dataHandler.getConfig();
        this._buttons = [];
        const icon1 = isSecondSet ? config.set2Button1Icon : config.set1Button1Icon;
        const icon2 = isSecondSet ? config.set2Button2Icon : config.set1Button2Icon;
        const icon3 = isSecondSet ? config.set2Button3Icon : config.set1Button3Icon;
        const button2Styleclass = icon3 ? 'bbm-toggle-button-middle' : 'bbm-toggle-button-end';
        const props = this._dataHandler.getProps();
        const buttonEnabledIndex = isSecondSet ? props.toggle2State : props.toggle1State;

        const box = new St.BoxLayout({x_expand: true, y_expand: false});
        if (icon1) {
            const button1 = new St.Button({
                style_class: 'bbm-toggle-button bbm-toggle-button-start',
            });

            const button1Icon = new St.Icon({
                style_class: 'popup-menu-icon',
                gicon: gIcon(icon1),
            });
            button1.connectObject(
                'clicked', () => {
                    const buttonNumber = 1;
                    if (isSecondSet)
                        this._dataHandler.set2ButtonClicked(buttonNumber);
                    else
                        this._dataHandler.set1ButtonClicked(buttonNumber);
                },
                this
            );
            button1.child = button1Icon;
            box.add_child(button1);

            this._buttons.push({button: button1, number: 1});
        }

        if (icon2) {
            const button2 = new St.Button({
                style_class: `bbm-toggle-button ${button2Styleclass}`,
            });
            const button2Icon = new St.Icon({
                style_class: 'popup-menu-icon',
                gicon: gIcon(icon2),
            });
            button2.child = button2Icon;
            box.add_child(button2);
            button2.connectObject(
                'clicked', () => {
                    const buttonNumber = 2;
                    if (isSecondSet)
                        this._dataHandler.set2ButtonClicked(buttonNumber);
                    else
                        this._dataHandler.set1ButtonClicked(buttonNumber);
                },
                this
            );
            this._buttons.push({button: button2, number: 2});
        }

        if (icon3) {
            const button3 = new St.Button({
                style_class: 'bbm-toggle-button bbm-toggle-button-end',
            });

            const button3Icon = new St.Icon({
                style_class: 'popup-menu-icon',
                gicon: gIcon(icon3),
            });
            button3.child = button3Icon;
            box.add_child(button3);
            button3.connectObject(
                'clicked', () => {
                    const buttonNumber = 3;
                    if (isSecondSet)
                        this._dataHandler.set2ButtonClicked(buttonNumber);
                    else
                        this._dataHandler.set1ButtonClicked(buttonNumber);
                },
                this
            );
            this._buttons.push({button: button3, number: 3});
        }
        this.set_child(box);

        this._setActiveButton(buttonEnabledIndex);

        this._dataHandler.connectObject(
            'properties-changed', () => {
                const properties = this._dataHandler.getProps();
                const buttonIndex = isSecondSet
                    ? properties.toggle2State : properties.toggle1State;
                this._setActiveButton(buttonIndex);
            },
            this
        );
    }

    _setActiveButton(buttonNumber) {
        this._buttons.forEach(({button, number}) => {
            button?.set_checked(number === buttonNumber);
        });
    }
});

