'use strict';
import Adw from 'gi://Adw';
import GObject from 'gi://GObject';

import {supportedAudioDualIcons, supportedCaseIcons} from '../../../lib/widgets/iconGroups.js';
import {DropDownRowWidget} from './../../widgets/dropDownRowWidget.js';
import {SliderRowWidget} from './../../widgets/sliderRowWidget.js';
import {CheckBoxesRowWidget} from './../../widgets/checkBoxesRowWidget.js';
import {IconSelectorWidget} from './../../widgets/iconSelectorWidget.js';
import {
    GalaxyBudsModelList, EqPresets

} from '../../../lib/devices/galaxyBuds/galaxyBudsConfig.js';

export const ConfigureWindow = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_GalaxyBudsConfigureWindow',
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

        const pathsString = settings.get_strv('galaxy-buds-list').map(JSON.parse);
        this._settingsItems = pathsString.find(info => info.path === devicePath);

        if (!this._settingsItems)
            return;

        this.title = this._settingsItems.alias;

        const modelData = GalaxyBudsModelList.find(m => m.modelId === this._settingsItems.modelId);
        this._features = modelData.features;
        this._touchOptions = modelData.touchOptions;


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

        const iconList = supportedAudioDualIcons;

        let caseIconList = [];
        let initialCaseIcon = '';
        if (this._features.caseBattery) {
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

        if (this._features.caseBattery) {
            iconSelector.connect('notify::selected-case-icon', () => {
                this._updateGsettings('case', iconSelector.selected_case_icon);
            });
        }

        this._page.add(iconSelector);

        const inEarSettingsGroup = new Adw.PreferencesGroup({
            title: _('Playback Behavior'),
        });

        const inEarOptions =  [
            _('Default behavior'),
            _('Resume with both earbuds'),
            _('Resume with any earbud'),
        ];

        const inEarValues = [0, 1, 2];

        this._inEarDropdown = new DropDownRowWidget({
            title: _('Choose playback behaviour for Ear detection'),
            subtitle: _('Automatically pause or resume playback ' +
                'based on wearing detection.'),
            options: inEarOptions,
            values: inEarValues,
            initialValue: this._settingsItems['wear-detection-mode'],
        });

        this._inEarDropdown.connect('notify::selected-item', () => {
            this._updateGsettings('wear-detection-mode', this._inEarDropdown.selected_item);
        });

        inEarSettingsGroup.add(this._inEarDropdown);

        this._page.add(inEarSettingsGroup);

        this._addDetectConversations(_);
        this._addEqPreset(_);
        this._addTouchLock(_);
        this._addTouchAdvanceControl(_);
        this._addAdvancedTouchLockForCalls(_);
        this._addLightingControl(_);
        this._addAmbientCustomization(_);
        this._addAdditionalSetting(_);
        this._addNCCycleCheckBox(_);
        this._addTouchAndHoldFnChange(_);

        settings.connect('changed::galaxy-buds-list', () => {
            const updatedList = settings.get_strv('galaxy-buds-list').map(JSON.parse);
            this._settingsItems = updatedList.find(info => info.path === devicePath);
            if (!this._settingsItems)
                return;

            this.title = this._settingsItems.alias;

            if (this._features.detectConversations)
                this._durationDropdown.selected_item = this._settingsItems['s2c-time'];


            this._eqPresetDropdown.selected_item = this._settingsItems['eq-preset'];

            if (this._features.stereoPan)
                this._stereoBal.value = this._settingsItems['stereo-bal'];

            this._touchControlLockSwitch.active = this._settingsItems['tp-enabled'];

            if (this._features.advancedTouchLock) {
                this._touchControlSingleTapSwitch.active = this._settingsItems['tp-adv-single'];
                this._touchControlDoubleTapSwitch.active = this._settingsItems['tp-adv-double'];
                this._touchControlTripleTapSwitch.active = this._settingsItems['tp-adv-triple'];
                this._touchControlTouchHoldSwitch.active = this._settingsItems['tp-adv-hold'];
            }

            if (this._features.advancedTouchLockForCalls) {
                this._touchControlDoubleCall.active = this._settingsItems['tp-adv-call-double'];
                this._touchControlHoldCall.active = this._settingsItems['tp-adv-call-hold'];
            }

            if (this._features.lightingControl)
                this._lightingModeDD.selected_item = this._settingsItems['tp-lighting'];

            this._touchAndHoldLeftDD.selected_item = this._settingsItems['th-left'];
            this._touchAndHoldRightDD.selected_item = this._settingsItems['th-right'];

            if (this._features.noiseControl) {
                this._ncCycleRight.toggled_value = this._settingsItems['nc-cycle-right'];
                if (this._features.noiseControlModeDualSide)
                    this._ncCycleLeft.toggled_value = this._settingsItems['nc-cycle-left'];
            }
            if (this._features.ambientSidetone)
                this._sideToneSwitch.active = this._settingsItems['sidetone'];

            if (this._features.noiseControlsWithOneEarbud)
                this._noiseControlsOneEarbudSwitch.active = this._settingsItems['nc-one'];

            if (this._features.doubleTapVolume)
                this._outsideDoubleTapSwitch.active = this._settingsItems['2tap-vol'];


            if (this._features.ambientCustomize) {
                this._customAmbientSwitch.active = this._settingsItems['amb-enable'];
                this._ambCustomLeft.value = this._settingsItems['amb-left'];
                this._ambCustomRight.value = this._settingsItems['amb-right'];
                this._ambCustomTone.active = this._settingsItems['amb-tone'];
            }
        });
    }

    _updateGsettings(key, value) {
        const pairedDevice = this._settings.get_strv('galaxy-buds-list');
        const existingPathIndex =
                pairedDevice.findIndex(item => JSON.parse(item).path === this._devicePath);
        if (existingPathIndex !== -1) {
            const existingItem = JSON.parse(pairedDevice[existingPathIndex]);
            existingItem[key] = value;
            pairedDevice[existingPathIndex] = JSON.stringify(existingItem);
            this._settings.set_strv('galaxy-buds-list', pairedDevice);
        }
    }

    _addDetectConversations(_) {
        if (!this._features.detectConversations)
            return;

        const voiceDetectionGrp = new Adw.PreferencesGroup({title: _('Voice detection')});
        this._page.add(voiceDetectionGrp);

        const durationOptions = [_('5 seconds'), _('10 seconds'), _('15 seconds')];
        const durationValues = [0, 1, 2];
        this._durationDropdown = new DropDownRowWidget({
            title: _('Duration'),
            options: durationOptions,
            values: durationValues,
            initialValue: this._settingsItems['s2c-time'],
        });

        this._durationDropdown.connect('notify::selected-item', () => {
            const val = this._durationDropdown.selected_item;
            this._updateGsettings('s2c-time', val);
        });

        voiceDetectionGrp.add(this._durationDropdown);
    }

    _addEqPreset(_) {
        const eqGroup = new Adw.PreferencesGroup({title: _('Equalizer')});
        this._page.add(eqGroup);

        const eqPresets =  [
            _('Off'),
            _('Bass Boost'),
            _('Soft'),
            _('Dynamic'),
            _('Clear'),
            _('Treble Boost'),

        ];

        const eqPresetValues = [
            EqPresets.Off,
            EqPresets.BassBoost,
            EqPresets.Soft,
            EqPresets.Dynamic,
            EqPresets.Clear,
            EqPresets.TrebleBoost,
        ];

        this._eqPresetDropdown = new DropDownRowWidget({
            title: _('Equalizer Preset'),
            options: eqPresets,
            values: eqPresetValues,
            initialValue: EqPresets.Off,
        });

        this._eqPresetDropdown.connect('notify::selected-item', () => {
            this._updateGsettings('eq-preset', this._eqPresetDropdown.selected_item);
        });

        eqGroup.add(this._eqPresetDropdown);

        if (!this._features.stereoPan)
            return;

        this._stereoBal = new SliderRowWidget({
            rowTitle: _('Balance'),
            rowSubtitle: '',
            initialValue: 16,
            marks: [
                {mark: 0, label: _('Left')},
                {mark: 16, label: _('Center')},
                {mark: 32, label: _('Right')},
            ],
            range: [0, 32, 1],
            snapOnStep: true,
        });

        this._stereoBal.connect('notify::value', () => {
            this._updateGsettings('stereo-bal', this._stereoBal.value);
        });


        eqGroup.add(this._stereoBal);
    }

    _addTouchLock(_) {
        this._touchControlGroup = new Adw.PreferencesGroup({
            title: _('Earbuds Controls'),
        });
        this._page.add(this._touchControlGroup);

        this._touchControlLockSwitch = new Adw.SwitchRow({
            title: this._features.advancedTouchIsPinch
                ? _('Media Controls (Pinch And Swipe)') : _('Enable Touch Controls '),
        });

        this._touchControlGroup.add(this._touchControlLockSwitch);

        this._touchControlLockSwitch.connect('notify::active', () => {
            this._updateGsettings('tp-enabled', this._touchControlLockSwitch.active);
        });
    }

    _addTouchAdvanceControl(_) {
        if (!this._features.advancedTouchLock)
            return;

        this._touchControlSingleTapSwitch = new Adw.SwitchRow({
            title: _('Single Tap'),
        });

        this._touchControlSingleTapSwitch.connect('notify::active', () => {
            this._updateGsettings('tp-adv-single',
                this._touchControlSingleTapSwitch.active);
        });

        this._touchControlGroup.add(this._touchControlSingleTapSwitch);

        this._touchControlDoubleTapSwitch = new Adw.SwitchRow({
            title: _('Double Tap'),
        });

        this._touchControlDoubleTapSwitch.connect('notify::active', () => {
            this._updateGsettings('tp-adv-double',
                this._touchControlDoubleTapSwitch.active);
        });

        this._touchControlGroup.add(this._touchControlDoubleTapSwitch);

        this._touchControlTripleTapSwitch = new Adw.SwitchRow({
            title: _('Triple Tap'),
        });

        this._touchControlTripleTapSwitch.connect('notify::active', () => {
            this._updateGsettings('tp-adv-triple',
                this._touchControlTripleTapSwitch.active);
        });

        this._touchControlGroup.add(this._touchControlTripleTapSwitch);

        this._touchControlTouchHoldSwitch = new Adw.SwitchRow({
            title: _('Touch and Hold'),
        });

        this._touchControlTouchHoldSwitch.connect('notify::active', () => {
            this._updateGsettings('tp-adv-hold',
                this._touchControlTouchHoldSwitch.active);
        });

        this._touchControlGroup.add(this._touchControlTouchHoldSwitch);
    }

    _addAdvancedTouchLockForCalls(_) {
        if (!this._features.advancedTouchLockForCalls)
            return;

        this._touchControlDoubleCall = new Adw.SwitchRow({
            title: _('Double Tap to Answer Call or End Call'),
        });

        this._touchControlDoubleCall.connect('notify::active', () => {
            this._updateGsettings('tp-adv-call-double',
                this._touchControlDoubleCall.active);
        });

        this._touchControlGroup.add(this._touchControlDoubleCall);

        this._touchControlHoldCall = new Adw.SwitchRow({
            title: _('Touch and Hold to Decline Call'),
        });

        this._touchControlHoldCall.connect('notify::active', () => {
            this._updateGsettings('tp-adv-call-hold',
                this._touchControlHoldCall.active);
        });

        this._touchControlGroup.add(this._touchControlHoldCall);
    }

    _addLightingControl(_) {
        if (!this._features.lightingControl)
            return;

        const lightingModesOptions = ['Blinking', 'Fade in and out', 'Steady'];
        const lightingValues = [2, 3, 1];
        this._lightingModeDD = new DropDownRowWidget({
            title: 'Earbuds Lighting Controls',
            options: lightingModesOptions,
            values: lightingValues,
            initialValue: 2,
        });

        this._lightingModeDD.connect('notify::selected-item', () => {
            this._updateGsettings('tp-lighting', this._lightingModeDD.selected_item);
        });

        this._touchControlGroup.add(this._lightingModeDD);
    }

    _addTouchAndHoldFnChange(_) {
        const readableNames = {
            voiceAssistant: _('Voice Assistant'),
            quickAmbientSound: _('Quick Ambient Sound'),
            volume: _('Volume Control'),
            ambientSound: _('Ambient Sound'),
            spotifySpotOn: _('Spotify Spot On'),
            noiseControl: _('Noise Control'),
            anc: _('ANC'),
        };

        const options = [];
        const values = [];

        for (const [key, value] of Object.entries(this._touchOptions)) {
            if (key === 'otherL' || key === 'otherR')
                continue;

            const label = readableNames[key] ?? key;
            options.push(label);
            values.push(value);
        }

        const leftTitle = this._features.advancedTouchIsPinch
            ? _('Left Earbud Pinch and Hold Function')
            : _('Left Earbud Touch and Hold Function');

        const rightTitle = this._features.advancedTouchIsPinch
            ? _('Right Earbud Pinch and Hold Function')
            : _('Right Earbud Touch and Hold Function');

        this._touchAndHoldLeftDD = new DropDownRowWidget({
            title: leftTitle,
            options,
            values,
            initialValue: 2,
        });

        this._touchAndHoldLeftDD.connect('notify::selected-item', () => {
            this._updateGsettings('th-left', this._touchAndHoldLeftDD.selected_item);
        });

        this._touchControlGroup.add(this._touchAndHoldLeftDD);

        this._touchAndHoldRightDD = new DropDownRowWidget({
            title: rightTitle,
            options,
            values,
            initialValue: 2,
        });

        this._touchAndHoldRightDD.connect('notify::selected-item', () => {
            this._updateGsettings('th-right', this._touchAndHoldRightDD.selected_item);
        });

        this._touchControlGroup.add(this._touchAndHoldRightDD);
    }

    _addNCCycleCheckBox(_) {
        if (!this._features.noiseControl)
            return;

        const items = [
            {name: _('Off'), icon: 'bbm-anc-off-symbolic'},
            {name: _('Ambient'), icon: 'bbm-transperancy-symbolic'},
            {name: _('Noise Cancellation'), icon: 'bbm-anc-on-symbolic'},
        ];

        if (this._features.adaptiveNoiseControl)
            items.push({name: _('Adaptive'), icon: 'bbm-adaptive-symbolic'});

        let groupTitle = '';
        let rowTitle = '';
        let groupTitleL = '';
        let rowTitleL = '';
        let rowSubtitle = '';
        let maxRequired = 1;

        if (this._features.noiseTouchAndHoldNewVersion) {
            rowSubtitle = '';
            maxRequired = 1;
        } else {
            rowSubtitle = _('Select any two toggles');
            maxRequired = 2;
        }

        if (this._features.noiseControlModeDualSide) {
            if (this._features.advancedTouchIsPinch) {
                groupTitleL = _('Pinch and Hold Cycle for Left Earbud');
                rowTitleL = _('Pinch and hold cycles between modes (Left)');
                groupTitle = _('Pinch and Hold Cycle for Right Earbud');
                rowTitle = _('Pinch and hold cycles between modes (Right)');
            } else {
                groupTitleL = _('Touch and Hold Cycle for Left Earbud');
                rowTitleL = _('Touch and hold cycles between modes (Left)');
                groupTitle = _('Touch and Hold Cycle for Right Earbud');
                rowTitle = _('Touch and hold cycles between modes (Right)');
            }
        } else if (this._features.advancedTouchIsPinch) {
            groupTitle = _('Pinch and Hold Cycle');
            rowTitle = _('Pinch and hold cycles between modes');
        } else {
            groupTitle = _('Touch and Hold Cycle');
            rowTitle = _('Touch and hold cycles between modes');
        }

        if (this._features.noiseControlModeDualSide) {
            const ncCycleLeftGrp = new Adw.PreferencesGroup({title: groupTitleL});

            this._ncCycleLeft = new CheckBoxesRowWidget({
                rowTitle: rowTitleL,
                rowSubtitle,
                items,
                applyBtnName: _('Apply'),
                initialValue: this._settingsItems['nc-cycle-left'],
                minRequired: maxRequired,
            });

            this._ncCycleLeft.connect('notify::toggled-value', () => {
                this._updateGsettings('nc-cycle-left',
                    this._ncCycleLeft.toggled_value);
            });

            ncCycleLeftGrp.add(this._ncCycleLeft);
            this._page.add(ncCycleLeftGrp);
        }

        const ncCycleRightGrp = new Adw.PreferencesGroup({title: groupTitle});

        this._ncCycleRight = new CheckBoxesRowWidget({
            rowTitle,
            rowSubtitle,
            items,
            applyBtnName: _('Apply'),
            initialValue: this._settingsItems['nc-cycle-right'],
            minRequired: maxRequired,
        });

        this._ncCycleRight.connect('notify::toggled-value', () => {
            this._updateGsettings('nc-cycle-right',
                this._ncCycleRight.toggled_value);
        });

        ncCycleRightGrp.add(this._ncCycleRight);
        this._page.add(ncCycleRightGrp);
    }

    _addAdditionalSetting(_) {
        if (!this._features.ambientSidetone && !this._features.noiseControlsWithOneEarbud &&
                !this._features.doubleTapVolume && !this._features.ambientCustomize)
            return;

        const moreSettings = new Adw.PreferencesGroup({
            title: _('Additional Settings'),
        });
        this._page.add(moreSettings);

        if (this._features.ambientSidetone) {
            this._sideToneSwitch = new Adw.SwitchRow({
                title: _('Ambient Sound During Calls'),
            });

            this._sideToneSwitch.connect('notify::active', () => {
                this._updateGsettings('sidetone', this._sideToneSwitch.active);
            });

            moreSettings.add(this._sideToneSwitch);
        }

        if (this._features.noiseControlsWithOneEarbud) {
            this._noiseControlsOneEarbudSwitch = new Adw.SwitchRow({
                title: _('Noise Controls With One Earbud'),
            });

            this._noiseControlsOneEarbudSwitch.connect('notify::active', () => {
                this._updateGsettings('nc-one', this._noiseControlsOneEarbudSwitch.active);
            });

            moreSettings.add(this._noiseControlsOneEarbudSwitch);
        }

        if (this._features.doubleTapVolume) {
            this._outsideDoubleTapSwitch = new Adw.SwitchRow({
                title: _('Double Tap Outside Edge For Volume Controls'),
            });

            this._outsideDoubleTapSwitch.connect('notify::active', () => {
                this._updateGsettings('2tap-vol', this._outsideDoubleTapSwitch.active);
            });

            moreSettings.add(this._outsideDoubleTapSwitch);
        }
    }

    _addAmbientCustomization(_) {
        if (!this._features.ambientCustomize)
            return;

        const ambientCustomizeGroup = new Adw.PreferencesGroup({
            title: 'Customize Ambient Sound',
        });
        this._page.add(ambientCustomizeGroup);

        this._customAmbientSwitch = new Adw.SwitchRow({title: 'Customize Ambient Sound'});
        this._customAmbientSwitch.connect('notify::active', () => {
            this._updateGsettings('amb-enable', this._customAmbientSwitch.active);
        });

        ambientCustomizeGroup.add(this._customAmbientSwitch);

        const max = this._features.ambientCustomizeVolume;

        this._ambCustomLeft = new SliderRowWidget({
            rowTitle: _('Left Ambient Sound Volume'),
            rowSubtitle: '',
            initialValue: 16,
            marks: [
                {mark: 0, label: ''},
                {mark: max / 2, label: ''},
                {mark: max, label: ''},
            ],
            range: [0, max, 1],
            snapOnStep: true,
        });

        this._ambCustomLeft.connect('notify::value', () => {
            this._updateGsettings('amb-left', this._ambCustomLeft.value);
        });

        ambientCustomizeGroup.add(this._ambCustomLeft);

        this._ambCustomRight = new SliderRowWidget({
            rowTitle: _('Right Ambient Sound Volume'),
            rowSubtitle: '',
            initialValue: 16,
            marks: [
                {mark: 0, label: ''},
                {mark: max / 2, label: ''},
                {mark: max, label: ''},
            ],
            range: [0, max, 1],
            snapOnStep: true,
        });

        this._ambCustomRight.connect('notify::value', () => {
            this._updateGsettings('amb-right', this._ambCustomRight.value);
        });

        ambientCustomizeGroup.add(this._ambCustomRight);

        this._ambCustomTone = new SliderRowWidget({
            rowTitle: _('Ambient Sound Tone'),
            rowSubtitle: '',
            initialValue: 16,
            marks: [
                {mark: 0, label: ''},
                {mark: 2, label: ''},
                {mark: 4, label: ''},
            ],
            range: [0, 4, 1],
            snapOnStep: true,
        });

        this._ambCustomTone.connect('notify::value', () => {
            this._updateGsettings('amb-tone', this._ambCustomTone.value);
        });

        ambientCustomizeGroup.add(this._ambCustomTone);
    }
});
