'use strict';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

export const IconSelectorWidget = GObject.registerClass({
    GTypeName: 'BBM_IconSelectorWidget',
    Properties: {
        'selected-icon': GObject.ParamSpec.string(
            'selected-icon',
            'selected-icon',
            'selected-icon',
            GObject.ParamFlags.READWRITE,
            ''
        ),
    },
}, class IconSelectorWidget extends Adw.PreferencesGroup {
    _init(params = {}) {
        const {
            grpTitle = '',
            rowTitle = '',
            rowSubtitle = '',
            supportedIcons = [],
            initialIcon = '',
        } = params;

        super._init({title: grpTitle});

        this._supportedIcons = supportedIcons;
        this._updatingProgrammatically = false;
        this._lastIcon = initialIcon;

        const row = new Adw.ActionRow({
            title: rowTitle,
            subtitle: rowSubtitle,
        });

        this._splitButton = new Adw.SplitButton({
            icon_name: initialIcon ? `bbm-${initialIcon}-symbolic` : '',
            valign: Gtk.Align.CENTER,
        });

        const popover = new Gtk.Popover({
            has_arrow: true,
            autohide: true,
        });

        const grid = new Gtk.Grid({
            column_spacing: 10,
            row_spacing: 10,
        });

        const total = this._supportedIcons.length;
        let rows = Math.ceil(Math.sqrt(total));
        rows = Math.min(rows, 7);
        const columns = Math.ceil(total / rows);

        this._supportedIcons.forEach((name, index) => {
            const btn = new Gtk.Button({
                icon_name: `bbm-${name}-symbolic`,
                valign: Gtk.Align.CENTER,
            });

            const rowNum = Math.floor(index / columns);
            const col = index % columns;
            grid.attach(btn, col, rowNum, 1, 1);

            btn.connect('clicked', () => {
                if (this._updatingProgrammatically)
                    return;
                popover.hide();
                this.selected_icon = name;
                this._splitButton.icon_name = `bbm-${name}-symbolic`;
            });
        });

        popover.set_child(grid);
        this._splitButton.set_popover(popover);
        row.add_suffix(this._splitButton);
        this.add(row);

        this._selected_icon = initialIcon;
    }

    get selected_icon() {
        return this._selected_icon;
    }

    set selected_icon(value) {
        if (value === this._lastIcon)
            return;

        this._updatingProgrammatically = true;
        this._selected_icon = value;
        this._splitButton.icon_name = `bbm-${value}-symbolic`;
        this._updatingProgrammatically = false;

        this._lastIcon = value;
        this.notify('selected-icon');
    }
});

