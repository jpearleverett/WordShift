#!/usr/bin/env node
/** Device evidence from an attached Android build. Default is read-only;
 * --launch-samples additionally backgrounds/force-stops/relaunches the test app.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const output = args.find(arg => !arg.startsWith('--'));
const packageName = 'com.wordshift.app';
if (!output || args.includes('--help')) {
  console.log('Usage: node scripts/tools/profileAndroid.mjs <evidence-directory> [--launch-samples]');
  console.log('Install through Play internal testing, exercise the journey, then capture. Requires adb and one authorized device (or ANDROID_SERIAL).');
  console.log('--launch-samples records three cold/warm native activity launches; finish your current move first. Android launch timing is not JS playable-frame timing.');
  process.exit(args.includes('--help') ? 0 : 1);
}
const deviceArgs = process.env.ANDROID_SERIAL ? ['-s', process.env.ANDROID_SERIAL] : [];
function adb(command) { return execFileSync('adb', [...deviceArgs, ...command], { encoding: 'utf8', timeout: 30_000 }).trim(); }
function save(name, value) { fs.writeFileSync(path.join(output, name), value + '\n'); }
try {
  if (!process.env.ANDROID_SERIAL) {
    const devices = adb(['devices']).split('\n').filter(line => /\tdevice$/.test(line.trim()));
    if (devices.length !== 1) throw new Error('Connect exactly one authorized Android device, or set ANDROID_SERIAL.');
  }
  fs.mkdirSync(output, { recursive: true });
  const commands = {
    'device.txt': ['shell', 'getprop', 'ro.product.model'],
    'android.txt': ['shell', 'getprop', 'ro.build.version.release'],
    'package.txt': ['shell', 'dumpsys', 'package', packageName],
    'installer.txt': ['shell', 'pm', 'list', 'packages', '-i', packageName],
    'frames.txt': ['shell', 'dumpsys', 'gfxinfo', packageName, 'framestats'],
    'memory.txt': ['shell', 'dumpsys', 'meminfo', packageName],
    'battery.txt': ['shell', 'dumpsys', 'battery'],
    'thermal.txt': ['shell', 'dumpsys', 'thermalservice'],
  };
  const failures = [];
  for (const [name, command] of Object.entries(commands)) {
    try { save(name, adb(command)); } catch (error) { failures.push({ file: name, error: error.message }); }
  }
  const settings = {};
  for (const [scope, key] of [['system', 'font_scale'], ['global', 'animator_duration_scale'], ['global', 'transition_animation_scale'], ['global', 'window_animation_scale'], ['secure', 'accessibility_enabled']]) {
    settings[key] = adb(['shell', 'settings', 'get', scope, key]);
  }
  const launches = [];
  if (args.includes('--launch-samples')) {
    for (let run = 1; run <= 3; run++) {
      for (const kind of ['cold', 'warm']) {
        if (kind === 'cold') adb(['shell', 'am', 'force-stop', packageName]);
        else adb(['shell', 'input', 'keyevent', 'KEYCODE_HOME']);
        const result = adb(['shell', 'am', 'start', '-W', '-a', 'android.intent.action.MAIN', '-c', 'android.intent.category.LAUNCHER', '-p', packageName]);
        save(`launch-${run}-${kind}.txt`, result);
        const timing = key => { const match = result.match(new RegExp(`^${key}: (\\d+)$`, 'm')); return match ? Number(match[1]) : null; };
        launches.push({ run, kind, totalTimeMs: timing('TotalTime'), waitTimeMs: timing('WaitTime'), reportedState: result.match(/^LaunchState: (.+)$/m)?.[1] ?? null });
        // Give the app time to finish hydration before the next sample.
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }
  save('capture.json', JSON.stringify({ capturedAt: new Date().toISOString(), package: packageName, settings, launches, failures,
    note: 'Record journey, build/runtime, purchase and network state. Native activity launch time is not time to an interactive JS board. Download/install size must come from the signed artifact or Play Console. Compare three samples on each device; these files alone do not prove performance.' }, null, 2));
  console.log(`Captured local device evidence in ${output}`);
  if (failures.length) console.warn(`${failures.length} device counters were unavailable; see capture.json.`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
