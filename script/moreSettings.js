#!/usr/bin/env -S gjs -m

/*
    Opens the Enhanced Devices (Airpdos / Sony etc)) Settings (Configure) window,
    the same one available in extension preferences. Normally this window would be launched
    through the prefs system, but GNOME only allows one extension prefs window at a time.
    If another extension’s prefs window is already open, this settings window
    cannot be opened from the popup menu. To avoid that conflict, it is launched
    here as a standalone script.
*/

import Gtk from 'gi://Gtk?version=4.0';
import Gdk from 'gi://Gdk?version=4.0';
import Adw from 'gi://Adw?version=1';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gettext from 'gettext';

import * as Airpods from '../preferences/devices/airpods/configureWindow.js';
import * as Sony from '../preferences/devices/sony/configureWindow.js';

Gio._promisify(Gio.DBusProxy, 'new');
Gio._promisify(Gio.DBusProxy.prototype, 'call');

const EXTENSION_ID = 'Bluetooth-Battery-Meter@maniacx.github.com';
const SCHEMA_ID = 'org.gnome.shell.extensions.Bluetooth-Battery-Meter';
const APP_ID = 'com.github.maniacx.Bluetooth-Battery-Meter-More-Settings';
const EXTENSION_BUS_NAME = 'org.gnome.Shell.Extensions';
const EXTENSION_OBJECT_PATH = '/org/gnome/Shell/Extensions';
const EXTENSION_INTERFACE = 'org.gnome.Shell.Extensions';

Adw.init();

class MoreSettingsLauncher {
    constructor(argv) {
        this._devicePath = null;
        this._deviceType = null;
        this._prefsType = null;
        this._schemaKey = null;
        this._proxy = null;
        this._win = null;
        this._app = null;
        this._settings = null;
        this._loop = new GLib.MainLoop(null, false);
        this._parseArgs(argv);
        this._initMonitor();
    }

    _parseArgs(argv) {
        const pathIndex = argv.indexOf('--path');
        const typeIndex = argv.indexOf('--type');
        if (pathIndex !== -1 && argv[pathIndex + 1])
            this._devicePath = argv[pathIndex + 1];
        if (typeIndex !== -1 && argv[typeIndex + 1])
            this._deviceType = argv[typeIndex + 1];

        if (this._deviceType === 'airpods') {
            this._prefsType = Airpods;
            this._schemaKey = 'airpods-list';
        } else if (this._deviceType === 'sony') {
            this._prefsType = Sony;
            this._schemaKey = 'sony-list';
        }
    }

    async _initMonitor() {
        try {
            this._proxy = await Gio.DBusProxy.new(
                Gio.DBus.session,
                Gio.DBusProxyFlags.NONE,
                null,
                EXTENSION_BUS_NAME,
                EXTENSION_OBJECT_PATH,
                EXTENSION_INTERFACE,
                null
            );
            this._proxy.connect('g-signal', this._onExtensionSignal.bind(this));
            await this._checkInitialExtensionState();
        } catch {
            this._quit();
        }
    }

    async _checkInitialExtensionState() {
        const result = await this._proxy.call(
            'GetExtensionInfo',
            GLib.Variant.new_tuple([GLib.Variant.new_string(EXTENSION_ID)]),
            Gio.DBusCallFlags.NONE,
            -1,
            null
        );
        const [info] = result.recursiveUnpack();
        if (info.state !== 1) {
            this._quit();
            return;
        }

        if (!this._devicePath || !this._prefsType || !this._schemaKey) {
            this._quit();
            return;
        }

        const scriptDir = GLib.path_get_dirname(import.meta.url.replace('file://', ''));
        const extDir = GLib.path_get_dirname(scriptDir);
        const settings = this._loadSettings(extDir);
        if (!settings) {
            this._quit();
            return;
        }
        const deviceListRaw = settings.get_strv(this._schemaKey);
        const deviceList = deviceListRaw.map(str => JSON.parse(str));
        const pathInfo = deviceList.find(entry => entry.path === this._devicePath);
        if (!pathInfo) {
            this._quit();
            return;
        }

        this._settings = settings;
        this._initApp();
    }

    _onExtensionSignal(proxy, senderName, signalName, parameters) {
        if (signalName !== 'ExtensionStateChanged')
            return;
        const [uuid, info] = parameters.recursiveUnpack();
        if (uuid === EXTENSION_ID && info.state !== 1)
            this._quit();
    }

    _initApp() {
        this._app = new Gtk.Application({
            application_id: APP_ID,
            flags: Gio.ApplicationFlags.ALLOW_REPLACEMENT | Gio.ApplicationFlags.REPLACE,
        });

        this._app.connect('shutdown', () => {
            this._quit();
        });
        this._app.connect('activate', () => this._onActivate());
        this._app.run([]);
    }

    _loadIconDir(extDir) {
        const display = Gdk.Display.get_default();
        if (!display)
            return;

        const iconTheme = Gtk.IconTheme.get_for_display(display);
        const iconsDirectory = `${extDir}/icons`;
        iconTheme.add_search_path(iconsDirectory);
    }

    _setupGettext(extDir) {
        const localeDir = GLib.build_filenamev([extDir, 'locale']);
        Gettext.bindtextdomain(EXTENSION_ID, localeDir);
        Gettext.textdomain(EXTENSION_ID);
        return Gettext.gettext;
    }

    _loadSettings(extDir) {
        const schemaDir = GLib.build_filenamev([extDir, 'schemas']);
        const schemaSource = Gio.SettingsSchemaSource.new_from_directory(
            schemaDir, Gio.SettingsSchemaSource.get_default(), false);

        const schemaObj = schemaSource.lookup(SCHEMA_ID, true);
        if (!schemaObj)
            return null;
        return new Gio.Settings({settings_schema: schemaObj});
    }

    _pathToMacAddress(path) {
        const indexMacAddress = path.indexOf('dev_') + 4;
        const macAddress = path.substring(indexMacAddress);
        return macAddress.replace(/_/g, ':');
    }

    _onActivate() {
        const scriptDir = GLib.path_get_dirname(import.meta.url.replace('file://', ''));
        const extDir = GLib.path_get_dirname(scriptDir);

        this._loadIconDir(extDir);
        const _ = this._setupGettext(extDir);

        const macAddress = this._pathToMacAddress(this._devicePath);
        this._win = new this._prefsType.ConfigureWindow(this._settings, macAddress,
            this._devicePath, null, _);
        this._win.set_application(this._app);
        this._win.present();
    }

    run() {
        this._loop.run();
    }

    _quit() {
        this._win?.destroy();
        this._win = null;
        this._app?.quit();
        this._app = null;

        if (this._loop.is_running())
            this._loop.quit();
    }
}

const appInstance = new MoreSettingsLauncher(ARGV);
appInstance.run();

