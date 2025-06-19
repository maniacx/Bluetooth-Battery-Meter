#!/usr/bin/env -S gjs -m

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import {LOG_BYTES} from '../config.js';
import {createLogger} from './logger.js';

export const SocketHandler = GObject.registerClass(
class SocketHandler extends GObject.Object {
    _init(manager, devicePath, fd) {
        super._init();
        const subclassName = this.constructor.name;
        const identifier = devicePath.split('_').slice(-3).join('');
        const tag = `SocketHandler-${subclassName}-${identifier}`;
        this._log = createLogger(tag);
        this._manager = manager;
        this._devicePath = devicePath;
        this.running = false;
        this._cancellable = new Gio.Cancellable();
        this.output_queue = [];
        this._socketInitialization(fd);
    }

    _socketInitialization(fd) {
        this._log.info(`Starting socket with fd: ${fd}}`);
        try {
            this._socket = Gio.Socket.new_from_fd(fd);
        } catch (e) {
            this._log.error(e, 'Error creating socket by fd');
            return;
        }
        this._connection = this._socket.connection_factory_create_connection();
        this.input_stream = this._connection.get_input_stream();
        this.output_stream = this._connection.get_output_stream();


        this._log.info(`Socket.type = ${this._socket.type}`);        // SEQPACKET
        this._log.info(`Socket.protocol = ${this._socket.protocol}`); // UNKNOWN (-1)
        this._log.info(`Socket.family = ${this._socket.family}`);     // Usually 0
        this._log.info(`Socket.timeout = ${this._socket.timeout}`);   // 0
        this._log.info(`Socket.keepalive = ${this._socket.keepalive}`); // false
        this._log.info(`Socket.blocking = ${this._socket.blocking}`);   // true

        this.running = true;
        this.commandQueue = [];
        this._sending = false;
    }

    async start() {
        try {
            this._receiveLoop();
            await this.postConnectInitialization();
        } catch (e) {
            this._log.error(e, 'Error post connection initialization');
            this.destroy();
        }
    }

    async _receiveLoop() {
        if (!this.running)
            return;

        try {
            const bytes = await this.input_stream.read_bytes_async(
                1024, GLib.PRIORITY_DEFAULT, this._cancellable
            );

            if (!bytes || bytes.get_size() === 0) {
                this._log.info('Received empty or null data — stopping receive loop');
                this.destroy();
                return;
            }

            const array = bytes.toArray();

            if (LOG_BYTES) {
                this._log.bytes('⬅ Received:', Array.from(array).map(
                    b => b.toString(16).padStart(2, '0')).join(' '));
            }

            this.processData(array);

            this._receiveLoop();
        } catch (e) {
            this._log.error(e, 'SocketHandler Disconnected');
            this.destroy();
        }
    }

    async sendMessage(packet) {
        if (!this.running)
            return;

        if (LOG_BYTES) {
            this._log.bytes('➡ Sent', Array.from(packet).map(
                b => b.toString(16).padStart(2, '0')).join(' '));
        }

        this.output_queue.push(packet);
        if (this._sending)
            return;

        this._sending = true;

        while (this.output_queue.length > 0 && this.running) {
            const buf = this.output_queue.shift();
            try {
            // eslint-disable-next-line no-await-in-loop
                await this.output_stream.write_all_async(
                    buf, GLib.PRIORITY_DEFAULT, this._cancellable, null
                );
            } catch (e) {
                this._log.error(e, 'Send Message');
                this.destroy();
                break;
            }
        }

        this._sending = false;
    }

    // --- Optional hooks for subclasses to override ---

    postConnectInitialization() {
    }

    processData() {
    }

    onDestroy() {
    }

    destroy() {
        this.onDestroy();
        if (!this.running)
            return;

        this.running = false;
        this._cancellable.cancel();
        this._log.info('Destroying socket');
        [this._connection, this.input_stream, this.output_stream].forEach(s => {
            try {
                s?.close(null);
            } catch (e) {
                this._log.error(e, 'Error during Socket / Stream closure');
            }
        });
        this._manager.removeDevice(this._devicePath);
    }
});

