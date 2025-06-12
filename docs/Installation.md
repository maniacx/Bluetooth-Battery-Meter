---
layout: default
title: Installation
nav_order: 2
permalink: /installation
---

# Modes and Requirements

## 1. Normal Mode

**Requirement: Enable Experimental BlueZ**

This is the default mode. The extension needs BlueZ's experimental feature enabled so it can access and display battery levels for supported Bluetooth devices.

---

## 2. Enhanced Mode *(Disabled by default)*

**Requirement: Python Environment**

Enhanced Mode runs an external Python script to provide:

- Multiple battery readings (e.g., left, right, and case for earbuds, or main/backup for keyboards)
- Advanced features like ANC control (for supported devices)

**Dependencies:**

- Python **3.11** with **Bluetooth socket** support (available on most distributions)
- **PyGObject** (usually pre-installed on GNOME-based distributions)


# Enable Experimental Bluez

---

If bluetooth device is not reporting battery level, it could be that it needs Bluez Experimental.
Note: Some bluetooth devices may also require to enable Bluez kernel experimental feature.
<br>

### Check if experimental feature
To check if experimental feature is enabled or not by try the following command. It will echo if experimental flag is enabled or disabled.
```bash
bluetoothctl show | grep -q 'PowerState' && echo 'Experimental flag enabled' || echo 'Experimental flag disabled'
```

<br>
### Enable experimental feature
There are several ways to enable experimental feature, the easiest way to enable is to edit system file
```
/etc/bluetooth/main.conf
```
Search for the line `#Experimental = false` and remove the `#` and change from `false` to `true`
```
Experimental = true
```
 Restart the bluetooth service using
```
systemctl restart bluetooth
```
Once done check if device displays battery level under `Power` in `Gnome Control Center (Settings)`
<br>
<img src="./assets/images/installation/power.png" width="100%">

### Enable kernel experimental feature
Users have reported that some devices will not report battery level until the **kernel experimatal** flag is enabled. If the battery level is still not reported. Try to enable bluez kernel experimental feaures
Edit system file
```
/etc/bluetooth/main.conf
```
Search for the line `#KernelExperimental = false` and remove the `#` and change from `false` to `true`
```
KernelExperimental = true
```
 Restart the system.

---
# Installation

{: .warning }
This extension may conflict with other Bluetooth related Gnome Extensions. It's better to disable or remove them before using this extension.

## Gnome Extension Website

[<img src="./assets/images/home/get-it-on-gnome-extension.png" width="45%">](https://extensions.gnome.org/extension/6670/bluetooth-battery-meter/)

* The extension is available on the Gnome Extension Website https://extensions.gnome.org/, where it undergoes a review process upon submission.
* Therefore, it's recommended to install this extension from the website.

### Using Apps

[<img src="./assets/images/installation/extension.png" width="45%">](https://flathub.org/apps/org.gnome.Extensions)[<img src="./assets/images/installation/extension-manager.png" width="45%" class="float-right">](https://flathub.org/apps/com.mattjakeman.ExtensionManager)

* This will require installing an Extensions or Extension Manager app to manage the Gnome extension.
* Either search for the extension by its name, "Bluetooth Battery Meter" or use the website link below<br><https://extensions.gnome.org/extension/6670/bluetooth-battery-meter/>

### Using dbus command

```bash
busctl --user call org.gnome.Shell.Extensions /org/gnome/Shell/Extensions org.gnome.Shell.Extensions InstallRemoteExtension s Bluetooth-Battery-Meter@maniacx.github.com
```
* Running this in console/terminal will download and install extension from Gnome Extension Website.

## From Github

[<img src="./assets/images/home/view-sources-on-github.png" width="45%">](https://github.com/maniacx/Bluetooth-Battery-Meter)

* Installation from sources is not recommended but can be done for debugging or testing new updates not yet submitted to Gnome Extension.
* A prerequisite is that gettext needs to be installed.
* Execute `./install.sh` in the terminal to proceed with the installation.
* Restart GNOME Shell by logging out and logging back in. Alternatively, on Xorg, you can restart GNOME Shell using `Alt + F2`, then typing `r`, and pressing Enter.

## Uninstallation

To uninstall this extension, use the `Extensions`  or `Extension Manager` app.
<br>
<br>
Or
<br>
<br>
Using commandline to uninstall
```bash
gnome-extensions uninstall Bluetooth-Battery-Meter@maniacx.github.com
```
Although not neccesary, to take a step further and remove all gsettings saved by this extension, you can use the following terminal command:
```bash
gsettings --schemadir /home/$USER/.local/share/gnome-shell/extensions/Bluetooth-Battery-Meter@maniacx.github.com/schemas reset-recursively org.gnome.shell.extensions.Bluetooth-Battery-Meter
```


