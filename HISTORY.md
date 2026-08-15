# Project History

## Version 61 - 2026-08-15

- Renamed the verified-device toggle to `Enable OnePlus Buds Pro 3 Support` while retaining the generic OnePlus/Oppo preferences page and separate experimental OPOv1 support.

## Version 60 - 2026-08-15

- Restored the separate opt-in experimental OPOv1 switch for unconfirmed devices.
- Kept the verified OnePlus Buds Pro 3 profile behind its own primary switch.

## Build Workflow - 2026-08-15

- Recorded the mandatory automatic `./install.sh` workflow after extension changes: tests, version bump, package build, and local installation are one ready-to-test operation.

## Version 58 - 2026-08-15

- Deferred the confirmed OnePlus Buds Pro 3 ANC read until the first battery or presence response completes the RFCOMM state exchange.
- This ensures the earbuds answer the ANC poll and their actual mode initializes both the device settings window and Bluetooth Quick Settings.

## Version 57 - 2026-08-15

- Made the OnePlus/Oppo settings schema metadata use the generic device-family name.
- Added an ANC mode read at each confirmed OnePlus Buds Pro 3 RFCOMM connection.
- Persisted the device-confirmed ANC mode so the configuration window and Bluetooth Quick Settings selector start in the actual earbud state.

## Version 56 - 2026-08-15

- Renamed the device preferences page to `OnePlus/Oppo Buds`.
- Unified confirmed OnePlus Buds Pro 3 and UUID-confirmed OPOv1 device discovery in the OnePlus/Oppo device list.
- Added configurable icons, individual battery levels, and Bluetooth Quick Settings battery widgets for generic OPOv1 devices.
- Kept the OnePlus Buds Pro 3 Noise Control UI and ANC writes limited to the confirmed model.

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
