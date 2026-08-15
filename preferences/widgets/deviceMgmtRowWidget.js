'use strict';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';

import {BtDeviceState, DeviceManagementAction} from '../../lib/devices/commonEmuns.js';

const DeviceManagementDialog = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_DeviceManagementDialog',
}, class DeviceManagementDialog extends Adw.Dialog {
    _init(mgmtRow, ownDevice, routeDevice) {
        super._init({
            title: '',
            content_width: 360,
            content_height: 700,
        });

        const _ = mgmtRow.gtxt;
        this._mgmtRow = mgmtRow;
        this._ownDevice = ownDevice;
        this._routeDevice = routeDevice;
        this._rows = new Map();
        this._connectedRows = [];
        this._pairedRows = [];

        const toolbarView = new Adw.ToolbarView();
        const headerBar = new Adw.HeaderBar({
            title_widget: new Adw.WindowTitle({
                title: _('Connection Manager'),
            }),
        });
        toolbarView.add_top_bar(headerBar);
        const page = new Adw.PreferencesPage();

        if (this._mgmtRow.config.hasPairMode) {
            const pairModeGroup = new Adw.PreferencesGroup({title: _('Pairing Mode')});
            const pairModeRow = new Adw.ActionRow({
                title: _('Enable Pairing Mode'),
                subtitle: _('Allow a new Bluetooth device to pair.'),
            });

            const spinner = new Adw.Spinner({
                halign: Gtk.Align.CENTER,
                valign: Gtk.Align.CENTER,
                width_request: 16,
                height_request: 16,
                visible: false,
            });

            const pairModeSwitch = new Gtk.Switch({
                valign: Gtk.Align.CENTER,
                active: this._mgmtRow.pairMode,
            });

            pairModeSwitch.bind_property(
                'active',
                spinner,
                'visible',
                GObject.BindingFlags.BIDIRECTIONAL | GObject.BindingFlags.SYNC_CREATE
            );

            this._mgmtRow.bind_property(
                'pair-mode',
                pairModeSwitch,
                'active',
                GObject.BindingFlags.BIDIRECTIONAL | GObject.BindingFlags.SYNC_CREATE
            );

            pairModeRow.add_suffix(spinner);
            pairModeRow.add_suffix(pairModeSwitch);
            pairModeGroup.add(pairModeRow);
            page.add(pairModeGroup);
        }

        if (this._mgmtRow.config.hasActiveFix) {
            const activeFixedGroup = new Adw.PreferencesGroup({title: _('Playback Device')});
            const title = _('Lock Playback Device');
            const subtitle = _('Prevent playback from switching to another connected device ' +
                'while the set playback device is streaming.');

            const activeFixedRow = new Adw.SwitchRow({title,  subtitle});

            this._mgmtRow.bind_property(
                'active-fixed',
                activeFixedRow,
                'active',
                GObject.BindingFlags.BIDIRECTIONAL | GObject.BindingFlags.SYNC_CREATE
            );

            activeFixedGroup.add(activeFixedRow);
            page.add(activeFixedGroup);
        }

        this._connectedGroup = new Adw.PreferencesGroup({title: _('Connected')});
        this._pairedGroup = new Adw.PreferencesGroup({title: _('Paired')});
        this._connectedEmptyRow = new Adw.ActionRow({title: _('No device connected')});
        this._pairedEmptyRow = new Adw.ActionRow({title: _('No additional device paired')});
        page.add(this._connectedGroup);
        page.add(this._pairedGroup);
        toolbarView.set_content(page);
        this.set_child(toolbarView);

        this.updateDevices(this._mgmtRow.deviceArr);
    }

    _formatMac(mac) {
        return mac.replace(/:/g, '').match(/.{1,2}/g)?.join(':') ?? mac;
    }

    updateDevices(deviceArr) {
        const _ = this._mgmtRow.gtxt;
        const devices = deviceArr.map(device => ({...device}));

        devices.sort((a, b) => {
            const aCurrent = a.id === this._ownDevice;
            const bCurrent = b.id === this._ownDevice;
            if (aCurrent === bCurrent)
                return 0;

            return aCurrent ? -1 : 1;
        });

        const newIds = new Set(devices.map(device => device.id));

        for (const [id, info] of this._rows) {
            if (!newIds.has(id)) {
                info.group.remove(info.row);

                if (info.group === this._connectedGroup)
                    this._connectedRows = this._connectedRows.filter(r => r !== info.row);
                else
                    this._pairedRows = this._pairedRows.filter(r => r !== info.row);

                this._rows.delete(id);
            }
        }

        for (const device of devices) {
            const info = this._rows.get(device.id);

            if (!info) {
                const row = this._createDeviceRow(device);
                const group = device.connected ? this._connectedGroup : this._pairedGroup;
                group.add(row);

                if (device.connected)
                    this._connectedRows.push(row);
                else
                    this._pairedRows.push(row);

                this._rows.set(device.id, {row, group});
                continue;
            }

            const isOwnDevice = device.id === this._ownDevice;
            const isInitializing = device.state === BtDeviceState.NotInitialized;
            const isProcessing = device.state === BtDeviceState.Processing;

            let title;
            if (isInitializing)
                title = _('Loading Device Information...');
            else if (isOwnDevice)
                title = `${device.name} <span alpha="60%"><i>${_('(This Device)')}</i></span>`;
            else
                title = device.name;

            info.row.title = title;

            if (this._mgmtRow.config.showMac)
                info.row.subtitle = this._formatMac(device.id);

            info.row.spinner.visible = isProcessing || isInitializing;

            if (this._mgmtRow.config.hasRoutingIndicator) {
                const isRouteDevice = this._routeDevice === device.id;
                info.row.routeIcon.visible = !isInitializing && !isProcessing &&
                        device.connected && isRouteDevice;
            }

            const targetGroup = device.connected ? this._connectedGroup : this._pairedGroup;

            if (info.group !== targetGroup) {
                info.group.remove(info.row);

                if (info.group === this._connectedGroup) {
                    this._connectedRows = this._connectedRows.filter(r => r !== info.row);
                    this._pairedRows.push(info.row);
                } else {
                    this._pairedRows = this._pairedRows.filter(r => r !== info.row);
                    this._connectedRows.push(info.row);
                }

                targetGroup.add(info.row);
                info.group = targetGroup;
            }
            this._updateDeviceMenu(info.row, device);
        }

        const connectedIds = devices.filter(device => device.connected).map(device => device.id);
        const pairedIds = devices.filter(device => !device.connected).map(device => device.id);
        this._reorderRows(this._connectedRows, this._connectedGroup, connectedIds);
        this._reorderRows(this._pairedRows, this._pairedGroup, pairedIds);

        this._updateEmptyRows();
    }

    _updateEmptyRows() {
        if (this._connectedRows.length === 0) {
            if (!this._connectedEmptyRow.get_parent())
                this._connectedGroup.add(this._connectedEmptyRow);
        } else if (this._connectedEmptyRow.get_parent()) {
            this._connectedGroup.remove(this._connectedEmptyRow);
        }

        if (this._pairedRows.length === 0) {
            if (!this._pairedEmptyRow.get_parent())
                this._pairedGroup.add(this._pairedEmptyRow);
        } else if (this._pairedEmptyRow.get_parent()) {
            this._pairedGroup.remove(this._pairedEmptyRow);
        }
    }

    _reorderRows(rows, group, orderedIds) {
        if (rows.length !== orderedIds.length)
            return;

        const orderedRows = orderedIds.map(id => this._rows.get(id)?.row).filter(Boolean);

        if (rows.every((row, i) => row === orderedRows[i]))
            return;

        for (const row of rows)
            group.remove(row);

        for (const row of orderedRows)
            group.add(row);

        rows.splice(0, rows.length, ...orderedRows);
    }

    _createDeviceRow(device) {
        const _ = this._mgmtRow.gtxt;
        const isOwnDevice = device.id === this._ownDevice;
        const isInitializing = device.state === BtDeviceState.NotInitialized;
        const isProcessing = device.state === BtDeviceState.Processing;

        let title;
        if (isInitializing)
            title = _('Loading Device Information...');
        else if (isOwnDevice)
            title = `${device.name} <span alpha="60%"><i>${_('(This Device)')}</i></span>`;
        else
            title = device.name;

        const subtitle = this._mgmtRow.config.showMac ? this._formatMac(device.id) : '';
        const row = new Adw.ActionRow({title, subtitle});

        let routeIcon;
        if (this._mgmtRow.config.hasRoutingIndicator) {
            routeIcon = new Gtk.Image({
                icon_name: 'bbm-speakers-symbolic',
                css_classes: ['flat'],
                visible: !isProcessing && device.connected && this._routeDevice === device.id,
            });
        }

        const spinner = new Adw.Spinner({
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.CENTER,
            width_request: 16,
            height_request: 16,
            visible: isInitializing || isProcessing,
        });

        const button = new Gtk.MenuButton({
            valign: Gtk.Align.CENTER,
            icon_name: 'bbm-settings-symbolic',
        });

        const menu = new Gio.Menu();
        const actionGroup = new Gio.SimpleActionGroup();

        if (this._mgmtRow.config.hasRoutingControl) {
            const routingAction = new Gio.SimpleAction({name: 'routing'});
            routingAction.connect('activate', () => {
                this._mgmtRow?.emit('device-action', DeviceManagementAction.Routing, device.id);
            });
            actionGroup.add_action(routingAction);
        }

        const connectAction = new Gio.SimpleAction({name: 'connect'});
        connectAction.connect('activate', () => {
            const maxReached = this._mgmtRow.config.maxConnected > 0 &&
                this._connectedRows.length >= this._mgmtRow.config.maxConnected;

            if (maxReached) {
                const dialog = new Adw.AlertDialog({
                    heading: _('Connection Limit Reached'),
                    body: _('Disconnect another device before connecting this device.'),
                });

                dialog.add_response('ok', _('OK'));
                dialog.set_default_response('ok');
                dialog.set_close_response('ok');
                dialog.present(this);

                return;
            }

            this._mgmtRow?.emit('device-action', DeviceManagementAction.Connect, device.id);
        });
        actionGroup.add_action(connectAction);

        const disconnectAction = new Gio.SimpleAction({name: 'disconnect'});
        disconnectAction.connect('activate', () => {
            this._mgmtRow?.emit('device-action', DeviceManagementAction.Disconnect, device.id);
        });
        actionGroup.add_action(disconnectAction);

        const removeAction = new Gio.SimpleAction({name: 'remove'});
        removeAction.connect('activate', () => {
            const _ = this._mgmtRow.gtxt;

            const dialog = new Adw.AlertDialog({
                heading: _('Remove Device?'),
                body: _('The device will be removed from the paired devices list.'),
            });

            dialog.add_response('cancel', _('Cancel'));
            dialog.add_response('remove', _('Remove'));
            dialog.set_response_appearance('remove', Adw.ResponseAppearance.DESTRUCTIVE);
            dialog.set_default_response('cancel');
            dialog.set_close_response('cancel');

            dialog.connect('response', (_dialog, response) => {
                if (response === 'remove')
                    this._mgmtRow?.emit('device-action', DeviceManagementAction.Remove, device.id);
            });

            dialog.present(this);
        });
        actionGroup.add_action(removeAction);

        row.insert_action_group('device', actionGroup);
        button.menu_model = menu;

        const routingItem = Gio.MenuItem.new(_('Set as Playback Device'), 'device.routing');
        const connectItem = Gio.MenuItem.new(_('Connect'), 'device.connect');
        const disconnectItem = Gio.MenuItem.new(_('Disconnect'), 'device.disconnect');
        const removeItem = Gio.MenuItem.new(_('Remove'), 'device.remove');

        row.menu = menu;
        row.connectItem = connectItem;
        row.disconnectItem = disconnectItem;
        row.removeItem = removeItem;
        if (this._mgmtRow.config.hasRoutingControl)
            row.routingItem = routingItem;


        this._updateDeviceMenu(row, device);

        spinner.bind_property(
            'visible',
            button,
            'visible',
            GObject.BindingFlags.INVERT_BOOLEAN | GObject.BindingFlags.SYNC_CREATE
        );

        if (this._mgmtRow.config.hasRoutingIndicator) {
            row.add_suffix(routeIcon);
            row.routeIcon = routeIcon;
        }

        row.add_suffix(spinner);
        row.add_suffix(button);

        row.spinner = spinner;
        return row;
    }

    _updateDeviceMenu(row, device) {
        const menu = row.menu;

        menu.remove_all();

        if (device.connected) {
            const isRouteDevice = this._routeDevice === device.id;
            if (this._mgmtRow.config.hasRoutingControl && !isRouteDevice)
                menu.append_item(row.routingItem);

            menu.append_item(row.disconnectItem);
            menu.append_item(row.removeItem);
        } else {
            menu.append_item(row.connectItem);
            menu.append_item(row.removeItem);
        }
    }

    updateRouteDevice(id) {
        if (!this._mgmtRow.config.hasRoutingIndicator && !this._mgmtRow.config.hasRoutingControl)
            return;

        if (!id || this._routeDevice === id)
            return;

        this._routeDevice = id;

        for (const [deviceId, info] of this._rows) {
            const isConnectedRow = this._connectedRows.includes(info.row);
            const isRouteDevice = deviceId === id;

            if (this._mgmtRow.config.hasRoutingIndicator) {
                info.row.routeIcon.visible = isConnectedRow && isRouteDevice &&
                            !info.row.spinner.visible;
            }

            if (this._mgmtRow.config.hasRoutingControl)
                this._updateDeviceMenu(info.row, {id: deviceId, connected: isConnectedRow});
        }
    }

    updateOwnDevice(id) {
        if (!id || this._ownDevice === id)
            return;

        this._ownDevice = id;
        this.updateDevices(this._mgmtRow.deviceArr);
    }
});

export const DeviceManagementRow = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_DeviceManagementRow',
    Signals: {
        'device-action': {param_types: [GObject.TYPE_INT, GObject.TYPE_STRING]},
    },
    Properties: {
        'active': GObject.ParamSpec.boolean('active', '', '', GObject.ParamFlags.READWRITE, false),
        'pair-mode': GObject.ParamSpec.boolean('pair-mode', '', '',
            GObject.ParamFlags.READWRITE, false),
        'active-fixed': GObject.ParamSpec.boolean('active-fixed', '', '',
            GObject.ParamFlags.READWRITE, false),
    },
}, class DeviceManagementRow extends Adw.ActionRow {
    _init(window, gtxt, deviceArr, ownDevice, routeDevice, config = {}) {
        super._init();
        this.config = {
            hasMultipointSwitch: true,
            maxConnected: 2,
            hasPairMode: false,
            hasRoutingIndicator: false,
            hasRoutingControl: false,
            hasActiveFix: false,
            showMac: true,
            ...config,
        };

        const _ = gtxt;
        this.title = _('Allow Connections to Multiple Devices');
        this.gtxt = gtxt;
        this.deviceArr = deviceArr.map(device => ({...device}));
        this._active = false;

        const box = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 12,
            valign: Gtk.Align.CENTER,
        });

        this._button = new Gtk.Button({
            icon_name: 'bbm-device-mgmt-symbolic',
            valign: Gtk.Align.CENTER,
            css_classes: ['circular'],
            tooltip_text: _('Manage Devices'),
        });

        box.append(this._button);

        if (this.config.hasMultipointSwitch) {
            this._switch = new Gtk.Switch({
                valign: Gtk.Align.CENTER,
            });

            this.bind_property(
                'active',
                this._switch,
                'active',
                GObject.BindingFlags.BIDIRECTIONAL | GObject.BindingFlags.SYNC_CREATE
            );

            this._switch.bind_property(
                'active',
                this._button,
                'sensitive',
                GObject.BindingFlags.SYNC_CREATE
            );

            box.append(this._switch);
        }

        this._dialog = new DeviceManagementDialog(this, ownDevice, routeDevice);
        this._button.connect('clicked', () => this._dialog.present(window));
        this.add_suffix(box);
    }

    get active() {
        return this._active;
    }

    set active(value) {
        if (this._active === value)
            return;

        this._active = value;
        this.notify('active');
    }

    _deviceArrEqual(a, b) {
        if (a.length !== b.length)
            return false;

        return a.every((device, i) => {
            const other = b[i];

            return device.id === other.id &&
                device.name === other.name &&
                device.connected === other.connected &&
                device.state === other.state;
        });
    }

    updateDevices(deviceArr) {
        if (this._deviceArrEqual(this.deviceArr, deviceArr))
            return;

        this.deviceArr = deviceArr.map(device => ({...device}));
        this._dialog?.updateDevices(deviceArr);
    }

    updateRouteDevice(id) {
        this._dialog?.updateRouteDevice(id);
    }

    updateOwnDevice(id) {
        this._dialog?.updateOwnDevice(id);
    }
});

