'use strict';
import Adw from 'gi://Adw';
import GObject from 'gi://GObject';

import {
    supportedAudioSingleIcons, supportedAudioDualIcons, supportedCaseIcons
} from '../../../lib/widgets/iconGroups.js';
import {DropDownRowWidget} from './../../widgets/dropDownRowWidget.js';
import {SliderRowWidget} from './../../widgets/sliderRowWidget.js';
import {CheckBoxesRowWidget} from './../../widgets/checkBoxesRowWidget.js';
import {IconSelectorWidget} from './../../widgets/iconSelectorWidget.js';
import {RingMyBudsRow} from './../../widgets/ringMyBudsRow.js';
import {EqualizerWidget} from './../../widgets/equalizerWidget.js';
import {
    NothingBudsModelList
} from '../../../lib/devices/nothingBuds/nothingBudsConfig.js';

const NC_BITMASK_TO_BYTE = {
    0b101: 0x14,
    0b110: 0x16,
    0b111: 0x0A,
    0b011: 0x15,
};

const NC_BYTE_TO_BITMASK = {
    0x14: 0b101,
    0x16: 0b110,
    0x0A: 0b111,
    0x15: 0b011,
};

export const ConfigureWindow = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_NothingBudsConfigureWindow',
}, class ConfigureWindow extends Adw.Window {
    _init(settings, mac, devicePath, parentWindow, _, modal = false) {
        super._init({
            default_width: 650,
            default_height: 650,
            modal,
            transient_for: parentWindow ?? null,
        });

        this._settings = settings;
        this._devicePath = devicePath;
        this._gettext = _;

        const pathsString = settings.get_strv('nothing-buds-list').map(JSON.parse);
        this._settingsItems = pathsString.find(info => info.path === devicePath);

        if (!this._settingsItems)
            return;

        this.title = this._settingsItems.alias;

        this._modelData =
                NothingBudsModelList.find(m => m.modelId === this._settingsItems.modelid);

        if (!this._modelData)
            return;

        const toolViewBar = new Adw.ToolbarView();
        const headerBar = new Adw.HeaderBar({
            decoration_layout: 'icon:close',
            show_end_title_buttons: true,
        });
        this._page = new Adw.PreferencesPage();

        toolViewBar.add_top_bar(headerBar);
        toolViewBar.set_content(this._page);
        this.set_content(toolViewBar);

        const aliasGroup = new Adw.PreferencesGroup({title: `MAC: ${mac}`});
        this._page.add(aliasGroup);

        const iconList = this._modelData.batteryLR ? supportedAudioDualIcons
            : supportedAudioSingleIcons;

        let caseIconList = [];
        let initialCaseIcon = '';
        if (this._modelData.batteryCase) {
            caseIconList = supportedCaseIcons;
            initialCaseIcon = this._settingsItems['case'];
        }

        const iconSelector = new IconSelectorWidget({
            grpTitle: _('Icon'),
            rowTitle: _('Select Icon'),
            rowSubtitle: _('Select the icon used for the indicator and quick menu'),
            iconList,
            initialIcon: this._settingsItems['icon'],
            caseIconList,
            initialCaseIcon,
        });

        iconSelector.connect('notify::selected-icon', () => {
            this._updateGsettings('icon', iconSelector.selected_icon);
        });

        if (this._modelData.batteryCase) {
            iconSelector.connect('notify::selected-case-icon', () => {
                this._updateGsettings('case', iconSelector.selected_case_icon);
            });
        }

        this._page.add(iconSelector);

        this._addEq();
        this._addBassEnhance();
        this._addMiscSetting();
        this._addGestureControls();

        settings.connect('changed::nothing-buds-list', () => {
            const updatedList = settings.get_strv('nothing-buds-list').map(JSON.parse);
            this._settingsItems = updatedList.find(info => info.path === devicePath);
            if (!this._settingsItems)
                return;

            this.title = this._settingsItems.alias;

            if (this._modelData.eqPreset) {
                this._eqPresetDropdown.selected_item = this._settingsItems['eq-preset'];
                this._updateEqCustomRowVisibility();
            }

            if (this._modelData.eqPreset?.custom !== undefined)
                this._eq.setValues(this._settingsItems['eq-custom']);

            if (this._modelData?.bassEnhanceLevel) {
                this._bassEnhanceSwitch.active = this._settingsItems['bass-enable'];
                this._baseLevel.value = this._settingsItems['bass-level'];
            }

            if (this._modelData?.lowLatencyMode)
                this._lowLatencySwitch.active = this._settingsItems['lowlatency'];

            if (this._modelData?.inEarDetection)
                this._inEarSwitch.active = this._settingsItems['inear-enable'];
        });

        this.connect('close-request', () => {
            if (!this._modelData?.ring)
                return false;

            const ringState = this._settingsItems?.['ring-state'];
            if (ringState === 'playing')
                this._updateGsettings('ring-state', 'stopped');

            if (!this._modelData.ringLegacy && !this._modelData.batterySingle) {
                const ringStateLeft = this._settingsItems?.['ring-state-left'];
                if (ringStateLeft === 'playing')
                    this._updateGsettings('ring-state-left', 'stopped');
            }

            return false;
        });
    }

    _updateGsettings(key, value) {
        const pairedDevice = this._settings.get_strv('nothing-buds-list');
        const existingPathIndex =
                pairedDevice.findIndex(item => JSON.parse(item).path === this._devicePath);
        if (existingPathIndex !== -1) {
            const existingItem = JSON.parse(pairedDevice[existingPathIndex]);
            existingItem[key] = value;
            pairedDevice[existingPathIndex] = JSON.stringify(existingItem);
            this._settings.set_strv('nothing-buds-list', pairedDevice);
        }
    }

    _addEq() {
        if (!this._modelData?.eqPreset)
            return;

        const _ = this._gettext;

        const eqGroup = new Adw.PreferencesGroup({title: _('Equalizer')});
        this._page.add(eqGroup);

        const presetObj = this._modelData.eqPreset;

        const presetLabels = {
            balanced: _('Balanced'),
            voice: _('Voice'),
            more_treble: _('More Treble'),
            more_bass: _('More Bass'),
            dirac: _('Dirac'),
            rock: _('Rock'),
            electronic: _('Electronic'),
            pop: _('Pop'),
            enhance_vocals: _('Enhance Vocals'),
            classical: _('Classical'),
            custom: _('Custom'),
        };

        const descriptors = Object.keys(presetObj).filter(key => presetLabels[key] !== undefined)
                .map(key => ({label: presetLabels[key], value: presetObj[key]}));

        const options = descriptors.map(d => d.label);
        const presetValues  = descriptors.map(d => d.value);

        this._eqPresetDropdown = new DropDownRowWidget({
            title: _('Equalizer Preset'),
            options,
            values: presetValues,
            initialValue: this._settingsItems['eq-preset'],
        });

        this._eqPresetDropdown.connect('notify::selected-item', () => {
            this._updateGsettings('eq-preset', this._eqPresetDropdown.selected_item);
            this._updateEqCustomRowVisibility();
        });

        eqGroup.add(this._eqPresetDropdown);

        if (this._modelData.eqPreset?.custom === undefined)
            return;

        this._equalizerCustomRow = new Adw.ActionRow({
            title: _('Custom Equalizer'),
        });

        const eqFreqs = [_('Bass'), _('Mid'), _('Treble')];
        const eqRange = 6;
        const initialValues = this._settingsItems['eq-custom'];

        this._eq = new EqualizerWidget(eqFreqs, initialValues, eqRange);

        this._eq.connect('eq-changed', (_widget, values) => {
            this._updateGsettings('eq-custom', values);
        });

        this._equalizerCustomRow.set_child(this._eq);

        this._updateEqCustomRowVisibility();

        eqGroup.add(this._equalizerCustomRow);
    }

    _updateEqCustomRowVisibility() {
        const selectedPreset = this._eqPresetDropdown.selected_item;
        const customPresetValue = this._modelData.eqPreset.custom;
        this._equalizerCustomRow.visible = selectedPreset === customPresetValue;
    }


    _addBassEnhance() {
        if (!this._modelData?.bassEnhanceLevel)
            return;

        const _ = this._gettext;

        const bassEnhanceGroup = new Adw.PreferencesGroup({title: _('Bass Enhance')});
        this._page.add(bassEnhanceGroup);

        this._bassEnhanceSwitch = new Adw.SwitchRow({title: _('Enable Bass Enhance')});

        this._bassEnhanceSwitch.connect('notify::active', () => {
            this._updateGsettings('bass-enable', this._bassEnhanceSwitch.active);
        });

        bassEnhanceGroup.add(this._bassEnhanceSwitch);


        this._baseLevel = new SliderRowWidget({
            rowTitle: _('Bass Enhance Level'),
            range: [1, 5, 1],
            marks: [
                {mark: 1, label: _('-')},
                {mark: 2},
                {mark: 3},
                {mark: 4},
                {mark: 5, label: _('+')},
            ],
            initialValue: this._settingsItems['bass-level'],
            snapOnStep: true,
        });

        this._baseLevel.connect('notify::value', () => {
            this._updateGsettings('bass-level', this._baseLevel.value);
        });

        bassEnhanceGroup.add(this._baseLevel);

        this._bassEnhanceSwitch.bind_property(
            'active',
            this._baseLevel,
            'sensitive',
            GObject.BindingFlags.SYNC_CREATE
        );
    }

    _addMiscSetting() {
        let miscGroup;
        const _ = this._gettext;

        if (this._modelData?.lowLatencyMode || this._modelData?.inEarDetection ||
                this._modelData?.ring) {
            miscGroup = new Adw.PreferencesGroup({title: _('Features')});
            this._page.add(miscGroup);
        }

        if (this._modelData?.lowLatencyMode) {
            this._lowLatencySwitch = new Adw.SwitchRow({title: _('Enable low latency mode')});

            this._lowLatencySwitch.connect('notify::active', () => {
                this._updateGsettings('lowlatency', this._lowLatencySwitch.active);
            });

            miscGroup.add(this._lowLatencySwitch);
        }

        if (this._modelData?.inEarDetection) {
            this._inEarSwitch = new Adw.SwitchRow({
                title: _('Enable in ear detection'),
            });

            this._inEarSwitch.connect('notify::active', () => {
                this._updateGsettings('inear-enable', this._inEarSwitch.active);
            });

            miscGroup.add(this._inEarSwitch);
        }

        if (this._modelData?.ring) {
            const dual = !this._modelData.ringLegacy && !this._modelData.batterySingle;

            this._ringBudsRow = new RingMyBudsRow(_, {dual});

            this._ringBudsRow.connect('notify::status', () => {
                this._updateGsettings('ring-state', this._ringBudsRow.status);
            });

            if (dual) {
                this._ringBudsRow.connect('notify::status-left', () => {
                    this._updateGsettings('ring-state-left', this._ringBudsRow.statusLeft);
                });
            }

            miscGroup.add(this._ringBudsRow);
        }
    }

    _buildNoiseControlRow(title, savedSlot)  {
        const _ = this._gettext;

        const items = [
            {name: _('Off'), icon: 'bbm-anc-off-symbolic'},
            {name: _('Ambient'), icon: 'bbm-transperancy-symbolic'},
            {name: _('Noise Cancellation'), icon: 'bbm-anc-on-symbolic'},
        ];

        const initialMask =
            savedSlot && NC_BYTE_TO_BITMASK[savedSlot.action]
                ? NC_BYTE_TO_BITMASK[savedSlot.action]
                : 0;

        const checkBoxWidget =  new CheckBoxesRowWidget({
            rowTitle: _('Noise Control Cycle: ') + title,
            items,
            applyBtnName: _('Apply'),
            initialValue: initialMask,
            minRequired: 2,
        });
        return checkBoxWidget;
    };

    _addGestureControls() {
        const gc = this._modelData?.gestureOptions;
        if (!gc)
            return;

        const _ = this._gettext;
        const allSlots = this._settingsItems.gestures ?? [];

        const GESTURE_DISPLAY = {
            'single-tap': _('Single Tap'),
            'double-tap': _('Double Tap'),
            'triple-tap': _('Triple Tap'),
            'action-hold-tap': _('Tap and Hold'),
            'double-action-hold-tap': _('Double Tap and Hold'),

            'single-press': _('Single Press'),
            'double-press': _('Double Press'),
            'triple-press': _('Triple Press'),
            'action-hold-press': _('Press and Hold'),
            'double-action-hold-press': _('Double Press and Hold'),

            'single-pinch': _('Single Pinch'),
            'double-pinch': _('Double Pinch'),
            'triple-pinch': _('Triple Pinch'),
            'action-hold-pinch': _('Pinch and Hold'),
            'double-action-hold-pinch': _('Double Pinch and Hold'),

            'roller-action-hold-press': _('Press and Hold'),
            'slider-single-slide': _('Slide to Adjust'),

            'case-knob-single-press': _('Single Press'),
            'case-knob-double-press': _('Double Press'),
            'case-knob-triple-press': _('Triple Press'),
            'case-knob-action-hold-press': _('Press and Hold'),
            'case-knob-double-action-hold-press': _('Double Press and Hold'),
            'case-knob-rotate-rotate': _('Rotate'),
        };

        const makeDropdown = (gestureKey, gestureConfig, slot) => {
            if (!gestureConfig?.actions?.length)
                return null;

            const actions = gestureConfig.actions;
            const onlyNoiseControl =
            actions.length === 1 && actions[0] === 'noise-control';

            const typeByte = gc.mapping.gestureTypes?.[gestureKey];
            if (typeByte === undefined)
                return null;

            const deviceByte = slot.device;

            let savedSlot = allSlots.find(s =>
                s.device === deviceByte &&
            s.type === typeByte
            );

            const displayKey = `${slot.type}-${gestureConfig.type}`;
            const title = GESTURE_DISPLAY[displayKey] ?? _('Unknown Gesture');

            let dd = null;
            let ncRow = null;

            if (!onlyNoiseControl) {
                const options = actions.map(a => this._readableAction(_, a));
                const values = actions.map(a => {
                    const bytes = gc.mapping.actions[a];
                    return Array.isArray(bytes) ? bytes[0] : bytes;
                });

                const initialValue = savedSlot?.action ?? values[0];

                dd = new DropDownRowWidget({
                    title,
                    options,
                    values,
                    initialValue,
                });
            }

            if (gc.noiseControlModes && actions.includes('noise-control')) {
                ncRow = this._buildNoiseControlRow(title, savedSlot);

                if (dd) {
                    const ncBytes = gc.mapping.actions['noise-control'];
                    ncRow.visible = ncBytes.includes(dd.selected_item);
                }

                ncRow.connect('notify::toggled-value', () => {
                    const byte = NC_BITMASK_TO_BYTE[ncRow.toggled_value];
                    if (!byte)
                        return;

                    if (!savedSlot) {
                        savedSlot = {device: deviceByte, type: typeByte};
                        allSlots.push(savedSlot);
                    }

                    savedSlot.action = byte;
                    this._updateGsettings('gestures', allSlots);
                });
            }

            if (dd) {
                dd.connect('notify::selected-item', () => {
                    const val = dd.selected_item;

                    if (!savedSlot) {
                        savedSlot = {device: deviceByte, type: typeByte};
                        allSlots.push(savedSlot);
                    }

                    savedSlot.action = val;

                    if (ncRow) {
                        const isNC = gc.mapping.actions['noise-control'].includes(val);
                        ncRow.visible = isNC;
                    }

                    this._updateGsettings('gestures', allSlots);
                });
            }

            return {dropdown: dd, checkBoxWidget: ncRow};
        };

        const groups = new Map();

        for (const slot of gc.slots) {
            if (!groups.has(slot.group)) {
                const groupWidget = new Adw.PreferencesGroup({
                    title: this._getGroupTitle(slot.group),
                });

                groups.set(slot.group, groupWidget);
                this._page.add(groupWidget);
            }
        }

        for (const slot of gc.slots) {
            const gestureKey = slot.type;
            const gestureConfig = gc.gestures?.[gestureKey];
            if (!gestureConfig)
                continue;

            const groupWidget = groups.get(slot.group);
            if (!groupWidget)
                continue;

            const widgets = makeDropdown(gestureKey, gestureConfig, slot);
            if (!widgets)
                continue;

            if (widgets.dropdown)
                groupWidget.add(widgets.dropdown);

            if (widgets.checkBoxWidget)
                groupWidget.add(widgets.checkBoxWidget);
        }
    }

    _getGroupTitle(group) {
        const _ = this._gettext;
        switch (group) {
            case 'single':
                return _('Gesture Controls');

            case 'left':
                return _('Left Buds Gesture Control');

            case 'right':
                return _('Right Buds Gesture Control');

            case 'roller':
                return _('Roller Gesture Control');

            case 'case-knob':
                return _('Case Gesture Control');

            case 'slider':
                return _('Slider Gesture Control');

            default:
                return _('Gesture Controls');
        }
    }

    _readableAction(_, action) {
        switch (action) {
            case 'play-pause':
                return _('Play / Pause');

            case 'skip-back':
                return _('Previous Track');

            case 'skip-forward':
                return _('Next Track');

            case 'voice-assistant':
                return _('Voice Assistant');

            case 'volume-up':
                return _('Volume Up');

            case 'volume-down':
                return _('Volume Down');

            case 'volume-control':
                return _('Volume Control');

            case 'noise-control':
                return _('Noise Control');

            case 'anc-type':
                return _('ANC Type');

            case 'no-action':
                return _('No Action');

            case 'change-volume':
                return _('Change Volume');

            case 'channel-hop':
                return _('Channel Hop');

            case 'news-description':
                return _('New Reporter');

            case 'spatial-audio':
                return _('Spatial Audio');

            case 'mic-on-off':
                return _('Mic On/Off');

            case 'eq-preset':
                return _('Equalizer Preset');

            case 'super-mic':
                return _('Walkie Takie');

            case 'ultra-bass':
                return _('Bass');

            case 'treble-enhance':
                return _('Treble');

            case 'case-game-mode':
                return _('Toggle Low Latency');

            case 'essential-space':
                return _('Essential Space');

            default:
                return action;
        }
    }
});
