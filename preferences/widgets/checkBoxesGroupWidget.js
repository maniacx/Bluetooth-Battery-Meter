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
            groupTitle = '',
            rowTitle = '',
            rowSubtitle = '',
            items,
            applyBtnName = '',
            initialValue = 0,
            resetOnApply = false,
            minRequired = 2,
        } = params;

        super({title: groupTitle ?? ''});

        if (!items || items.length !== 3 && items.length !== 4)
            return;

        this._checkButtons = [];
        this._toggledValue = initialValue;
        this._suspendToggleHandlers = false;
        this._resetOnApply = !!resetOnApply;
        this._minRequired = minRequired;

        const headerRow = new Adw.ActionRow({title: rowTitle, subtitle: rowSubtitle});

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
        this.add(headerRow);

        const boxRow = new Adw.ActionRow();
        this._hBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 4,
            homogeneous: true,
            valign: Gtk.Align.CENTER,
            margin_top: 8,
            margin_bottom: 8,
        });

        boxRow.set_child(this._hBox);
        this.add(boxRow);

        this.updateItems(items);

        this._applyButton.connect('clicked', () => this._applyChanges());

        this._suspendToggleHandlers = true;
        if (this._resetOnApply)
            this._updateCheckStates(0);
        else
            this._updateCheckStates(this._toggledValue);
        this._suspendToggleHandlers = false;

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
        this._applyButton.sensitive = count >= this._minRequired;
    }

    _applyChanges() {
        let val = 0;
        this._checkButtons.forEach((b, i) => {
            if (b.active)
                val |= 1 << i;
        });
        this.toggled_value = val;

        if (this._resetOnApply) {
            this._checkButtons.forEach(b => (b.active = false));
            this._applyButton.sensitive = false;
        }
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

    updateItems(items) {
        let child;
        while ((child = this._hBox.get_first_child()))
            this._hBox.remove(child);

        this._checkButtons = [];

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
                this._updateApplySensitivity();
            });

            this._checkButtons.push(check);
            cell.append(image);
            cell.append(label);
            cell.append(check);
            this._hBox.append(cell);
        }
    }
});

