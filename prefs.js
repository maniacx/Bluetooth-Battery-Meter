'use strict';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import {gettext as _, ExtensionPreferences}
    from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {QuickSettings} from './preferences/quickSettings.js';
import {Indicator} from './preferences/indicator.js';
import {BatteryWidgetSettings} from './preferences/batteryWidgetSettings.js';
import {Device} from './preferences/device.js';
import {UpowerDevices} from './preferences/upowerDevices.js';
import {Airpods} from './preferences/devices/airpods/devicePrefs.js';
import {Sony} from './preferences/devices/sony/devicePrefs.js';
import {GattBas} from './preferences/gattBas.js';
import {About} from './preferences/about.js';

Gio._promisify(Gio.DBusProxy, 'new');
Gio._promisify(Gio.DBusProxy, 'new_for_bus');
Gio._promisify(Gio.DBusProxy.prototype, 'call');
Gio._promisify(Gio.DBusConnection.prototype, 'call');

export default class BluetoothBatteryMeterPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const iconTheme = Gtk.IconTheme.get_for_display(window.get_display());
        const iconsDirectory = this.dir.get_child('icons').get_path();
        iconTheme.add_search_path(iconsDirectory);

        const useNavigationSplitView = true;
        if (useNavigationSplitView) {
            window.set_default_size(900, 700);
            this._switchToNavigationSplitViews(window);
        } else {
            window.set_default_size(650, 700);
            this._toastOverlay = null;
            this._addPage = (PreferencesPage, ...args) => window.add(new PreferencesPage(...args));
        }

        const settings = this.getSettings();
        this._addPage(QuickSettings, settings);
        this._addPage(Indicator, settings);
        this._addPage(BatteryWidgetSettings, settings);
        this._addPage(Device, settings);
        this._addPage(UpowerDevices, settings);
        this._addPage(Airpods, settings);
        this._addPage(Sony, settings);
        this._addPage(GattBas, settings);
        this._addPage(About, this);
    }

    _switchToNavigationSplitViews(window) {
        // Add dummy Adw.PreferencesPage to avoid logs spamming
        const dummyPrefsPage = new Adw.PreferencesPage();
        window.add(dummyPrefsPage);

        // Add AdwNavigationSplitView and componenents
        const splitView = new Adw.NavigationSplitView({
            hexpand: true,
            vexpand: true,
            sidebar_width_fraction: 0.277,
        });
        const breakpointBin = new Adw.BreakpointBin({
            width_request: 100,
            height_request: 100,
        });
        const breakpoint = new Adw.Breakpoint();
        breakpoint.set_condition(Adw.BreakpointCondition.parse('max-width: 565px'));
        breakpoint.add_setter(splitView, 'collapsed', true);
        breakpointBin.add_breakpoint(breakpoint);
        breakpointBin.set_child(splitView);
        window.set_content(breakpointBin);

        // AdwNavigationSplitView Sidebar configuration
        const splitViewSidebar = new Adw.NavigationPage({
            title: _('Bluetooth Battery Meter'),
        });
        const sidebarToolbar = new Adw.ToolbarView();
        const sidebarHeader = new Adw.HeaderBar();
        const sidebarBin = new Adw.Bin();
        this._sidebarListBox = new Gtk.ListBox();
        this._sidebarListBox.add_css_class('navigation-sidebar');
        sidebarBin.set_child(this._sidebarListBox);
        sidebarToolbar.set_content(sidebarBin);
        sidebarToolbar.add_top_bar(sidebarHeader);
        splitViewSidebar.set_child(sidebarToolbar);
        splitView.set_sidebar(splitViewSidebar);

        // Content configuration
        const splitViewContent = new Adw.NavigationPage();
        this._contentToastOverlay = new Adw.ToastOverlay();
        const contentToolbar = new Adw.ToolbarView();
        const contentHeader = new Adw.HeaderBar();
        const stack = new Gtk.Stack({transition_type: Gtk.StackTransitionType.NONE});
        contentToolbar.set_content(stack);
        contentToolbar.add_top_bar(contentHeader);
        this._contentToastOverlay.set_child(contentToolbar);
        splitViewContent.set_child(this._contentToastOverlay);
        splitView.set_content(splitViewContent);

        this._firstPageAdded = false;
        this._addPage = (PreferencesPage, ...args) => {
            const page = new PreferencesPage(...args);
            const row = new Gtk.ListBoxRow();
            row._name = page.get_name();
            row._title = page.get_title();
            row._id = row._name.toLowerCase().replace(/\s+/g, '-');
            const rowIcon = new Gtk.Image({icon_name: page.get_icon_name()});
            const rowLabel = new Gtk.Label({label: row._title, xalign: 0});
            const box = new Gtk.Box(
                {spacing: 12, margin_top: 12, margin_bottom: 12, margin_start: 6, margin_end: 6});
            box.append(rowIcon);
            box.append(rowLabel);
            row.set_child(box);
            row.set_activatable(true);
            stack.add_named(page, row._id);
            this._sidebarListBox.append(row);
            if (!this._firstPageAdded) {
                splitViewContent.set_title(row._title);
                this._firstPageAdded = true;
            }
        };

        this._sidebarListBox.connect('row-activated', (listBox, row) => {
            splitView.set_show_content(true);
            splitViewContent.set_title(row._title);
            stack.set_visible_child_name(row._id);
        });
    }
}
