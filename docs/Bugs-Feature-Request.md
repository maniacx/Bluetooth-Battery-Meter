---
layout: default
title: Bugs / Feature Request
nav_order: 4
permalink: /bugs-feature-request
---

# Bugs and Debugging

Encountering issues with this extension? Please follow the steps below for troubleshooting and reporting:

### Battery Level Not Displaying for Bluetooth Device
1. **Verify Display in Gnome Control Center**: Check if the battery level is visible in **Gnome Control Center (Settings) > Power** tab.
2. **Enable Bluez Experimental Feature**: If not displayed, your Bluetooth device might require the Bluez experimental feature for battery reporting. [Enable Bluez experimental feature](./features#enable-experimental-bluez) and recheck in **Gnome Control Center**.
3. **Check Device Compatibility**: If the battery level still does not show, test the device with other OS/devices (e.g., iOS/Android). Consult the OEM website/documentation to confirm if your Bluetooth device supports battery level reporting.
4. **Issue with Bluez**: If the device supports battery reporting but it's not visible in Gnome Control Center, conduct further tests and consider raising an issue on the [Bluez website](URL).
5. **Extension-Specific Issue**: If the battery level appears correctly in Gnome Control Center but not in this extension, please [Raise an issue on GitHub](https://github.com/maniacx/Bluetooth-Battery-Meter/issues){: .btn .btn-purple .v-align-bottom .fs-2}.

**Gnome Control Center**
<img src="./assets/images/bugs/power.png" width="100%">

### Battery Level Inaccuracies or Stuck Readings
* **Understanding Battery Reporting Increments**:
  - Bluetooth devices vary in how they report battery levels. Expectations of a continuous decrease (e.g., 100%, 99%, 98%...) might not align with the device's design.
  - Devices may report in increments of 5% (100%, 95%, 90%...), 10% (100%, 90%, 80%...), or even 20% (100%, 80%, 60%...).
* **Observing Quick Settings Percentage**:
  - When enabled, the Quick Settings percentage display might show the battery level being "stuck" at a certain percentage (e.g., 100%) and then suddenly drop (e.g., to 80%) if the device reports in larger increments.
* **Consistency Check**:
  - Verify if the battery level displayed in **Gnome Control Center (Settings) > Power** is consistent with what is shown in this extension. If there is a discrepancy, please [Raise an issue on GitHub](https://github.com/maniacx/Bluetooth-Battery-Meter/issues){: .btn .btn-purple .v-align-bottom .fs-2}.

### GUI issue
1. Check if there are any other Bluetooth Gnome extension installed and enabled that might conflict with this extension.
2. Reset the `gsettings` for this extension. First, disable the extension using the `Extensions` or `Extension Manager` app. To reset `gsettings` for the Bluetooth Battery Meter extension, use the command below in the `terminal`:
```bash
gsettings --schemadir /home/$USER/.local/share/gnome-shell/extensions/Bluetooth-Battery-Meter@maniacx.github.com/schemas reset-recursively org.gnome.shell.extensions.Bluetooth-Battery-Meter
```
3. If the issue still persists, [Raise an issue on Github](https://github.com/maniacx/Bluetooth-Battery-Meter/issues){: .btn .btn-purple .v-align-bottom .fs-2}.
4. When reporting the issue, include the following details:
   * Gnome Version (found in the `about` section of your desktop settings (Gnome Control Center))
   * Operating system (e.g., Ubuntu 23.10)
   * Bluetooth device make, model and type
   
Although there are no logs included in this extension, you can still monitor for any errors in the log by using the following commands in the `terminal`:

For Gnome Shell - logs related to the extension:
```bash
journalctl -f -o cat /usr/bin/gnome-shell
```

For GJS - logs related to extension preferences:
```bash
journalctl -f -o cat /usr/bin/gjs
```

# Feature Request

I have build this extension for me according to my requirements, so the features are limited.
If you want certain feature, please try other extensions that report Bluetooth Battery Level that may fulfill your requirements.
Here are few extensions
* [UPower Battery](https://extensions.gnome.org/extension/5165/upower-battery/) by codilia
* [Bluetooth Quick Connect](https://extensions.gnome.org/extension/1401/bluetooth-quick-connect/) by Extensions Valhalla
* [Bluetooth battery indicator](https://extensions.gnome.org/extension/3991/bluetooth-battery/) by michalwanat

If still need to request a new feature [Raise an issue on Github](https://github.com/maniacx/Bluetooth-Battery-Meter/issues){: .btn .btn-purple .v-align-bottom .fs-2}.


