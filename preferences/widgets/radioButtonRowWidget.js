import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
import GObject from 'gi://GObject';
import Pango from 'gi://Pango';

export const RadioButtonRowWidget = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_RadioButtonRowWidget',
    Properties: {
        'toggled-value': GObject.ParamSpec.int(
            'toggled-value',
            '',
            '',
            GObject.ParamFlags.READWRITE,
            0, 100, 0
        ),
    },
}, class RadioButtonRowWidget extends Adw.PreferencesRow {
    _init(params = {}) {
        const {
            title = '',
            subtitle = '',
            options = [],
            initialValue = 0,
        } = params;

        super._init();

        this._updatingProgrammatically = false;
        this._buttons = [];
        this._value = initialValue;

        this._mainBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 6,
        });

        this._header = new Adw.ActionRow({
            title,
            subtitle,
            activatable: false,
            can_focus: false,
        });

        this._radioBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            homogeneous: true,
            spacing: 12,
            margin_start: 18,
            margin_end: 18,
            margin_bottom: 12,
            can_focus: false,
        });

        let group = null;

        options.forEach((label, index) => {
            const btn = new Gtk.CheckButton({
                group,
                halign: Gtk.Align.START,
            });

            const lbl = new Gtk.Label({
                label,
                wrap: true,
                wrap_mode: Pango.WrapMode.WORD_CHAR,
                hexpand: true,
                margin_start: 6,
                css_classes: ['caption-heading'],
            });

            btn.set_child(lbl);

            if (!group)
                group = btn;

            if (index === initialValue)
                btn.set_active(true);

            btn.connect('toggled', () => {
                if (this._updatingProgrammatically)
                    return;

                if (!btn.get_active())
                    return;

                if (this._value !== index) {
                    this._value = index;
                    this.notify('toggled-value');
                }
            });

            this._buttons.push(btn);
            this._radioBox.append(btn);
        });

        this._mainBox.append(this._header);
        this._mainBox.append(this._radioBox);

        this.set_child(this._mainBox);

        this.connect('activate', () => {
            if (!this.has_focus)
                return;

            this._radioBox.can_focus = true;
            this._buttons[0].grab_focus();
        });

        this._keyController = new Gtk.EventControllerKey();
        this._keyController.connect('key-pressed', (_c, keyval, _keycode, state) => {
            const focused = this._buttons.find(btn => btn.has_focus);
            if (!focused)
                return false;

            const idx = this._buttons.indexOf(focused);

            if (keyval === Gdk.KEY_Up) {
                if (idx > 0)
                    this._buttons[idx - 1].grab_focus();
                return true;
            } else if (keyval === Gdk.KEY_Down) {
                if (idx < this._buttons.length - 1)
                    this._buttons[idx + 1].grab_focus();
                return true;
            } else if (keyval === Gdk.KEY_Tab) {
                this._radioBox.can_focus = false;
                return false;
            } else if (keyval === Gdk.KEY_ISO_Left_Tab ||
                        keyval === Gdk.KEY_Tab && state & Gdk.ModifierType.SHIFT_MASK) {
                this._radioBox.can_focus = false;
                return false;
            }

            return false;
        });

        this._radioBox.add_controller(this._keyController);

        this.connect('activate', () => {
            if (!this.has_focus)
                return;

            this._radioBox.can_focus = true;

            this._buttons[0].grab_focus();
        });
    }

    get toggled_value() {
        return this._value;
    }

    set toggled_value(v) {
        const intVal = Math.max(0, Math.min(v, this._buttons.length - 1));

        if (intVal === this._value)
            return;

        this._updatingProgrammatically = true;

        this._buttons.forEach((btn, i) => {
            btn.set_active(i === intVal);
        });

        this._updatingProgrammatically = false;

        this._value = intVal;
    }
});
