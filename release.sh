#!/bin/bash

# Define folder paths
source_folder="extension"
output_folder="dist"

# Create output folder if it doesn't exist
mkdir -p "$output_folder"

# Create timestamp for unique filename
timestamp=$(date +"%Y%m%d%H%M%S")

# Create ZIP file
zip_filename="$output_folder/component-highlighter-$timestamp.zip"
zip -r "$zip_filename" "$source_folder"

# Display success message
echo "ZIP file created: $zip_filename"
