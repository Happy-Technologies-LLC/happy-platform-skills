#!/usr/bin/env node

/**
 * DEPRECATED: sn-skills has been renamed to hps.
 * This shim forwards all commands to the new CLI.
 */

console.warn(
  '\x1b[33m[DEPRECATED]\x1b[0m The sn-skills command has been renamed to hps. ' +
  'Please run: npm install happy-platform-skills && npm uninstall happy-servicenow-skills'
);

// Forward to the real CLI
import('happy-platform-skills/src/cli.js');
