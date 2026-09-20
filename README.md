
## Bluetooth Battery Meter extension for GNOME shell
<br>
<br>
<picture>
<img src="https://github.com/maniacx/Bluetooth-Battery-Meter/blob/Documentation/assets/images/home/main.png" width="100%">
</picture>
<br>
<br>
<br>

[<img src="https://github.com/maniacx/Bluetooth-Battery-Meter/blob/Documentation/assets/images/home/get-it-on-gnome-extension.png" width="35%">](https://extensions.gnome.org/extension/6670/bluetooth-battery-meter/)

<br>

[<img src="https://github.com/maniacx/Bluetooth-Battery-Meter/blob/Documentation/assets/images/home/readme.png" width="35%">](https://maniacx.github.io/Bluetooth-Battery-Meter/)




**Note!**
Starting with Bluetooth Battery Meter v48, device-specific features for AirPods, Sony, Samsung Galaxy Buds, Nothing/CMF, Bose, Redmi/Xiaomi, Sennheiser, and other supported devices now require the BudsLink Flatpak app to be installed.

This was not a change I made lightly. Over time, the device-specific code in the extension grew considerably, including low-level Bluetooth communication and protocol handling. Keeping all of this inside a GNOME Shell extension was becoming increasingly difficult to maintain, test, and review.

Moving this functionality to the BudsLink Flatpak app allows the extension to remain lightweight.

I want to apologize for this change and for any inconvenience it may cause existing users. However, I believe this is a better approach in terms of keeping the GNOME extension lightweight, maintaining documentation and translations, and making it easier to add support for new devices and features.

I understand that requiring an additional application is less convenient than having everything built directly into the extension. I appreciate everyone who has been using Bluetooth Battery Meter and supporting the project.

Thank you for your understanding and patience as I make this transition.



**Note!**: Translations have been moved to Weblate.


