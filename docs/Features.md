---
layout: default
title: Notes / Features
nav_order: 2
permalink: /features
---

# Important Notes

---

{: .note }
>
> * Certain Bluetooth devices report battery levels in different increments.
> * One would expect a continuous discharge reading like 100, 99, 98, 97... down to 0.
> * However manufacturers often design devices to report in specific increments.
> * Some devices may report battery levels in increments of 5 (e.g., 100, 95, 90, 85... to 0)
> * Some devices may report battery levels in increments of 10 (e.g., 100, 90, 80, 70... to 0)
> * Some devices may report battery levels in increments of 20 (e.g., 100, 80, 60, 40... to 0)
> * For Quick settings percentage displayed in text (when enabled), might observe battery level stuck at a percentage example 100% for a while and later suddenly drop down to 80%, if designed for increment of 20%.

<br>

{: .note }
>
> * Certain Bluetooth devices may not report battery level, and may work only when bluez experimental features are enabled.
> * Most Linux distributions ship with bluez experimental features are disabled, but there are some like Fedora 39 ship with it enabled.
> * If your bluetooth device doesn't show battery level, refer the procedure below to enable bluez experimental feature

# Enable Experimental Bluez

---

* If bluetooth device is not reporting battery level, it could be that it needs Bluez Experimental.

<br>
### Check if experimental feature
* To check if experimental feature is enabled or not by try the following command. It will echo if experimental flag is enabled or disabled.
```bash
bluetoothctl show | grep -q 'PowerState' && echo 'Experimental flag enabled' || echo 'Experimental flag disabled'
```

<br>
### Check if experimental feature
There are several ways to enable experimental feature, the easiest way to enable is to edit system file
```
/etc/bluetooth/main.conf
```
Under `[General]` section add the following line or if the line exist change it from false to true
```
Experimental = true
```
 Restart the bluetooth service using
```
systemctl restart bluetooth
```
Once done check if device displays battery level under `Power` in `Gnome Control Center (Settings)`
<br>
<img src="./assets/images/features/power.png" width="100%">


# Features

---

## **Battery Level vs Icon**

| Icon Meter Level | Battery Level |
|:-:|:-:|
| <img src="./assets/images/features/100-mouse.png" width="15%"> | Approx. Fully Charge<br>Battery level: 100 - 85%  |
| <img src="./assets/images/features/75-mouse.png" width="15%"> | Approx. 75%<br>Battery level: 85-65% |
| <img src="./assets/images/features/50-mouse.png" width="15%"> | Approx. 50%<br>Battery level: 65-35% |
| <img src="./assets/images/features/25-mouse.png" width="15%"> | Approx. 25%<br>Battery level: 35-20% |
| <img src="./assets/images/features/20-mouse.png" width="15%"> | Warning! Below 20%<br>Battery level: 20-10% |
| <img src="./assets/images/features/10-mouse.png" width="15%"> | Warning! Below 10%<br>Battery level: 10-0%|

---

## **Supported Device Type and Icon**

| Icons Types | Reported by BT Client |
|:-:|:-:|
| <img src="./assets/images/features/input-mouse.png" width="15%"> | <b>input-mouse</b> |
| <img src="./assets/images/features/input-keyboard.png" width="15%"> | <b>input-keyboard</b> |
| <img src="./assets/images/features/input-gaming.png" width="15%"> | <b>input-gaming</b> |
| <img src="./assets/images/features/input-tablet.png" width="15%"> | <b>input-tablet</b> |
| <img src="./assets/images/features/audio-headphone.png" width="15%"> | <b>audio-headphone</b> |
| <img src="./assets/images/features/audio-headphone.png" width="15%"> | <b>audio-headset</b> |
| <img src="./assets/images/features/audio-speakers.png" width="15%"> | <b>audio-speakers</b> |

---

## **System Tray Indicators**
This extension provide information by displaying battery Levels of Bluetooth device as a Meter. This help taking minimum space on the system panel without being very intrusive.
<br>
These indicator icon can also be disabled in Extension Preferences
<br>
<br>
**Extension Preferences**
<br>
<img src="./assets/images/features/settings-indicators.png" width="100%">
<br>
<br>
**System Tray Indicators**
<br>
<img src="./assets/images/features/system-tray.png" width="50%">

---

## **Display Battery Level Icon In Bluetooth Quick Settings Menu**
An option to add/remove Battery Level icon in Bluetooth quick settings menu. 
<br>
<br>
**Extension Preferences**
<br>
<img src="./assets/images/features/settings-icon.png" width="100%">
<br>
<br>
**Bluetooth Quick Settings**
<br>
<img src="./assets/images/features/qc-battery-icon.png" width="50%">

---

## **Display Battery Percentage In Text In Bluetooth Quick Settings Menu**
An option to add/remove Battery Percentage in text in Bluetooth quick settings menu. 
<br>
<br>
**Extension Preferences**
<br>
<img src="./assets/images/features/settings-text.png" width="100%">
<br>
<br>
**Bluetooth Quick Settings**
<br>
<img src="./assets/images/features/qc-battery-text.png" width="50%">

---

## **Swap Battery Percentage Text With Icon In Bluetooth Quick Settings Menu**
When both, Battery Percentage Text and Battery Level Icon are enabled, Setting this feature to enabled with display Text after Icon, and vice versa
<br>
<br>
**Extension Preferences**
<br>
<img src="./assets/images/features/settings-swap.png" width="100%">
<br>
<br>
**Bluetooth Quick Settings Icon Before Text Disabled**
<br>
<img src="./assets/images/features/qc-battery-text-icon.png" width="50%">
<br>
<br>
**Bluetooth Quick Settings Icon Before Text Enabled**
<br>
<img src="./assets/images/features/qc-battery-icon-text.png" width="50%">



