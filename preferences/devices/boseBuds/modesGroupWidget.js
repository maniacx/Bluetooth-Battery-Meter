'use strict';
import Adw from 'gi://Adw';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import {DropDownRowWidget} from './../../widgets/dropDownRowWidget.js';
import {SliderRowWidget} from './../../widgets/sliderRowWidget.js';
import {AudioModes} from '../../../lib/devices/boseBuds/boseBudsConfig.js';

const ModeEditDialog = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_ModeEditDialog',
}, class ModeEditDialog extends Adw.Dialog {
    _init(modeRow, gtxt, modelData, mode, alias) {
        super._init({
            title: alias,
            content_width: 360,
            content_height: 600,
            width_request: 250,
            height_request: 300,
        });

        this._modeRow = modeRow;
        this._mode = mode;
        this._gtxt = gtxt;
        const _ = gtxt;
        this._modelData = modelData;

        const presetKeys = Object.keys(modelData.audioModes.presets);
        const presetKey = presetKeys.find(key =>
            modelData.audioModes.presets[key].id === this._mode.id);

        this._isPreset = presetKey !== undefined;
        this._isAware = presetKey === 'aware';

        this._toastOverlay = new Adw.ToastOverlay();
        const toolbarView = new Adw.ToolbarView();
        toolbarView.add_top_bar(new Adw.HeaderBar());
        this._toastOverlay.set_child(toolbarView);
        const page = new Adw.PreferencesPage();
        toolbarView.set_content(page);
        this.set_child(this._toastOverlay);
        const actionsGroup = new Adw.PreferencesGroup();
        const actionsRow = new Adw.ActionRow();

        const box = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            halign: Gtk.Align.FILL,
            spacing: 6,
            margin_top: 6,
            margin_bottom: 6,
            margin_start: 12,
            margin_end: 12,
            hexpand: true,
        });

        this.addToggleButton = new Gtk.ToggleButton({
            icon_name: 'bbm-add-toggle-symbolic',
            tooltip_text: _('Show in toggle'),
        });

        this.favoriteButton = new Gtk.ToggleButton({
            icon_name: 'bbm-star-outline-rounded-symbolic',
            tooltip_text: _('Favorite'),
        });

        const deleteButton = new Gtk.Button({
            icon_name: 'user-trash-symbolic',
            css_classes: ['destructive-action'],
        });

        this.addToggleButton.connect('toggled', () => this._updateAddToggleButton());
        this.favoriteButton.connect('toggled', () => this._updateFavoriteButton());
        deleteButton.connect('clicked', () => this._confirmRemoveMode());
        deleteButton.sensitive = !this._isPreset;
        deleteButton.tooltip_text = this._isPreset ? _('Preset modes cannot be deleted.')
            : _('Delete');

        box.append(this.addToggleButton);
        box.append(new Adw.Bin({hexpand: true}));
        box.append(this.favoriteButton);
        box.append(new Adw.Bin({hexpand: true}));
        box.append(deleteButton);
        actionsRow.set_child(box);
        actionsGroup.add(actionsRow);
        page.add(actionsGroup);

        const nameGrp = new Adw.PreferencesGroup({title: _('Mode')});
        this._nameRow = new Adw.EntryRow({
            text: this._mode.name,
            activates_default: false,
            editable: !this._isPreset,
            show_apply_button: !this._isPreset,

        });
        this._nameRow.connect('apply', () => this._confirmRename());

        nameGrp.add(this._nameRow);
        page.add(nameGrp);

        if (modelData.audioModes.nc) {
            const noiseGroup = new Adw.PreferencesGroup({title: _('Noise Control')});

            if (modelData.audioModes.ancToggle && !this._isPreset) {
                this._nCSwitch = new Gtk.Switch({
                    valign: Gtk.Align.CENTER,
                });

                this._nCSwitch.connect('notify::active', () => {
                    if (this._modeRow.updatingProgrammatically)
                        return;

                    this._mode.anc = this._nCSwitch.active;
                    this._modeRow.emit('mode-changed');
                });

                noiseGroup.set_header_suffix(this._nCSwitch);
            }

            const maxRange = modelData.audioModes.nc.level;
            const steps = modelData.audioModes.nc.steps;

            this._ncSliderRow = new SliderRowWidget({
                rowTitle: _('Noise Cancellation Level'),
                range: [0, maxRange, steps],
                initialValue: this._mode.cnc,
                snapOnStep: true,
            });
            this._ncSliderRow.compact_mode = true;

            noiseGroup.add(this._ncSliderRow);

            this._ncSliderID = this._ncSliderRow.connect('notify::value', () => {
                if (this._modeRow.updatingProgrammatically)
                    return;

                this._mode.cnc = this._ncSliderRow.value;
                this._modeRow.emit('mode-changed');
            });


            if (modelData.audioModes.autoNc && this._isAware) {
                this._autoCncSwitch = new Adw.SwitchRow({
                    title: _('Adaptive'),
                });

                this._autoCncSwitch.connect('notify::active', () => {
                    if (this._modeRow.updatingProgrammatically)
                        return;

                    this._mode.autoCnc = this._autoCncSwitch.active;
                    this._modeRow.emit('mode-changed');
                });

                noiseGroup.add(this._autoCncSwitch);
            }

            if (modelData.audioModes.windToggle && !this._isPreset) {
                this._windBlock = new Adw.SwitchRow({
                    title: _('Wind Block'),
                });

                this._windBlock.connect('notify::active', () => {
                    if (this._modeRow.updatingProgrammatically)
                        return;

                    this._mode.wind = this._windBlock.active;
                    this._modeRow.emit('mode-changed');
                });

                noiseGroup.add(this._windBlock);
            }

            page.add(noiseGroup);
        }

        if (modelData.audioModes.spatialMode) {
            const spatialGroup = new Adw.PreferencesGroup({
                title: _('Spatial Audio'),
            });

            this._spatialRow = new DropDownRowWidget({
                title: _('Spatial Audio'),
                options: [_('Off'), _('Still'), _('Motion')],
                values: [0, 1, 2],
                initialValue: this._mode.spatial,
            });

            this._spatialId = this._spatialRow.connect('notify::selected-item', () => {
                if (this._modeRow.updatingProgrammatically)
                    return;

                this._mode.spatial = this._spatialRow.selected_item;
                this._modeRow.emit('mode-changed');
            });

            spatialGroup.add(this._spatialRow);
            page.add(spatialGroup);
        }

        this.updateUI();
    }

    showToast(message) {
        this._toastOverlay.dismiss_all();
        this._toastOverlay.add_toast(new Adw.Toast({title: message, timeout: 1}));
    }

    updateUI() {
        if (this._nCSwitch) {
            this._nCSwitch.active = this._mode.anc;
            this._nCSwitch.sensitive = (this._mode.flag & 1) !== 0;
        }

        if (this._ncSliderRow) {
            this._ncSliderRow.value = this._mode.cnc;
            this._ncSliderRow.sensitive = !this._isPreset && (this._mode.flag & 16) !== 0;
        }

        if (this._autoCncSwitch) {
            this._autoCncSwitch.active = this._mode.autoCnc;
            this._autoCncSwitch.sensitive = (this._mode.flag & 2) !== 0;
        }

        if (this._windBlock) {
            this._windBlock.active = this._mode.wind;
            this._windBlock.sensitive = (this._mode.flag & 8) !== 0;
        }

        if (this._spatialRow) {
            this._spatialRow.selected_item = this._mode.spatial;
            this._spatialRow.sensitive = !this._isPreset && (this._mode.flag & 4) !== 0;
        }
    }

    _confirmRemoveMode() {
        const _ = this._gtxt;

        const dialog = new Adw.AlertDialog({
            heading: _('Remove Mode?'),
            body: _('This mode will be removed.'),
        });

        dialog.add_response('cancel', _('Cancel'));
        dialog.add_response('remove', _('Remove'));

        dialog.set_response_appearance('remove', Adw.ResponseAppearance.DESTRUCTIVE);

        dialog.connect('response', (_dialog, response) => {
            if (response === 'remove') {
                this._mode.id = 0;
                this._mode.added = false;
                this._mode.ui = false;
                this._mode.fav = false;
                this._mode.name = '';
                this._mode.cnc = 5;
                this._mode.autoCnc = false;
                this._mode.spatial = 0;
                this._mode.wind = false;
                this._mode.anc = false;
                this._modeRow.emit('mode-changed');
                this.close();
                this._modeRow.emit('delete-requested');
            }
        });

        dialog.present(this);
    }

    _confirmRename() {
        const _ = this._gtxt;

        const newName = this._nameRow.text.trim();
        if (newName === this._mode.name) {
            this._nameRow.text = this._mode.name;
            return;
        }

        if (!newName) {
            this._nameRow.text = this._mode.name;
            return;
        }

        const dialog = new Adw.AlertDialog({
            heading: _('Rename Mode?'),
            body: _('Change the mode name to "%s"?').replace('%s', newName),
        });

        dialog.add_response('cancel', _('Cancel'));
        dialog.add_response('rename', _('Rename'));

        dialog.set_response_appearance(
            'rename',
            Adw.ResponseAppearance.SUGGESTED
        );

        dialog.connect('response', (_dialog, response) => {
            if (response === 'rename') {
                this._mode.name = newName;
                this._modeRow.emit('mode-changed');
            } else {
                this._nameRow.text = this._mode.name;
            }
        });

        dialog.present(this);
    }

    _updateAddToggleButton() {
        this.addToggleButton.icon_name = this.addToggleButton.active
            ? 'bbm-added-toggle-symbolic'
            : 'bbm-add-toggle-symbolic';

        if (this.addToggleButton.active)
            this.addToggleButton.add_css_class('accent');
        else
            this.addToggleButton.remove_css_class('accent');
    }

    _updateFavoriteButton() {
        this.favoriteButton.icon_name = this.favoriteButton.active
            ? 'bbm-star-large-symbolic'
            : 'bbm-star-outline-rounded-symbolic';

        if (this.favoriteButton.active)
            this.favoriteButton.add_css_class('accent');
        else
            this.favoriteButton.remove_css_class('accent');
    }

    destroy() {
        if (this._ncSliderID)
            this._ncSliderRow.disconnect(this._ncSliderID);
        this._ncSliderID = null;

        if (this._spatialId)
            this._spatialRow.disconnect(this._spatialId);
        this._spatialId = null;
    }
});

const ModeRow = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_ModeRow',
    Properties: {
        'row-active': GObject.ParamSpec.boolean(
            'row-active',
            'Row Active',
            '',
            GObject.ParamFlags.READWRITE,
            false
        ),
    },
    Signals: {
        'delete-requested': {},
        'mode-changed': {},
    },
}, class ModeRow extends Adw.ActionRow {
    _init(window, gtxt, modelData, mode, modes, alias) {
        super._init();
        this.activatable = true;
        this._window = window;
        this._gtxt = gtxt;
        const _ = this._gtxt;
        this._modelData = modelData;
        this._mode = mode;
        this._modes = modes;
        this.updatingProgrammatically = false;
        this._dialogPresented = false;

        const iconMode = AudioModes[this._mode.id];
        const modeIcon = new Gtk.Image({
            icon_name: `bbm-mode-${iconMode}-symbolic`,
        });

        this.add_prefix(modeIcon);
        this.title = this._mode.name;

        const box = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 6,
            margin_top: 12,
            margin_bottom: 12,
            margin_start: 12,
            margin_end: 12,
        });

        this.addToggleButton = new Gtk.ToggleButton({
            icon_name: 'bbm-add-toggle-symbolic',
            tooltip_text: _('Show in toggle'),
            active: this._mode.ui,
        });

        this.favoriteButton = new Gtk.ToggleButton({
            icon_name: 'bbm-star-outline-rounded-symbolic',
            tooltip_text: _('Favorite'),
            active: this._mode.fav,
        });

        this._updateUI();

        const editButton = new Gtk.Button({
            icon_name: 'bbm-edit-symbolic',
            tooltip_text: _('Edit'),
        });

        this._rowActiveSignalId = this.connect('notify::row-active', () => {
            if (this.row_active)
                modeIcon.add_css_class('accent');
            else
                modeIcon.remove_css_class('accent');
        });

        if (this.row_active)
            modeIcon.add_css_class('accent');
        else
            modeIcon.remove_css_class('accent');

        this.dialog = new ModeEditDialog(this, this._gtxt, modelData, this._mode, alias);

        this.addToggleButton.bind_property(
            'active',
            this.dialog.addToggleButton,
            'active',
            GObject.BindingFlags.BIDIRECTIONAL |
                GObject.BindingFlags.SYNC_CREATE
        );

        this.favoriteButton.bind_property(
            'active',
            this.dialog.favoriteButton,
            'active',
            GObject.BindingFlags.BIDIRECTIONAL |
                GObject.BindingFlags.SYNC_CREATE
        );


        this._updateAddToggleButton(true);
        this._updateFavoriteButton(true);

        this.addToggleButton.connect('toggled', () => {
            if (this.updatingProgrammatically)
                return;

            this._updateAddToggleButton();
        });

        this.favoriteButton.connect('toggled', () => {
            if (this.updatingProgrammatically)
                return;

            this._updateFavoriteButton();
        });

        editButton.connect('clicked', () => {
            this._dialogPresented = true;
            this.dialog.present(window);
        });

        this.dialog.connect('closed', () => {
            this._dialogPresented = false;
        });

        box.append(this.addToggleButton);
        box.append(this.favoriteButton);
        box.append(editButton);
        this.add_suffix(box);
    }

    get mode() {
        return this._mode;
    }

    updateUI() {
        this.updatingProgrammatically = true;
        this._updateUI();
        this.dialog?.updateUI();
        this.updatingProgrammatically = false;
    }

    _updateUI() {
        this.title = this._mode.name;
        this.addToggleButton.active = this._mode.ui;
        this.favoriteButton.active = this._mode.fav;
    }

    _updateAddToggleButton(init = false) {
        if (!init) {
            const _ = this._gtxt;
            const enabling = this.addToggleButton.active;
            const uiCount = this._modes.filter(mode => mode.ui).length;

            if (enabling) {
                if (uiCount >= 4) {
                    this.updatingProgrammatically = true;
                    this.dialog.addToggleButton.active = false;
                    this.addToggleButton.active = false;
                    this.updatingProgrammatically = false;
                    const txt = _('Maximum 4 modes can be selected');

                    if (this._dialogPresented)
                        this.dialog.showToast(txt);
                    else
                        this._window.showToast(txt);

                    return;
                }
            } else if (uiCount <= 2) {
                this.updatingProgrammatically = true;
                this.dialog.addToggleButton.active = true;
                this.addToggleButton.active = true;
                this.updatingProgrammatically = false;
                const txt = _('At least 2 modes must be selected.');

                if (this._dialogPresented)
                    this.dialog.showToast(txt);
                else
                    this._window.showToast(txt);

                return;
            }

            this._mode.ui = enabling;
        }

        this.addToggleButton.icon_name = this.addToggleButton.active
            ? 'bbm-added-toggle-symbolic'
            : 'bbm-add-toggle-symbolic';

        if (this.addToggleButton.active)
            this.addToggleButton.add_css_class('accent');
        else
            this.addToggleButton.remove_css_class('accent');

        if (!init)
            this.emit('mode-changed');
    }

    _updateFavoriteButton(init = false) {
        if (!init) {
            const _ = this._gtxt;
            const enabling = this.favoriteButton.active;
            const favCount = this._modes.filter(m => m.fav).length;

            if (enabling) {
                const maxFav = this._modelData.audioModes.maxAllowedFav;

                if (favCount >= maxFav) {
                    this.updatingProgrammatically = true;
                    this.dialog.favoriteButton.active = false;
                    this.favoriteButton.active = false;
                    this.updatingProgrammatically = false;

                    const txt = _('Maximum favorites limit reached.');

                    if (this._dialogPresented)
                        this.dialog.showToast(txt);
                    else
                        this._window.showToast(txt);

                    return;
                }
            } else if (favCount <= 2) {
                this.updatingProgrammatically = true;
                this.dialog.favoriteButton.active = true;
                this.favoriteButton.active = true;
                this.updatingProgrammatically = false;

                const txt = _('At least 2 favorites are required.');

                if (this._dialogPresented)
                    this.dialog.showToast(txt);
                else
                    this._window.showToast(txt);

                return;
            }

            this._mode.fav = enabling;
        }

        this.favoriteButton.icon_name = this.favoriteButton.active ? 'bbm-star-large-symbolic'
            : 'bbm-star-outline-rounded-symbolic';

        if (this.favoriteButton.active)
            this.favoriteButton.add_css_class('accent');
        else
            this.favoriteButton.remove_css_class('accent');

        if (!init)
            this.emit('mode-changed');
    }

    destroy() {
        this.dialog.destroy();
        this.dialog = null;

        if (this._rowActiveSignalId)
            this.disconnect(this._rowActiveSignalId);
        this._rowActiveSignalId = null;
    }
});

const ModeAddButton = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_ModeAddButton',
    Signals: {
        'mode-added': {
            param_types: [GObject.TYPE_JSOBJECT],
        },
    },
}, class ModeAddButton extends Gtk.MenuButton {
    _init(gtxt, modelData, modes) {
        super._init();
        const _ = gtxt;
        this._modelData = modelData;
        this._modes = modes;

        const btnContent = new Adw.ButtonContent({
            icon_name: 'list-add-symbolic',
            label: _('Add'),
        });

        this.set_child(btnContent);

        this._modeLabels = {
            commute: _('Commute'),
            focus: _('Focus'),
            home: _('Home'),
            music: _('Music'),
            outdoor: _('Outdoor'),
            relax: _('Relax'),
            run: _('Run'),
            walk: _('Walk'),
            work: _('Work'),
            workout: _('Workout'),
            stereo: _('Stereo'),
        };

        this._popover = new Gtk.Popover({
            has_arrow: true,
            cascade_popdown: true,
        });

        this._box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 6,
            margin_top: 6,
            margin_bottom: 6,
            margin_start: 6,
            margin_end: 6,
        });

        this._popover.set_child(this._box);
        this.set_popover(this._popover);
        this.refresh();
    }

    refresh() {
        while (this._box.get_first_child())
            this._box.remove(this._box.get_first_child());

        const addedModes = new Set(this._modes.filter(mode => mode.added)
            .map(mode => mode.id)
        );

        for (const [id, modeName] of Object.entries(AudioModes)) {
            if (!this._modelData.audioModes.userMode.includes(modeName))
                continue;

            if (addedModes.has(Number(id)))
                continue;

            this._box.append(this._createModeRow(Number(id), modeName));
        }
    }

    _createModeRow(id, modeName) {
        const button = new Gtk.Button({
            css_classes: ['flat'],
        });

        const row = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 12,
        });

        row.append(new Gtk.Image({
            icon_name: `bbm-mode-${modeName}-symbolic`,
        }));

        row.append(new Gtk.Label({
            label: this._modeLabels[modeName] ?? modeName,
            xalign: 0,
            hexpand: true,
        }));

        button.set_child(row);

        button.connect('clicked', () => {
            const mode = this._modes.find(m => !m.added);

            if (mode) {
                mode.id = id;
                mode.name = this._modeLabels[modeName] ?? modeName;
                mode.added = true;

                this.emit('mode-added', mode);
            }

            this.get_popover()?.popdown();
        });

        return button;
    }
});

export const ModesGroupWidget = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_ModesGroup',
    Signals: {
        'current-mode-changed': {
            param_types: [GObject.TYPE_INT],
        },
        'modes-changed': {
            param_types: [GObject.TYPE_JSOBJECT],
        },
    },
}, class ModesGroupWidget extends Adw.PreferencesGroup {
    _init(window, gtxt, modelData, modes, currentMode, alias) {
        super._init();
        this._window = window;
        this._gtxt = gtxt;
        const _ = gtxt;
        this._modelData = modelData;
        this._modes = modes.map(mode => ({...mode}));
        this._alias = alias;
        this._currentMode = null;
        this._rows = new Map();

        this.set_title(_('Modes'));
        this._defaultGroupButton = null;

        for (const mode of this._modes) {
            if (mode.added)
                this._addModeRow(mode);
        }

        this._setCurrentMode(currentMode);

        this._addButton = new ModeAddButton(gtxt, modelData, this._modes);

        this._addButtonSignalId = this._addButton.connect('mode-added', (button, mode) => {
            const row = this._addModeRow(mode);
            this.emit('modes-changed', this._modes);
            this._setCurrentMode(mode.index, true);
            row.dialog.present(this._window);
            this._addButton.refresh();
        });

        this.set_header_suffix(this._addButton);
    }

    _addModeRow(mode) {
        const row = new ModeRow(this._window, this._gtxt, this._modelData, mode, this._modes,
            this._alias);

        const activatedId = row.connect('activated', () => {
            this._setCurrentMode(mode.index, true);
        });

        const modeId = row.connect('mode-changed', () => {
            this.emit('modes-changed', this._modes);
        });

        const deleteId = row.connect('delete-requested', () => {
            this._removeModeRow(row);
            this._addButton.refresh();
        });

        this._rows.set(row, {activatedId, modeId, deleteId});
        this.add(row);
        return row;
    }

    _removeModeRow(row) {
        const signals = this._rows.get(row);

        if (signals) {
            row.disconnect(signals.activatedId);
            row.disconnect(signals.modeId);
            row.disconnect(signals.deleteId);
            this._rows.delete(row);
        }

        this.remove(row);
    }

    updateParams(modes, currentMode) {
        this._updateModes(modes);
        this._setCurrentMode(currentMode);
    }


    _setCurrentMode(modeIndex, emitChanged = false) {
        if (this._currentMode === modeIndex)
            return;

        this._currentMode = modeIndex;

        for (const row of this._rows.keys())
            row.row_active = row.mode.index === modeIndex;

        if (emitChanged)
            this.emit('current-mode-changed', modeIndex);
    }

    _updateModes(modes) {
        const isEqual = this._modes.length === modes.length &&
        this._modes.every((mode, i) => Object.keys(mode).every(key =>
            mode[key] === modes[i][key]));

        if (isEqual)
            return;

        const newModes = modes.map(mode => ({...mode}));

        for (const newMode of newModes) {
            const oldMode = this._modes.find(mode => mode.id === newMode.id);

            const row = [...this._rows.keys()]
            .find(row => row.mode.id === newMode.id);

            if (!oldMode)
                continue;

            if (!oldMode.added && newMode.added) {
                this._addModeRow(newMode);
            } else if (oldMode.added && !newMode.added) {
                if (row)
                    this._removeModeRow(row);
            } else if (oldMode.added && newMode.added) {
                if (row) {
                    Object.assign(row.mode, newMode);
                    row.updateUI();
                }
            }
        }

        this._modes = newModes;
        this._addButton.refresh();
    }

    destroy() {
        if (this._addButtonSignalId)
            this._addButton.disconnect(this._addButtonSignalId);
        this._addButtonSignalId = null;

        for (const [row, signals] of this._rows) {
            row.disconnect(signals.activatedId);
            row.disconnect(signals.modeId);
            row.disconnect(signals.deleteId);
            row.destroy();
        }

        this._rows.clear();
    }
});

