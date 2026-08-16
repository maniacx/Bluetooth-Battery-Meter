'use strict';
import Adw from 'gi://Adw';
import GObject from 'gi://GObject';

import {
    supportedAudioSingleIcons, supportedAudioDualIcons, supportedCaseIcons
} from '../../../lib/widgets/iconGroups.js';
import {DropDownRowWidget} from './../../widgets/dropDownRowWidget.js';
import {SliderRowWidget} from './../../widgets/sliderRowWidget.js';
import {IconSelectorWidget} from './../../widgets/iconSelectorWidget.js';
import {RadioButtonRowWidget} from './../../widgets/radioButtonRowWidget.js';
import {EqualizerWidget} from './../../widgets/equalizerWidget.js';
import {ParametricEqRowWidget} from './../../widgets/peqRowWidget.js';
import {DeviceManagementRow} from './../../widgets/deviceMgmtRowWidget.js';
import {SenhBudsModelList} from '../../../lib/devices/senhBuds/senhBudsConfig.js';

export const ConfigureWindow = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_SenhBudsConfigureWindow',
}, class ConfigureWindow extends Adw.Window {
    _init(settings, mac, devicePath, parentWindow, _, modal = false) {
        super._init({
            default_width: 650,
            default_height: 650,
            width_request: 320,
            height_request: 100,
            modal,
            transient_for: parentWindow ?? null,
        });

        this._isCompactMode = false;

        this._breakpointCompact = new Adw.Breakpoint({
            condition: Adw.BreakpointCondition.parse('max-width: 500px'),
        });

        this._breakpointExpanded = new Adw.Breakpoint({
            condition: Adw.BreakpointCondition.parse('min-width: 550px'),
        });

        this.add_breakpoint(this._breakpointCompact);
        this.add_breakpoint(this._breakpointExpanded);

        this._breakpointCompact.connect('apply', () => {
            this._isCompactMode = true;
            this._updateCompactStatus();
        });

        this._breakpointExpanded.connect('apply', () => {
            this._isCompactMode = false;
            this._updateCompactStatus();
        });

        this._settings = settings;
        this._devicePath = devicePath;
        this._gettext = _;

        const pathsString = settings.get_strv('senh-buds-list').map(JSON.parse);
        this._settingsItems = pathsString.find(info => info.path === devicePath);

        if (!this._settingsItems)
            return;

        this.title = this._settingsItems.alias;

        const modelId = this._settingsItems.modelId;

        this._modelData = SenhBudsModelList.find(model => model.id?.includes(modelId));

        if (!this._modelData)
            return;

        const toolViewBar = new Adw.ToolbarView();
        const headerBar = new Adw.HeaderBar({
            decoration_layout: ':close',
            show_end_title_buttons: true,
        });
        this._page = new Adw.PreferencesPage();

        toolViewBar.add_top_bar(headerBar);
        toolViewBar.set_content(this._page);
        this.set_content(toolViewBar);

        const iconList = this._modelData.batteryMultiple ? supportedAudioDualIcons
            : supportedAudioSingleIcons;

        let caseIconList = [];
        let initialCaseIcon = '';
        if (this._modelData.batteryCase) {
            caseIconList = supportedCaseIcons;
            initialCaseIcon = this._settingsItems['case'];
        }

        const iconSelector = new IconSelectorWidget({
            gtxt: _,
            grpTitle: _('Icon'),
            rowTitle: _('Select Icon'),
            rowSubtitle: _('Select the icon used for the indicator and quick menu'),
            iconList,
            initialIcon: this._settingsItems['icon'],
            caseIconList,
            initialCaseIcon,
            mac,
            fw: this._settingsItems['fw-version'],
            serial: this._settingsItems['serial'],
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

        this._addSoundSettings();
        this._addCallsSetting();
        this._addInEarSettings();
        this._addDevMgmtSetting();

        const settingSignalId = this._settings.connect('changed::senh-buds-list', () => {
            const updatedList = this._settings.get_strv('senh-buds-list').map(JSON.parse);
            this._settingsItems = updatedList.find(info => info.path === devicePath);

            if (!this._settingsItems)
                return;

            this.title = this._settingsItems.alias;

            if (this._audioModeDropdown)
                this._audioModeDropdown.selected_item = this._settingsItems['audio-mode'];

            if (this._eqPresetDropdown)
                this._eqPresetDropdown.selected_item = this._settingsItems['eq-preset'];

            if (this._modelData.eq?.custom !== undefined)
                this._eq.setValues(this._settingsItems['eq-custom']);

            if (this._bassBoostSwitch)
                this._bassBoostSwitch.active = this._settingsItems['bass-boost'];

            if (this._peqRow?.dialog)
                this._updatePeqParams();

            if (this._crossfeedDropdown)
                this._crossfeedDropdown.selected_item = this._settingsItems['crossfeed'];

            if (this._inEarDetectionSwitch)
                this._inEarDetectionSwitch.active = this._settingsItems['in-ear-setting'];

            if (this._smartPauseSwitch)
                this._smartPauseSwitch.active = this._settingsItems['smart-pause'];

            if (this._autoAnswerSwitch)
                this._autoAnswerSwitch.active = this._settingsItems['autoanswer'];

            if (this._transPauseSwitch)
                this._transPauseSwitch.active = this._settingsItems['trans-pause'];

            if (this._autoPowerOffDropdown)
                this._autoPowerOffDropdown.selected_item = this._settingsItems['auto-power'];

            if (this._sideToneSlider)
                this._sideToneSlider.value = this._settingsItems['side-tone'];

            if (this._comfortCallsSwitch)
                this._comfortCallsSwitch.active = this._settingsItems['comfort-call'];

            if (this._dualConnSwitch) {
                const deviceInfo = this._settingsItems['dev-mgmt'];
                this._dualConnSwitch?.updateDevices(deviceInfo);
                const ownDevice = this._settingsItems['own-dev'];
                this._dualConnSwitch?.updateOwnDevice(ownDevice);
            }

            this._updateInEarSensitivity();
            this._updateSoundVisibility();
        });

        this.connect('close-request', () => {
            this._eq?.destroy();
            this._eq = null;

            this._peqRow?.destroy();
            this._peqRow = null;

            if (this._modelData.ring) {
                const ringState = this._settingsItems?.['ring-state'];
                if (ringState === 'playing')
                    this._updateGsettings('ring-state', 'stopped');
            }

            if (settingSignalId && this._settings)
                this._settings.disconnect(settingSignalId);

            this._settings = null;

            return false;
        });
    }

    _updateGsettings(key, value) {
        const pairedDevice = this._settings.get_strv('senh-buds-list');
        const existingPathIndex =
                pairedDevice.findIndex(item => JSON.parse(item).path === this._devicePath);
        if (existingPathIndex !== -1) {
            const existingItem = JSON.parse(pairedDevice[existingPathIndex]);
            existingItem[key] = value;
            pairedDevice[existingPathIndex] = JSON.stringify(existingItem);
            this._settings.set_strv('senh-buds-list', pairedDevice);
        }
    }

    _addSoundSettings() {
        if (!this._modelData.audioMode && !this._modelData.eq)
            return;

        const _ = this._gettext;

        const eqGroup = new Adw.PreferencesGroup({title: _('Sound Settings')});
        this._page.add(eqGroup);

        if (this._modelData.audioMode) {
            const audioModeObj = this._modelData.audioMode;

            const audioModeLabels = {
                off: _('Off'),
                eq: _('Equalizer'),
                podcast: _('Podcast'),
                personalized: _('Sound personalization'),
                peq: _('Parametric Equalizer'),
            };

            const audioModeDesc = Object.keys(audioModeObj)
                .filter(key => audioModeLabels[key] !== undefined)
                .map(key => ({label: audioModeLabels[key], value: audioModeObj[key]}));

            const audioModeOptions = audioModeDesc.map(d => d.label);
            const audioModeValues  = audioModeDesc.map(d => d.value);

            this._audioModeDropdown = new DropDownRowWidget({
                title: _('Audio Mode'),
                options: audioModeOptions,
                values: audioModeValues,
                initialValue: this._settingsItems['audio-mode'],
            });

            this._audioModeDropdown.connect('notify::selected-item', () => {
                this._updateGsettings('audio-mode', this._audioModeDropdown.selected_item);
                this._updateSoundVisibility();
            });

            eqGroup.add(this._audioModeDropdown);
        }

        if (this._modelData.eq) {
            const presetOptions = [];
            const presetValues = [];

            const getPresetLabel = name => {
                const labels = {
                    flat: _('Flat'),
                    rock: _('Rock'),
                    pop: _('Pop'),
                    dance: _('Dance'),
                    hipHop: _('Hip Hop'),
                    classical: _('Classical'),
                    movie: _('Movie'),
                    jazz: _('Jazz'),
                };

                return labels[name] ?? name;
            };

            for (const presetName of Object.keys(this._modelData.eq.presets)) {
                presetOptions.push(getPresetLabel(presetName));
                presetValues.push(presetName);
            }

            let customEqButton = {};
            if (this._modelData.eq?.custom) {
                presetOptions.push(_('Custom'));
                presetValues.push('custom');

                customEqButton =  {
                    hasButton: true,
                    buttonIcon: 'bbm-eq-symbolic',
                    buttonTooltip: _('Custom Equalizer'),
                };
            }

            this._eqPresetDropdown = new DropDownRowWidget({
                title: _('Equalizer Preset'),
                options: presetOptions,
                values: presetValues,
                initialValue: this._settingsItems['eq-preset'],
                ...customEqButton,
            });

            eqGroup.add(this._eqPresetDropdown);

            const freqLabels = {
                50: _('50'),
                63: _('63'),
                125: _('125'),
                250: _('250'),
                400: _('400'),
                500: _('500'),
                800: _('800'),
                1000: _('1k'),
                2000: _('2k'),
                2500: _('2.5k'),
                3000: _('3k'),
                4000: _('4k'),
                6300: _('6.3k'),
                7000: _('7k'),
                8000: _('8k'),
                12000: _('12k'),
                16000: _('16k'),
            };

            const freqs = this._modelData.eq.displayedBand.map(
                freq => freqLabels[freq] ?? `${freq}`
            );

            const range = this._modelData.eq.range;

            const initialValues = this._settingsItems['eq-custom'];

            this._eq = new EqualizerWidget({
                freqs,
                initialValues,
                range,
                step: 0.1,
                digits: 1,
                topBarTitle: _('Frequency (Hz)'),
                bottomBarTitle: _('Gain (dB)'),
            });

            this._eq.connect('eq-changed', (_w, arr) => {
                this._eqPresetDropdown.selected_item = 'custom';
                this._updateGsettings('eq-custom', arr);
            });

            this._eqPresetDropdown.connect('notify::selected-item', () => {
                const preset = this._eqPresetDropdown.selected_item;
                this._updateGsettings('eq-preset', preset);
                if (preset === 'custom')
                    return;

                const eqValues = this._modelData.eq?.presets?.[preset];
                if (eqValues) {
                    this._updateGsettings('eq-custom', eqValues);
                    this._eq.setValues(eqValues);
                }
            });

            this._eqPresetDropdown.connect('button-clicked', () => {
                this._eq.present(this);
            });
        }

        if (this._modelData.eq?.bassBoost) {
            this._bassBoostSwitch = new Adw.SwitchRow({title: _('Enable Bass Boost')});

            this._bassBoostSwitch.active = this._settingsItems['bass-boost'];

            this._bassBoostSwitch.connect('notify::active', () => {
                this._updateGsettings('bass-boost', this._bassBoostSwitch.active);
            });

            eqGroup.add(this._bassBoostSwitch);
        }

        if (this._modelData.peq) {
            const peqCfg = this._modelData.peq;
            this._peqRow = new ParametricEqRowWidget(this, this._gettext, peqCfg);

            this._updatePeqParams(true);

            this._peqRow.dialog.connect('peq-changed', (_dialog, peqState) => {
                const peqBands = this._settingsItems['peq-bands'];

                for (let i = 0; i < peqState.bands.length; i++) {
                    const src = peqState.bands[i];

                    peqBands[i].freq = src.frequency;
                    peqBands[i].gain = src.gain;
                    peqBands[i].q = src.q;
                    peqBands[i].filter = src.filter;
                    peqBands[i].bypass = src.bypass;
                }

                this._peqBands = peqBands.map(b => ({...b}));

                this._updateGsettings('peq-bands', peqBands);
            });

            this._peqRow.dialog.connect('band-removed', (_dialog, index) => {
                const bands = this._settingsItems['peq-bands'];

                for (let i = index; i < bands.length; i++) {
                    bands[i].gain = 0;
                    bands[i].filter = 'bell';
                    bands[i].bypass = false;
                }

                this._peqBands = bands.map(b => ({...b}));

                this._updateGsettings('peq-bands', bands);
            });

            this._peqRow.dialog.connect('band-removed', (_dialog, index) => {
                const peqBands = this._settingsItems['peq-bands'];

                for (let i = index; i < peqBands.length; i++) {
                    peqBands[i].gain = 0;
                    peqBands[i].filter = 'bell';
                    peqBands[i].bypass = false;
                }

                this._peqBands = peqBands.map(b => ({...b}));

                this._updateGsettings('peq-bands', peqBands);
            });

            this._peqRow.dialog.connect('preamp-changed', (_dialog, value) => {
                this._updateGsettings('pre-gain', value);
            });

            eqGroup.add(this._peqRow);
        }

        if (this._modelData.crossfeed) {
            const crossfeedObj = this._modelData.crossfeed;

            const crossfeedLabels = {
                off: _('Off'),
                low: _('Low'),
                high: _('High'),
            };

            const crossfeedDesc = Object.keys(crossfeedObj)
                .filter(key => crossfeedLabels[key] !== undefined)
                .map(key => ({label: crossfeedLabels[key], value: crossfeedObj[key]}));

            const crossfeedOptions = crossfeedDesc.map(d => d.label);
            const crossfeedValues = crossfeedDesc.map(d => d.value);

            this._crossfeedDropdown = new DropDownRowWidget({
                title: _('Crossfeed'),
                options: crossfeedOptions,
                values: crossfeedValues,
                initialValue: this._settingsItems['crossfeed'],
            });

            this._crossfeedDropdown.connect('notify::selected-item', () => {
                this._updateGsettings('crossfeed', this._crossfeedDropdown.selected_item);
            });

            eqGroup.add(this._crossfeedDropdown);
        }

        this._updateSoundVisibility();
    }

    _updatePeqParams(isInit = false) {
        if (!this._peqRow?.dialog)
            return;

        const peqBands = this._settingsItems['peq-bands'];
        if (isInit) {
            let lastUsed = -1;

            for (let i = peqBands.length - 1; i >= 0; i--) {
                if (peqBands[i].gain !== 0) {
                    lastUsed = i;
                    break;
                }
            }

            if (lastUsed < 0)
                lastUsed = 0;

            for (let i = 0; i <= lastUsed; i++) {
                this._peqRow.dialog.addBand({
                    frequency: peqBands[i].freq,
                    gain: peqBands[i].gain,
                    q: peqBands[i].q,
                    filter: peqBands[i].filter,
                    bypass: peqBands[i].bypass,
                });
            }
            this._peqBands = peqBands.map(b => ({...b}));
        } else {
            for (let i = 0; i < peqBands.length; i++) {
                const oldBand = this._peqBands?.[i];
                const newBand = peqBands[i];

                if (!oldBand || !newBand)
                    continue;

                const params = {};

                if (oldBand.freq !== newBand.freq)
                    params.frequency = newBand.freq;

                if (oldBand.gain !== newBand.gain)
                    params.gain = newBand.gain;

                if (oldBand.q !== newBand.q)
                    params.q = newBand.q;

                if (oldBand.filter !== newBand.filter)
                    params.filter = newBand.filter;

                if (oldBand.bypass !== newBand.bypass)
                    params.bypass = newBand.bypass;

                if (Object.keys(params).length > 0)
                    this._peqRow.dialog.updateBand(i, params);
            }

            this._peqBands = peqBands.map(b => ({...b}));
        }
        this._peqRow.dialog.preAmpValue = this._settingsItems['pre-gain'];
    }

    _updateSoundVisibility() {
        if (!this._audioModeDropdown)
            return;

        const mode = this._audioModeDropdown.selected_item;

        if (this._modelData.eq) {
            const eqMode = this._modelData.audioMode.eq;
            this._eqPresetDropdown.visible = mode === eqMode;

            if (this._modelData.eq?.bassBoost)
                this._bassBoostSwitch.visible = mode === eqMode;
        }

        if (this._modelData.peq) {
            const peqMode = this._modelData.audioMode.peq;
            this._peqRow.visible = mode === peqMode;
        }
    }

    _addInEarSettings() {
        const _ = this._gettext;

        if (!this._modelData.inEarDetection && !this._modelData.transPause &&
                !this._modelData.smartPause && !this._modelData.autoAnswer &&
                !this._modelData.autoPowerOff)
            return;

        const groupTitle = this._modelData.earbuds ? _('In Ear Settings') : _('On Head Settings');
        const inEarGroup = new Adw.PreferencesGroup({title: groupTitle});
        this._page.add(inEarGroup);

        if (this._modelData.inEarDetection) {
            const inEarTitle = this._modelData.earbuds ? _('Enable In-Ear Detection')
                : _('Enable On Head Detection');
            this._inEarDetectionSwitch = new Adw.SwitchRow({title: inEarTitle});
            this._inEarDetectionSwitch.active = this._settingsItems['in-ear-setting'];
            this._inEarDetectionSwitch.connect('notify::active', () => {
                this._updateGsettings('in-ear-setting', this._inEarDetectionSwitch.active);
                this._updateInEarSensitivity();
            });

            inEarGroup.add(this._inEarDetectionSwitch);
        }

        if (this._modelData.smartPause) {
            this._smartPauseSwitch = new Adw.SwitchRow({
                title: _('Pause Media When Not Worn'),
                subtitle: _('Playback controlled by the OEM app'),
            });
            this._smartPauseSwitch.active = this._settingsItems['smart-pause'];
            this._smartPauseSwitch.connect('notify::active', () => {
                this._updateGsettings('smart-pause', this._smartPauseSwitch.active);
            });

            inEarGroup.add(this._smartPauseSwitch);
        }

        if (this._modelData.autoAnswer) {
            this._autoAnswerSwitch =
                new Adw.SwitchRow({title: _('Automatically Answer Calls When Worn')});

            this._autoAnswerSwitch.active = this._settingsItems['autoanswer'];
            this._autoAnswerSwitch.connect('notify::active', () => {
                this._updateGsettings('autoanswer', this._autoAnswerSwitch.active);
            });

            inEarGroup.add(this._autoAnswerSwitch);
        }

        if (this._modelData.transPause) {
            this._transPauseSwitch =
                new Adw.SwitchRow({title: _('Pause Media When Transparency Mode Is Enabled')});

            this._transPauseSwitch.active = this._settingsItems['trans-pause'];
            this._transPauseSwitch.connect('notify::active', () => {
                this._updateGsettings('trans-pause', this._transPauseSwitch.active);
            });

            inEarGroup.add(this._transPauseSwitch);
        }

        if (this._modelData.autoPowerOff) {
            const autoPowerOffLabelsMap = {
                0: _('Never'),
                15: _('After 15 minutes'),
                30: _('After 30 minutes'),
                60: _('After 1 hour'),
            };

            const options = this._modelData.autoPowerOff.map(v => {
                return autoPowerOffLabelsMap[v] ?? String(v);
            });

            this._autoPowerOffDropdown = new DropDownRowWidget({
                title: _('Automatically Power Off When Not Worn'),
                options,
                values: this._modelData.autoPowerOff,
                initialValue: this._settingsItems['auto-power'],
            });

            this._autoPowerOffDropdown.connect('notify::selected-item', () => {
                this._updateGsettings('auto-power', this._autoPowerOffDropdown.selected_item);
            });

            inEarGroup.add(this._autoPowerOffDropdown);
        }

        if (this._modelData.inEarDetection) {
            const inEarSettingsGroup = new Adw.PreferencesGroup({
                title: _('Playback Behavior'),
                description: _('Playback controlled by the BudsLink'),
            });

            const inEarOptions = this._modelData.type === 'earbuds' ? [
                _('Default behavior'),
                _('Resume with both earbuds, Pause if any removed'),
                _('Resume with any earbud, Pause if both removed'),
            ] : [
                _('Default behavior'),
                _('Resume when worn'),
            ];

            const inEarTitle = this._modelData.type === 'earbuds'
                ? _('Choose playback behavior for in-ear detection')
                : _('Choose playback behavior for on-head detection');

            this._inEarDropdown = new RadioButtonRowWidget({
                title: inEarTitle,
                subtitle: _('Automatically pause or resume playback ' +
                'based on wearing detection.'),
                options: inEarOptions,
                initialValue: this._settingsItems['wear-detection-mode'],
            });

            this._inEarDropdown.connect('notify::toggled-value', () => {
                this._updateGsettings('wear-detection-mode', this._inEarDropdown.toggled_value);
            });

            inEarSettingsGroup.add(this._inEarDropdown);

            this._page.add(inEarSettingsGroup);
        }

        this._updateInEarSensitivity();
    }

    _updateInEarSensitivity() {
        const sensitive = this._inEarDetectionSwitch?.active ?? true;

        this._smartPauseSwitch?.set_sensitive(sensitive);
        this._autoAnswerSwitch?.set_sensitive(sensitive);
        this._transPauseSwitch?.set_sensitive(sensitive);
        this._autoPowerOffDropdown?.set_sensitive(sensitive);
        this._inEarDropdown?.set_sensitive(sensitive);
    }

    _addCallsSetting() {
        const _ = this._gettext;

        if (!this._modelData.sideTone && !this._modelData.comfortCalls)
            return;

        const callGroup = new Adw.PreferencesGroup({title: _('Calls Settings')});
        this._page.add(callGroup);

        if (this._modelData.sideTone) {
            const maxLevel = this._modelData.sideTone - 1;

            const marks = [];

            for (let i = 0; i <= maxLevel; i++)
                marks.push({mark: i, label: i === 0 ? _('Off') : String(i)});

            this._sideToneSlider = new SliderRowWidget({
                rowTitle: _('Ambient Sound During Calls'),
                range: [0, maxLevel, 1],
                marks,
                initialValue: this._settingsItems['side-tone'],
                snapOnStep: true,
            });

            this._sideToneSlider.compact_mode = this._isCompactMode;

            this._sideToneSlider.connect('notify::value', () => {
                this._updateGsettings('side-tone', this._sideToneSlider.value);
            });

            callGroup.add(this._sideToneSlider);
        }

        if (this._modelData.comfortCalls) {
            this._comfortCallsSwitch = new Adw.SwitchRow({title: _('Comfort Calls')});
            this._comfortCallsSwitch.active = this._settingsItems['comfort-call'];
            this._comfortCallsSwitch.connect('notify::active', () => {
                this._updateGsettings('comfort-call', this._comfortCallsSwitch.active);
            });
            callGroup.add(this._comfortCallsSwitch);
        }
    }

    _addDevMgmtSetting() {
        if (!this._modelData.dualConnection)
            return;

        const _ = this._gettext;

        const devMgmtGroup = new Adw.PreferencesGroup({title: _('Connection Management')});
        this._page.add(devMgmtGroup);

        const deviceInfo = this._settingsItems['dev-mgmt'];
        const maxConnected = this._settingsItems['max-dev'];
        const ownDevice = this._settingsItems['own-dev'];

        const deviceManagementConfig = {
            maxConnected,
            hasMultipointSwitch: false,
            hasPairMode: false,
            hasRoutingIndicator: false,
            hasRoutingControl: false,
            hasActiveFix: false,
            showMac: false,
        };

        this._dualConnSwitch = new DeviceManagementRow(this, this._gettext, deviceInfo,
            ownDevice, '', deviceManagementConfig);

        const actionData = this._settingsItems['dev-mgmt-action'];
        this._seq = actionData?.seq ?? 0;

        this._dualConnSwitch.connect('device-action', (_row, action, id) => {
            const data = {seq: this._seq ^= 1, action, id};
            this._updateGsettings('dev-mgmt-action', data);
        });

        devMgmtGroup.add(this._dualConnSwitch);
    }



    _updateCompactStatus() {
        this._sideToneSlider?.set_property('compact-mode', this._isCompactMode);
    }
});
