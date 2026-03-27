import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';

export const CheckBoxesRowWidget = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_CheckBoxesGroupWidget',
    Properties: {
        'toggled-value': GObject.ParamSpec.int(
            'toggled-value',
            '',
            '',
            GObject.ParamFlags.READWRITE,
            0, 255, 0
        ),
        'compact-mode': GObject.ParamSpec.boolean(
            'compact-mode',
            '',
            '',
            GObject.ParamFlags.READWRITE,
            false
        ),
    },
}, class CheckBoxesRowWidget extends Adw.PreferencesRow {
    constructor(params = {}) {
        const {
            rowTitle = '',
            rowSubtitle = '',
            items,
            applyBtnName = '',
            initialValue = 0,
            resetOnApply = false,
            minRequired = 2,
        } = params;

        super();

        if (!items || items.length !== 3 && items.length !== 4)
            return;

        this._checkButtons = [];
        this._cells = [];
        this._toggledValue = initialValue;
        this._resetOnApply = !!resetOnApply;
        this._minRequired = minRequired;

        this._vBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
        });

        const headerRow = new Adw.ActionRow({
            title: rowTitle,
            subtitle: rowSubtitle,
            activatable: false,
        });

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

        this._box = new Gtk.Box({
            spacing: 4,
            homogeneous: true,
            valign: Gtk.Align.CENTER,
            margin_top: 8,
            margin_bottom: 8,
            margin_start: 8,
            margin_end: 8,
            visible: false,
        });

        this._vBox.append(headerRow);
        this._vBox.append(this._box);
        this.set_child(this._vBox);
        this.updateItems(items);

        this._applyButton.connect('clicked', () => this._applyChanges());
        this.connect('notify::compact-mode', () => this._onCompactMode(this.compact_mode));

        if (this._resetOnApply)
            this._updateCheckStates(0);
        else
            this._updateCheckStates(this._toggledValue);

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

        if (this._toggledValue === val)
            return;

        this._toggledValue = val;
        this.notify('toggled-value');

        if (this._resetOnApply) {
            this._updateCheckStates(0);
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

        this._updateCheckStates(v);
    }

    updateItems(items) {
        this._box.visible = false;
        let child;
        while ((child = this._box.get_first_child()))
            this._box.remove(child);

        this._checkButtons = [];
        this._cells = [];

        for (let i = 0; i < items.length; i++) {
            const {name, icon} = items[i];
            const cell = new Gtk.Box({
                spacing: 6,
                halign: Gtk.Align.CENTER,
                valign: Gtk.Align.CENTER,

            });

            const image = new Gtk.Image({icon_name: icon, halign: Gtk.Align.CENTER});
            const label = new Gtk.Label({
                label: name,
                halign: Gtk.Align.CENTER,
                css_classes: ['caption-heading'],
            });

            const check = new Gtk.CheckButton({halign: Gtk.Align.CENTER});
            check.connect('toggled', () => {
                this._updateApplySensitivity();
            });

            cell._label = label;
            cell._check = check;
            cell.append(image);
            cell.append(label);
            cell.append(check);
            this._cells.push(cell);
            this._checkButtons.push(check);
            this._box.append(cell);
        }
        this._onCompactMode(this.compact_mode);
    }

    _onCompactMode(mode) {
        this._box.visible = false;
        this._vBox.spacing = mode ? 0 : 12;
        this._box.spacing = mode ? 12 : 4;
        this._box.orientation = mode ? Gtk.Orientation.VERTICAL : Gtk.Orientation.HORIZONTAL;

        this._cells.forEach(cell => {
            cell.orientation = mode ? Gtk.Orientation.HORIZONTAL : Gtk.Orientation.VERTICAL;
            cell.halign = mode ? Gtk.Align.START : Gtk.Align.CENTER;
            this._reorderCell(cell, mode);
        });
        this._box.visible = true;
    }

    _reorderCell(cell, mode) {
        const label = cell._label;
        const check = cell._check;

        if (mode)
            cell.reorder_child_after(check, null);
        else
            cell.reorder_child_after(check, label);
    }
});

