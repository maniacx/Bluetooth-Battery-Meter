---
layout: default
title: Battery Widget Settings
parent: Preferences
nav_order: 3
permalink: /preferences/batterywidget
---


## Battery Widget Settings
<br>
<br>

**Battery Widget Preferences**
<br>
<img src="{{ 'assets/images/preferences/batterywidget/batterywidget-prefs.png' | relative_url }}" width="100%">

---

## Show icon only (Hide Bar/Dots)
<br>
<img src="{{ 'assets/images/preferences/batterywidget/show-icon-only-prefs.png' | relative_url }}" width="100%">

**Enabled:** When enabled, the extension hides the battery level visualization (bar or dots) and displays only the Bluetooth device icon.
This mode is best used together with the “Display battery percentage as text” option for a cleaner, minimal look while still retaining key battery information.

Below picture shows icon when this settings is enabled.
<br>
<img src="{{ 'assets/images/preferences/batterywidget/show-icon-without-level.png' | relative_url }}" width="35%">

Best to be use this setting with **Display battery percentage as text** settings enabled and it will look like the picture shown below.
<br>
<img src="{{ 'assets/images/preferences/batterywidget/show-icon-without-level-with-text.png' | relative_url }}" width="35%">
<br>
<br>
**Disabled:** When disabled, the icon will include a battery bar or dot indicator to represent the device’s charge level visually as shown below.
<br>
<img src="{{ 'assets/images/preferences/batterywidget/show-icon-with-level.png' | relative_url }}" width="35%">


---

## Display battery percentage as text
<br>
<img src="{{ 'assets/images/preferences/batterywidget/show-text-prefs.png' | relative_url }}" width="100%">

Display battery percentage in text next to the indicator icon. 
<br>
<img src="{{ 'assets/images/preferences/batterywidget/indicator-text.png' | relative_url }}" width="50%">
<br>
<br>

---

## **Indicator: Battery Level Type**
<br>
<br>
**Extension Preferences**
<br>
<br>
<img src="{{ 'assets/images/preferences/batterywidget/level-indicator-type-prefs.png' | relative_url }}" width="100%">
<br>

Available levels types are Battery Level Bar and Battery Level Bar.
- **Battery Level Bar:** display a battery bar below the device icon.
- **Battery Level Dots:** displays dots representing level of battery.


**Battery Level Bar Mode**

<img src="{{ 'assets/images/preferences/batterywidget/level-bar-left.png' | relative_url }}" width="10%">
<img src="{{ 'assets/images/preferences/batterywidget/level-bar.png' | relative_url }}" width="10%">
<img src="{{ 'assets/images/preferences/batterywidget/level-bar-right.png' | relative_url }}" width="10%">


**Battery Level Dots Mode**

<img src="{{ 'assets/images/preferences/batterywidget/level-50-dot.png' | relative_url }}" width="10%">

| Symbolic | Battery Level |
|:-:|:-:|
| <img src="{{ 'assets/images/preferences/batterywidget/level-100-dot.png' | relative_url }}" width="15%"> | Approx. Fully Charge<br>Battery level: 100 - 76%  |
| <img src="{{ 'assets/images/preferences/batterywidget/level-75-dot.png' | relative_url }}" width="15%"> | Battery level: 75-51% |
| <img src="{{ 'assets/images/preferences/batterywidget/level-50-dot.png' | relative_url }}" width="15%"> | Battery level: 50-26% |
| <img src="{{ 'assets/images/preferences/batterywidget/level-25-dot.png' | relative_url }}" width="15%"> | Battery level: 25-20% |
| <img src="{{ 'assets/images/preferences/batterywidget/level-20-dot.png' | relative_url }}" width="15%"> | Warning! Below 20%<br>Battery level: 20-0% |

---

## Level Bar Mode: Battery Bar Postion
<br>
<img src="{{ 'assets/images/preferences/batterywidget/bar-position-prefs.png' | relative_url }}" width="100%">

Postion of Level Bar in respect to device icon.

<div style="
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 20px;
  background: transparent;
">

  <figure style="margin: 0; text-align: center;">
    <figcaption style="font-weight: bold; margin-bottom: 4px;">Left</figcaption>
    <img src="{{ 'assets/images/preferences/batterywidget/level-bar-left.png' | relative_url }}"
         alt="Left" style="height: 70px; width: auto;">
  </figure>

  <figure style="margin: 0; text-align: center;">
    <figcaption style="font-weight: bold; margin-bottom: 4px;">Below</figcaption>
    <img src="{{ 'assets/images/preferences/batterywidget/level-bar.png' | relative_url }}"
         alt="Below" style="height: 70px; width: auto;">
  </figure>

  <figure style="margin: 0; text-align: center;">
    <figcaption style="font-weight: bold; margin-bottom: 4px;">Right</figcaption>
    <img src="{{ 'assets/images/preferences/batterywidget/level-bar-right.png' | relative_url }}"
         alt="Right" style="height: 70px; width: auto;">
  </figure>

</div>


---

## Device Icon Size
<br>
<img src="{{ 'assets/images/preferences/batterywidget/icon-size-prefs.png' | relative_url }}" width="100%">

Allows user to change device icon size.

**100 %**
<br>
<img src="{{ 'assets/images/preferences/batterywidget/icon-size-100.png' | relative_url }}" width="50%">
<br>
<br>


**70 %**
<br>
<img src="{{ 'assets/images/preferences/batterywidget/icon-size-70.png' | relative_url }}" width="50%">
<br>
<br>


---
## **Battery Indicator Color Scheme**
<br>
<img src="{{ 'assets/images/preferences/batterywidget/indicator-batlevel-scheme-prefs.png' | relative_url }}" width="100%">
<br>

This setting provides three options to customize the color scheme of indicator level bar/dots:

- **Symbolic Color:** 
  The color of the bar/dot will match the system indicator's foreground color (typically black or white, depending on the theme) when the battery percentage is greater than 20%.
  If the battery percentage falls below 20%, the bar/dot will use the system's warning color (usually orange, depending on the theme).

<img src="{{ 'assets/images/preferences/batterywidget/level-bar.png' | relative_url }}" width="10%">
<img src="{{ 'assets/images/preferences/batterywidget/color-20-bar.png' | relative_url }}" width="10%">
<img src="{{ 'assets/images/preferences/batterywidget/level-50-dot.png' | relative_url }}" width="10%">
<img src="{{ 'assets/images/preferences/batterywidget/level-20-dot.png' | relative_url }}" width="10%">

- **Color:** 
  The color of the bar/dot will be **green** when the battery percentage is above 20%, and **orange** when it is 20% or lower.

<img src="{{ 'assets/images/preferences/batterywidget/color-50-bar.png' | relative_url }}" width="10%">
<img src="{{ 'assets/images/preferences/batterywidget/color-20-bar.png' | relative_url }}" width="10%">
<img src="{{ 'assets/images/preferences/batterywidget/color-50-dot.png' | relative_url }}" width="10%">
<img src="{{ 'assets/images/preferences/batterywidget/level-20-dot.png' | relative_url }}" width="10%">

- **Customize:**
  Allows you to define custom colors for different battery level ranges.
  
<img src="{{ 'assets/images/preferences/batterywidget/customize-indicator-prefs.png' | relative_url }}" width="100%">

---
## **Circular Widget Color Scheme**
<br>
<img src="{{ 'assets/images/preferences/batterywidget/circle-prefs.png' | relative_url }}" width="100%">
<br>


Similar to indicator level widget color, this setting provides three options to customize the color scheme of circular battery level widget.


<div style="
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 20px;
  background: transparent;
">

  <figure style="margin: 0; text-align: center;">
    <figcaption style="font-weight: bold; margin-bottom: 4px;">Symbolic</figcaption>
    <img src="{{ 'assets/images/preferences/batterywidget/circle-sym.png' | relative_url }}"
         alt="Left" style="height: 100px; width: auto;">
  </figure>

  <figure style="margin: 0; text-align: center;">
    <figcaption style="font-weight: bold; margin-bottom: 4px;">Color</figcaption>
    <img src="{{ 'assets/images/preferences/batterywidget/circle-color.png' | relative_url }}"
         alt="Below" style="height: 100px; width: auto;">
  </figure>

  <figure style="margin: 0; text-align: center;">
    <figcaption style="font-weight: bold; margin-bottom: 4px;">Customize</figcaption>
    <img src="{{ 'assets/images/preferences/batterywidget/circle-custom.png' | relative_url }}"
         alt="Right" style="height: 100px; width: auto;">
  </figure>

</div>
