---
layout: default
title: Device
parent: Preferences
nav_order: 4
permalink: /preferences/device
---


## Device Settings
<br>
<br>

**Device Preferences**
<br>
<img src="{{ 'assets/images/preferences/device/device-prefs.png' | relative_url }}" width="100%">

## Configuration By Device

<img src="{{ 'assets/images/preferences/device/configure-device.png' | relative_url }}" width="80%">

This window allows users to customize device-specific configurations. These settings are stored in **gsettings** and are restored automatically if the Bluetooth device is re-paired.

- **Configure Button:**
  Allows users to customize the icon type (e.g., headphones, earbuds), toggle indicator visibility, and enable/disable quick settings battery level reporting.

- **Delete Button:** 
  If a Bluetooth device is no longer paired or used, the stored configuration can be deleted. This ensures no unnecessary settings remain in **gsettings**.

---
## Configure

This window provides options to customize device settings and indicates whether **battery reporting** is supported. The available options differ based on the device's battery reporting capabilities.

- **For devices with battery reporting:** 

  <img src="{{ 'assets/images/preferences/device/configure-battery.png' | relative_url }}" width="80%">

- **For devices without battery reporting:** 

  <img src="{{ 'assets/images/preferences/device/configure-non-battery.png' | relative_url }}" width="80%">

---

## Configuration By Device: Select Icon

This setting allows users to customize the device icon displayed in both the quick settings menu and the indicator. A wide range of icons is available to choose from.

<img src="{{ 'assets/images/preferences/device/configure-icon.png' | relative_url }}" width="80%">

In the example below, the icon is set to **earbuds**, and the changes are applied to both the **indicator** and the **quick settings** icon.

- **Indicator Icon:** 

  <img src="{{ 'assets/images/preferences/device/indicator.png' | relative_url }}" width="20%">

- **Quick Settings Icon:** 

  <img src="{{ 'assets/images/preferences/device/qs.png' | relative_url }}" width="60%">

---

## Quick Menu: Display Battery Level

<img src="{{ 'assets/images/preferences/device/qs-no-level.png' | relative_url }}" width="60%">

This setting provides option to hide battery information display in quick menu.
This is particularly useful if an unsupported Bluetooth device (not yet supported by BlueZ) reports incorrect battery levels, allowing users to hide it from the quick settings and the indicator.



It is particularly useful for unsupported Bluetooth devices (not fully supported by BlueZ) that may report incorrect battery levels, helping users avoid misleading information.

---

## Indicator: Configure Indicator

<img src="{{ 'assets/images/preferences/device/configure-hide-indicator.png' | relative_url }}" width="80%">

This setting allows users to customize how the indicator is displayed, particularly for devices with inaccurate or missing battery level reporting.

### Available Options:
- **Do not show icon:** 
  Completely hides the indicator.

- **Show icon without battery level:** 
  Displays the indicator without battery information, showing only the icon with two triangles at the bottom. 
  Useful for devices that don’t report battery levels or report them incorrectly but still indicate a connection. 
  For example, a connected externally powered Bluetooth speaker will show a speaker icon in the system tray. 

  <img src="{{ 'assets/images/preferences/device/indicator-fixed.png' | relative_url }}" width="25%">

- **Show icon with battery level:**
  Displays the indicator with battery level information, including a bar or dots if the battery level is reported. 

  <img src="{{ 'assets/images/preferences/device/indicator.png' | relative_url }}" width="25%">

