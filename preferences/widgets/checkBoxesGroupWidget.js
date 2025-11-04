import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';

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

