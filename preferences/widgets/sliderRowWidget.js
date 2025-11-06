import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';
import GLib from 'gi://GLib';

export const SliderRowWidget = GObject.registerClass({
    Properties: {
        value: GObject.ParamSpec.int(
            'value',
            '',
            '',
            GObject.ParamFlags.READWRITE,
            0, 100, 0
        ),
    },
}, class SliderRowWidget extends Adw.ActionRow {
    _init(params = {}) {
        const {
            rowTitle = '',
            rowSubtitle = '',
            range = [0, 100, 1],
            marks = [],
            snapOnStep = false,
            initialValue = 0,
        } = params;

        super._init({title: rowTitle, subtitle: rowSubtitle});

        const [min, max, step] = range;
        this._step = step;
        this._snapOnStep = snapOnStep;
        this._updatingProgrammatically = false;
        this._lastValue = Math.round(initialValue);

        this._pendingValue = null;
        this._timeoutId = 0;
        this._updateDelay = 500;

        this._slider = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, min, max, step);
        this._slider.valign = Gtk.Align.CENTER;
        this._slider.hexpand = true;
        this._slider.margin_start = 12;
        this._slider.margin_end = 12;
        this._slider.set_size_request(200, -1);

        for (const {mark, label} of marks)
            this._slider.add_mark(mark, Gtk.PositionType.BOTTOM, label);

        this._slider.set_value(this._lastValue);

        this._slider.connect('value-changed', () => {
            if (this._updatingProgrammatically)
                return;

            const raw = this._slider.get_value();
            const stepped = Math.round(raw / this._step) * this._step;

            if (stepped !== this._lastValue) {
                this._lastValue = stepped;
                this._scheduleValueEmit(stepped);
            }
        });

        if (this._snapOnStep) {
            this._slider.connect('change-value', (_slider, _scroll, value) => {
                if (this._updatingProgrammatically)
                    return false;

                const steppedValue = Math.round(value / this._step) * this._step;
                if (steppedValue !== this._lastValue) {
                    this._updatingProgrammatically = true;
                    this._slider.set_value(steppedValue);
                    this._updatingProgrammatically = false;

                    this._lastValue = steppedValue;
                    this._scheduleValueEmit(steppedValue);
                }
                return true;
            });
        }

        this.add_suffix(this._slider);
        this.set_activatable_widget(this._slider);
    }

    _scheduleValueEmit(value) {
        this._pendingValue = value;

        if (this._timeoutId)
            return;

        this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, this._updateDelay, () => {
            if (this._pendingValue !== null) {
                const latest = this._pendingValue;
                this._pendingValue = null;
                this.value = latest;
                this.notify('value');
                return GLib.SOURCE_CONTINUE;
            }

            this._timeoutId = 0;
            return GLib.SOURCE_REMOVE;
        });
    }

    get value() {
        return this._lastValue;
    }

    set value(v) {
        const intVal = Math.round(v);
        if (intVal === this._lastValue)
            return;

        this._updatingProgrammatically = true;
        this._slider.set_value(intVal);
        this._updatingProgrammatically = false;

        this._lastValue = intVal;
        this.notify('value');
    }
});

