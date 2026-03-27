import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';
import GLib from 'gi://GLib';

export const SliderRowWidget = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_SliderRowWidget',
    Properties: {
        value: GObject.ParamSpec.int(
            'value',
            '',
            '',
            GObject.ParamFlags.READWRITE,
            0, 100, 0
        ),
        'compact-mode': GObject.ParamSpec.boolean(
            'compact-mode',
            '',
            '',
            GObject.ParamFlags.READWRITE,
            false
        ),
    },
}, class SliderRowWidget extends Adw.PreferencesRow {
    _init(params = {}) {
        const {
            rowTitle = '',
            rowSubtitle = '',
            range = [0, 100, 1],
            marks = [],
            snapOnStep = false,
            initialValue = 0,
        } = params;

        super._init();

        const [min, max, step] = range;
        this._step = step;
        this._snapOnStep = snapOnStep;
        this._updatingProgrammatically = false;
        this._lastValue = Math.round(initialValue);

        this._pendingValue = null;
        this._timeoutId = 0;
        this._updateDelay = 500;

        this._mainBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 6,
        });

        this._hbox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            margin_top: 0,
            margin_bottom: 0,
            margin_start: 0,
            margin_end: 0,
            spacing: 0,
        });

        this._header = new Adw.ActionRow({
            title: rowTitle,
            subtitle: rowSubtitle,
            activatable: false,
            can_focus: false,
            hexpand: true,
        });

        this._slider = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, min, max, step);
        this._slider.valign = Gtk.Align.CENTER;
        this._slider.margin_top = 12;
        this._slider.margin_bottom = 12;
        this._slider.margin_start = 12;
        this._slider.margin_end = 12;

        this._slider.set_size_request(250, -1);
        this._slider.can_focus = false;

        for (const {mark, label} of marks)
            this._slider.add_mark(mark, Gtk.PositionType.BOTTOM, label ?? null);

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

        this._hbox.append(this._header);
        this._mainBox.append(this._hbox);
        this.set_child(this._mainBox);

        this.connect('notify::compact-mode', () => {
            this._updateLayout(this.compact_mode);
        });

        this._updateLayout(this.compact_mode);

        this.connect('activate', () => {
            this._slider.focusable = true;
            this._slider.can_focus = true;
            this._slider.grab_focus();
        });

        this._slider.connect('notify::has-focus', () => {
            if (!this._slider.has_focus) {
                this._slider.focusable = false;
                this._slider.can_focus = false;
            }
        });
    }

    _updateLayout(compact) {
        const parent = this._slider.get_parent();
        if (parent)
            parent.remove(this._slider);

        if (compact) {
            this._slider.hexpand = true;
            this._slider.halign = Gtk.Align.FILL;
            this._mainBox.append(this._slider);
        } else {
            this._slider.hexpand = false;
            this._slider.halign = Gtk.Align.END;
            this._hbox.append(this._slider);
        }
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
