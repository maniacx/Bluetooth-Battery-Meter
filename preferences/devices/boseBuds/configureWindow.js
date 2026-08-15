'use strict';
import Adw from 'gi://Adw';
import GObject from 'gi://GObject';

import {
    supportedAudioSingleIcons, supportedAudioDualIcons, supportedCaseIcons
} from '../../../lib/widgets/iconGroups.js';
import {DropDownRowWidget} from './../../widgets/dropDownRowWidget.js';
import {IconSelectorWidget} from './../../widgets/iconSelectorWidget.js';
import {RadioButtonRowWidget} from './../../widgets/radioButtonRowWidget.js';
import {EqualizerWidget} from './../../widgets/equalizerWidget.js';
import {DeviceManagementRow} from './../../widgets/deviceMgmtRowWidget.js';
import {ModesGroupWidget} from './modesGroupWidget.js';
import {BoseBudsModelList, VoicePrompt} from '../../../lib/devices/boseBuds/boseBudsConfig.js';

export const ConfigureWindow = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_BoseBudsConfigureWindow',
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

        const pathsString = settings.get_strv('bose-buds-list').map(JSON.parse);
        this._settingsItems = pathsString.find(info => info.path === devicePath);

        if (!this._settingsItems)
            return;

        this.title = this._settingsItems.alias;
        const modelId = this._settingsItems.id;
        this._modelData = BoseBudsModelList.find(model => model.id?.includes(modelId));

        if (!this._modelData)
            return;

        this._toastOverlay = new Adw.ToastOverlay();
        const toolViewBar = new Adw.ToolbarView();
        const headerBar = new Adw.HeaderBar({
            decoration_layout: ':close',
            show_end_title_buttons: true,
        });
        this._page = new Adw.PreferencesPage();
        this._toastOverlay.set_child(toolViewBar);
        toolViewBar.add_top_bar(headerBar);
        toolViewBar.set_content(this._page);
        this.set_content(this._toastOverlay);

        const iconList = this._modelData.batterySingle ? supportedAudioSingleIcons
            : supportedAudioDualIcons;

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

        this._addAudioModes();
        this._addSoundSettings();
        this._addCallsSetting();
        this._addInEarSettings();
        this._addVoicePrompt();
        this._addMiscSetting();
        this._addGestureControls();

        const settingSignalId = this._settings.connect('changed::bose-buds-list', () => {
            const updatedList = this._settings.get_strv('bose-buds-list').map(JSON.parse);
            this._settingsItems = updatedList.find(info => info.path === devicePath);

            if (!this._settingsItems)
                return;

            this.title = this._settingsItems.alias;

            if (this._eqPresetDropdown)
                this._eqPresetDropdown.selected_item = this._settingsItems['eq-preset'];

            if (this._audioModesGrp) {
                const modes = this._settingsItems['modes'];
                const currentMode = this._settingsItems['current-mode'];
                this._audioModesGrp.updateParams(modes, currentMode);
                this._restoreModeSwitch.active = this._settingsItems['restore-mode'];
            }

            if (this._eq)
                this._eq.setValues(this._settingsItems['eq-custom']);

            if (this._inEarSettingsSwitch)
                this._inEarSettingsSwitch.active = this._settingsItems['in-ear'];

            if (this._autoPauseSwitch)
                this._autoPauseSwitch.active = this._settingsItems['auto-pause'];

            if (this._autoAnswerSwitch)
                this._autoAnswerSwitch.active = this._settingsItems['auto-answer'];

            if (this._autoTransparencySwitch)
                this._autoTransparencySwitch.active = this._settingsItems['auto-transp'];

            if (this._sideToneDropdown)
                this._sideToneDropdown.selected_item = this._settingsItems['side-tone'];

            if (this._dualConnSwitch) {
                this._dualConnSwitch.active = this._settingsItems['multipoint'];
                this._dualConnSwitch.pair_mode = this._settingsItems['pairing-mode'];
                const deviceInfo = this._settingsItems['dev-mgmt'];
                this._dualConnSwitch?.updateDevices(deviceInfo);
                const routeInfo = this._settingsItems['active-dev'];
                this._dualConnSwitch?.updateRouteDevice(routeInfo);
                const ownDevice = this._settingsItems['own-dev'];
                this._dualConnSwitch?.updateOwnDevice(ownDevice);
            }

            if (this._autoPowerOffDropdown)
                this._autoPowerOffDropdown.selected_item = this._settingsItems['auto-power'];

            if (this._modelData.voicePrompt && !this._voicePromptSwitch)
                this._addVoicePrompt();

            if (this._voicePromptSwitch)
                this._voicePromptSwitch.active = this._settingsItems['voice-enabled'];

            if (this._voicePrompDropdown)
                this._voicePrompDropdown.selected_item = this._settingsItems['voice-prompt'];

            if (this._battVoiceSwitch) {
                this._battVoiceSwitch.active = this._settingsItems['vobat-en'];
                this._battVoiceSwitch.visible = this._settingsItems['vobat-sup'];
            }

            if (this._gestureRows) {
                const gestures = this._settingsItems['gestures'] ?? [];

                for (const row of this._gestureRows) {
                    const slot = gestures.find(g =>
                        g.id === row.buttonId && g.gesture === row.gestureByte);

                    if (slot)
                        row.dropdown.selected_item = slot.action;
                }
            }
        });

        this.connect('close-request', () => {
            this._eq?.destroy();
            this._eq = null;

            this._audioModesGrp?.destroy();
            this._audioModesGrp = null;

            if (settingSignalId && this._settings)
                this._settings.disconnect(settingSignalId);

            this._settings = null;

            return false;
        });
    }

    _updateGsettings(key, value) {
        const pairedDevice = this._settings.get_strv('bose-buds-list');
        const existingPathIndex =
                pairedDevice.findIndex(item => JSON.parse(item).path === this._devicePath);
        if (existingPathIndex !== -1) {
            const existingItem = JSON.parse(pairedDevice[existingPathIndex]);
            existingItem[key] = value;
            pairedDevice[existingPathIndex] = JSON.stringify(existingItem);
            this._settings.set_strv('bose-buds-list', pairedDevice);
        }
    }

    showToast(message) {
        this._toastOverlay.add_toast(new Adw.Toast({title: message, timeout: 2}));
    }

    _addAudioModes() {
        if (!this._modelData.audioModes)
            return;

        const _ = this._gettext;

        const curretMode = this._settingsItems['current-mode'];
        const modes = this._settingsItems['modes'];
        const alias = this._settingsItems.alias;
        this._audioModesGrp = new ModesGroupWidget(this, this._gettext,
            this._modelData, modes, curretMode, alias);

        this._audioModesGrp.connect('current-mode-changed', (_w, mode) => {
            this._updateGsettings('current-mode', mode);
        });

        this._audioModesGrp.connect('modes-changed', (_o, modes) => {
            this._updateGsettings('modes', modes);
        });

        this._page.add(this._audioModesGrp);

        const restoreModeGrp = new Adw.PreferencesGroup();
        this._restoreModeSwitch = new Adw.SwitchRow({title: _('Remember my mode')});
        this._restoreModeSwitch.active = this._settingsItems['restore-mode'];
        this._restoreModeSwitch.connect('notify::active', () => {
            this._updateGsettings('restore-mode', this._restoreModeSwitch.active);
        });

        restoreModeGrp.add(this._restoreModeSwitch);
        this._page.add(restoreModeGrp);
    }

    _addSoundSettings() {
        if (!this._modelData.audioMode && !this._modelData.eq)
            return;

        const _ = this._gettext;

        const eqGroup = new Adw.PreferencesGroup({title: _('Sound Settings')});
        this._page.add(eqGroup);

        if (this._modelData.eq) {
            const presetOptions = [];
            const presetValues = [];

            const getPresetLabel = name => {
                const labels = {
                    flat: _('Flat'),
                    bassBoost: _('Bass Boost'),
                    bassReducer: _('Bass Reducer'),
                    trebleBoost: _('Treble Boost'),
                    trebleReducer: _('Treble Reducer'),
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
                    buttonVisibleFor: ['custom'],
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
                bass: _('Bass'),
                mid: _('Mid'),
                treble: _('Treble'),
            };

            const freqs = this._modelData.eq.bands.map(
                freq => freqLabels[freq] ?? `${freq}`
            );

            const range = this._modelData.eq.range;

            const initialValues = this._settingsItems['eq-custom'];

            this._eq = new EqualizerWidget({
                freqs,
                initialValues,
                range,
                topBarTitle: _('Band'),
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
    }

    _addInEarSettings() {
        if (!this._modelData.inEarSettings && !this._modelData.autoAnswer &&
                !this._modelData.autoPause)
            return;

        const _ = this._gettext;
        const groupTitle = this._modelData.type === 'earbuds' ? _('In Ear Settings')
            : _('On Head Settings');

        const inEarGroup = new Adw.PreferencesGroup({title: groupTitle});
        this._page.add(inEarGroup);

        if (this._modelData.inEarSettings) {
            const inEarTitle = this._modelData.earbuds ? _('Enable In-Ear Detection')
                : _('Enable On Head Detection');

            this._inEarSettingsSwitch = new Adw.SwitchRow({title: inEarTitle});
            this._inEarSettingsSwitch.active = this._settingsItems['in-ear'];
            this._inEarSettingsSwitch.connect('notify::active', () => {
                this._updateGsettings('in-ear', this._inEarSettingsSwitch.active);
                this._updateInEarSensitivity();
            });

            inEarGroup.add(this._inEarSettingsSwitch);
        }

        if (this._modelData.autoPause) {
            this._autoPauseSwitch = new Adw.SwitchRow({
                title: _('Pause Media When Not Worn'),
                subtitle: _('Playback controlled by the OEM app'),
            });
            this._autoPauseSwitch.active = this._settingsItems['auto-pause'];
            this._autoPauseSwitch.connect('notify::active', () => {
                this._updateGsettings('auto-pause', this._autoPauseSwitch.active);
            });

            inEarGroup.add(this._autoPauseSwitch);
        }

        if (this._modelData.autoAnswer) {
            this._autoAnswerSwitch =
                new Adw.SwitchRow({title: _('Automatically Answer Calls When Worn')});

            this._autoAnswerSwitch.active = this._settingsItems['auto-answer'];
            this._autoAnswerSwitch.connect('notify::active', () => {
                this._updateGsettings('auto-answer', this._autoAnswerSwitch.active);
            });

            inEarGroup.add(this._autoAnswerSwitch);
        }

        if (this._modelData.autoTransparency) {
            const title = _('Automatically switch to Transparency mode when an earbud is removed');
            this._autoTransparencySwitch =  new Adw.SwitchRow({title});

            this._autoTransparencySwitch.active = this._settingsItems['auto-transp'];
            this._autoTransparencySwitch.connect('notify::active', () => {
                this._updateGsettings('auto-transp', this._autoTransparencySwitch.active);
            });

            inEarGroup.add(this._autoTransparencySwitch);
        }

        if (this._modelData.inEarSettings) {
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
        if (!this._inEarSettingsSwitch)
            return;

        const sensitive = this._inEarSettingsSwitch?.active ?? true;

        this._autoPauseSwitch?.set_sensitive(sensitive);
        this._autoAnswerSwitch?.set_sensitive(sensitive);
        this._autoTransparencySwitch?.set_sensitive(sensitive);
        this._inEarDropdown?.set_sensitive(sensitive);
    }

    _addCallsSetting() {
        const st = this._modelData.sideTone;
        if (!st)
            return;

        const _ = this._gettext;
        const callGroup = new Adw.PreferencesGroup({title: _('Calls Settings')});
        this._page.add(callGroup);

        const sideToneLabelsMap = {
            [st.off]: _('Off'),
            [st.low]: _('Low'),
            [st.mid]: _('Medium'),
            [st.high]: _('High'),
        };

        const values = Object.values(st);
        const options = values.map(value => sideToneLabelsMap[value]);

        this._sideToneDropdown = new DropDownRowWidget({
            title: _('Ambient Sound During Calls'),
            options,
            values,
            initialValue: this._settingsItems['side-tone'],
        });

        this._sideToneDropdown.connect('notify::selected-item', () => {
            this._updateGsettings('side-tone', this._sideToneDropdown.selected_item);
        });

        callGroup.add(this._sideToneDropdown);
    }

    _addMiscSetting() {
        if (!this._modelData.dualConnection && !this._modelData.automaticPowerOffTimer)
            return;

        const _ = this._gettext;

        const miscGroup = new Adw.PreferencesGroup({title: _('Additional Settings')});
        this._page.add(miscGroup);

        if (this._modelData.dualConnection) {
            const deviceManagementConfig = {
                maxConnected: this._modelData.maxConnected ?? 2,
                hasMultipointSwitch: true,
                hasPairMode: true,
                hasRoutingIndicator: true,
                hasRoutingControl: true,
                hasActiveFix: true,
                showMac: true,
            };
            const deviceInfo = this._settingsItems['dev-mgmt'];
            const currentActiveRoute = this._settingsItems['active-dev'];
            const ownDevice = this._settingsItems['own-dev'];

            this._dualConnSwitch = new DeviceManagementRow(this, this._gettext, deviceInfo,
                ownDevice, currentActiveRoute, deviceManagementConfig);

            this._dualConnSwitch.active = this._settingsItems['multipoint'];
            this._dualConnSwitch.pair_mode = this._settingsItems['pairing-mode'];

            this._dualConnSwitch.connect('notify::active', () => {
                this._updateGsettings('multipoint', this._dualConnSwitch.active);
            });

            this._dualConnSwitch.connect('notify::pair-mode', () => {
                this._updateGsettings('pairing-mode', this._dualConnSwitch.pair_mode);
            });

            const actionData = this._settingsItems['dev-mgmt-action'];
            this._seq = actionData?.seq ?? 0;

            this._dualConnSwitch.connect('device-action', (_row, action, id) => {
                const data = {seq: this._seq ^= 1, action, id};
                this._updateGsettings('dev-mgmt-action', data);
            });

            miscGroup.add(this._dualConnSwitch);
        }

        if (this._modelData.automaticPowerOffTimer) {
            const autoPowerOffLabelsMap = {
                0: _('Never'),
                5: _('After 5 minutes'),
                20: _('After 20 minutes'),
                40: _('After 40 minutes'),
                60: _('After 1 hour'),
                180: _('After 3 hours'),
            };

            const autoPowerOffLabels = this._modelData.automaticPowerOffTimer.map(minutes => {
                return autoPowerOffLabelsMap[minutes] ?? String(minutes);
            });

            this._autoPowerOffDropdown = new DropDownRowWidget({
                title: _('Automatic Power Off'),
                options: autoPowerOffLabels,
                values: this._modelData.automaticPowerOffTimer,
                initialValue: this._settingsItems['auto-power'],
            });

            this._autoPowerOffDropdown.connect('notify::selected-item', () => {
                const selectedVal = this._autoPowerOffDropdown.selected_item;
                this._updateGsettings('auto-power', selectedVal);
            });
            miscGroup.add(this._autoPowerOffDropdown);
        }
    }

    _addVoicePrompt() {
        if (!this._modelData.voicePrompt)
            return;

        const _ = this._gettext;

        if (!this._promptGroup) {
            this._promptGroup = new Adw.PreferencesGroup({
                title: _('Voice Prompts'),
                visible: false,
            });
            this._page.add(this._promptGroup);
        }

        const supportedVoice = this._settingsItems['supported-voice'];

        if (supportedVoice === 0xFFFFFFFF)
            return;

        const currentVoicePrompt = this._settingsItems['voice-prompt'];
        if (currentVoicePrompt === 0xFF)
            return;

        this._voicePromptSwitch = new Adw.SwitchRow({title: _('Enable Voice Prompts')});
        this._voicePromptSwitch.active = this._settingsItems['voice-enabled'];

        this._voicePromptSwitch.connect('notify::active', () => {
            this._updateGsettings('voice-enabled', this._voicePromptSwitch.active);
        });

        this._promptGroup.add(this._voicePromptSwitch);

        const getSupportedVoiceLanguages = mask => {
            const languages = [];

            for (let i = 0; i < 32; i++) {
                if (mask & 1 << i)
                    languages.push(i);
            }

            return languages;
        };

        const voicePromptValues = getSupportedVoiceLanguages(supportedVoice);
        const voicePromptLabels = voicePromptValues.map(value =>
            VoicePrompt[value] ?? String(value)
        );

        this._voicePrompDropdown = new DropDownRowWidget({
            title: _('Prompt Language'),
            options: voicePromptLabels,
            values: voicePromptValues,
            initialValue: this._settingsItems['voice-prompt'],
        });

        this._voicePrompDropdown.connect('notify::selected-item', () => {
            const selectedVal = this._voicePrompDropdown.selected_item;
            this._updateGsettings('voice-prompt', selectedVal);
        });
        this._promptGroup.add(this._voicePrompDropdown);

        this._battVoiceSwitch = new Adw.SwitchRow({
            title: _('Announce Battery Level at Startup'),
            visible: this._settingsItems['vobat-sup'],
        });

        this._battVoiceSwitch.active = this._settingsItems['vobat-en'];

        this._battVoiceSwitch.connect('notify::active', () => {
            this._updateGsettings('vobat-en', this._battVoiceSwitch.active);
        });

        this._promptGroup.add(this._battVoiceSwitch);

        this._promptGroup.visible = true;
    }

    _addGestureControls() {
        const gc = this._modelData.gestureOptions;
        if (!gc)
            return;

        const _ = this._gettext;
        this._gestureRows = [];
        const GESTURE_DISPLAY = {
            'single-tap': _('Single Tap'),
            'double-tap': _('Double Tap'),
            'triple-tap': _('Triple Tap'),
            'action-hold-tap': _('Touch and Hold'),
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
        };

        const allSlots = this._settingsItems['gestures'] ?? [];

        for (const [groupKey, button] of Object.entries(gc.buttons)) {
            const group = new Adw.PreferencesGroup({
                title: this._getGroupTitle(groupKey),
            });

            for (const [gestureKey, gesture] of Object.entries(button.gestures)) {
                const actions = Object.keys(gesture.actions);
                const values = Object.values(gesture.actions);
                const options = actions.map(a => this._readableAction(a));

                const displayKey = `${gestureKey}-${gesture.type}`;
                const title = GESTURE_DISPLAY[displayKey] ?? gestureKey;

                const savedSlot = allSlots.find(g =>
                    g.id === button.id && g.gesture === gesture.byte);

                const dropdown = new DropDownRowWidget({
                    title,
                    options,
                    values,
                    initialValue: savedSlot?.action ?? values[0],
                });

                this._gestureRows.push({
                    buttonId: button.id,
                    gestureByte: gesture.byte,
                    dropdown,
                });

                dropdown.connect('notify::selected-item', () => {
                    const action = dropdown.selected_item;

                    const index = allSlots.findIndex(g =>
                        g.id === button.id && g.gesture === gesture.byte);

                    if (index === -1) {
                        allSlots.push({
                            id: button.id,
                            gesture: gesture.byte,
                            action,
                        });
                    } else {
                        allSlots[index].action = action;
                    }

                    this._updateGsettings('gestures', allSlots);
                });

                group.add(dropdown);
            }

            this._page.add(group);
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

            default:
                return _('Gesture Controls');
        }
    }

    _readableAction(action) {
        const _ = this._gettext;

        switch (action) {
            case 'no-action':
                return _('No Action');

            case 'mode':
                return _('Cycle Through Modes');

            case 'spatial':
                return _('Spatial Audio');

            case 'switch-device':
                return _('Switch Devices');

            case 'spotify-go':
                return _('Spotify');

            case 'voice-assistant':
                return _('Voice Assistant');

            case 'not-configured':
                return _('Not Configured');

            case 'vpa':
                return _('Voice Assistant');

            case 'anc':
                return _('Noise Control');

            case 'battery-level':
                return _('Hear Battery Level');

            case 'play-pause':
                return _('Play / Pause');

            case 'increase-cnc':
                return _('Increase Noise Cancellation');

            case 'decrease-cnc':
                return _('Decrease Noise Cancellation');

            case 'toggle-wake-word':
                return _('Toggle Wake Word');

            case 'conversation-mode':
                return _('Conversation Mode');

            case 'skip-back':
                return _('Previous Track');

            case 'skip-forward':
                return _('Next Track');

            case 'fetch-notifications':
                return _('Hear Notifications');

            case 'wind-mode':
                return _('Wind Mode');

            case 'client-interaction':
                return _('Client Interaction');

            case 'line-in-switch':
                return _('Audio Line-In');

            case 'linking':
                return _('Speaker Link');

            case 'disabled':
                return _('Disabled');

            default:
                return action;
        }
    }

    _updateCompactStatus() {

    }
});
