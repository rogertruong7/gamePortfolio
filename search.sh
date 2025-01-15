#!/bin/bash

# Usage: ./search_string.sh "string_to_search" /path/to/directory

search_string=$1
directory=${2:-'frontend/src'} # Default to current directory if no directory is provided

if [ -z "$search_string" ]; then
  echo "Usage: $0 \"string_to_search\" [directory]"
  exit 1
fi

echo "Searching for '$search_string' in directory '$directory'"

# Find all files and print the filename and line number where the string is found
grep -rnw "$directory" -e "$search_string"

if [ $? -eq 0 ]; then
  echo "String '$search_string' found in the above files and lines."
else
  echo "String '$search_string' not found in any file."
fi
