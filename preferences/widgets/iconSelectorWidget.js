'use strict';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

export const IconSelectorWidget = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_IconSelectorWidget',
    Properties: {
        'selected-icon': GObject.ParamSpec.string(
            'selected-icon',
            'selected-icon',
            'selected-icon',
            GObject.ParamFlags.READWRITE,
            ''
        ),
        'selected-case-icon': GObject.ParamSpec.string(
            'selected-case-icon',
            'selected-case-icon',
            'selected-case-icon',
            GObject.ParamFlags.READWRITE,
            ''
        ),
    },
}, class IconSelectorWidget extends Adw.PreferencesGroup {
    _init(params = {}) {
        const {
            gtxt,
            grpTitle = '',
            rowTitle = '',
            rowSubtitle = '',
            iconList = [],
            initialIcon = '',
            caseIconList = [],
            initialCaseIcon = '',
            mac = '',
            fw = '',
            serial = '',
            lSn = '',
            rSn = '',
            caseSn = '',
        } = params;

        super._init({title: grpTitle});

        const _ = gtxt;

        const infoButton = new Gtk.MenuButton({
            icon_name: 'bbm-help-about-symbolic',
            valign: Gtk.Align.CENTER,
            css_classes: ['flat'],
            tooltip_text: _('Device information'),
        });

        const infoPopOver = new Gtk.Popover({
            has_arrow: true,
            position: Gtk.PositionType.BOTTOM,
        });

        const infoBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 16,
            margin_top: 8,
            margin_bottom: 8,
            margin_start: 10,
            margin_end: 10,
        });

        const title = new Gtk.Label({
            label: _('Device information'),
            halign: Gtk.Align.CENTER,
            css_classes: ['heading'],
        });

        infoBox.append(title);

        const addInfo = (label, value) => {
            if (!value)
                return;

            const box = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 2,
                halign: Gtk.Align.CENTER,
            });

            const title = new Gtk.Label({
                label,
                halign: Gtk.Align.CENTER,
                css_classes: ['caption-heading'],
            });

            const valueLabel = new Gtk.Label({
                label: value,
                halign: Gtk.Align.CENTER,
                css_classes: ['caption', 'dimmed'],
            });

            box.append(title);
            box.append(valueLabel);
            infoBox.append(box);
        };

        addInfo(_('Mac Address'), mac);

        if (fw)
            addInfo(_('Firmware Version'), fw);

        if (lSn || rSn || caseSn) {
            const serialBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 2,
                halign: Gtk.Align.CENTER,
            });

            const serialTitle = new Gtk.Label({
                label: _('Serial Number'),
                halign: Gtk.Align.CENTER,
                css_classes: ['caption-heading'],
            });

            serialBox.append(serialTitle);

            if (lSn) {
                serialBox.append(new Gtk.Label({
                    label: `L: ${lSn}`,
                    halign: Gtk.Align.CENTER,
                    css_classes: ['caption', 'dimmed'],
                }));
            }

            if (rSn) {
                serialBox.append(new Gtk.Label({
                    label: `R: ${rSn}`,
                    halign: Gtk.Align.CENTER,
                    css_classes: ['caption', 'dimmed'],
                }));
            }

            if (caseSn) {
                serialBox.append(new Gtk.Label({
                    label: `Case: ${caseSn}`,
                    halign: Gtk.Align.CENTER,
                    css_classes: ['caption', 'dimmed'],
                }));
            }

            infoBox.append(serialBox);
        } else if (serial) {
            addInfo(_('Serial Number'), serial);
        }


        infoPopOver.set_child(infoBox);
        infoButton.set_popover(infoPopOver);

        this.set_header_suffix(infoButton);

        this._supportedIcons = iconList;
        this._caseIcons = caseIconList;

        this._updatingProgrammatically = false;
        this._lastIcon = initialIcon;
        this._lastCaseIcon = initialCaseIcon;

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

        if (this._caseIcons.length > 0) {
            this._caseButton = new Adw.SplitButton({
                icon_name: initialCaseIcon ? `bbm-${initialCaseIcon}-symbolic` : '',
                valign: Gtk.Align.CENTER,
            });

            const popover2 = new Gtk.Popover({
                has_arrow: true,
                autohide: true,
            });

            const grid2 = new Gtk.Grid({
                column_spacing: 10,
                row_spacing: 10,
            });

            const total2 = this._caseIcons.length;
            let rows2 = Math.ceil(Math.sqrt(total2));
            rows2 = Math.min(rows2, 7);
            const columns2 = Math.ceil(total2 / rows2);

            this._caseIcons.forEach((name, index) => {
                const btn = new Gtk.Button({
                    icon_name: `bbm-${name}-symbolic`,
                    valign: Gtk.Align.CENTER,
                });

                const r = Math.floor(index / columns2);
                const c = index % columns2;
                grid2.attach(btn, c, r, 1, 1);

                btn.connect('clicked', () => {
                    if (this._updatingProgrammatically)
                        return;
                    popover2.hide();
                    this.selected_case_icon = name;
                    this._caseButton.icon_name = `bbm-${name}-symbolic`;
                });
            });

            popover2.set_child(grid2);
            this._caseButton.set_popover(popover2);
            row.add_suffix(this._caseButton);
        }

        this.add(row);

        this._selected_icon = initialIcon;
        this._selected_case_icon = initialCaseIcon;
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

    get selected_case_icon() {
        return this._selected_case_icon;
    }

    set selected_case_icon(value) {
        if (value === this._lastCaseIcon)
            return;

        this._updatingProgrammatically = true;
        this._selected_case_icon = value;
        if (this._caseButton)
            this._caseButton.icon_name = `bbm-${value}-symbolic`;
        this._updatingProgrammatically = false;

        this._lastCaseIcon = value;
        this.notify('selected-case-icon');
    }
});

