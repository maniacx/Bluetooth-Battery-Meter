'use strict';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gvc from 'gi://Gvc';
import * as Volume from 'resource:///org/gnome/shell/ui/status/volume.js';

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

    _verifyState() {
        if (!this._controllerReady)
            return null;

        const sink = this._validateDeviceIsActiveOuput();
        if (!sink)
            return null;

        const isA2DP = this._validateProfileIsA2dp(sink);
        if (!isA2DP)
            return null;

        return sink;
    }

    lowerAirpodsVolume(attenuated) {
        const sink = this._verifyState();
        if (!sink)
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
        const fadeOutTargetVolume = Math.floor(this._caVolume * maxVolume);

        const easeInOutQuad = t => {
            return t < 0.5
                ? 2 * t * t
                : -1 + (4 - 2 * t) * t;
        };

        if (this._volumeRampTimeoutId)
            GLib.source_remove(this._volumeRampTimeoutId);
        this._volumeRampTimeoutId = null;

        if (attenuated) {
            if (this._previousVolume !== null)
                return;

            const currentVolume = sink.volume;

            if (currentVolume <= fadeOutTargetVolume)
                return;

            this._previousVolume = currentVolume;
            this._calculatedVolume = fadeOutTargetVolume;

            const duration = 1000;
            const steps = 50;
            const interval = duration / steps;
            let step = 0;

            this._volumeRampTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, interval, () => {
                if (step >= steps) {
                    sink.set_volume(fadeOutTargetVolume);
                    sink.push_volume();
                    this._volumeRampTimeoutId = null;
                    return GLib.SOURCE_REMOVE;
                }

                const t = step / steps;
                const eased = easeInOutQuad(t);
                const newVolume =
                    Math.round(currentVolume + (fadeOutTargetVolume - currentVolume) * eased);
                sink.set_volume(newVolume);
                sink.push_volume();

                step++;
                return GLib.SOURCE_CONTINUE;
            });
        } else if (this._previousVolume !== null && this._previousVolume > 0) {
            const currentVolume = sink.volume;
            const fadeInTargetVolume = this._previousVolume;

            if (currentVolume !== this._calculatedVolume) {
                this._previousVolume = null;
                return;
            }

            const duration = 1000;
            const steps = 50;
            const interval = duration / steps;
            let step = 0;

            this._volumeRampTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, interval, () => {
                if (step >= steps) {
                    sink.set_volume(fadeInTargetVolume);
                    sink.push_volume();
                    this._previousVolume = null;
                    this._volumeRampTimeoutId = null;
                    return GLib.SOURCE_REMOVE;
                }

                const t = step / steps;
                const eased = easeInOutQuad(t);
                const newVolume =
                    Math.round(currentVolume + (fadeInTargetVolume - currentVolume) * eased);
                sink.set_volume(newVolume);
                sink.push_volume();

                step++;
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
                try {
                    await this._playerProxy.call(
                        'Pause',
                        null,
                        Gio.DBusCallFlags.NONE,
                        -1,
                        null
                    );
                } catch {
                    console.error('Bluetooth-Battery-Meter: Error call Mpris Pause method');
                }
                const status = this._playerProxy?.get_cached_property('PlaybackStatus')?.unpack();
                this._playbackStatusChangePending = status !== 'Paused';
                this._playerProxy.connectObject(
                    'g-properties-changed', () => this._playerPropsChanged(), this);
            } else {
                try {
                    await this._playerProxy.call(
                        'Play',
                        null,
                        Gio.DBusCallFlags.NONE,
                        -1,
                        null
                    );
                } catch {
                    console.error('Bluetooth-Battery-Meter: Error calling Mpris Play method');
                }
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
        try {
            this._playerProxy = await Gio.DBusProxy.new_for_bus(
                Gio.BusType.SESSION,
                Gio.DBusProxyFlags.NONE,
                null,
                busname,
                '/org/mpris/MediaPlayer2',
                'org.mpris.MediaPlayer2.Player',
                null
            );
        } catch {
            console.error('Bluetooth-Battery-Meter: Failed to initialize proxy in player proxy');
            return;
        }
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

        let names = [];
        try {
            const res = await Gio.DBus.session.call(
                'org.freedesktop.DBus',
                '/org/freedesktop/DBus',
                'org.freedesktop.DBus',
                'ListNames',
                null,
                new GLib.VariantType('(as)'),
                Gio.DBusCallFlags.NONE,
                -1,
                null
            );

            if (res)
                [names] = res.deepUnpack();
        } catch {
            console.error('Bluetooth-Battery-Meter: Error calling ListNames');
            return;
        }

        this._mprisNames = names.filter(name => name.startsWith(MEDIA_PLAYER_PREFIX));
        if (this._requestedState === 'play') {
            if (this._lastPausedPlayer && this._mprisNames.includes(this._lastPausedPlayer))
                this._initPlayerProxy(this._lastPausedPlayer);
        } else {
            this._iteratePlayers();
        }
    }

    _onDestroy() {
        if (this._previousVolume !== null) {
            const sink = this._verifyState();
            if (!sink)
                return;
            sink.set_volume(this._previousVolume);
            sink.push_volume();
        }
    }

    destroy() {
        if (this._volumeRampTimeoutId)
            GLib.remove_source(this._volumeRampTimeoutId);
        this._volumeRampTimeoutId = null;
        this._onDestroy();
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

