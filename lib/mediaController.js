'use strict';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gvc from 'gi://Gvc';
import * as Volume from 'resource:///org/gnome/shell/ui/status/volume.js';
import * as Helper from './enhancedDeviceSupportHelper.js';

const MEDIA_PLAYER_PREFIX = 'org.mpris.MediaPlayer2.';

export const MediaController = GObject.registerClass({
    Properties: {
        'output-is-a2dp': GObject.ParamSpec.boolean(
            'output-is-a2dp', 'output-is-a2dp', '', GObject.ParamFlags.READWRITE, false
        ),
    },
}, class MediaController extends GObject.Object {
    _init(path, inEarControl, caVolume) {
        super._init();
        this._inEarControl = inEarControl;
        this._caVolume = caVolume;
        this._previousVolume = null;
        this._controllerReady = false;
        const indexMacAddress = path.indexOf('dev_') + 4;
        this._macAddress = path.substring(indexMacAddress);
        this._mprisNames = null;
        this._lastPausedPlayer = null;
        this._playbackStatusChangePending = false;

        this._control = Volume.getMixerControl();
        if (!this._control)
            return;

        this._control.connectObject(
            'state-changed', () => {
                const state = this._control.get_state();
                if (state === Gvc.MixerControlState.READY) {
                    this._intialize();
                } else {
                    this._controllerReady = false;
                    this._control?.disconnect(this._controlSignalId);
                    this._controlSignalId = null;
                }
            },
            this
        );
        this._intialize();
    }

    _lookupSink() {
        const sinks = this._control.get_sinks();
        for (const sink of sinks) {
            if (sink.get_name().includes(this._macAddress))
                return sink;
        }
        return null;
    }

    _validateDeviceIsActiveOuput() {
        const sink = this._control.get_default_sink();
        if (!sink)
            return null;

        const name = sink.get_name();
        if (!name.includes(this._macAddress))
            return null;

        return sink;
    }

    _validateProfileIsA2dp(sink) {
        if (sink) {
            const mixerDevice = this._control.lookup_device_from_stream(sink);
            const currerntProfile = mixerDevice.get_active_profile();
            if (currerntProfile === 'a2dp-sink')
                return true;
        }
        return false;
    }

    _updateOutputIsA2dp() {
        const sink = this._validateDeviceIsActiveOuput();
        const isA2dp = this._validateProfileIsA2dp(sink);
        if (this.output_is_a2dp !== isA2dp) {
            this.output_is_a2dp = isA2dp;
            this.notify('output-is-a2dp');
        }
    }

    _intialize() {
        if (this._controllerReady)
            return;

        const ready = this._control.get_state() === Gvc.MixerControlState.READY;
        if (!ready)
            return;

        this._controlSignalId = this._control.connect(
            'default-sink-changed', () => {
                this._updateOutputIsA2dp();

                if (!this._validateDeviceIsActiveOuput())
                    this._lastPausedPlayer = null;
            }
        );
        this._updateOutputIsA2dp();
        this._controllerReady = true;
    }

    updateConfig(inEarControl, caVolume) {
        this._inEarControl = inEarControl;
        this._caVolume = caVolume;
    }

    lowerAirpodsVolume(attenuated) {
        if (!this._controllerReady)
            return;

        const sink = this._validateDeviceIsActiveOuput();
        if (!sink)
            return;

        const isA2DP = this._validateProfileIsA2dp(sink);
        if (!isA2DP)
            return;

        if (attenuated && sink.get_state() !== Gvc.MixerStreamState.RUNNING)
            return;

        if (sink.is_muted) {
            if (!attenuated && this._previousVolume !== null) {
                sink.set_volume(this._previousVolume);
                sink.push_volume();
                this._previousVolume = null;
            }
            return;
        }


        const maxVolume = this._control.get_vol_max_norm();

        if (attenuated) {
            if (sink.volume <= this._calculatedVolume)
                return;

            if (this._previousVolume !== null)
                return;

            this._previousVolume = sink.volume;
            this._calculatedVolume = Math.floor(this._caVolume * maxVolume);
            sink.set_volume(this._calculatedVolume);
            sink.push_volume();
        } else if (this._previousVolume !== null && this._previousVolume > 0) {
            if (sink.volume !== this._calculatedVolume)
                return;

            const steps = 10;
            const duration = 1000;
            const interval = duration / steps;
            const currentVolume = sink.volume;
            const targetVolume = this._previousVolume;
            const volumeStep = Math.floor((targetVolume - currentVolume) / steps);
            let stepCount = 0;

            this._volumeRampTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, interval, () => {
                if (stepCount >= steps) {
                    sink.set_volume(targetVolume);
                    sink.push_volume();
                    this._previousVolume = null;
                    this._volumeRampTimeoutId = null;
                    return GLib.SOURCE_REMOVE;
                }

                const newVolume = currentVolume + volumeStep * stepCount;
                sink.set_volume(newVolume);
                sink.push_volume();

                stepCount++;
                return GLib.SOURCE_CONTINUE;
            });
        }
    }

    _playerPropsChanged() {
        if (this._playbackStatusChangePending) {
            this._playbackStatusChangePending = false;
            return;
        }
        const status = this._playerProxy?.get_cached_property('PlaybackStatus')?.unpack();
        if (status !== 'Paused')
            this._lastPausedPlayer = null;
    }

    async _changeStatus() {
        if (this._playerProxy) {
            if (this._requestedState === 'pause') {
                await Helper.pausePlayer(this._playerProxy);
                const status = this._playerProxy?.get_cached_property('PlaybackStatus')?.unpack();
                this._playbackStatusChangePending = status !== 'Paused';
                this._playerProxy.connectObject(
                    'g-properties-changed', () => this._playerPropsChanged(), this);
            } else {
                await Helper.playPlayer(this._playerProxy);
            }
        }
    }

    _onPlayerProxyReady() {
        const status = this._playerProxy?.get_cached_property('PlaybackStatus')?.unpack();
        if (this._requestedState === 'play' && status === 'Playing') {
            this._lastPausedPlayer = null;
            this._mprisNames = [];
        } else if (this._requestedState === 'play' && status === 'Paused') {
            this._lastPausedPlayer = null;
            this._mprisNames = [];
            this._changeStatus();
        } else if (this._requestedState === 'pause' && status === 'Playing') {
            this._mprisNames = [];
            this._lastPausedPlayer = this._busname;
            this._changeStatus();
        } else {
            this._playerProxy = null;
            this._iteratePlayers();
        }
    }

    async _initPlayerProxy(busname) {
        this._playerProxy = await Helper.initMediaPlayerProxy(busname);
        if (!this._playerProxy)
            return;

        this._onPlayerProxyReady();
    }

    _iteratePlayers() {
        if (this._mprisNames.length === 0)
            return;

        this._busname = this._mprisNames.shift();
        this._initPlayerProxy(this._busname);
    }

    _disconnectPlayerProxy() {
        this._playerProxy?.disconnectObject(this);
        this._playerProxy = null;
    }

    async changeActivePlayerState(requestedState) {
        if (!this._inEarControl)
            return;

        if (!this._validateDeviceIsActiveOuput())
            return;

        this._requestedState = requestedState;
        this._disconnectPlayerProxy();
        const [names] = await Helper.getPlayerNames();
        this._mprisNames = names.filter(name => name.startsWith(MEDIA_PLAYER_PREFIX));
        if (this._requestedState === 'play') {
            if (this._lastPausedPlayer && this._mprisNames.includes(this._lastPausedPlayer))
                this._initPlayerProxy(this._lastPausedPlayer);
        } else {
            this._iteratePlayers();
        }
    }

    destroy() {
        if (this._volumeRampTimeoutId)
            GLib.remove_source(this._volumeRampTimeoutId);
        this._volumeRampTimeoutId = null;
        this._disconnectPlayerProxy();
        if (this._controlSignalId)
            this._control?.disconnect(this._controlSignalId);
        this._controlSignalId = null;
        this._control?.disconnectObject(this);
        this._controllerReady = false;
        this._lastPausedPlayer = null;
        this._playbackStatusChangePending = null;
        this._control = null;
    }
});

