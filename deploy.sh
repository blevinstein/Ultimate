#!/bin/bash

FILES="src font images main.css index.html play.html"

destination=$1

if [[ -z "$destination" ]]; then
  echo "Usage: deploy.sh <destination_directory>"
  exit 1
fi

for file in $FILES; do
  cp -r $file $destination
done
