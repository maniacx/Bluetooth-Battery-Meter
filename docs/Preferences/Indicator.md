---
layout: default
title: Indicator
parent: Preferences
nav_order: 2
permalink: /preferences/indicator
---


## Indicators
<br>

**Indicator Preferences**
<br>
<img src="{{ 'assets/images/preferences/indicator/indicator-prefs.png' | relative_url }}" width="100%">


## Bluetooth Connection Status Indicator
<br>
<img src="{{ 'assets/images/preferences/indicator/ind-system-icon-prefs.png' | relative_url }}" width="100%">

By default, GNOME shows the Bluetooth Connection Status Indicator whenever one or more Bluetooth devices are connected.
This setting allows you to customize how that indicator behaves:

**Default Behavior:** The icon will follow its original behavior as intended by GNOME.
<img src="{{ 'assets/images/preferences/indicator/status-indicator.png' | relative_url }}" width="40%">
<br>
<br>

**Hide Always:** The Bluetooth Connection Status Indicator icon will always be hidden.
<img src="{{ 'assets/images/preferences/indicator/status-hidden.png' | relative_url }}" width="35%">
<br>
<br>

**Hide Conditionally:** The Bluetooth Connection Status Indicator icon will remain hidden if a Bluetooth device indicator is displayed. If no individual Bluetooth device indicator is shown in the system tray, the Bluetooth Connection Status Indicator icon will be displayed.

Bluetooth Status Icon hidden when Bluetooth device indicator are displayed
<img src="{{ 'assets/images/preferences/indicator/status-hidden.png' | relative_url }}" width="35%">
<br>

Bluetooth Status Icon shown when no Bluetooth device indicators are displayed
<img src="{{ 'assets/images/preferences/indicator/status-normal.png' | relative_url }}" width="25%">
<br>
<br>

## Choose Indicator Mode
<br>
<img src="{{ 'assets/images/preferences/indicator/ind-type-prefs.png' | relative_url }}" width="100%">


**Mode: Off**: Disables the indicator entirely. No battery information will be shown on the panel or system tray.

**Mode: System Tray**: Displays indicators in the GNOME system tray, showing the Bluetooth device’s battery icon and/or percentage.

<br>
<img src="{{ 'assets/images/preferences/indicator/indicator-mode-systemtray.png' | relative_url }}" width="40%">
<br>


**Mode: Panel Button** : Adds a dedicated button to the top panel that displays the Bluetooth device’s battery icon and/or percentage. Clicking the button opens a detailed menu showing battery status, circular battery visuals, and available controls such as ANC or other supported features.

<br>
<img src="{{ 'assets/images/preferences/indicator/indicator-mode-panelbutton.png' | relative_url }}" width="60%">
<br>

---

## System Tray Preferences
<br>
<img src="{{ 'assets/images/preferences/indicator/system-tray-prefs.png' | relative_url }}" width="100%">

---

## System Tray: Show Multiple Battery Indicators per Device
<br>
<img src="{{ 'assets/images/preferences/indicator/indicator-multiple-prefs.png' | relative_url }}" width="100%">

This setting applies to Bluetooth devices that have multiple batteries — for example, Airpods that has separate left, right and charging case battery levels.

When enabled, the extension displays a dedicated battery indicator for each individual battery, providing a clear overview of all components.
<br>
<img src="{{ 'assets/images/preferences/indicator/indicator-multiple.png' | relative_url }}" width="35%">
<br>

When disabled, only a single indicator is shown, representing the most critical (lowest) battery level within that device. This helps keep the panel uncluttered while still showing essential battery information.
<br>
<img src="{{ 'assets/images/preferences/indicator/indicator-single.png' | relative_url }}" width="30%">
<br>

---

## System Tray: Show Detailed Info on Hover
<br>
<img src="{{ 'assets/images/preferences/indicator/indicator-hover-prefs.png' | relative_url }}" width="100%">


**Show Detailed Info on Hover**
When enabled, hovering the mouse pointer over the battery indicator automatically displays a popup with detailed information about connected Bluetooth devices. The popup can show battery levels, icons, and available controls (such as ANC or other supported features) without requiring a click.
This feature is useful for quickly checking device status at a glance.

**Hover Activation Delay**
Specifies how long (in seconds) the mouse pointer must remain over the indicator before the detailed popup appears.
Use this setting to fine-tune responsiveness — shorter delays make the popup appear quickly, while longer delays help avoid accidental activations when moving the cursor across the panel.

<br>
<img src="{{ 'assets/images/preferences/indicator/indicator-hover.png' | relative_url }}" width="50%">

---

## Panel Button Preferences
<br>
<img src="{{ 'assets/images/preferences/indicator/panelbutton-prefs.png' | relative_url }}" width="100%">

---

## Panel Button: Panel Button Indicator Mode
<br>
<img src="{{ 'assets/images/preferences/indicator/panel-single-prefs.png' | relative_url }}" width="100%">

This preference determines the content of the panel button.

**Disabled:** Displays battery level icons for all connected devices within the panel button, allowing you to see multiple devices’ battery statuses at once.
<br>
<img src="{{ 'assets/images/preferences/indicator/panel-all-device.png' | relative_url }}" width="50%">

**Enabled:** Shows information for a single selected device, including its icon and battery percentage in text directly on the panel button. You can switch which device is shown by pinning a different one from the popup menu.
<br>
<img src="{{ 'assets/images/preferences/indicator/panel-single-device.png' | relative_url }}" width="50%">

---

## Panel Button: Show Multiple Battery Indicators Per Device
<br>
<img src="{{ 'assets/images/preferences/indicator/panel-mulibatt-prefs.png' | relative_url }}" width="100%">

This preference determines the content of the panel button for device with multiple batteries.

**Disabled:** When disabled, only a single indicator is shown, representing the most critical (lowest) battery level within that device. This helps keep the panel uncluttered while still showing essential battery information.
<br>
<img src="{{ 'assets/images/preferences/indicator/panel-single-battery.png' | relative_url }}" width="50%">

**Enabled:** When enabled, the extension displays a dedicated battery indicator for each individual battery, providing a clear overview of all components.
<br>
<img src="{{ 'assets/images/preferences/indicator/panel-multi-battery.png' | relative_url }}" width="50%">




