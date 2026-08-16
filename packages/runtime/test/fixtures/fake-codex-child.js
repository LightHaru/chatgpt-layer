#!/usr/bin/env node
"use strict";

process.stdout.write("READY\n");

if (process.argv.includes("--exit-immediately")) {
  process.exit(0);
}
if (process.argv.includes("--crash")) {
  process.exit(2);
}

function die() {
  process.exit(0);
}

process.on("SIGTERM", die);
process.on("SIGINT", die);
process.stdin.on("end", die);
process.stdin.resume();

setInterval(() => {}, 1 << 30);
