#!/usr/bin/env bash

echo "Scanning project..."

modules=$(grep -RhoE "require\(['\"][^'\"]+['\"]\)|from ['\"][^'\"]+['\"]" . \
| sed -E "s/require\(['\"]([^'\"]+)['\"]\)/\1/" \
| sed -E "s/from ['\"]([^'\"]+)['\"]/\\1/" \
| cut -d'/' -f1 \
| sort -u)

installed=$(jq -r '.dependencies // {} | keys[]' package.json)

node_builtins="fs path http https crypto os util stream url querystring zlib events buffer net tls child_process"

missing=""

for module in $modules
do
  if [[ "$module" != "."* ]] && [[ "$module" != "/"* ]] && [[ "$module" != *"$"* ]]
  then
    if ! echo "$installed" | grep -q "^$module$"
    then
      if ! echo "$node_builtins" | grep -qw "$module"
      then
        missing="$missing $module"
      fi
    fi
  fi
done

echo ""
echo "Missing dependencies:"
echo "$missing"
echo ""

if [ -n "$missing" ]; then
  npm install $missing
else
  echo "Nothing missing."
fi