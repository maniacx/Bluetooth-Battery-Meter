#!/usr/bin/env bash

# Change working directory to project folder
cd "${0%/*}"

EXT_NAME="Bluetooth Battery Meter"
EXT_UUID="Bluetooth-Battery-Meter@maniacx.github.com"
LOG_PATH="${TMPDIR:-/tmp}/bluetooth_battery_meter/service.log"
BUILD_VERSION=""

bump_version() {
    local current_version new_version temp_metadata
    current_version=$(jq -r '.version' metadata.json)
    if ! [[ "$current_version" =~ ^[0-9]+$ ]]; then
        echo "metadata.json has an invalid extension version: $current_version"
        exit 1
    fi

    new_version=$((current_version + 1))
    temp_metadata=$(mktemp)
    jq --argjson version "$new_version" '.version = $version' metadata.json > "$temp_metadata"
    mv "$temp_metadata" metadata.json
    BUILD_VERSION="$new_version"
    echo "Building extension version $new_version..."
}

verify_running_version() {
    local attempt
    echo "Checking the active extension version in $LOG_PATH..."
    for attempt in {1..10}; do
        if [ -f "$LOG_PATH" ] && grep -Fq "Initializing Bluetooth Battery Meter version=$BUILD_VERSION" "$LOG_PATH"; then
            echo "PASS: extension version $BUILD_VERSION started successfully."
            return 0
        fi
        sleep 1
    done

    echo "FAIL: version $BUILD_VERSION was installed but did not start in GNOME Shell."
    echo "Please log out and log back in, then verify $LOG_PATH contains version=$BUILD_VERSION."
    return 1
}

reload_extension() {
    echo "Restarting extension in the active GNOME Shell session..."
    if gdbus call --session \
        --dest org.gnome.Shell.Extensions \
        --object-path /org/gnome/Shell/Extensions \
        --method org.gnome.Shell.Extensions.DisableExtension "$EXT_UUID" && \
        sleep 1 && \
        gdbus call --session \
        --dest org.gnome.Shell.Extensions \
        --object-path /org/gnome/Shell/Extensions \
            --method org.gnome.Shell.Extensions.EnableExtension "$EXT_UUID"; then
        echo "Gnome Extension $EXT_NAME was installed and restarted."
        verify_running_version
    else
        echo "Gnome Extension $EXT_NAME was installed. GNOME Shell restart is unavailable."
        echo "Run the extension restart from an active graphical GNOME session."
    fi
}

if ! command -v msgfmt &> /dev/null
then
    echo "Missing gettext!!!"
    echo "Please install gettext and re-run this installer."
    echo "Press any key to exit..."
    read -n1
    exit 1
fi

echo "Running headless tests..."
if ! tests/run-tests.sh; then
    echo "Tests failed. Extension packaging was skipped."
    echo "Press any key to exit..."
    read -n1
    exit 1
fi

bump_version

echo "Packing extension..."
gnome-extensions pack ./ \
    --extra-source=icons/ \
    --extra-source=lib/ \
    --extra-source=preferences/ \
    --extra-source=ui/ \
    --extra-source=script/ \
    --podir=po \
    --force \

if [ $? -ne 0 ]; then 
    echo "Error occur during compilation of Gnome Extension ${EXT_NAME}."
    echo "Press any key to exit..."
    read -n1
    exit $?
fi

echo "Installing extension..."
gnome-extensions install $EXT_UUID.shell-extension.zip --force

if [ $? -ne 0 ]; then 
    read -n1
    exit $?
fi

reload_extension
exit 0
