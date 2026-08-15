'use strict';
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';
import GLib from 'gi://GLib';

export const EqualizerWidget = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_EqualizerWidget',
    Signals: {'eq-changed': {param_types: [GObject.TYPE_JSOBJECT]}},
}, class EqualizerWidget extends Adw.Dialog {
    _init(params = {}) {
        const {
            freqs = [],
            initialValues = [],
            range = 6,
            step = 1,
            digits = 0,
            topBarTitle = '',
            bottomBarTitle = '',
        } = params;

        super._init({
            content_width: 650,
            content_height: 320,
        });

        const scrollWin = new Gtk.ScrolledWindow({
            hscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
            vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
            hexpand: true,
            vexpand: false,
            kinetic_scrolling: true,
            overlay_scrolling: false,
        });

        const hbox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 10,
            homogeneous: true,
            margin_top: 12,
            margin_bottom: 12,
            margin_start: 12,
            margin_end: 12,
        });

        this._values = freqs.map((_, i) => Math.round(initialValues[i] ?? 0));
        this._range = range;
        this._step = step;
        this._digits = digits;
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
                height_request: 200,
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
                step_increment: step,
                page_increment: step,
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
                label: this._formatValue(this._values[i]),
                width_chars: 5,
                max_width_chars: 5,
                margin_bottom: 12,
            });

            slider._lastStepValue = this._values[i];
            this._sliders.push(slider);
            this._valueLabels.push(valueLabel);

            slider._valueChangedHandler = slider.connect('value-changed', w => {
                const val = this._roundToStep(w.get_value());
                if (val !== slider._lastStepValue) {
                    slider._lastStepValue = val;
                    this._values[i] = val;
                    valueLabel.label = this._formatValue(val);
                    this._scheduleEqChanged();
                }
            });

            vbox.append(freqLabel);
            vbox.append(slider);
            vbox.append(valueLabel);
            hbox.append(vbox);
        });


        const toolbarView = new Adw.ToolbarView();

        const topBar = new Adw.HeaderBar({
            title_widget: new Gtk.Label({
                label: topBarTitle,
                css_classes: ['heading'],
            }),
        });

        const bottomBar = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            halign: Gtk.Align.CENTER,
            margin_bottom: 6,
            css_classes: ['toolbar'],
        });

        bottomBar.append(new Gtk.Label({
            label: bottomBarTitle,
            css_classes: ['heading'],
        }));

        toolbarView.add_top_bar(topBar);
        toolbarView.add_bottom_bar(bottomBar);
        toolbarView.set_top_bar_style(Adw.ToolbarStyle.FLAT);
        toolbarView.set_bottom_bar_style(Adw.ToolbarStyle.FLAT);
        scrollWin.set_child(hbox);
        toolbarView.set_content(scrollWin);
        this.set_child(toolbarView);
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

    _roundToStep(value) {
        return Math.round(value / this._step) * this._step;
    }

    _formatValue(value) {
        return `${value.toFixed(this._digits)}`;
    }

    get values() {
        return this._values.slice();
    }

    setValues(values) {
        this._values = this._values.map((_, i) => this._roundToStep(values[i] ?? 0));

        this._sliders.forEach((slider, i) => {
            const valueLabel = this._valueLabels[i];
            const val = this._values[i];
            GObject.signal_handler_block(slider, slider._valueChangedHandler);
            slider.set_value(val);
            slider._lastStepValue = val;
            GObject.signal_handler_unblock(slider, slider._valueChangedHandler);
            valueLabel.label = this._formatValue(val);
        });
    }

    destroy() {
        if (this._eqTimeoutId)
            GLib.source_remove(this._eqTimeoutId);
        this._eqTimeoutId = null;
    }
});
