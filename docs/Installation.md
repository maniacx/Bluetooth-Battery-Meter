---
layout: default
title: Installation
nav_order: 2
permalink: /installation
---

# Installation

{: .warning }
This extension may conflict with other Bluetooth related Gnome Extensions. It's better to disable or remove them before using this extension.

## Gnome Extension Website

[<img src="./assets/images/home/get-it-on-gnome-extension.png" width="45%">](https://extensions.gnome.org/extension/6670/battery-health-charging/)

* The extension is available on the Gnome Extension Website https://extensions.gnome.org/, where it undergoes a review process upon submission.
* Therefore, it's recommended to install this extension from the website.

### Using Apps

[<img src="./assets/images/installation/extension.png" width="45%">](https://flathub.org/apps/org.gnome.Extensions)[<img src="./assets/images/installation/extension-manager.png" width="45%" class="float-right">](https://flathub.org/apps/com.mattjakeman.ExtensionManager)

* This will require installing an Extensions or Extension Manager app to manage the Gnome extension.
* Either search for the extension by its name, "Bluetooth Battery Meter" or use the website link below<br><https://extensions.gnome.org/extension/6670/battery-health-charging/>

### Using dbus command

```bash
busctl --user call org.gnome.Shell.Extensions /org/gnome/Shell/Extensions org.gnome.Shell.Extensions InstallRemoteExtension s Bluetooth-Battery-Meter@maniacx.github.com
```
* Running this in console/terminal will download and install extension from Gnome Extension Website.

## From Github

[<img src="./assets/images/home/view-sources-on-github.png" width="45%">](https://github.com/maniacx/Bluetooth-Battery-Meter)

* Installation from sources is not recommended but can be done for debugging or testing new updates not yet submitted to Gnome Extension.
* A prerequisite is that gettext needs to be installed.
* Run `./install.sh` from terminal to install.
* Open terminal and

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


