import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';
import GLib from 'gi://GLib';

export const EqualizerWidget = GObject.registerClass({
    GTypeName: 'EqualizerWidget',
    Signals: {'eq-changed': {param_types: [GObject.TYPE_JSOBJECT]}},
}, class EqualizerWidget extends Gtk.Box {
    _init(freqs, initialValues = [], range = 6) {
        super._init({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 10,
            homogeneous: false,
            margin_top: 6,
            margin_bottom: 6,
            margin_start: 12,
            margin_end: 12,
        });

        this.set_size_request(-1, 200);
        this._values = freqs.map((_, i) => Math.round(initialValues[i] ?? 0));
        this._range = range;
        this._sliders = [];
        this._valueLabels = [];
        this._eqPending = null;
        this._eqTimeoutId = 0;
        this._updateDelay = 500;

        freqs.forEach((freq, i) => {
            const vbox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 4,
                halign: Gtk.Align.CENTER,
                vexpand: true,
                hexpand: true,
            });

            const freqLabel = new Gtk.Label({
                label: String(freq),
                halign: Gtk.Align.CENTER,
                width_chars: 5,
                max_width_chars: 5,
            });

            const adj = new Gtk.Adjustment({
                lower: -range,
                upper: range,
                step_increment: 1,
                page_increment: 1,
                value: this._values[i],
            });

            const slider = new Gtk.Scale({
                orientation: Gtk.Orientation.VERTICAL,
                adjustment: adj,
                draw_value: false,
                inverted: true,
                vexpand: true,
            });

            const valueLabel = new Gtk.Label({
                halign: Gtk.Align.CENTER,
                label: `${this._values[i]} dB`,
                width_chars: 5,
                max_width_chars: 5,
            });

            slider._lastStepValue = this._values[i];
            this._sliders.push(slider);
            this._valueLabels.push(valueLabel);

            slider._valueChangedHandler = slider.connect('value-changed', w => {
                const val = Math.round(w.get_value());
                if (val !== slider._lastStepValue) {
                    slider._lastStepValue = val;
                    this._values[i] = val;
                    valueLabel.label = `${val} dB`;
                    this._scheduleEqChanged();
                }
            });

            vbox.append(freqLabel);
            vbox.append(slider);
            vbox.append(valueLabel);
            this.append(vbox);
        });
    }

    _scheduleEqChanged() {
        this._eqPending = this._values.slice();

        if (this._eqTimeoutId)
            return;

        this._eqTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, this._updateDelay, () => {
            if (this._eqPending) {
                const latest = this._eqPending;
                this.emit('eq-changed', latest);
                this._eqPending = null;
                return GLib.SOURCE_CONTINUE;
            }

            this._eqTimeoutId = 0;
            return GLib.SOURCE_REMOVE;
        });
    }

    get values() {
        return this._values.slice();
    }

    setValues(values) {
        this._values = this._values.map((_, i) => Math.round(values[i] ?? 0));

        this._sliders.forEach((slider, i) => {
            const valueLabel = this._valueLabels[i];
            const val = this._values[i];
            GObject.signal_handler_block(slider, slider._valueChangedHandler);
            slider.set_value(val);
            slider._lastStepValue = val;
            GObject.signal_handler_unblock(slider, slider._valueChangedHandler);
            valueLabel.label = `${val} dB`;
        });
    }
});

