import Clutter from 'gi://Clutter';
import Cogl from 'gi://Cogl';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';

const [major] = Config.PACKAGE_VERSION.split('.');
const shellVersion = Number.parseInt(major);

export function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s;
    const l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const delta = max - min;
        s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
        switch (max) {
            case r:
                h = (g - b) / delta + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / delta + 2;
                break;
            case b:
                h = (r - g) / delta + 4;
                break;
        }
        h /= 6;
    }

    return {
        h: h * 360,
        s: s * 100,
        l: l * 100,
    };
}

export function hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    let r, g, b;

    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0)
                t += 1;
            if (t > 1)
                t -= 1;
            if (t < 1 / 6)
                return p + (q - p) * 6 * t;
            if (t < 1 / 2)
                return q;
            if (t < 2 / 3)
                return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;

        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
        red: Math.round(r * 255),
        green: Math.round(g * 255),
        blue: Math.round(b * 255),
    };
}

export function hslToRgbHexString(h, s, l) {
    const {red, green, blue} = hslToRgb(h, s, l);
    return `#${((1 << 24) + (red << 16) + (green << 8) + blue)
        .toString(16)
        .slice(1)
        .toUpperCase()}`;
}

export function colorToString(color) {
    return color.to_string().substring(0, 7);
}

export function colorToRgba(color) {
    return `rgba(${color.red}, ${color.green}, ${color.blue}, ${color.alpha})`;
}

export function colorToHsl(color) {
    return rgbToHsl(color.red, color.green, color.blue);
}

export function isDarkMode(color) {
    const {l} = rgbToHsl(color.red, color.green, color.blue);
    return l < 40;
}

export function adjustOpacityToRgba(color, transparency) {
    const alpha = Math.max(0, Math.min(1, transparency)).toFixed(2);
    return `rgba(${color.red}, ${color.green}, ${color.blue}, ${alpha})`;
}

export function colorGreyOpacity(transparency) {
    const alpha = Math.max(0, Math.min(1, transparency)).toFixed(2);
    return `rgba(${128}, ${128}, ${128}, ${alpha})`;
}

export function adjustColorLuminanceToRgba(color, factor) {
    const {h, s, l} = rgbToHsl(color.red, color.green, color.blue);
    const newL = Math.max(0, Math.min(100, l + factor));
    const {red, green, blue} = hslToRgb(h, s, newL);
    const alpha = (color.alpha / 255).toFixed(2);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function hexToColor(hexColor) {
    return (shellVersion <= 46 ? Clutter.Color : Cogl.Color).from_string(hexColor)[1];
}

