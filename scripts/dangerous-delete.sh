#!/bin/bash

# Usage: ./search_string.sh "string_to_search" /path/to/directory

search_string=$1
directory=${2:-'frontend/src'} # Default to current directory if no directory is provided

if [ -z "$search_string" ]; then
  echo "Usage: $0 \"string_to_search\" [directory]"
  exit 1
fi

echo "Searching for '$search_string' and deleting lines containing it in directory '$directory'"

# Find all files containing the search string, then delete the lines containing it using sed
grep -rl "$search_string" "$directory" | while read -r file; do
  echo "Processing file: $file"
  sed -i "/$search_string/d" "$file"  # Remove lines containing the search string
done

echo "Deletion of lines containing '$search_string' completed."
