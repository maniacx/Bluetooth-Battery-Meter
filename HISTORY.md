# Project History

## Installation Workflow - 2026-08-15

- Removed the unreliable D-Bus hot reload from `install.sh`.
- Local installation now requires logout/login before verifying the newly loaded extension version in the diagnostic log.

## Version 54 - 2026-08-15

- Preserved event-driven OnePlus Buds Pro 3 state updates for every unsolicited battery or presence packet received over RFCOMM.
- Added handling for unsolicited ANC responses: the Quick Settings control is updated immediately and a single coalesced battery/presence read follows the external device activity.
- Kept the initial RFCOMM state synchronization and added no periodic device polling.

## Version 52 - 2026-08-15

- Expanded the OnePlus Buds Pro 3 device configuration window to match the established adaptive device-settings pattern.
- Added a persistent Noise Control selector covering Off, High, Medium, Low, Auto, and Transparency.
- Applied a changed Noise Control setting through the confirmed OnePlus RFCOMM ANC transport when the earbuds are connected.
- Kept the selectable earbud and case icons synchronized with the live device indicator.

## Development Workflow - 2026-08-15

- Documented the nested GNOME Shell debugging workflow for clean Wayland extension reloads.
- Documented the GNOME 49+ `--devkit` command and the legacy `--nested` command for GNOME 48 and earlier.
- Recorded nested-session safety boundaries, dependency checks, logging, and build-version verification steps.
