'use strict';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';

const [major] = Config.PACKAGE_VERSION.split('.');
const shellVersion = Number.parseInt(major);
const boxLayoutProps = shellVersion >= 48
    ? {orientation: Clutter.Orientation.VERTICAL} : {vertical: true};

const ToggleButton = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_ToggleButton',
}, class ToggleButton extends St.Button {
    _init(gIcon, iconName, toggleBtnTitle) {
        super._init({
            style_class: 'button bbm-toggle-button',
            can_focus: true,
            accessible_name: toggleBtnTitle,
        });

        const icon = new St.Icon({
            style_class: 'popup-menu-icon',
            gicon: gIcon(iconName),
        });
        this.child = icon;
    }
});

export const ToggleButtonsSet = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_ToggleButtonsSet',
}, class ToggleButtonsSet extends St.BoxLayout {
    _init(gIcon, isSecondSet, dataHandler) {
        super._init({style_class: 'bbm-box', ...boxLayoutProps, x_expand: true});

        this._gIcon = gIcon;
        this._isSecondSet = isSecondSet;
        this._dataHandler = dataHandler;
        const config = this._dataHandler.getConfig();
        const props = this._dataHandler.getProps();
        this._icon1 = this._isSecondSet ? config.toggle2Button1Icon : config.toggle1Button1Icon;
        this._acc1 = this._isSecondSet ? config.toggle2Button1Name : config.toggle1Button1Name;
        this._icon2 = this._isSecondSet ? config.toggle2Button2Icon : config.toggle1Button2Icon;
        this._acc2 = this._isSecondSet ? config.toggle2Button2Name : config.toggle1Button2Name;
        this._icon3 = this._isSecondSet ? config.toggle2Button3Icon : config.toggle1Button3Icon;
        this._acc3 = this._isSecondSet ? config.toggle2Button3Name : config.toggle1Button3Name;
        this._icon4 = this._isSecondSet ? config.toggle2Button4Icon : config.toggle1Button4Icon;
        this._acc4 = this._isSecondSet ? config.toggle2Button4Name : config.toggle1Button4Name;
        this._toggleTitle = this._isSecondSet ? config.toggle2Title : config.toggle1Title;
        this._buttonEnabledIndex = this._isSecondSet ? props.toggle2State : props.toggle1State;
        this._opacityLow = 'background-color: rgba(128, 128, 128, 0.4);';
        this._opacityNone = 'background-color: transparent;';

        if (this._icon1 && this._icon2)
            this._buildWidget();
    }

    _buildWidget() {
        this._label = new St.Label({
            style_class: 'bbm-toggle-label',
            x_align: Clutter.ActorAlign.CENTER,
        });
        this._label.text = this._toggleTitle;
        this.add_child(this._label);

        const hBox = new St.BoxLayout({
            x_align: Clutter.ActorAlign.CENTER,
            style_class: 'bbm-toggle-box',
        });
        this.add_child(hBox);

        const accName1 = `${this._toggleTitle} ${this._acc1}`;
        this._button1 = new ToggleButton(this._gIcon, this._icon1, accName1);
        hBox.add_child(this._button1);

        this._buttonSeparator1 = new St.Widget({style_class: 'bbm-toggle-button-separator'});
        hBox.add_child(this._buttonSeparator1);

        const accName2 = `${this._toggleTitle} ${this._acc2}`;
        this._button2 = new ToggleButton(this._gIcon, this._icon2, accName2);
        hBox.add_child(this._button2);

        if (this._icon3) {
            this._buttonSeparator2 = new St.Widget({style_class: 'bbm-toggle-button-separator'});
            hBox.add_child(this._buttonSeparator2);

            const accName3 = `${this._toggleTitle} ${this._acc3}`;
            this._button3 = new ToggleButton(this._gIcon, this._icon3, accName3);
            hBox.add_child(this._button3);
        }

        if (this._icon4) {
            this._buttonSeparator3 = new St.Widget({style_class: 'bbm-toggle-button-separator'});
            hBox.add_child(this._buttonSeparator3);

            const accName4 = `${this._toggleTitle} ${this._acc4}`;
            this._button4 = new ToggleButton(this._gIcon, this._icon4, accName4);
            hBox.add_child(this._button4);
        }

        this._button1.connectObject(
            'clicked', () => {
                const buttonNumber = 1;
                const toggleState = this._isSecondSet ? 'toggle2State' : 'toggle1State';
                this._dataHandler.emitUIAction(toggleState, buttonNumber);
            },
            'notify::hover', () => {
                this._updateSeperator1();
            },
            'notify::checked', () => {
                this._updateSeperator1();
            },
            'key-focus-in', () => {
                this._updateSeperator1();
            },
            'key-focus-out', () => {
                this._updateSeperator1();
            },
            this
        );

        this._button2.connectObject(
            'clicked', () => {
                const buttonNumber = 2;
                const toggleState = this._isSecondSet ? 'toggle2State' : 'toggle1State';
                this._dataHandler.emitUIAction(toggleState, buttonNumber);
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
            'key-focus-in', () => {
                this._updateSeperator1();
                if (this._icon3)
                    this._updateSeperator2();
            },
            'key-focus-out', () => {
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
                    const toggleState = this._isSecondSet ? 'toggle2State' : 'toggle1State';
                    this._dataHandler.emitUIAction(toggleState, buttonNumber);
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
                'key-focus-in', () => {
                    this._updateSeperator2();
                    if (this._icon4)
                        this._updateSeperator3();
                },
                'key-focus-out', () => {
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
                    const toggleState = this._isSecondSet ? 'toggle2State' : 'toggle1State';
                    this._dataHandler.emitUIAction(toggleState, buttonNumber);
                },
                'notify::hover', () => {
                    this._updateSeperator3();
                },
                'notify::checked', () => {
                    this._updateSeperator3();
                },
                'key-focus-in', () => {
                    this._updateSeperator3();
                },
                'key-focus-out', () => {
                    this._updateSeperator3();
                },
                this
            );
        }

        this._buttonSeparator1.set_style(this._opacityLow);
        this._buttonSeparator2?.set_style(this._opacityLow);
        this._buttonSeparator3?.set_style(this._opacityLow);

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
            this._buttonSeparator1.set_style(this._opacityNone);
        else if (this._button1.hover || this._button2.hover)
            this._buttonSeparator1.set_style(this._opacityNone);
        else if (this._button1.has_key_focus() || this._button2.has_key_focus())
            this._buttonSeparator1.set_style(this._opacityNone);
        else
            this._buttonSeparator1.set_style(this._opacityLow);
    }

    _updateSeperator2() {
        if (this._button2.checked || this._button3.checked)
            this._buttonSeparator2.set_style(this._opacityNone);
        else if (this._button2.hover || this._button3.hover)
            this._buttonSeparator2.set_style(this._opacityNone);
        else if (this._button2.has_key_focus() || this._button3.has_key_focus())
            this._buttonSeparator3.set_style(this._opacityNone);
        else
            this._buttonSeparator2.set_style(this._opacityLow);
    }

    _updateSeperator3() {
        if (this._button3.checked || this._button4.checked)
            this._buttonSeparator3.set_style(this._opacityNone);
        else if (this._button3.hover || this._button4.hover)
            this._buttonSeparator3.set_style(this._opacityNone);
        else if (this._button3.has_key_focus() || this._button4.has_key_focus())
            this._buttonSeparator3.set_style(this._opacityNone);
        else
            this._buttonSeparator3.set_style(this._opacityLow);
    }

    _setActiveButton(buttonNumber) {
        const buttons = [this._button1, this._button2, this._button3, this._button4];

        buttons.forEach((button, index) => {
            button?.set_checked(buttonNumber !== 0 && index === buttonNumber - 1);
        });
    }
});

