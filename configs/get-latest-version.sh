#!/bin/bash

pnpm ls -r --depth -1 | grep -v '(PRIVATE)' | sed '/^$/d' | awk '{print $1}' | awk -F '@' '{print $NF}' | sort -V | tail -1
