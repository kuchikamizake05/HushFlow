#!/usr/bin/env bash

repo_root="$(git rev-parse --show-toplevel)"
tools_dir="$repo_root/.tools"

export GOROOT="$tools_dir/go"
export PATH="$tools_dir/node/bin:$tools_dir/go/bin:$tools_dir/foundry:$tools_dir/bin:$PATH"
