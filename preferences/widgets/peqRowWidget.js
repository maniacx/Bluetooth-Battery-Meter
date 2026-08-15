'use strict';
import Adw from 'gi://Adw';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
import GLib from 'gi://GLib';
import Cairo from 'gi://cairo';

const LayoutMode = {
    DESKTOP: 0,
    MOBILE_PORTRAIT: 1,
    MOBILE_LANDSCAPE: 2,
};

const FALLBACK_COLORS = [
    {red: 0x21 / 255, green: 0x90 / 255, blue: 0xa4 / 255, alpha: 1.0},
    {red: 0xc8 / 255, green: 0x88 / 255, blue: 0x00 / 255, alpha: 1.0},
    {red: 0x91 / 255, green: 0x41 / 255, blue: 0xac / 255, alpha: 1.0},
    {red: 0xed / 255, green: 0x5b / 255, blue: 0x00 / 255, alpha: 1.0},
    {red: 0x3a / 255, green: 0x94 / 255, blue: 0x4a / 255, alpha: 1.0},
    {red: 0x35 / 255, green: 0x84 / 255, blue: 0xe4 / 255, alpha: 1.0},
    {red: 0xd5 / 255, green: 0x61 / 255, blue: 0x99 / 255, alpha: 1.0},
    {red: 0x91 / 255, green: 0x41 / 255, blue: 0xac / 255, alpha: 1.0},
];

const PEQ_CSS = `
.bbm-peq-band1 {
    color: var(--accent-teal);
}
.bbm-peq-band1 highlight {
    background-color: var(--accent-teal);
}
.bbm-peq-band2 {
    color: var(--accent-yellow);
}
.bbm-peq-band2 highlight {
    background-color: var(--accent-yellow);
}
.bbm-peq-band3 {
    color: var(--accent-purple);
}
.bbm-peq-band3 highlight {
   background-color: var(--accent-purple);
}
.bbm-peq-band4 {
    color: var(--accent-orange);
}
.bbm-peq-band4 highlight {
    background-color: var(--accent-orange);
}
.bbm-peq-band5 {
    color: var(--accent-green);
}
.bbm-peq-band5 highlight {
    background-color: var(--accent-green);
}
.bbm-peq-band6 {
    color: var(--accent-blue);
}
.bbm-peq-band6 highlight {
    background-color: var(--accent-blue);
}
.bbm-peq-band7 {
    color: var(--accent-pink);
}
.bbm-peq-band7 highlight {
    background-color: var(--accent-pink);
}
.bbm-peq-band8 {
    color: var(--accent-purple);
}
.bbm-peq-band8 highlight {
    background-color: var(--accent-purple);
}
.debug-border {
    border: 2px solid red;
    background-color: rgba(255, 0, 0, 0.1);
}
`;

const TOP_MARGIN = 20;
const BOTTOM_MARGIN = 50;
const LEFT_MARGIN = 50;
const RIGHT_MARGIN = 20;

function roundToStep(value, step, digits) {
    const rounded = Math.round(value / step) * step;
    return Number(rounded.toFixed(digits));
}

function normalizeValue(value, config) {
    return roundToStep(value, config.step ?? 1, config.digit ?? 0);
}

function generateLinearTicks(min, max) {
    const ticks = [];
    const segments = 4;
    const step = (max - min) / segments;

    for (let i = 0; i <= segments; i++)
        ticks.push(min + step * i);

    return ticks;
}

function generateLogTicks(min, max) {
    const ticks = [];
    const multipliers = [1, 2, 5];
    const startDecade = Math.floor(Math.log10(min));
    const endDecade = Math.ceil(Math.log10(max));

    for (let decade = startDecade; decade <= endDecade; decade++) {
        const base = Math.pow(10, decade);

        for (const m of multipliers) {
            const freq = base * m;

            if (freq >= min && freq <= max)
                ticks.push(freq);
        }
    }

    return ticks;
}

function freqToX(freq, width, config) {
    const logMin = Math.log10(config.frequency.min);
    const logMax = Math.log10(config.frequency.max);
    const p = (Math.log10(freq) - logMin) / (logMax - logMin);
    return LEFT_MARGIN + p * (width - LEFT_MARGIN - RIGHT_MARGIN);
}

function xToFreq(x, width, config) {
    const p = (x - LEFT_MARGIN) / (width - LEFT_MARGIN - RIGHT_MARGIN);
    const logMin = Math.log10(config.frequency.min);
    const logMax = Math.log10(config.frequency.max);
    const freq = Math.pow(10, logMin + p * (logMax - logMin));
    return normalizeValue(freq, config.frequency);
}

function dbToY(db, height, config) {
    const min = config.gain.min;
    const max = config.gain.max;
    const p = (db - min) / (max - min);
    return height - BOTTOM_MARGIN - p * (height - TOP_MARGIN - BOTTOM_MARGIN);
}

function yToDb(y, height, config) {
    const min = config.gain.min;
    const max = config.gain.max;
    const p = (height - BOTTOM_MARGIN - y) / (height - TOP_MARGIN - BOTTOM_MARGIN);
    const gain = min + p * (max - min);
    return normalizeValue(gain, config.gain);
}

function bellResponse(freq, band) {
    const logDistance = Math.log2(freq / band.frequency);
    const bandwidth = 1.0 / Math.max(band.q, 0.01);
    return band.gain * Math.exp(-(logDistance * logDistance) / (2 * bandwidth * bandwidth));
}

function lowPassResponse(freq, band) {
    const ratio = freq / band.frequency;
    return band.gain / (1 + Math.pow(ratio, band.q * 2));
}

function highPassResponse(freq, band) {
    const ratio = band.frequency / freq;
    return band.gain / (1 + Math.pow(ratio, band.q * 2));
}

function lowShelfResponse(freq, band) {
    const x = Math.log2(freq / band.frequency);
    const steepness = Math.max(band.q, 0.01);
    return band.gain / (1 + Math.exp(x * steepness * 4));
}

function highShelfResponse(freq, band) {
    const x = Math.log2(freq / band.frequency);
    const steepness = Math.max(band.q, 0.01);
    return band.gain / (1 + Math.exp(-x * steepness * 4));
}

function bandResponse(freq, band) {
    switch (band.filter) {
        case 'bell':
            return bellResponse(freq, band);

        case 'lpf':
            return lowPassResponse(freq, band);

        case 'hpf':
            return highPassResponse(freq, band);

        case 'lsf':
            return lowShelfResponse(freq, band);

        case 'hsf':
            return highShelfResponse(freq, band);

        default:
            return 0;
    }
}

function drawGrid(cr, width, height, config, color) {
    cr.selectFontFace('Sans', Cairo.FontSlant.NORMAL, Cairo.FontWeight.NORMAL);
    cr.setFontSize(11);
    const freqTicks = generateLogTicks(config.frequency.min, config.frequency.max);

    for (const freq of freqTicks) {
        const x = freqToX(freq, width, config);
        cr.setLineWidth(1);
        cr.setSourceRGBA(color.grid.red, color.grid.green, color.grid.blue, color.grid.alpha);
        cr.moveTo(x, TOP_MARGIN);
        cr.lineTo(x, height - BOTTOM_MARGIN);
        cr.stroke();
        let label = `${freq}`;

        if (freq >= 1000)
            label = `${freq / 1000}k`;

        const ext = cr.textExtents(label);
        cr.setSourceRGBA(color.text.red, color.text.green, color.text.blue, color.text.alpha);
        cr.moveTo(x - ext.width / 2, height - BOTTOM_MARGIN + 18);
        cr.showText(label);
    }

    const dbTicks = generateLinearTicks(config.gain.min, config.gain.max);

    for (const db of dbTicks) {
        const y = dbToY(db, height, config);

        if (db === 0) {
            cr.setLineWidth(2);
            cr.setSourceRGBA(color.gridMajor.red, color.gridMajor.green,
                color.gridMajor.blue, color.gridMajor.alpha);
        } else {
            cr.setLineWidth(1);
            cr.setSourceRGBA(color.grid.red, color.grid.green, color.grid.blue, color.grid.alpha);
        }

        cr.moveTo(LEFT_MARGIN, y);
        cr.lineTo(width - RIGHT_MARGIN, y);
        cr.stroke();
        let label = `${db}`;

        if (db > 0)
            label = `+${db}`;

        const ext = cr.textExtents(label);
        cr.setSourceRGBA(color.text.red, color.text.green, color.text.blue, color.text.alpha);
        cr.moveTo(LEFT_MARGIN - ext.width - 8, y + ext.height / 2);
        cr.showText(label);
    }
}

const EqGraph = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_EqGraph',
    Signals: {
        'band-selected': {
            param_types: [GObject.TYPE_INT],
        },
    },
}, class EqGraph extends Gtk.DrawingArea {
    _init(gtxt, config) {
        super._init({});
        this._gtxt = gtxt;
        this._config = config;

        this._styleManager = Adw.StyleManager.get_default();
        this._updateThemeColors(this._styleManager.dark);
        this._styleId = this._styleManager.connect('notify::dark', () => {
            this._updateThemeColors(this._styleManager.dark);
            this.queue_draw();
        });

        this._bands = [];
        this._signalIds = [];
        this._dragging = false;
        this._activeBand = null;
        this._dragStartX = 0;
        this._dragStartY = 0;
        this.set_size_request(-1, 280);
        this.set_hexpand(true);
        this.set_vexpand(false);

        this.set_draw_func((_area, cr, width, height) => {
            drawGrid(cr, width, height, this._config, this._colors);
            this._drawBandCurves(cr, width, height);
            this._drawCurve(cr, width, height);
            this._drawHandles(cr, width, height);
        });

        const drag = new Gtk.GestureDrag();

        drag.connect('drag-begin', (_gesture, startX, startY) => {
            const width = this.get_width();
            const height = this.get_height();
            this._activeBand = null;

            for (const band of this._bands) {
                const cx = freqToX(band.frequency, width, this._config);
                const cy = dbToY(band.gain, height, this._config);
                const dist = Math.hypot(startX - cx, startY - cy);

                if (dist < 12) {
                    this._activeBand = band;
                    this._dragging = true;
                    this.emit('band-selected', band.index);
                    this._dragStartX = startX;
                    this._dragStartY = startY;
                    break;
                }
            }
        });

        drag.connect('drag-update', (_gesture, offsetX, offsetY) => {
            if (!this._dragging || !this._activeBand)
                return;

            const x = this._dragStartX + offsetX;
            const y = this._dragStartY + offsetY;

            this._updateBandFromPoint(this._activeBand, x, y);
        });

        drag.connect('drag-end', () => {
            this._dragging = false;
            this._activeBand = null;
        });

        this.add_controller(drag);
    }

    _updateThemeColors(dark) {
        if (dark) {
            this._colors = {
                grid: {red: 1, green: 1, blue: 1, alpha: 0.15},
                gridMajor: {red: 1, green: 1, blue: 1, alpha: 0.35},
                text: {red: 1, green: 1, blue: 1, alpha: 0.75},
            };
        } else {
            this._colors = {
                grid: {red: 0, green: 0, blue: 0, alpha: 0.15},
                gridMajor: {red: 0, green: 0, blue: 0, alpha: 0.35},
                text: {red: 0, green: 0, blue: 0, alpha: 0.75},
            };
        }
    }

    addBand(eqBand) {
        this._bands.push(eqBand);
        const eqBandId = eqBand.connect('notify', () => this.queue_draw());
        this._signalIds.push([eqBand, eqBandId]);
        this.queue_draw();
    }

    removeBand(eqBand) {
        const index = this._bands.indexOf(eqBand);

        if (index >= 0)
            this._bands.splice(index, 1);

        const signalIndex = this._signalIds.findIndex(([obj]) => obj === eqBand);

        if (signalIndex >= 0) {
            const [obj, id] = this._signalIds[signalIndex];

            obj.disconnect(id);
            this._signalIds.splice(signalIndex, 1);
        }

        this.queue_draw();
    }

    _updateBandFromPoint(band, x, y) {
        const width = this.get_width();
        const height = this.get_height();
        x = Math.max(LEFT_MARGIN, Math.min(width - RIGHT_MARGIN, x));
        y = Math.max(TOP_MARGIN, Math.min(height - BOTTOM_MARGIN, y));
        band.frequency = xToFreq(x, width, this._config);
        band.gain = yToDb(y, height, this._config);
        this.queue_draw();
    }

    _drawBandCurves(cr, width, height) {
        const zeroY = dbToY(0, height, this._config);

        for (const band of this._bands) {
            if (band.bypass)
                continue;

            const color = band.color ?? FALLBACK_COLORS[band.index - 1];
            let first = true;
            cr.newPath();

            for (let x = LEFT_MARGIN; x <= width - RIGHT_MARGIN; x++) {
                const freq = xToFreq(x, width, this._config);
                const gain = bandResponse(freq, band);
                const y = dbToY(gain, height, this._config);

                if (first) {
                    cr.moveTo(x, y);
                    first = false;
                } else {
                    cr.lineTo(x, y);
                }
            }

            cr.lineTo(width - RIGHT_MARGIN, zeroY);
            cr.lineTo(LEFT_MARGIN, zeroY);
            cr.closePath();
            cr.setSourceRGBA(color.red, color.green, color.blue, 0.08);
            cr.fillPreserve();
            cr.setSourceRGBA(color.red, color.green, color.blue, 0.35);
            cr.setLineWidth(1.5);
            cr.stroke();
        }
    }

    _drawCurve(cr, width, height) {
        cr.setLineWidth(2);
        cr.setSourceRGB(0.2, 0.8, 1.0);

        let first = true;

        for (let x = LEFT_MARGIN; x <= width - RIGHT_MARGIN; x++) {
            const freq = xToFreq(x, width, this._config);
            let totalGain = 0;

            for (const band of this._bands) {
                if (band.bypass)
                    continue;

                totalGain += bandResponse(freq, band);
            }

            const clampedGain = Math.max(this._config.gain.min,
                Math.min(this._config.gain.max, totalGain));

            const y = dbToY(clampedGain, height, this._config);

            if (first) {
                cr.moveTo(x, y);
                first = false;
            } else {
                cr.lineTo(x, y);
            }
        }

        cr.stroke();
    }

    _drawHandles(cr, width, height) {
        for (const band of this._bands) {
            if (band.bypass)
                continue;

            const cx = freqToX(band.frequency, width, this._config);
            const cy = dbToY(band.gain, height, this._config);
            const color = band.color ?? FALLBACK_COLORS[band.index];

            cr.setSourceRGBA(color.red, color.green, color.blue, color.alpha ?? 1.0);
            cr.arc(cx, cy, 6, 0, Math.PI * 2);
            cr.fill();
        }
    }

    destroy() {
        if (this._styleId && this._styleManager)
            this._styleManager.disconnect(this._styleId);
        this._styleManager = null;
        this._styleId = null;

        for (const [obj, id] of this._signalIds)
            obj.disconnect(id);

        this._signalIds = null;
    }
});

const EqBand = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_EqBand',
    Properties: {
        frequency: GObject.ParamSpec.double('frequency', '', '',
            GObject.ParamFlags.READWRITE, 20, 20000, 1000),
        gain: GObject.ParamSpec.double('gain', '', '', GObject.ParamFlags.READWRITE, -24, 24, 0),
        q: GObject.ParamSpec.double('q', '', '', GObject.ParamFlags.READWRITE, 0.1, 10.0, 1.0),
        filter: GObject.ParamSpec.string('filter', '', '', GObject.ParamFlags.READWRITE, 'bell'),
        bypass: GObject.ParamSpec.boolean('bypass', '', '', GObject.ParamFlags.READWRITE, false),
    },
}, class EqBand extends GObject.Object {
    _init(index, params = {}) {
        super._init(params);
        this.index = index;
        this.color = null;
    }
});

const ParamButton = GObject.registerClass({
    GTypeName: 'ParamButton',
}, class ParamButton extends Gtk.MenuButton {
    _init(tooltip, iconName, config, value, css, useButtonContent = false) {
        super._init({tooltip_text: tooltip});

        if (useButtonContent) {
            this.buttonContent = new Adw.ButtonContent({
                icon_name: iconName,
                css_classes: [css],
            });
            this.set_child(this.buttonContent);
        } else {
            this.set_icon_name(iconName);
            this.set_css_classes([css]);
        }

        this._isLog = config.scale === 'log';

        this.adjustment = new Gtk.Adjustment({
            lower: config.min,
            upper: config.max,
            value,
            step_increment: config.step ?? 1,
            page_increment: (config.step ?? 1) * 10,
        });

        const popover = new Gtk.Popover();

        const box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 8,
            margin_top: 12,
            margin_bottom: 12,
            margin_start: 12,
            margin_end: 12,
        });

        this.scale = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL,
            draw_value: false,
            hexpand: true,
            width_request: 250,
            css_classes: [css],
        });

        if (this._isLog) {
            this.scale.set_adjustment(new Gtk.Adjustment({
                lower: Math.log10(config.min),
                upper: Math.log10(config.max),
                value: Math.log10(value),
                step_increment: 0.01,
                page_increment: 0.1,
            }));

            this.scale.connect('value-changed', () => {
                const val = Math.pow(10, this.scale.get_adjustment().value);
                this.adjustment.value = normalizeValue(val, config);
            });

            this.adjustment.connect('notify::value', () => {
                this.scale.get_adjustment().value = Math.log10(this.adjustment.value);
            });
        } else {
            this.scale.set_adjustment(this.adjustment);

            this.scale.connect('value-changed', () => {
                const val = normalizeValue(this.adjustment.value, config);

                if (val !== this.adjustment.value)
                    this.adjustment.value = val;
            });
        }

        const spin = new Gtk.SpinButton({
            adjustment: this.adjustment,
            digits: config.digit ?? 0,
            halign: Gtk.Align.CENTER,
            css_classes: [css],
        });

        box.append(this.scale);
        box.append(spin);
        popover.set_child(box);
        this.set_popover(popover);
    }

    updateRange(config) {
        this.adjustment.lower = config.min;
        this.adjustment.upper = config.max;

        if (this._isLog) {
            const scaleAdj = this.scale.get_adjustment();

            scaleAdj.lower = Math.log10(config.min);
            scaleAdj.upper = Math.log10(config.max);

            scaleAdj.value = Math.log10(this.adjustment.value);
        }
    }
});

const BandPage = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_BandPage',
}, class BandPage extends Gtk.Box {
    _init(gtxt, bandNumber, eqBand, config) {
        super._init({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 6,
            halign: Gtk.Align.CENTER,
            margin_bottom: 16,
            margin_start: 8,
            margin_end: 8,
        });

        const controlsRow = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 6,
            halign: Gtk.Align.CENTER,
        });

        this._signalIds = [];

        const _ = gtxt;
        this._eqBand = eqBand;
        this._config = config;
        const css = `bbm-peq-band${bandNumber}`;
        this.color = null;

        const filterLabels = {
            bell: _('Peak'),
            lpf: _('Low Pass Filter'),
            hpf: _('High Pass Filter'),
            lsf: _('Low Shelf Filter'),
            hsf: _('High Shelf Filter'),
        };

        const getQConfig = () => this._config.q[this._eqBand.filter] ?? this._config.q.bell;

        const freqBtn = new ParamButton(
            _('Frequency'),
            'bbm-hz-symbolic',
            this._config.frequency,
            this._eqBand.frequency,
            css
        );

        const qBtn = new ParamButton(
            _('Quality Factor'),
            'bbm-q-symbolic',
            getQConfig(),
            this._eqBand.q,
            css
        );

        const gainBtn = new ParamButton(
            _('Gain'),
            'bbm-db-symbolic',
            this._config.gain,
            this._eqBand.gain,
            css
        );

        controlsRow.append(freqBtn);
        controlsRow.append(qBtn);
        controlsRow.append(gainBtn);

        this.color = freqBtn.get_color();

        this._eqBand.bind_property(
            'frequency',
            freqBtn.adjustment,
            'value',
            GObject.BindingFlags.BIDIRECTIONAL | GObject.BindingFlags.SYNC_CREATE
        );

        this._eqBand.bind_property(
            'q',
            qBtn.adjustment,
            'value',
            GObject.BindingFlags.BIDIRECTIONAL | GObject.BindingFlags.SYNC_CREATE
        );

        this._eqBand.bind_property(
            'gain',
            gainBtn.adjustment,
            'value',
            GObject.BindingFlags.BIDIRECTIONAL | GObject.BindingFlags.SYNC_CREATE
        );

        if (this._config.filters?.length > 1) {
            controlsRow.append(new Gtk.Separator({orientation: Gtk.Orientation.VERTICAL}));
            const filterButton = new Gtk.MenuButton({
                css_classes: [css],
                tooltip_text: filterLabels[this._eqBand.filter] ?? this._eqBand.filter,
            });

            const filterPopover = new Gtk.Popover();
            filterButton.set_popover(filterPopover);

            const filterBox = new Gtk.Box({
                spacing: 4,
                margin_top: 6,
                margin_bottom: 6,
                margin_start: 6,
                margin_end: 6,
            });

            filterPopover.set_child(filterBox);
            controlsRow.append(filterButton);

            const updateQRange = () => {
                const qConfig = getQConfig();

                if (this._eqBand.q > qConfig.max)
                    this._eqBand.q = qConfig.max;

                if (this._eqBand.q < qConfig.min)
                    this._eqBand.q = qConfig.min;

                qBtn.updateRange(qConfig);
            };

            const updateFilterUI = () => {
                updateQRange();
                filterButton.icon_name = `bbm-${this._eqBand.filter}-symbolic`;
                let child = filterBox.get_first_child();

                while (child) {
                    const next = child.get_next_sibling();
                    filterBox.remove(child);
                    child = next;
                }

                for (const filter of this._config.filters) {
                    if (filter === this._eqBand.filter)
                        continue;

                    const btn = new Gtk.Button({
                        icon_name: `bbm-${filter}-symbolic`,
                        tooltip_text: filterLabels[filter] ?? filter,
                        css_classes: [css],
                    });

                    btn.connect('clicked', () => {
                        this._eqBand.filter = filter;
                        filterPopover.popdown();
                        filterButton.tooltip_text =
                            filterLabels[this._eqBand.filter] ?? this._eqBand.filter;
                    });

                    filterBox.append(btn);
                }
            };

            const eqBandId = this._eqBand.connect('notify::filter', updateFilterUI);
            this._signalIds.push(eqBandId);
            updateFilterUI();
        }

        if (this._config.bypassSupported) {
            controlsRow.append(new Gtk.Separator({orientation: Gtk.Orientation.VERTICAL}));

            const bypassBtn = new Gtk.ToggleButton({
                icon_name: 'bbm-bypass-symbolic',
                tooltip_text: 'Bypass',
                css_classes: [css],
            });

            controlsRow.append(bypassBtn);

            this._eqBand.bind_property(
                'bypass',
                bypassBtn,
                'active',
                GObject.BindingFlags.BIDIRECTIONAL | GObject.BindingFlags.SYNC_CREATE
            );
        }

        const updateValueLabel = () => {
            if (this._eqBand.bypass) {
                this._valueLabel.label = _('Bypass');
                return;
            }

            const freq = Math.round(this._eqBand.frequency);
            const gain = this._eqBand.gain.toFixed(1);
            const q = this._eqBand.q.toFixed(2);

            this._valueLabel.label =  _('%d Hz,  %s dB,  Q: %s')
            .replace('%d', freq)
            .replace('%s', gain)
            .replace('%s', q);
        };

        this._signalIds.push(this._eqBand.connect('notify::frequency', () => updateValueLabel()));
        this._signalIds.push(this._eqBand.connect('notify::gain', () => updateValueLabel()));
        this._signalIds.push(this._eqBand.connect('notify::q', () => updateValueLabel()));
        this._signalIds.push(this._eqBand.connect('notify::bypass', updateValueLabel));

        this._valueLabel = new Gtk.Label({
            halign: Gtk.Align.CENTER,
            selectable: false,
            css_classes: ['caption-heading', css, 'dimmed'],
            margin_top: 12,
            margin_bottom: 12,
        });

        updateValueLabel();

        this.append(controlsRow);
        this.append(this._valueLabel);
    }

    destroy() {
        if (this._eqBand && this._signalIds) {
            for (const id of this._signalIds) {
                if (id)
                    this._eqBand.disconnect(id);
            }
        }

        this._signalIds = null;
        this._eqBand = null;
    }
});

const ParametricEqDialog = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_ParametricEqDialog',
    Signals: {
        'peq-changed': {
            param_types: [GObject.TYPE_JSOBJECT],
        },
        'band-removed': {
            param_types: [GObject.TYPE_INT],
        },
        'preamp-changed': {
            param_types: [GObject.TYPE_DOUBLE],
        },
    },
}, class ParametricEqDialog extends Adw.Dialog {
    _init(gtxt, config) {
        super._init({
            content_width: 650,
            content_height: 520,
            width_request: 300,
            height_request: 300,
        });

        this._gtxt = gtxt;
        const _ = this._gtxt;
        this._config = config;
        this._layoutMode = LayoutMode.DESKTOP;
        this.bands = [];
        this._suppressPeqSignals = false;
        this._suppressPreAmpSignals = false;
        this._peqPending = null;
        this._peqTimeoutId = 0;
        this._preAmpPending = null;
        this._preAmpTimeoutId = 0;
        this._updateDelay = 200;


        const scrollWin = new Gtk.ScrolledWindow({
            hscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
            vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
            hexpand: true,
            vexpand: false,
            kinetic_scrolling: true,
            overlay_scrolling: false,
        });

        this._parentBox = new Gtk.Box({
            margin_top: 8,
            margin_bottom: 16,
            margin_start: 8,
            margin_end: 8,
        });
        scrollWin.set_child(this._parentBox);

        const headerBar = new Adw.HeaderBar({
            title_widget: new Adw.WindowTitle({
                title: _('Parametric Equalizer'),
            }),
        });

        const toolbarView = new Adw.ToolbarView();
        toolbarView.add_top_bar(headerBar);
        toolbarView.set_content(scrollWin);
        this.set_child(toolbarView);

        this._portraitBreakpoint = new Adw.Breakpoint({
            condition: Adw.BreakpointCondition.parse('max-width: 370sp'),
        });

        this._landscapeBreakpoint = new Adw.Breakpoint({
            condition: Adw.BreakpointCondition.parse('max-height: 370sp'),
        });

        this.add_breakpoint(this._portraitBreakpoint);
        this.add_breakpoint(this._landscapeBreakpoint);

        this._portraitBreakpoint.connect('apply', () => {
            this._setLayoutMode(LayoutMode.MOBILE_PORTRAIT);
        });

        this._portraitBreakpoint.connect('unapply', () => {
            this._setLayoutMode(LayoutMode.DESKTOP);
        });

        this._landscapeBreakpoint.connect('apply', () => {
            this._setLayoutMode(LayoutMode.MOBILE_LANDSCAPE);
        });

        this._landscapeBreakpoint.connect('unapply', () => {
            this._setLayoutMode(LayoutMode.DESKTOP);
        });

        const panelBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.CENTER,
            hexpand: false,
            vexpand: false,
        });

        this._graph = new EqGraph(this._gtxt, this._config);
        this._parentBox.append(this._graph);
        this._parentBox.append(panelBox);

        this._preAmpButton = new ParamButton(_('Pre Amp Gain'), 'bbm-preamp-symbolic',
            this._config.preamp, 0, '', true);

        this._preAmpButton.set_halign(Gtk.Align.CENTER);
        this._preAmpButton.set_margin_bottom(16);

        this._preAmpButton.adjustment.bind_property_full(
            'value',
            this._preAmpButton.buttonContent,
            'label',
            GObject.BindingFlags.SYNC_CREATE,
            (_binding, value) => [true, `${value.toFixed(1)} dB`],
            null
        );

        this._preAmpButton.adjustment.connect('notify::value', () =>
            this._schedulePreAmpChanged());

        this._actionBox = new Gtk.Box({
            spacing: 4,
            halign: Gtk.Align.CENTER,
            margin_bottom: 16,
        });

        this._selectorBox = new Gtk.Box({
            spacing: 4,
            halign: Gtk.Align.CENTER,
        });

        if (this._config.addRemoveBand) {
            this._addButton = new Gtk.Button({
                icon_name: 'list-add-symbolic',
                tooltip_text: _('Add Band'),
                css_classes: ['circular'],
            });

            this._removeButton = new Gtk.Button({
                icon_name: 'user-trash-symbolic',
                tooltip_text: _('Remove Last Band'),
                css_classes: ['circular', 'destructive-action'],
                visible: false,
            });
            this._removeButton.connect('clicked', () => this._confirmRemoveBand());
            this._actionBox.append(this._addButton);
            this._actionBox.append(this._removeButton);
        }


        this._addButton.connect('clicked', () => this.addBand());

        this._bandButtonCtnt = new Adw.ButtonContent({
            icon_name: 'bbm-eq-symbolic',
            label: _('Band'),
        });

        this._bandButton = new Gtk.MenuButton({child: this._bandButtonCtnt});
        const popover = new Gtk.Popover();
        this._bandButton.set_popover(popover);
        this._bandButtonContainer = new Gtk.Box();
        popover.set_child(this._bandButtonContainer);

        this._stack = new Gtk.Stack({
            hexpand: true,
            vexpand: false,
            transition_type: Gtk.StackTransitionType.SLIDE_LEFT_RIGHT,
            transition_duration: 250,
        });

        panelBox.append(this._preAmpButton);
        panelBox.append(this._actionBox);
        panelBox.append(this._stack);

        this._graph.connect('band-selected', (_graph, bandIndex) => {
            this._selectBand(bandIndex);
        });

        this._updateUI();
    }

    addBand(parameters = {}) {
        if (this.bands.length >= this._config.maxBands)
            return;

        this._suppressPeqSignals = true;
        const index = this.bands.length;
        const bandNumber = index + 1;
        const params = {
            frequency: this._config.defaultBands[index],
            gain: 0,
            q: 1.0,
            filter: 'bell',
            bypass: false,
            ...parameters,
        };

        params.frequency = normalizeValue(params.frequency, this._config.frequency);
        params.gain = normalizeValue(params.gain, this._config.gain);
        params.q = normalizeValue(params.q, this._config.q[params.filter]);


        const eqBand = new EqBand(index, params);
        const page = new BandPage(this._gtxt, bandNumber, eqBand, this._config);
        eqBand.color = page.color;

        this._graph.addBand(eqBand);

        const redraw = () => {
            this._graph.queue_draw();
            this._schedulePeqChanged();
        };

        const signalIds = [
            eqBand.connect('notify::frequency', redraw),
            eqBand.connect('notify::gain', redraw),
            eqBand.connect('notify::q', redraw),
            eqBand.connect('notify::bypass', redraw),
            eqBand.connect('notify::filter', redraw),
        ];

        const pageName = `band${bandNumber}`;
        this._stack.add_named(page, pageName);

        const btn = new Gtk.ToggleButton({
            label: `${bandNumber}`,
            css_classes: [`bbm-peq-band${bandNumber}`],
        });

        btn.connect('clicked', () => this._selectBand(index));

        this.bands.push({page, pageName, eqBand, button: btn, signalIds});
        this._selectorBox.append(btn);

        this._selectBand(this.bands.length - 1);
        this._updateControls();
        this._suppressPeqSignals = false;
    }

    updateBand(index, params) {
        const band = this.bands[index];

        if (!band)
            return;

        this._suppressPeqSignals = true;
        if ('filter' in params)
            band.eqBand.filter = params.filter;

        if ('frequency' in params)
            band.eqBand.frequency = normalizeValue(params.frequency, this._config.frequency);


        if ('gain' in params)
            band.eqBand.gain = normalizeValue(params.gain, this._config.gain);


        if ('q' in params)
            band.eqBand.q = normalizeValue(params.q, this._config.q[band.eqBand.filter]);


        if ('bypass' in params)
            band.eqBand.bypass = params.bypass;

        this._suppressPeqSignals = false;
    }

    _selectBand(index) {
        const _ = this._gtxt;
        for (const band of this.bands)
            band.button.set_active(false);

        const band = this.bands[index];
        if (!band)
            return;

        this._bandButtonCtnt.label = _('Band %d').replace('%d', index + 1);
        band.button.set_active(true);
        this._stack.set_visible_child_name(band.pageName);
    }

    _confirmRemoveBand() {
        if (this.bands.length === 0)
            return;

        const _ = this._gtxt;
        const bandNumber = this.bands.length;

        const dialog = new Adw.AlertDialog({
            heading: _('Remove Band?'),
            body: _('Band %d will be removed.').replace('%d', bandNumber),
        });

        dialog.add_response('cancel', _('Cancel'));
        dialog.add_response('remove', _('Remove'));
        dialog.set_response_appearance('remove', Adw.ResponseAppearance.DESTRUCTIVE);
        dialog.set_default_response('cancel');
        dialog.set_close_response('cancel');

        dialog.connect('response', (_dialog, response) => {
            if (response === 'remove')
                this._removeBand();
        });

        dialog.present(this.get_root());
    }

    _removeBand() {
        const _ = this._gtxt;
        if (this.bands.length === 0)
            return;

        const band = this.bands.pop();

        for (const id of band.signalIds)
            band.eqBand.disconnect(id);

        this._stack.remove(band.page);
        this._selectorBox.remove(band.button);
        this._graph.removeBand(band.eqBand);


        if (this.bands.length > 0)
            this._selectBand(this.bands.length - 1);
        else
            this._bandButtonCtnt.label = _('Band');

        this.emit('band-removed', band.eqBand.index);

        this._updateControls();
    }

    _getPeqState() {
        return {
            bands: this.bands.map(b => ({
                frequency: b.eqBand.frequency,
                gain: b.eqBand.gain,
                q: b.eqBand.q,
                filter: b.eqBand.filter,
                bypass: b.eqBand.bypass,
            })),
        };
    }

    _schedulePeqChanged() {
        if (this._suppressPeqSignals)
            return;

        this._peqPending = this._getPeqState();

        if (this._peqTimeoutId)
            return;

        this.emit('peq-changed', this._peqPending);
        this._peqPending = null;
        this._peqTimeoutId = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT, this._updateDelay, () => {
                if (this._peqPending) {
                    const latest = this._peqPending;
                    this.emit('peq-changed', latest);
                    this._peqPending = null;
                    return GLib.SOURCE_CONTINUE;
                }

                this._peqTimeoutId = 0;
                return GLib.SOURCE_REMOVE;
            });
    }

    _schedulePreAmpChanged() {
        if (this._suppressPreAmpSignals)
            return;

        this._preAmpPending = this._preAmpButton.adjustment.value;

        if (this._preAmpTimeoutId)
            return;

        this.emit('preamp-changed', normalizeValue(this._preAmpPending, this._config.preamp));
        this._preAmpPending = null;
        this._preAmpTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, this._updateDelay, () => {
            if (this._preAmpPending) {
                const latest = this._preAmpPending;
                this.emit('preamp-changed', latest);
                this._preAmpPending = null;
                return GLib.SOURCE_CONTINUE;
            }

            this._preAmpTimeoutId = 0;
            return GLib.SOURCE_REMOVE;
        });
    }

    get preAmpValue() {
        return this._preAmpButton.adjustment.value;
    }

    set preAmpValue(value) {
        this._suppressPreAmpSignals = true;
        this._preAmpButton.adjustment.value = value;
        this._suppressPreAmpSignals = false;
    }

    _setLayoutMode(mode) {
        if (this._layoutMode === mode)
            return;

        this._layoutMode = mode;
        this._updateUI();
    }

    _updateUI() {
        if (this._layoutMode === LayoutMode.DESKTOP) {
            if (this._bandButton.get_parent() === this._actionBox)
                this._actionBox.remove(this._bandButton);

            if (this._selectorBox.get_parent() === this._bandButtonContainer)
                this._bandButtonContainer.remove(this._selectorBox);

            this._actionBox.insert_child_after(this._selectorBox, this._addButton);
        } else {
            if (this._selectorBox.get_parent() === this._actionBox)
                this._actionBox.remove(this._selectorBox);

            this._bandButtonContainer.append(this._selectorBox);
            this._actionBox.insert_child_after(this._bandButton, this._addButton);
        }

        this._selectorBox.orientation = this._layoutMode === LayoutMode.MOBILE_PORTRAIT
            ? Gtk.Orientation.VERTICAL : Gtk.Orientation.HORIZONTAL;

        this._parentBox.orientation = this._layoutMode === LayoutMode.MOBILE_LANDSCAPE
            ? Gtk.Orientation.HORIZONTAL : Gtk.Orientation.VERTICAL;

        this._updateControls();
    }

    _updateControls() {
        if (this._config.addRemoveBand) {
            this._addButton.set_sensitive(this.bands.length < this._config.maxBands);

            if (this._layoutMode === LayoutMode.DESKTOP) {
                this._removeButton.set_sensitive(true);
                this._removeButton.set_visible(this.bands.length > 0);
            } else {
                this._removeButton.set_visible(true);
                this._removeButton.set_sensitive(this.bands.length > 0);
            }

            this._bandButton.set_sensitive(this.bands.length > 1);
        }
    }

    destroy() {
        for (const band of this.bands) {
            for (const id of band.signalIds)
                band.eqBand.disconnect(id);
        }

        if (this._peqTimeoutId)
            GLib.source_remove(this._peqTimeoutId);
        this._peqTimeoutId = null;

        if (this._preAmpTimeoutId)
            GLib.source_remove(this._preAmpTimeoutId);
        this._preAmpTimeoutId = null;

        this.bands = [];
        this._graph.destroy();
        this._graph = null;
    }
});


export const ParametricEqRowWidget = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_ParametricEqRowWidget',
}, class ParametricEqRowWidget extends Adw.ActionRow {
    _init(window, _, config = {}) {
        super._init({
            title: _('Parametric Equalizer'),
        });

        const provider = new Gtk.CssProvider();
        provider.load_from_string(PEQ_CSS);
        Gtk.StyleContext.add_provider_for_display(
            Gdk.Display.get_default(),
            provider,
            Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
        );

        const cfg = {
            frequency: {min: 20, max: 20000, step: 1, digit: 0, scale: 'log'},
            q: {min: 0.1, max: 10,  step: 0.01, digit: 2, scale: 'log'},
            gain: {min: -24, max: 24, step: 0.1, digit: 1, scale: 'linear'},
            maxBands: 8,
            defaultBands: [50, 100, 200, 500, 1000, 2000, 5000, 10000],
            addRemoveBand: true,
            filters: ['bell', 'hsf', 'lsf'],
            bypassSupported: true,
            preamp: {min: -12, max: 0, step: 0.1, digit: 1, scale: 'linear'},
            ...config,
        };

        this.dialog = new ParametricEqDialog(_, cfg);

        const button = new Gtk.Button({
            valign: Gtk.Align.CENTER,
        });

        button.set_child(new Adw.ButtonContent({
            icon_name: 'bbm-peq-symbolic',
            label: _('Show'),
        }));

        button.connect('clicked', () => this.dialog.present(window));
        this.add_suffix(button);
        this.activatable_widget = button;
    }

    destroy() {
        this.dialog?.destroy();
        this.dialog = null;
    }
});
