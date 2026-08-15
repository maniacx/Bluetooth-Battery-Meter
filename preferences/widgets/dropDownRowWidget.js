'use strict';
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';

export const DropDownRowWidget = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_DropDownRowWidget',
    Properties: {
        selected_item: GObject.ParamSpec.object(
            'selected-item',
            '',
            '',
            GObject.ParamFlags.READWRITE,
            GObject.TYPE_OBJECT
        ),
    },
    Signals: {
        'button-clicked': {},
    },
}, class DropDownRowWidget extends Adw.ActionRow {
    _init(params = {}) {
        const {
            title = '',
            subtitle = '',
            options = [],
            values = [],
            initialValue = null,

            hasButton = false,
            buttonIcon = 'document-edit-symbolic',
            buttonTooltip = '',
            buttonVisibleFor = [],
        } = params;

        super._init({title, subtitle});

        this._buttonVisibleFor = buttonVisibleFor;

        if (options.length === 0 || values.length === 0) {
            this._values = ['none'];
            this._stringList = new Gtk.StringList();
            this._stringList.append('—');
        } else {
            this._values = values;
            this._stringList = new Gtk.StringList();
            for (const label of options)
                this._stringList.append(label);
        }

        let currentIndex = this._values.indexOf(initialValue);
        if (currentIndex === -1)
            currentIndex = 0;

        this._updatingProgrammatically = false;
        let box = null;

        if (hasButton) {
            box = new Gtk.Box({spacing: 8, valign: Gtk.Align.CENTER});

            this._button = new Gtk.Button({
                icon_name: buttonIcon,
                tooltip_text: buttonTooltip,
                valign: Gtk.Align.CENTER,
                visible: false,
                css_classes: ['circular'],
            });

            this._button.connect('clicked', () => this.emit('button-clicked'));
            box.append(this._button);
        }

        this._dropdown = Gtk.DropDown.new(this._stringList, null);
        this._dropdown.valign = Gtk.Align.CENTER;
        this._dropdown.selected = currentIndex;
        this.activatable_widget = this._dropdown;

        if (hasButton) {
            this._updateButtonVisibility();
            box.append(this._dropdown);
            this.add_suffix(box);
        } else {
            this.add_suffix(this._dropdown);
        }

        this._dropdown.connect('notify::selected', () => {
            this._updateButtonVisibility();
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
        this._updateButtonVisibility();
    }

    updateList(options = [], values = [], initialValue = null,
        buttonVisibleFor = this._buttonVisibleFor) {
        const currentValue = this.selected_item;
        this._stringList.splice(0, this._stringList.get_n_items(), []);

        for (const label of options)
            this._stringList.append(label);

        this._values = values;
        const targetValue = initialValue !== null ? initialValue : currentValue;
        let currentIndex = this._values.indexOf(targetValue);
        if (currentIndex === -1)
            currentIndex = 0;

        this._updatingProgrammatically = true;
        this._dropdown.selected = currentIndex;
        this._updatingProgrammatically = false;
        this._buttonVisibleFor = buttonVisibleFor;
        this._updateButtonVisibility();
    }

    _updateButtonVisibility() {
        if (!this._button)
            return;

        if (this._buttonVisibleFor.length === 0) {
            this._button.visible = true;
            return;
        }

        this._button.visible = this._buttonVisibleFor.includes(this.selected_item);
    }
});

