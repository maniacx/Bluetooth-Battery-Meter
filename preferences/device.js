'use strict';
const {Adw, GLib, Gtk, GObject} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const gettextDomain = Me.metadata['gettext-domain'];
const Gettext = imports.gettext.domain(gettextDomain);
const _ = Gettext.gettext;

const  ConfigureWindow = GObject.registerClass({
}, class ConfigureWindow extends Adw.Window {
    _init(settings, mac, deviceItem, pathInfo, parentWindow) {
        super._init({
            title: pathInfo.alias,
            default_width: 580,
            default_height: 600,
            modal: true,
            transient_for: parentWindow,
        });

        const box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
        });

        const headerBar = new Adw.HeaderBar({
            decoration_layout: 'icon:close',
            show_end_title_buttons: true,
        });

        const page = new Adw.PreferencesPage();

        box.append(headerBar);
        box.append(page);
        this.set_content(box);

        const aliasGroup = new Adw.PreferencesGroup({
            title: `MAC: ${mac}`,
        });

        const status = _('Battery Status:');
        const batteryStatus = pathInfo.batteryReported  ? _('Reported') : _('Not Available');
        aliasGroup.set_description(`${status} ${batteryStatus}`);
        page.add(aliasGroup);

        const iconGroup = new Adw.PreferencesGroup({
            title: _('Icon'),
        });

        const iconRow = new Adw.ActionRow({
            title: _('Select Icon'),
            subtitle: _('Select the icon used for the indicator and quick menu'),
        });

        const supportedIcons = [
            'audio-card', 'audio-speakers', 'audio-speakers2', 'audio-speakers3', 'audio-headphones', 'audio-headset',
            'earbuds', 'earbuds2', 'earbuds-stem', 'earbuds-stem2', 'input-gaming', 'input-gaming2', 'input-gaming3',
            'input-keyboard', 'input-keyboard2', 'input-mouse', 'input-tablet', 'touchpad', 'phone', 'phone-samsung-galaxy-s',
            'phone-apple-iphone', 'phone-google-nexus-one', 'camera-photo', 'camera-video', 'computer', 'video-display',
            'modem', 'network-wireless', 'printer', 'scanner', 'multimedia-player', 'bluetooth',
        ];

        const iconSplitButton = new Adw.SplitButton({
            icon_name: `bbm-${pathInfo.icon}-symbolic`,
            dropdown_tooltip: _('Select icon'),
            valign: Gtk.Align.CENTER,
        });

        const popover = new Gtk.Popover({
            has_arrow: true,
            autohide: true,
        });

        const grid = new Gtk.Grid({
            column_spacing: 10,
            row_spacing: 10,
        });

        supportedIcons.forEach((deviceType, index) => {
            const button = new Gtk.Button({
                icon_name: `bbm-${deviceType}-symbolic`,
                valign: Gtk.Align.CENTER,
            });
            grid.attach(button, index % 4, Math.floor(index / 4), 1, 1);
            button.connect('clicked', () => {
                popover.hide();
                const pairedDevice = settings.get_strv('device-list');
                const existingPathIndex = pairedDevice.findIndex(item => JSON.parse(item).path === pathInfo.path);
                const existingItem = JSON.parse(pairedDevice[existingPathIndex]);
                existingItem['icon'] = deviceType;
                pairedDevice[existingPathIndex] = JSON.stringify(existingItem);
                settings.set_strv('device-list', pairedDevice);
                iconSplitButton.icon_name = `bbm-${deviceType}-symbolic`;
            });
        });

        popover.set_child(grid);
        iconSplitButton.set_popover(popover);
        iconRow.add_suffix(iconSplitButton);
        iconGroup.add(iconRow);
        page.add(iconGroup);

        const quickSettingsGroup = new Adw.PreferencesGroup({
            title: _('Quick Menu'),
        });

        const quickSettingsRow = new Adw.ActionRow({
            title: _('Display Battery Level'),
            subtitle: _('Display battery level in the Bluetooth panel quick menu'),
        });

        const quickSettingSwitch = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
        });

        quickSettingSwitch.active = pathInfo.qsLevelEnabled;
        quickSettingSwitch.connect('notify::active', () => {
            const pairedDevice = settings.get_strv('device-list');
            const existingPathIndex = pairedDevice.findIndex(item => JSON.parse(item).path === pathInfo.path);
            if (existingPathIndex !== -1) {
                const existingItem = JSON.parse(pairedDevice[existingPathIndex]);
                existingItem['qs-level'] = quickSettingSwitch.active;
                pairedDevice[existingPathIndex] = JSON.stringify(existingItem);
                settings.set_strv('device-list', pairedDevice);
            }
        });
        quickSettingsGroup.visible =  pathInfo.batteryReported;
        quickSettingsRow.add_suffix(quickSettingSwitch);
        quickSettingsGroup.add(quickSettingsRow);
        page.add(quickSettingsGroup);

        const indicatorGroup = new Adw.PreferencesGroup({
            title: _('Indicator'),
        });

        const indicatorRow = new Adw.ActionRow({
            title: _('Configure Indicator'),
            subtitle: _('Choose how the indicator should behave'),
        });

        const indicatorOptions = pathInfo.batteryReported
            ? [
                {id: 0, label: _('Do not show Icon')},
                {id: 1, label: _('Show Icon without Battery level')},
                {id: 2, label: _('Show Icon with Battery Level')},
            ]
            : [
                {id: 0, label: _('Hide Icon')},
                {id: 1, label: _('Show Icon')},
            ];

        const dropDown = new Gtk.DropDown({
            valign: Gtk.Align.CENTER,
            model: Gtk.StringList.new(indicatorOptions.map(option => option.label)),
            selected: indicatorOptions.findIndex(option => option.id === pathInfo.indicatorMode) >= 0
                ? indicatorOptions.findIndex(option => option.id === pathInfo.indicatorMode)
                : 0,
        });

        dropDown.connect('notify::selected', () => {
            const index = dropDown.get_selected();
            const selectedId = indicatorOptions[index].id;
            const pairedDevice = settings.get_strv('device-list');
            const existingPathIndex = pairedDevice.findIndex(item => JSON.parse(item).path === pathInfo.path);
            if (existingPathIndex !== -1) {
                const existingItem = JSON.parse(pairedDevice[existingPathIndex]);
                existingItem['indicator-mode'] = selectedId;
                pairedDevice[existingPathIndex] = JSON.stringify(existingItem);
                settings.set_strv('device-list', pairedDevice);
            }
        });

        indicatorRow.add_suffix(dropDown);
        indicatorRow.activatable_widget = dropDown;
        indicatorGroup.add(indicatorRow);
        page.add(indicatorGroup);
    }
}
);

const  DeviceItem = GObject.registerClass({
}, class DeviceItem extends Adw.ActionRow {
    constructor(settings, deviceItem, pathInfo) {
        super({});
        this._pathInfo = pathInfo;
        this._macAddress = this._pathToMacAddress(pathInfo.path);

        this._icon = new Gtk.Image({
            icon_name: `bbm-${this._pathInfo.icon}-symbolic`,
        });

        this._customiseButton = new Gtk.Button({
            icon_name: 'bbm-settings-symbolic',
            valign: Gtk.Align.CENTER,
        });

        this._customiseButton.connect('clicked', () => {
            const parentWindow = this._customiseButton.get_ancestor(Gtk.Window);
            const configureWindow = new ConfigureWindow(settings, this._macAddress, deviceItem, this._pathInfo, parentWindow);
            configureWindow.present();
        });

        this._deleteButton = new Gtk.Button({
            icon_name: 'user-trash-symbolic',
            tooltip_text: _('Delete device information: The button is available after unpairing device'),
            css_classes: ['destructive-action'],
            valign: Gtk.Align.CENTER,
        });

        this._deleteButton.connect('clicked', () => {
            const pairedDevices = settings.get_strv('device-list');
            const existingPathIndex = pairedDevices.findIndex(entry => {
                const parsedEntry = JSON.parse(entry);
                return parsedEntry.path === pathInfo.path;
            });

            if (existingPathIndex !== -1) {
                pairedDevices.splice(existingPathIndex, 1);
                settings.set_strv('device-list', pairedDevices);
            }
            this.get_parent().remove(this);
            deviceItem.delete(pathInfo.path);
        });

        const box = new Gtk.Box({spacing: 16});
        box.append(this._customiseButton);
        box.append(this._deleteButton);
        this.add_prefix(this._icon);
        this.add_suffix(box);

        this.updateProperites(pathInfo);
    }

    updateProperites(pathInfo) {
        this._pathInfo = pathInfo;
        const removedLabel = _('(Removed)');
        const pairedLabel = _('(Paired)');
        this.title = pathInfo.alias;
        this.subtitle = pathInfo.paired ? `${this._macAddress} ${pairedLabel}` : `${this._macAddress} ${removedLabel}`;
        this._deleteButton.sensitive = !pathInfo.paired;
        this._icon.icon_name = `bbm-${pathInfo.icon}-symbolic`;
    }

    _pathToMacAddress(path) {
        const indexMacAddress = path.indexOf('dev_') + 4;
        const macAddress = path.substring(indexMacAddress);
        return macAddress.replace(/_/g, ':');
    }
});


var Device = GObject.registerClass({
    GTypeName: 'BBM_Device',
    Template: `file://${GLib.build_filenamev([Me.path, 'ui', 'device.ui'])}`,
    InternalChildren: [
        'device_group',
        'no_paired_row',
    ],
}, class Device extends Adw.PreferencesPage {
    constructor(settings) {
        super({});
        this._settings = settings;
        this._deviceItems = new Map();
        this._createDevices();
        this._settings.connect('changed::device-list', () => this._createDevices());
    }

    _createDevices() {
        const pathsString = this._settings.get_strv('device-list').map(JSON.parse);
        if (!pathsString || pathsString.length === 0) {
            this._no_paired_row.visible  = true;
            return;
        }
        this._no_paired_row.visible  = false;
        const pairedDevices = pathsString.filter(device => device.paired);
        const unpairedDevices = pathsString.filter(device => !device.paired);
        pairedDevices.sort((a, b) => b['connected-time'] - a['connected-time']);
        unpairedDevices.sort((a, b) => b['disconnected-time'] - a['disconnected-time']);
        const sortedDevices = [...pairedDevices, ...unpairedDevices];
        for (const info of sortedDevices) {
            const pathInfo = {
                path: info.path,
                icon: info.icon,
                alias: info.alias,
                paired: info.paired,
                batteryReported: info['battery-reported'],
                qsLevelEnabled: info['qs-level'],
                indicatorMode: info['indicator-mode'],
            };
            if (this._deviceItems.has(pathInfo.path)) {
                const row = this._deviceItems.get(pathInfo.path);
                row.updateProperites(pathInfo);
            } else {
                const deviceItem = new DeviceItem(this._settings, this._deviceItems, pathInfo);
                this._deviceItems.set(pathInfo.path, deviceItem);
                this._device_group.add(deviceItem);
            }
        }
    }
});

