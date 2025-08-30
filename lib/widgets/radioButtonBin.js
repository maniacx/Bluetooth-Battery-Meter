'use strict';
import Atk from 'gi://Atk';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';

import {
    adjustColorLuminanceToRgba, adjustOpacityToRgba,
    colorToRgba, colorGreyOpacity
} from './colorHelpers.js';

const RadioButton = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_RadioButton',
}, class RadioButton extends St.BoxLayout {
    _init(gIcon, styleInfo, length, radioBtnTitle, grpTitle, initialChecked) {
        super._init({
            ...boxLayoutProps,
        });
        this.style_class = `bbm-radio${length}btn-box`;
        this._styleInfo = styleInfo;

        this._radioBoxLabel = new St.Label({
            style_class: 'bbm-radiobtn-label',
            x_align: Clutter.ActorAlign.CENTER,
        });
        this._radioBoxLabel.text = radioBtnTitle;

        this.radioButton = new St.Button({
            style_class: 'bbm-radiobtn',
            reactive: true,
            can_focus: true,
            track_hover: true,
            button_mask: St.ButtonMask.ONE,
            y_align: Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.CENTER,
            accessible_role: Atk.Role.RADIO_BUTTON,
            accessible_name: `${grpTitle} ${radioBtnTitle}`,
        });

        this._box = new St.Bin({
            style_class: 'bbm-radiobtn-box',
            y_align: Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.CENTER,
        });
        this.radioButton.child = this._box;

        this._icon = new St.Icon({
            gicon: gIcon('bbm-radio-symbolic.svg'),
            style_class: 'bbm-radiobtn-icon',
        });
        this._box.set_child(this._icon);

        this.radioButton.checked = initialChecked;

        this.updateStyle();
        this.radioButton.connectObject(
            'clicked', () => {
                this.radioButton.checked = !this.radioButton.checked;
                this.updateStyle();
            },
            'notify::hover', () => {
                this.updateStyle();
            },
            'key-focus-in', () => {
                this.updateStyle();
            },
            'key-focus-out', () => {
                this.updateStyle();
            },
            this
        );

        const bin = new St.Bin();
        bin.set_child(this.radioButton);
        this.add_child(bin);
        this.add_child(this._radioBoxLabel);
    }

    updateStyle() {
        let iconStyle = '';
        let boxStyle = '';

        if (this.radioButton.checked && this.radioButton.hover) {
            iconStyle = this._styleInfo.iconHoverCheckedStyle;
            boxStyle =
            `${this._styleInfo.borderCheckedStyle} ${
                this._styleInfo.boxHoverCheckedStyle}`;
        } else if (this.radioButton.checked) {
            iconStyle = this._styleInfo.iconCheckedStyle;
            boxStyle =
            `${this._styleInfo.borderCheckedStyle} ${
                this._styleInfo.boxCheckedStyle}`;
        } else if (this.radioButton.hover) {
            iconStyle = this._styleInfo.iconStyle;
            boxStyle =
            `${this._styleInfo.borderHoverStyle} ${
                this._styleInfo.boxStyle}`;
        } else {
            iconStyle = this._styleInfo.iconStyle;
            boxStyle =
            `${this._styleInfo.borderStyle} ${
                this._styleInfo.boxStyle}`;
        }

        if (this.radioButton.has_key_focus() && this.radioButton.checked) {
            boxStyle =
            `${this._styleInfo.borderCheckedStyle} ${
                this._styleInfo.boxHoverCheckedStyle}`;
        } else if (this.radioButton.has_key_focus()) {
            boxStyle = this._styleInfo.borderFocusStyle;
        }

        this._icon.set_style(iconStyle);
        this._box.set_style(boxStyle);
    }
});

const [major] = Config.PACKAGE_VERSION.split('.');
const shellVersion = Number.parseInt(major);
const boxLayoutProps = shellVersion >= 48
    ? {orientation: Clutter.Orientation.VERTICAL} : {vertical: true};

export const RadioButtonBin = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_RadioButtonBin',
}, class RadioButtonBin extends St.BoxLayout {
    _init(gIcon, colorInfo, dataHandler, id) {
        super._init({
            ...boxLayoutProps, x_expand: true, style_class: 'bbm-box',
        });
        this._gIcon = gIcon;
        this._colorInfo = colorInfo;
        this._dataHandler = dataHandler;
        this._radioButtons = [];
        const config = dataHandler.getConfig();
        const buttons = config[`box${id}RadioButton`];

        const accentColor = colorInfo.accentColor;
        const accentRgba = colorToRgba(accentColor);
        const fgColor = colorInfo.foregroundColor;
        const fgRgba = colorToRgba(fgColor);

        const hoverAccentColor = adjustColorLuminanceToRgba(accentColor, 5);
        const hoverAccentFgColor = adjustColorLuminanceToRgba(fgColor, 5);
        const focusBorderColor = adjustOpacityToRgba(accentColor, 0.65);

        const borderStyle = `border: 2px solid ${colorGreyOpacity(0.50)};`;
        const borderHoverStyle = `border: 2px solid ${colorGreyOpacity(0.70)};`;
        const borderCheckedStyle = 'border: 2px solid transparent;';
        const borderFocusStyle = `border: 2px solid ${focusBorderColor};`;

        const boxStyle = 'background-color: transparent;';
        const boxCheckedStyle = `background-color: ${accentRgba};`;
        const boxHoverCheckedStyle = `background-color: ${hoverAccentColor};`;

        const iconStyle = 'color: transparent;';
        const iconCheckedStyle = `color: ${fgRgba};`;
        const iconHoverCheckedStyle = `color: ${hoverAccentFgColor};`;

        const styleInfo = {
            borderStyle, borderHoverStyle, borderCheckedStyle,
            boxStyle, boxCheckedStyle, boxHoverCheckedStyle,
            iconStyle, iconCheckedStyle, iconHoverCheckedStyle, borderFocusStyle,
        };

        const menuSeparator = new St.Widget({
            style_class: 'bbm-option-menu-separator',
            x_align: Clutter.ActorAlign.CENTER,
        });

        this.add_child(menuSeparator);

        const title = config[`box${id}RadioTitle`];
        this._radioBoxTitleLabel = new St.Label({
            style_class: 'bbm-subtitle-label',
            x_align: Clutter.ActorAlign.CENTER,
        });
        this._radioBoxTitleLabel.text = title;
        this.add_child(this._radioBoxTitleLabel);


        const hBox = new St.BoxLayout({x_align: Clutter.ActorAlign.CENTER});

        buttons.forEach((label, i) => {
            const btnIndex = i + 1;
            const state = this._dataHandler.getProps()[`box${id}RadioButtonState`];
            const initialChecked = state === btnIndex;
            const btn =
                new RadioButton(gIcon, styleInfo, buttons.length, label, title, initialChecked);
            this._radioButtons.push(btn);
            hBox.add_child(btn);

            btn.radioButton.connectObject('clicked', () => {
                this._radioButtons.forEach((b, j) => {
                    b.radioButton.checked = j === i;
                });
                this._radioButtons.forEach(b => b.updateStyle());

                this._dataHandler.emitUIAction(`box${id}RadioButtonState`, btnIndex);
            }, this);

            if (i < buttons.length - 1) {
                const sep = new St.Widget({style_class: 'bbm-button-separator'});
                hBox.add_child(sep);
            }
        });


        this._dataHandler.connectObject('properties-changed', () => {
            const state = this._dataHandler.getProps()[`box${id}RadioButtonState`];
            this._radioButtons.forEach((btn, idx) => {
                btn.radioButton.checked = state > 0 && idx + 1 === state;
                btn.updateStyle();
            });
        }, this);

        this.add_child(hBox);
    }
});

