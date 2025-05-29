'use strict';
import Cogl from 'gi://Cogl';
import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';

import {VectorImages} from './circularBatteryVectorImages.js';

const [major] = Config.PACKAGE_VERSION.split('.');
const shellVersion = Number.parseInt(major);

// Credits: to https://github.com/Deminder for this
// https://github.com/Deminder/battery-indicator-icon/blob/main/src/modules/drawicon.js

export const CircleBatteryIcon = GObject.registerClass(
class CircleBatteryIcon extends St.DrawingArea {
    _init(modelIconSize, modelPathName, widgetInfo, params = {}) {
        super._init({
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            ...params,
        });
        this.width = modelIconSize;
        this.height = modelIconSize;
        this._modelPathName = modelPathName;
        this._widgetInfo = widgetInfo;
    }

    _setSourceColor(cr, color) {
        if (shellVersion <= 45)
            Clutter.cairo_set_source_color(cr, color);
        else
            cr.setSourceColor(color);
    }

    _assignWidgetColor() {
        const colorObject = hexColor => (shellVersion <= 46
            ? Clutter.Color : Cogl.Color).from_string(hexColor)[1]; ;
        const themeColors = this.get_theme_node().get_icon_colors();
        const symbolicColor = themeColors.foreground;
        const successColor =  themeColors.success;
        const warningColor =  themeColors.warning;
        const errorColor =  themeColors.error;
        const baseLevelColor = symbolicColor.copy();
        baseLevelColor.alpha *= 0.5;

        let fillLevelColor;
        let chargingIconColor = symbolicColor;
        const disconnectedIconColor = errorColor;
        if (this._widgetInfo.circleWidgetColor === 0) {
            fillLevelColor = this._percentage > 20 ? symbolicColor : warningColor;
            chargingIconColor = successColor;
        } else if (this._widgetInfo.circleWidgetColor === 1) {
            fillLevelColor = this._percentage > 20 ? successColor : warningColor;
        } else {
            let hex;
            if (this._percentage > 90)
                hex = this._widgetInfo.color100;
            else if (this._percentage > 80 && this._percentage <= 90)
                hex = this._widgetInfo.color90;
            else if (this._percentage > 70 && this._percentage <= 80)
                hex = this._widgetInfo.color80;
            else if (this._percentage > 60 && this._percentage <= 70)
                hex = this._widgetInfo.color70;
            else if (this._percentage > 50 && this._percentage <= 60)
                hex = this._widgetInfo.color60;
            else if (this._percentage > 40 && this._percentage <= 50)
                hex = this._widgetInfo.color50;
            else if (this._percentage > 30 && this._percentage <= 40)
                hex = this._widgetInfo.color40;
            else if (this._percentage > 20 && this._percentage <= 30)
                hex = this._widgetInfo.color30;
            else if (this._percentage > 10 && this._percentage <= 20)
                hex = this._widgetInfo.color20;
            else if (this._percentage <= 10)
                hex = this._widgetInfo.color10;

            fillLevelColor = colorObject(hex);
        }
        return {
            symbolicColor, fillLevelColor, baseLevelColor,
            chargingIconColor, disconnectedIconColor,
        };
    }

    updateValues(percentage, status) {
        this._status = status;
        this._percentage = percentage;
        this.queue_repaint();
    }

    _addVectorImage(cr, path)  {
        cr.translate(0, 0);
        let currentX = 0;
        let currentY = 0;
        const vectorPath = path.split(' ');
        for (let i = 0; i < vectorPath.length; i++) {
            if (vectorPath[i] === 'M') {
                currentX = parseFloat(vectorPath[i + 1]);
                currentY = parseFloat(vectorPath[i + 2]);
                cr.moveTo(currentX, currentY);
                i += 2;
            } else if (vectorPath[i] === 'L') {
                currentX = parseFloat(vectorPath[i + 1]);
                currentY = parseFloat(vectorPath[i + 2]);
                cr.lineTo(currentX, currentY);
                i += 2;
            } else if (vectorPath[i] === 'H') {
                currentX = parseFloat(vectorPath[i + 1]);
                cr.lineTo(currentX, currentY);
                i += 1;
            } else if (vectorPath[i] === 'V') {
                currentY = parseFloat(vectorPath[i + 1]);
                cr.lineTo(currentX, currentY);
                i += 1;
            } else if (vectorPath[i] === 'C') {
                const x1 = parseFloat(vectorPath[i + 1]);
                const y1 = parseFloat(vectorPath[i + 2]);
                const x2 = parseFloat(vectorPath[i + 3]);
                const y2 = parseFloat(vectorPath[i + 4]);
                const x3 = parseFloat(vectorPath[i + 5]);
                const y3 = parseFloat(vectorPath[i + 6]);
                cr.curveTo(x1, y1, x2, y2, x3, y3);
                currentX = x3;
                currentY = y3;
                i += 6;
            } else if (vectorPath[i] === 'Z') {
                cr.closePath();
            }
        }
        cr.fill();
    }

    _circle(cr, w, h, p, strokeWidth) {
        const size = h;
        const radius = (size - strokeWidth) / 2;
        const [cw, ch] = [w / 2, h / 2];
        cr.save();
        this._setSourceColor(cr, this._colors.baseLevelColor);
        cr.setLineWidth(strokeWidth);
        cr.translate(cw, ch);
        cr.scale(w / size, h / size);
        cr.arc(0, 0, radius, 0, 2 * Math.PI);
        cr.stroke();

        this._setSourceColor(cr, this._colors.fillLevelColor);
        const angleOffset = -0.5 * Math.PI;
        cr.arc(0, 0, radius, angleOffset, angleOffset + p * 2 * Math.PI);
        cr.stroke();
        cr.restore();

        cr.scale(w / 32, h / 32);

        const modelPath = VectorImages[this._modelPathName];
        const chargingPath = VectorImages['charging-bolt'];
        const disconnectedPath = VectorImages['disconnected'];

        this._setSourceColor(cr, this._colors.symbolicColor);
        this._addVectorImage(cr, modelPath);

        if (this._status === 'disconnected') {
            cr.fill();
            this._setSourceColor(cr, this._colors.disconnectedIconColor);
            this._addVectorImage(cr, disconnectedPath);
        } else if (this._status === 'charging') {
            this._setSourceColor(cr, this._colors.chargingIconColor);
            this._addVectorImage(cr, chargingPath);
        }
        cr.fill();
    }

    get iconColors() {
        return this.get_theme_node().get_icon_colors();
    }

    vfunc_repaint() {
        this._colors = this._assignWidgetColor();
        const cr = this.get_context();
        const [w, h] = this.get_surface_size();
        const one = h / 16;
        const strokeWidth = 1.8 * one;
        const p = this._percentage <= 0 ? 0 : this._percentage / 100;
        this._circle(cr, w, h, p, strokeWidth);
        cr.$dispose();
    }
}
);


