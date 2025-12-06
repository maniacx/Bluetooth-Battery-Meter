'use strict';
import Adw from 'gi://Adw';
import GObject from 'gi://GObject';

import {
    supportedAudioSingleIcons, supportedAudioDualIcons, supportedCaseIcons
} from '../../../lib/widgets/iconGroups.js';
import {DropDownRowWidget} from './../../widgets/dropDownRowWidget.js';
import {SliderRowWidget} from './../../widgets/sliderRowWidget.js';
import {EqualizerWidget} from './../../widgets/equalizerWidget.js';
import {CheckBoxesGroupWidget} from './../../widgets/checkBoxesGroupWidget.js';
import {IconSelectorWidget} from './../../widgets/iconSelectorWidget.js';
import {
    SonyConfiguration, EqualizerPreset, ListeningMode, BgmDistance, ButtonModes, AutoPowerOffTime

} from '../../../lib/devices/sony/sonyConfig.js';

export const ConfigureWindow = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_SonyConfigureWindow',
}, class ConfigureWindow extends Adw.Window {
    _init(settings, mac, devicePath, parentWindow, _) {
        super._init({
            default_width: 650,
            default_height: 650,
            modal: true,
            transient_for: parentWindow ?? null,
        });

        this._settings = settings;
        this._devicePath = devicePath;

        const pathsString = settings.get_strv('sony-list').map(JSON.parse);
        this._settingsItems = pathsString.find(info => info.path === devicePath);
        this.title = this._settingsItems.alias;

        const modelData = SonyConfiguration.find(cfg => cfg.pattern.test(this._settingsItems.name));

        const toolViewBar = new Adw.ToolbarView();
        const headerBar = new Adw.HeaderBar({
            decoration_layout: 'icon:close',
            show_end_title_buttons: true,
        });
        const page = new Adw.PreferencesPage();

        toolViewBar.add_top_bar(headerBar);
        toolViewBar.set_content(page);
        this.set_content(toolViewBar);

        const aliasGroup = new Adw.PreferencesGroup({title: `MAC: ${mac}`});
        page.add(aliasGroup);

        const iconList = modelData.batteryDual ? supportedAudioDualIcons
            : supportedAudioSingleIcons;

        let caseIconList = [];
        let initialCaseIcon = '';
        if (modelData.batteryCase) {
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

        if (modelData.batteryCase) {
            iconSelector.connect('notify::selected-case-icon', () => {
                this._updateGsettings('case', iconSelector.selected_case_icon);
            });
        }

        page.add(iconSelector);

        if (modelData.speakToChatConfig) {
            const speak2ChatGroup = new Adw.PreferencesGroup({title: _('Conversation Awareness')});

            const sensitivityOptions = [_('Auto'), _('High'), _('Low')];
            const sensitivityValues = [0, 1, 2];
            this._sensitivityDropdown = new DropDownRowWidget({
                title: _('Voice Detection Sensitivity'),
                options: sensitivityOptions,
                values: sensitivityValues,
                initialValue: this._settingsItems['s2c-sensitivity'],
            });

            this._sensitivityDropdown.connect('notify::selected-item', () => {
                const val = this._sensitivityDropdown.selected_item;
                this._updateGsettings('s2c-sensitivity', val);
            });

            speak2ChatGroup.add(this._sensitivityDropdown);

            const durationOptions = [_('Short'), _('Standard'), _('Long'), _('Off')];
            const durationValues = [0, 1, 2, 3];
            this._durationDropdown = new DropDownRowWidget({
                title: _('Duration'),
                options: durationOptions,
                values: durationValues,
                initialValue: this._settingsItems['s2c-duration'],
            });

            this._durationDropdown.connect('notify::selected-item', () => {
                const val = this._durationDropdown.selected_item;
                this._updateGsettings('s2c-duration', val);
            });

            speak2ChatGroup.add(this._durationDropdown);
            page.add(speak2ChatGroup);
        }

        if (modelData.listeningMode) {
            const listeningModeGroup = new Adw.PreferencesGroup({
                title: _('Listening Mode'),
            });

            const listeningModes =  [
                _('Standard'),
                _('Background Music'),
                _('Cinema'),
            ];

            this._listeningModesValues = [
                ListeningMode.STANDARD,
                ListeningMode.BGM,
                ListeningMode.CINEMA,
            ];

            this._bgmModeDropdown = new DropDownRowWidget({
                title: _('Listening Mode'),
                options: listeningModes,
                values: this._listeningModesValues,
                initialValue: this._settingsItems['bgm-mode'],
            });

            this._bgmModeDropdown.connect('notify::selected-item', () => {
                const val = this._bgmModeDropdown.selected_item;
                this._updateGsettings('bgm-mode', val);
                this._updateMenuSensitivity();
            });

            listeningModeGroup.add(this._bgmModeDropdown);

            const bgmDistance =  [
                _('My Room'),
                _('Living Room'),
                _('Cafe'),
            ];

            this._bgmDistanceValues = [
                BgmDistance.MY_ROOM,
                BgmDistance.LIVING_ROOM,
                BgmDistance.CAFE,
            ];

            this._bgmDistanceDropdown = new DropDownRowWidget({
                title: _('Background Music Effects'),
                options: bgmDistance,
                values: this._bgmDistanceValues,
                initialValue: this._settingsItems['bgm-distance'],
            });

            this._updateMenuSensitivity();

            this._bgmDistanceDropdown.connect('notify::selected-item', () => {
                const val = this._bgmDistanceDropdown.selected_item;
                this._updateGsettings('bgm-distance', val);
            });

            listeningModeGroup.add(this._bgmDistanceDropdown);
            page.add(listeningModeGroup);
        }

        if (modelData.equalizerSixBands || modelData.equalizerTenBands) {
            const equalizerGroup = new Adw.PreferencesGroup({title: _('Equalizer')});

            const eqPresets =  [
                _('Off'),
                _('Bright'),
                _('Excited'),
                _('Mellow'),
                _('Relaxed'),
                _('Vocal'),
                _('Treble Boost'),
                _('Bass Boost'),
                _('Speech'),
                _('Manual'),
                _('Custom 1'),
                _('Custom 2'),
            ];

            this._eqPresetValues = [
                EqualizerPreset.OFF,
                EqualizerPreset.BRIGHT,
                EqualizerPreset.EXCITED,
                EqualizerPreset.MELLOW,
                EqualizerPreset.RELAXED,
                EqualizerPreset.VOCAL,
                EqualizerPreset.TREBLE_BOOST,
                EqualizerPreset.BASS_BOOST,
                EqualizerPreset.SPEECH,
                EqualizerPreset.MANUAL,
                EqualizerPreset.CUSTOM_1,
                EqualizerPreset.CUSTOM_2,
            ];

            this._eqPresetDropdown = new DropDownRowWidget({
                title: _('Equalizer Preset'),
                options: eqPresets,
                values: this._eqPresetValues,
                initialValue: this._settingsItems['eq-preset'],
            });

            this._eqPresetDropdown.connect('notify::selected-item', () => {
                this._updateGsettings('eq-preset', this._eqPresetDropdown.selected_item);
                this._updateEqCustomRowVisibility();
            });

            equalizerGroup.add(this._eqPresetDropdown);

            this._equalizerCustomRow = new Adw.ActionRow({title: _('Custom Equalizer')});

            const sixBandFreqs = [_('Bass'), _('400'), _('1k'), _('2.5k'), _('6.3k'), _('16k')];
            const tenBandFreqs = [_('31'), _('63'), _('125'), _('250'), _('500'),
                _('1k'), _('2k'), _('4k'), _('8k'), _('16k')];
            const freqs = modelData.equalizerTenBands ? tenBandFreqs : sixBandFreqs;
            const range = modelData.equalizerTenBands ? 6 : 10;
            const initialValues = this._settingsItems['eq-custom'];

            this._eq = new EqualizerWidget(freqs, initialValues, range);

            this._eq.connect('eq-changed', (_w, arr) => {
                this._updateGsettings('eq-custom', arr);
            });

            this._equalizerCustomRow.set_child(this._eq);
            this._updateEqCustomRowVisibility();
            equalizerGroup.add(this._equalizerCustomRow);
            page.add(equalizerGroup);
        }

        if (modelData.audioUpsampling) {
            const upscalingGrp = new Adw.PreferencesGroup({title: 'Button/Touch Settings'});
            page.add(upscalingGrp);

            this._upscalingSwitchRow = new DropDownRowWidget({
                title: _('Enable DSEE enhancement'),
                options: [_('Auto'), _('Off')],
                values: [1, 0],
                initialValue: this._settingsItems['dsee'],
            });

            this._upscalingSwitchRow.connect('notify::selected-item', () => {
                const val = this._upscalingSwitchRow.selected_item;
                this._updateGsettings('dsee', val);
            });
            upscalingGrp.add(this._upscalingSwitchRow);
        }

        if (modelData.buttonModesLeftRight || modelData.ambientSoundControlButtonMode) {
            this._btnTchGroup = new Adw.PreferencesGroup({title: 'Button/Touch Settings'});
            page.add(this._btnTchGroup);
        }

        if (modelData.buttonModesLeftRight) {
            const buttonModeMap = {
                amb: [_('Ambient Sound Control'), ButtonModes.AMBIENT_SOUND_CONTROL],
                ambqa: [_('Ambient Sound Control / Quick Access'),
                    ButtonModes.AMBIENT_SOUND_CONTROL_QA],
                pb: [_('Playback Control'), ButtonModes.PLAYBACK_CONTROL],
                pbwl: [_('Playback Control'), ButtonModes.PLAYBACK_CONTROL_W_LIMITATION],
                vol: [_('Volume Control'), ButtonModes.VOLUME_CONTROL],
                na: [_('Not Assigned'), ButtonModes.NO_FUNCTION],
            };

            const options = [];
            const values = [];

            for (const key of modelData.buttonModesLeftRight) {
                const entry = buttonModeMap[key];
                if (!entry)
                    continue;
                const [label, value] = entry;
                options.push(label);
                values.push(value);
            }

            this._leftBtnTchDropdown = new DropDownRowWidget({
                title: _('Left Bud'),
                options,
                values,
                initialValue: this._settingsItems['btn-left'],
            });

            this._leftBtnTchDropdown.connect('notify::selected-item', () => {
                const val = this._leftBtnTchDropdown.selected_item;
                this._updateGsettings('btn-left', val);
            });

            this._btnTchGroup.add(this._leftBtnTchDropdown);

            this._rightBtnTchDropdown = new DropDownRowWidget({
                title: _('Right Bud'),
                options,
                values,
                initialValue: this._settingsItems['btn-right'],
            });

            this._rightBtnTchDropdown.connect('notify::selected-item', () => {
                const val = this._rightBtnTchDropdown.selected_item;
                this._updateGsettings('btn-right', val);
            });

            this._btnTchGroup.add(this._rightBtnTchDropdown);
        }


        if (modelData.ambientSoundControlButtonMode) {
            const items = [
                {name: _('Noise Cancellation'), icon: 'bbm-anc-on-symbolic'},
                {name: _('Ambient'), icon: 'bbm-transperancy-symbolic'},
                {name: _('Off'), icon: 'bbm-anc-off-symbolic'},
            ];

            this._ancToggleButtonWidget = new CheckBoxesGroupWidget({
                groupTitle: _('ANC Button Configuration'),
                rowTitle: _('[NC/AMB] Button Settings'),
                rowSubtitle: _('Select the modes to toggle when the button is pressed'),
                items,
                applyBtnName: _('Apply'),
                initialValue: this._settingsItems['amb-btn-mode'],
            });

            this._ancToggleButtonWidget.connect('notify::toggled-value', () => {
                const val = this._ancToggleButtonWidget.toggled_value;
                this._updateGsettings('amb-btn-mode', val);
            });

            this._btnTchGroup.add(this._ancToggleButtonWidget);
        }

        if (modelData.voiceNotifications) {
            const voiceNotificationsGroup = new Adw.PreferencesGroup({
                title: _('Notification'),
            });

            this._voiceNotificationsSwitchRow = new Adw.SwitchRow({
                title: _('Voice Notification'),
                subtitle: _('Enable voice notification'),
            });

            this._voiceNotificationsSwitchRow.active = this._settingsItems['voice-noti'];

            this._voiceNotificationsSwitchRow.connect('notify::active', () => {
                this._updateGsettings('voice-noti', this._voiceNotificationsSwitchRow.active);
                if (this._voiceNotificationsVolume) {
                    this._voiceNotificationsVolume.sensitive =
                        this._voiceNotificationsSwitchRow.active;
                }
            });

            voiceNotificationsGroup.add(this._voiceNotificationsSwitchRow);
            page.add(voiceNotificationsGroup);

            if (modelData.voiceNotificationsVolume) {
                this._voiceNotificationsVolume = new SliderRowWidget({
                    rowTitle: _('Voice Notification Volume'),
                    marks: [
                        {mark: -2, label: _('-2')},
                        {mark: -1, label: _('-1')},
                        {mark: 0, label: _('0')},
                        {mark: 1, label: _('+1')},
                        {mark: 2, label: _('+2')},
                    ],
                    initialValue: this._settingsItems['voice-vol'],
                    range: [-2, 2, 1],
                    snapOnStep: true,
                });

                this._voiceNotificationsVolume.sensitive = this._voiceNotificationsSwitchRow.active;
                this._voiceNotificationsVolume.connect('notify::value', () => {
                    this._updateGsettings('voice-vol', this._voiceNotificationsVolume.value);
                });
                voiceNotificationsGroup.add(this._voiceNotificationsVolume);
            }
        }

        if (modelData.pauseWhenTakenOff || modelData.automaticPowerOffWhenTakenOff) {
            this._headsetTakenOffGroup = new Adw.PreferencesGroup({
                title: _('Headset Take off'),
            });
            page.add(this._headsetTakenOffGroup);
        }

        if (modelData.pauseWhenTakenOff) {
            this._pauseWhenTakenOff = new Adw.SwitchRow({
                title: _('Pause when taken off'),
            });

            this._pauseWhenTakenOff.connect('notify::active', () => {
                this._updateGsettings('pause-takeoff', this._pauseWhenTakenOff.active);
            });

            this._pauseWhenTakenOff.active = this._settingsItems['pause-takeoff'];

            this._headsetTakenOffGroup.add(this._pauseWhenTakenOff);
        }

        if (modelData.automaticPowerOffWhenTakenOff) {
            this._autoPowerOffSwitch = new Adw.SwitchRow({
                title: _('Automatically Power Off'),
                subtitle: _('Automatically power off when not worn.'),
            });

            this._autoPowerOffSwitch.connect('notify::active', () => {
                this._updateGsettings('auto-power', this._autoPowerOffSwitch.active);
                if (this._autoPowerOffDropdown)
                    this._autoPowerOffDropdown.sensitive = this._autoPowerOffSwitch.active;
            });

            this._autoPowerOffSwitch.active = this._settingsItems['auto-power'];

            this._headsetTakenOffGroup.add(this._autoPowerOffSwitch);

            if (modelData.automaticPowerOffByTime) {
                this._autoPowerOffLabels = [
                    _('After 5 minutes'),
                    _('After 15 minutes'),
                    _('After 30 minutes'),
                    _('After 1 hour'),
                    _('After 3 hours'),
                ];

                this._autoPowerOffValues = [
                    AutoPowerOffTime.AFTER_5_MIN,
                    AutoPowerOffTime.AFTER_15_MIN,
                    AutoPowerOffTime.AFTER_30_MIN,
                    AutoPowerOffTime.AFTER_1_HOUR,
                    AutoPowerOffTime.AFTER_3_HOUR,
                ];

                this._autoPowerOffDropdown = new DropDownRowWidget({
                    title: _('Auto Power Off'),
                    options: this._autoPowerOffLabels,
                    values: this._autoPowerOffValues,
                    initialValue: this._settingsItems['auto-power-time'],
                });

                this._autoPowerOffDropdown.sensitive = this._autoPowerOffSwitch.active;
                this._autoPowerOffDropdown.connect('notify::selected-item', () => {
                    const selectedVal = this._autoPowerOffDropdown.selected_item;
                    this._updateGsettings('auto-power-time', selectedVal);
                });
                this._headsetTakenOffGroup.add(this._autoPowerOffDropdown);
            }
        }

        settings.connect('changed::sony-list', () => {
            const updatedList = settings.get_strv('sony-list').map(JSON.parse);
            this._settingsItems = updatedList.find(info => info.path === devicePath);
            this.title = this._settingsItems.alias;

            if (modelData.speakToChatConfig) {
                this._sensitivityDropdown.selected_item = this._settingsItems['s2c-sensitivity'];
                this._durationDropdown.selected_item = this._settingsItems['s2c-duration'];
            }

            if (modelData.listeningMode) {
                this._bgmModeDropdown.selected_item = this._settingsItems['bgm-mode'];
                this._bgmDistanceDropdown.selected_item = this._settingsItems['bgm-distance'];
                this._updateMenuSensitivity();
            }

            if (modelData.equalizerSixBands || modelData.equalizerTenBands)  {
                this._eqPresetDropdown.selected_item = this._settingsItems['eq-preset'];
                this._eq.setValues(this._settingsItems['eq-custom']);
                this._updateEqCustomRowVisibility();
            }

            if (modelData.audioUpsampling)
                this._upscalingSwitchRow.selected_item = this._settingsItems['dsee'];


            if (modelData.buttonModesLeftRight) {
                this._leftBtnTchDropdown.selected_item = this._settingsItems['btn-left'];
                this._rightBtnTchDropdown.selected_item = this._settingsItems['btn-right'];
            }

            if (modelData.ambientSoundControlButtonMode)
                this._ancToggleButtonWidget.toggled_value = this._settingsItems['amb-btn-mode'];

            if (modelData.voiceNotifications)
                this._voiceNotificationsSwitchRow.active = this._settingsItems['voice-noti'];

            if (modelData.voiceNotificationsVolume)
                this._voiceNotificationsVolume.value = this._settingsItems['voice-vol'];

            if (modelData.pauseWhenTakenOff)
                this._pauseWhenTakenOff.active = this._settingsItems['pause-takeoff'];

            if (modelData.automaticPowerOffWhenTakenOff)
                this._autoPowerOffSwitch.active = this._settingsItems['auto-power'];

            if (modelData.automaticPowerOffByTime)
                this._autoPowerOffDropdown.selected_item = this._settingsItems['auto-power-time'];
        });
    }

    _updateGsettings(key, value) {
        const pairedDevice = this._settings.get_strv('sony-list');
        const existingPathIndex =
                pairedDevice.findIndex(item => JSON.parse(item).path === this._devicePath);
        if (existingPathIndex !== -1) {
            const existingItem = JSON.parse(pairedDevice[existingPathIndex]);
            existingItem[key] = value;
            pairedDevice[existingPathIndex] = JSON.stringify(existingItem);
            this._settings.set_strv('sony-list', pairedDevice);
        }
    }

    _updateMenuSensitivity()  {
        if (!this._bgmModeDropdown || !this._bgmDistanceDropdown)
            return;

        const isBGMMode = this._bgmModeDropdown.selected_item === ListeningMode.BGM;
        this._bgmDistanceDropdown.sensitive = isBGMMode;

        const isStdMode = this._bgmModeDropdown.selected_item === ListeningMode.STANDARD;

        if (this._eqPresetDropdown)
            this._eqPresetDropdown.sensitive = isStdMode;

        if (this._equalizerCustomRow)
            this._equalizerCustomRow.sensitive = isStdMode;
    }

    _updateEqCustomRowVisibility() {
        if (!this._equalizerCustomRow)
            return;

        const val = this._eqPresetDropdown.selected_item;

        this._equalizerCustomRow.visible = [
            EqualizerPreset.MANUAL,
            EqualizerPreset.CUSTOM_1,
            EqualizerPreset.CUSTOM_2,
        ].includes(val);
    };
});
