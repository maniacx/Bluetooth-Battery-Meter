---
layout: default
title: Indicator
parent: Preferences
nav_order: 2
permalink: /preferences/indicator
---


## Indicator Settings
<br>
<br>

**Bluetooth Indicator**
<br>
<img src="{{ 'assets/images/preferences/indicator/indicator.png' | relative_url }}" width="40%">

**Indicator Preferences**
<br>
<img src="{{ 'assets/images/preferences/indicator/indicator-prefs.png' | relative_url }}" width="100%">

---

## Enable battery indicators for Bluetooth devices
Displays Bluetooth device icon with battery level in system tray without being very intrusive.
<br>
<img src="{{ 'assets/images/preferences/indicator/indicator.png' | relative_url }}" width="40%">

---

## Display battery percentage as text
Display battery percentage in text next to the indicator icon. 
<br>
<img src="{{ 'assets/images/preferences/indicator/indicator-text.png' | relative_url }}" width="50%">
<br>
<br>

---

## Bluetooth Connection Status Indicator
<br>
**Default GNOME behavior:** When one or more Bluetooth devices are connected, the Bluetooth Connection Status Indicator will be displayed.
<br>
<br>
<img src="{{ 'assets/images/preferences/indicator/status-normal.png' | relative_url }}" width="20%">
<br>

This setting provides three options:
- **Default Behavior:** The icon will follow its original behavior as intended by GNOME.
<img src="{{ 'assets/images/preferences/indicator/status-indicator.png' | relative_url }}" width="40%">
<br>
- **Hide Always:** The Bluetooth Connection Status Indicator icon will always be hidden.
    <img src="{{ 'assets/images/preferences/indicator/status-hidden.png' | relative_url }}" width="40%">
    <br>

- **Hide Conditionally:** The Bluetooth Connection Status Indicator icon will remain hidden if a Bluetooth device indicator is displayed. If no individual Bluetooth device indicator is shown in the system tray, the Bluetooth Connection Status Indicator icon will be displayed.

    Bluetooth Status Icon hidden when Bluetooth device indicator are displayed
    <img src="{{ 'assets/images/preferences/indicator/status-hidden.png' | relative_url }}" width="40%">
    <br>

    Bluetooth Status Icon shown when no Bluetooth device indicators are displayed
    <img src="{{ 'assets/images/preferences/indicator/status-normal.png' | relative_url }}" width="20%">
    <br>

<br>

---

## **Indicator: Battery Level Type**
<br>
<br>
**Extension Preferences**
<br>
<br>
<img src="{{ 'assets/images/preferences/indicator/settings-indicator-level-type.png' | relative_url }}" width="100%">
<br>

Available levels types are Battery Level Bar and Battery Level Bar.
- **Battery Level Bar:** display a battery bar below the device icon.
- **Battery Level Dots:** displays dots representing level of battery.


**Battery Level Bar Mode**

<img src="{{ 'assets/images/preferences/indicator/level-bar.png' | relative_url }}" width="10%">


**Battery Level Dots Mode**

<img src="{{ 'assets/images/preferences/indicator/level-50-dot.png' | relative_url }}" width="10%">

| Symbolic | Battery Level |
|:-:|:-:|
| <img src="{{ 'assets/images/preferences/indicator/level-100-dot.png' | relative_url }}" width="15%"> | Approx. Fully Charge<br>Battery level: 100 - 76%  |
| <img src="{{ 'assets/images/preferences/indicator/level-75-dot.png' | relative_url }}" width="15%"> | Battery level: 75-51% |
| <img src="{{ 'assets/images/preferences/indicator/level-50-dot.png' | relative_url }}" width="15%"> | Battery level: 50-26% |
| <img src="{{ 'assets/images/preferences/indicator/level-25-dot.png' | relative_url }}" width="15%"> | Battery level: 25-20% |
| <img src="{{ 'assets/images/preferences/indicator/level-20-dot.png' | relative_url }}" width="15%"> | Warning! Below 20%<br>Battery level: 20-0% |

---
## **Indicator: Battery Level Color Scheme**
<br>
<img src="{{ 'assets/images/preferences/indicator/settings-indicator-level-scheme.png' | relative_url }}" width="100%">
<br>

This setting provides three options to customize the color scheme:

- **Symbolic Color:** 
  The color of the bar/dot will match the system indicator's foreground color (typically black or white, depending on the theme) when the battery percentage is greater than 20%.
  If the battery percentage falls below 20%, the bar/dot will use the system's warning color (usually orange, depending on the theme).

<img src="{{ 'assets/images/preferences/indicator/level-bar.png' | relative_url }}" width="10%">
<img src="{{ 'assets/images/preferences/indicator/color-20-bar.png' | relative_url }}" width="10%">
<img src="{{ 'assets/images/preferences/indicator/level-50-dot.png' | relative_url }}" width="10%">
<img src="{{ 'assets/images/preferences/indicator/level-20-dot.png' | relative_url }}" width="10%">

- **Color:** 
  The color of the bar/dot will be **green** when the battery percentage is above 20%, and **orange** when it is 20% or lower.

<img src="{{ 'assets/images/preferences/indicator/color-50-bar.png' | relative_url }}" width="10%">
<img src="{{ 'assets/images/preferences/indicator/color-20-bar.png' | relative_url }}" width="10%">
<img src="{{ 'assets/images/preferences/indicator/color-50-dot.png' | relative_url }}" width="10%">
<img src="{{ 'assets/images/preferences/indicator/level-20-dot.png' | relative_url }}" width="10%">

- **Customize:**
  Allows you to define custom colors for different battery level ranges.
  
<img src="{{ 'assets/images/preferences/indicator/settings-indicator-level-customize.png' | relative_url }}" width="100%">


