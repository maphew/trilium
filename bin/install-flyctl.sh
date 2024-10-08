#!/bin/bash

# Define the directory to add to PATH
dir_to_add="/home/codespace/.fly/bin"

# Define the FLYCTL_INSTALL variable
flyctl_install="/home/codespace/.fly"

# Determine the correct configuration file
if [ -f "$HOME/.bashrc" ]; then
    config_file="$HOME/.bashrc"
elif [ -f "$HOME/.bash_profile" ]; then
    config_file="$HOME/.bash_profile"
elif [ -f "$HOME/.zshrc" ]; then
    config_file="$HOME/.zshrc"
else
    echo "Could not find a suitable configuration file"
    exit 1
fi

# Function to add a line to the config file if it doesn't exist
add_line_if_not_exists() {
    grep -qxF "$1" "$config_file" || echo "$1" >> "$config_file"
}

# Add PATH modification
add_line_if_not_exists "export PATH=\"$dir_to_add:\$PATH\""

# Add FLYCTL_INSTALL environment variable
add_line_if_not_exists "export FLYCTL_INSTALL=\"$flyctl_install\""

echo "Updated $config_file with PATH and FLYCTL_INSTALL"
echo "Please run 'source $config_file' or start a new shell session for changes to take effect"
