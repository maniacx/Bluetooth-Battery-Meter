---
layout: default
title: Quick Menu
parent: Preferences
nav_order: 1
permalink: /preferences/quick-menu
---

## Quick Menu battery widgets and sorting
<br>
<br>

**Bluetooth Quick Menu**
<br>
<img src="{{ 'assets/images/preferences/quick-menu/qc-battery-text-icon.png' | relative_url }}" width="50%">


**Quick Menu Preferences**
<br>
<img src="{{ 'assets/images/preferences/quick-menu/qc-prefs.png' | relative_url }}" width="100%">

---
## Enable popup submenu widget mode

{: .important-title }
> Introduced in Version 40

<br>
<img src="{{ 'assets/images/preferences/quick-menu/qc-submenu-prefs.png' | relative_url }}" width="100%">

When enabled, the Bluetooth quick menu replaces the inline battery display with a dedicated popup submenu. This submenu provides a richer interface, featuring circular battery indicators, device icons, and advanced controls such as ANC and other supported headphone features.

Pros: Ideal for advanced Bluetooth devices (like AirPods) that support additional controls, providing a cleaner and more informative layout.

Cons: With this mode enabled, the connect/disconnect action is moved to a dedicated button, since the submenu adds an “expand” button to open the detailed view. This design prevents accidental disconnects when users try to expand the submenu but click near the edge of the device entry.


### **Disabled**
<br>
<img src="{{ 'assets/images/preferences/quick-menu/qc-battery-icon-text.png' | relative_url }}" width="50%">
<br>
<br>
### **Enabled**
<br>
<img src="{{ 'assets/images/preferences/quick-menu/qc-submenu.png' | relative_url }}" width="50%">
<br>
<br>

---

## Show battery icon for Bluetooth devices
<br>
<img src="{{ 'assets/images/preferences/quick-menu/qc-show-battery-icon-prefs.png' | relative_url }}" width="100%">

Shows a battery icon indicating the charge level of supported Bluetooth devices in the Bluetooth quick menu.

<br>
<img src="{{ 'assets/images/preferences/quick-menu/qc-battery-icon.png' | relative_url }}" width="50%">

---

## Show Bluetooth device battery percentage
<br>
<img src="{{ 'assets/images/preferences/quick-menu/qc-show-battery-text-prefs.png' | relative_url }}" width="100%">

Shows the battery percentage of supported Bluetooth devices as text in the Bluetooth quick menu.
<br>
<img src="{{ 'assets/images/preferences/quick-menu/qc-battery-text.png' | relative_url }}" width="50%">

---

## Display battery level icon before text
<br>
<img src="{{ 'assets/images/preferences/quick-menu/qc-swap-icon-text-prefs.png' | relative_url }}" width="100%">

When both Battery Percentage Text and Battery Level Icon are enabled, this setting controls their display order. When disabled, the battery icon appears before the text (icon on the left, text on the right). When enabled, their positions are swapped, showing the text before the icon.
<br>
<br>

### **Disabled**
<br>
<img src="{{ 'assets/images/preferences/quick-menu/qc-battery-icon-text.png' | relative_url }}" width="50%">
<br>
<br>
### **Enabled**
<br>
<img src="{{ 'assets/images/preferences/quick-menu/qc-battery-text-icon.png' | relative_url }}" width="50%">
<br>
<br>

---

## Sort devices by connection history
<br>
<img src="{{ 'assets/images/preferences/quick-menu/qc-sort.png' | relative_url }}" width="100%">
<br>
 This setting allows you to sort Bluetooth devices based on their recent connection activity.

### **When disabled:** 
The device list follows GNOME’s default behavior: Both groups are sorted alphabetically.
    * Connected devices are shown at the top.
    * Paired (but disconnected) devices appear at the bottom.
    * Within each group, devices are sorted alphabetically.
  
In the example below, the devices are sorted alphabetically:
 * E - Edifier R1380DB
 * J - Jabra Elite 75t
 * S - Selfie
<br>
<img src="{{ 'assets/images/preferences/quick-menu/qc-sort-disabled.png' | relative_url }}" width="50%">
<br>

### **When enabled:** 
Devices are sorted by their recent connection status:
  * Connected devices appear at the top, sorted by most recent connection.
  * Paired (disconnected) devices are listed below, sorted by the time they were last disconnected, with the most recent first.
  
In the example below, devices are listed from most recently to least recently used:
 * Selfie - Most recently disconnected
 * Edifier R1380DB - Disconnected before Selfie
 * Jabra Elite 75t - Oldest disconnected device
    

<br>
<img src="{{ 'assets/images/preferences/quick-menu/qc-sort-enabled.png' | relative_url }}" width="50%">
<br>

> **Note:** BlueZ does not provide connection/disconnection times. The extension records these times only when enabled. Initially, all devices will appear unsorted until connection and disconnection events occur.


