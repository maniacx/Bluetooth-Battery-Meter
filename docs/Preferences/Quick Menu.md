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

## Show battery icon for Bluetooth devices
<br>
<img src="{{ 'assets/images/preferences/quick-menu/qc-battery-icon.png' | relative_url }}" width="50%">

---

## Show Bluetooth device battery percentage
<br>
<img src="{{ 'assets/images/preferences/quick-menu/qc-battery-text.png' | relative_url }}" width="50%">

## Display battery level icon before text
When both, Battery Percentage Text and Battery Level Icon are enabled, Setting this feature to enabled with display Text after Icon, and vice versa
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


