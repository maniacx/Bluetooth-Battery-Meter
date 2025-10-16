import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';

export const EqualizerWidget = GObject.registerClass({
    GTypeName: 'EqualizerWidget',
    Signals: {'eq-changed': {param_types: [GObject.TYPE_JSOBJECT]}},
}, class EqualizerWidget extends Gtk.Box {
    _init(freqs, initialValues, range) {
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

            slider._lastStepValue = Math.round(slider.get_value());

            slider.connect('value-changed', w => {
                const val = Math.round(w.get_value());
                if (val !== slider._lastStepValue) {
                    slider._lastStepValue = val;
                    this._values[i] = val;
                    valueLabel.label = `${val} dB`;
                    this.emit('eq-changed', this._values.slice());
                }
            });

            vbox.append(freqLabel);
            vbox.append(slider);
            vbox.append(valueLabel);
            this.append(vbox);
        });
    }

    get values() {
        return this._values.slice();
    }

    setValues(values) {
        this._values = this._values.map((_, i) => Math.round(values[i] ?? 0));
    }
});

export const DropDownRowWidget = GObject.registerClass({
    GTypeName: 'DropDownRowWidget',
    Properties: {
        selected_item: GObject.ParamSpec.object(
            'selected-item',
            '',
            '',
            GObject.ParamFlags.READWRITE,
            GObject.TYPE_OBJECT
        ),
    },
}, class DropDownRowWidget extends Adw.ActionRow {
    _init(params = {}) {
        const {
            title = '',             // Adw Row Title
            subtitle = '',          // Adw Row Subtitle
            options = [],           // Array of Options to be Displayed in dropdown
            values = [],            // Array of Values for the above options
            initialValue = null,    // Initital Selection
        } = params;

        super._init({title, subtitle});

        this._values = values;
        this._updatingProgrammatically = false;

        this._stringList = new Gtk.StringList();
        for (const label of options)
            this._stringList.append(label);

        let currentIndex = this._values.indexOf(initialValue);
        if (currentIndex === -1)
            currentIndex = 0;

        this._dropdown = Gtk.DropDown.new(this._stringList, null);
        this._dropdown.valign = Gtk.Align.CENTER;
        this._dropdown.selected = currentIndex;

        this.add_suffix(this._dropdown);
        this.activatable_widget = this._dropdown;

        this._dropdown.connect('notify::selected', () => {
            if (this._updatingProgrammatically)
                return;
            this.notify('selected-item');
        });
    }

    get selected_item() {
        const idx = this._dropdown.selected;
        return this._values[idx];
    }

    set selected_item(val) {
        const idx = this._values.indexOf(val);
        this._updatingProgrammatically = true;
        this._dropdown.selected = idx === -1 ? 0 : idx;
        this._updatingProgrammatically = false;
    }
});

export const CheckBoxesGroupWidget = GObject.registerClass({
    GTypeName: 'CheckBoxesGroupWidget',
    Properties: {
        'toggled-value': GObject.ParamSpec.int(
            'toggled-value',
            '',
            '',
            GObject.ParamFlags.READWRITE,
            0, 255, 0
        ),
    },
}, class CheckBoxesGroupWidget extends Adw.PreferencesGroup {
    constructor(params = {}) {
        const {
            groupTitle = '',        // Adw Preference Group Title
            rowTitle = '',          // Adw Preference Row Title
            rowSubtitle = '',       // Adw Preference Row Subtitle
            items,                  // Array of CheckBox name/icon_name object minimum 3 required
            applyBtnName = '',      // Name for Gtk.Button if defined adds Apply button
            initialValue = 0,       // Initial checkbox state bitwise
        } = params;

        super({title: groupTitle ?? ''});

        if (!items || items.length !== 3 && items.length !== 4)
            return;

        this._useApplyButton = !!applyBtnName;
        this._checkButtons = [];
        this._toggledValue = initialValue;
        this._suspendToggleHandlers = false;

        const headerRow = new Adw.ActionRow({title: rowTitle, subtitle: rowSubtitle});

        if (this._useApplyButton) {
            const btnContent = new Adw.ButtonContent({
                label: applyBtnName,
                icon_name: 'bbm-check-symbolic',
            });
            this._applyButton = new Gtk.Button({
                halign: Gtk.Align.START,
                valign: Gtk.Align.CENTER,
                margin_start: 6,
                css_classes: ['suggested-action'],
                child: btnContent,
            });
            this._applyButton.sensitive = false;
            headerRow.add_suffix(this._applyButton);
        }

        this.add(headerRow);

        const boxRow = new Adw.ActionRow();
        const hbox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 8,
            homogeneous: true,
            valign: Gtk.Align.CENTER,
            margin_top: 8,
            margin_bottom: 8,
        });

        for (let i = 0; i < items.length; i++) {
            const {name, icon} = items[i];
            const cell = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 6,
                halign: Gtk.Align.CENTER,
                valign: Gtk.Align.CENTER,
            });

            const image = new Gtk.Image({icon_name: icon, halign: Gtk.Align.CENTER});
            const label = new Gtk.Label({label: name, halign: Gtk.Align.CENTER});
            label.add_css_class('caption-heading');

            const check = new Gtk.CheckButton({halign: Gtk.Align.CENTER});
            check.connect('toggled', () => {
                if (this._suspendToggleHandlers)
                    return;

                if (this._useApplyButton)
                    this._updateApplySensitivity();
                else
                    this._updateValueImmediate();
            });

            this._checkButtons.push(check);
            cell.append(image);
            cell.append(label);
            cell.append(check);
            hbox.append(cell);
        }

        boxRow.set_child(hbox);
        this.add(boxRow);

        if (this._useApplyButton)
            this._applyButton.connect('clicked', () => this._applyChanges());

        this._suspendToggleHandlers = true;
        if (!this._useApplyButton)
            this._updateCheckStates(this._toggledValue);
        else
            this._updateCheckStates(0);
        this._suspendToggleHandlers = false;

        if (this._useApplyButton)
            this._updateApplySensitivity();
    }

    _updateCheckStates(value) {
        this._checkButtons.forEach((b, i) => {
            const bit = 1 << i;
            b.active = !!(value & bit);
        });
    }

    _updateApplySensitivity() {
        const count = this._checkButtons.filter(b => b.active).length;
        this._applyButton.sensitive = count >= 2;
    }

    _applyChanges() {
        let val = 0;
        this._checkButtons.forEach((b, i) => {
            if (b.active)
                val |= 1 << i;
        });
        this.toggled_value = val;

        this._checkButtons.forEach(b => (b.active = false));
        this._applyButton.sensitive = false;
    }

    _updateValueImmediate() {
        let val = 0;
        this._checkButtons.forEach((b, i) => {
            if (b.active)
                val |= 1 << i;
        });
        this.toggled_value = val;
    }

    get toggled_value() {
        return this._toggledValue;
    }

    set toggled_value(v) {
        if (this._toggledValue === v)
            return;

        this._toggledValue = v;
        this.notify('toggled-value');

        this._suspendToggleHandlers = true;
        this._updateCheckStates(v);
        this._suspendToggleHandlers = false;
    }
});

export const SliderGroupWidget = GObject.registerClass({
    Properties: {
        value: GObject.ParamSpec.int(
            'value',
            '',
            '',
            GObject.ParamFlags.READWRITE,
            0, 100, 0
        ),
    },
}, class SliderGroupWidget extends Adw.PreferencesGroup {
    _init(params = {}) {
        const {
            groupTitle = '',
            rowTitle = '',
            rowSubtitle = '',
            marks = [],
            initialValue = 0,
        } = params;

        super._init({title: groupTitle});

        this._updatingProgrammatically = false;
        this._lastValue = Math.round(initialValue);

        const toneVolRow = new Adw.ActionRow({
            title: rowTitle,
            subtitle: rowSubtitle,
        });

        this._slider = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0, 100, 1);
        this._slider.margin_start = 50;
        this._slider.margin_end = 50;
        this._slider.margin_top = 4;
        this._slider.margin_bottom = 4;

        for (const {mark, label} of marks)
            this._slider.add_mark(mark, Gtk.PositionType.BOTTOM, label);

        this._slider.set_value(this._lastValue);

        this._slider.connect('value-changed', () => {
            if (this._updatingProgrammatically)
                return;

            const newValue = Math.round(this._slider.get_value());
            if (newValue !== this._lastValue) {
                this._lastValue = newValue;
                this.notify('value');
            }
        });

        const sliderRow = new Adw.ActionRow({child: this._slider});
        this.add(toneVolRow);
        this.add(sliderRow);
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

