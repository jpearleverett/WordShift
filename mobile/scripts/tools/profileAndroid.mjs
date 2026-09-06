#!/usr/bin/env node
/** Read-only measurements from an attached signed Android build. */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const output = process.argv[2];
if (!output) {
  console.error('Usage: node scripts/tools/profileAndroid.mjs <evidence-directory>');
  console.error('Install the internal-testing AAB through Play, exercise a journey, then capture. Requires adb and a connected authorized device.');
  process.exit(1);
}
function adb(args) { return execFileSync('adb', args, { encoding: 'utf8', timeout: 30_000 }); }
try {
  const devices = adb(['devices']).split('\n').filter(line => /\tdevice$/.test(line.trim()));
  if (devices.length !== 1) throw new Error('Connect exactly one authorized Android device.');
  fs.mkdirSync(output, { recursive: true });
  const commands = {
    'device.txt': ['shell', 'getprop', 'ro.product.model'],
    'android.txt': ['shell', 'getprop', 'ro.build.version.release'],
    'package.txt': ['shell', 'dumpsys', 'package', 'com.wordshift.app'],
    'frames.txt': ['shell', 'dumpsys', 'gfxinfo', 'com.wordshift.app', 'framestats'],
    'memory.txt': ['shell', 'dumpsys', 'meminfo', 'com.wordshift.app'],
  };
  for (const [name, args] of Object.entries(commands)) fs.writeFileSync(path.join(output, name), adb(args));
  fs.writeFileSync(path.join(output, 'capture.json'), JSON.stringify({ capturedAt: new Date().toISOString(), package: 'com.wordshift.app', note: 'Record journey, build/runtime, cold/warm start timing, font scale and purchase state alongside these samples. Frame counts alone are not an end-to-end performance verdict.' }, null, 2));
  console.log(`Captured local device evidence in ${output}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
