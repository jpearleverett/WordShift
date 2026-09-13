import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Run the actual installed config plugins against the actual Expo template,
// without generating a native project or invoking Gradle.
const withAndroidOptimization = require('../../plugins/withAndroidOptimization');
const withBuildProperties = require('expo-build-properties').default;
const app = require('../../app.json').expo;
const expoDir = path.dirname(require.resolve('expo/package.json'));
const template = (file: string): string => execFileSync('tar', ['-xOzf', path.join(expoDir, 'template.tgz'), `package/android/${file}`], { encoding: 'utf8' });
const originalGradle = template('app/build.gradle');
const originalProperties = template('gradle.properties');

type Property = { type: 'property'; key: string; value: string } | { type: 'comment'; value: string };

function config() {
  const buildProperties = app.plugins.find((plugin: unknown[]) => Array.isArray(plugin) && plugin[0] === 'expo-build-properties')[1];
  return withAndroidOptimization(withBuildProperties({ name: app.name, slug: app.slug }, buildProperties));
}

async function applyGradle(contents: string, language = 'groovy'): Promise<string> {
  const value = config();
  const result = await value.mods.android.appBuildGradle({ ...value, modResults: { contents, language }, modRequest: {} });
  return result.modResults.contents;
}

async function applyProperties(properties: Property[]): Promise<Property[]> {
  const value = config();
  const result = await value.mods.android.gradleProperties({ ...value, modResults: properties, modRequest: {} });
  return result.modResults;
}

test('the app registers optimization after Expo build properties and keeps existing PNG handling', () => {
  const buildIndex = app.plugins.findIndex((plugin: unknown[]) => Array.isArray(plugin) && plugin[0] === 'expo-build-properties');
  const customIndex = app.plugins.indexOf('./plugins/withAndroidOptimization');
  expect(customIndex).toBeGreaterThan(buildIndex);
  expect(app.plugins[buildIndex][1].android).toEqual({
    enablePngCrunchInReleaseBuilds: false,
    enableMinifyInReleaseBuilds: true,
    enableShrinkResourcesInReleaseBuilds: true,
  });
});

test('the shipped template changes only its release default ProGuard file', async () => {
  const changed = await applyGradle(originalGradle);
  expect(changed).toBe(originalGradle.replace('getDefaultProguardFile("proguard-android.txt")', 'getDefaultProguardFile("proguard-android-optimize.txt")'));
  expect(await applyGradle(changed)).toBe(changed);
  expect(changed).toContain('"proguard-rules.pro"');
  expect(changed).toContain('minifyEnabled enableMinifyInReleaseBuilds');
  expect(changed).toContain('shrinkResources enableShrinkResources.toBoolean()');
});

test('a debug-only ProGuard configuration stays untouched', async () => {
  const source = originalGradle.replace('        debug {\n', '        debug {\n            proguardFiles getDefaultProguardFile("proguard-android.txt")\n');
  const result = await applyGradle(source);
  expect(result).toContain('debug {\n            proguardFiles getDefaultProguardFile("proguard-android.txt")');
  expect(result.match(/proguard-android-optimize\.txt/g)).toHaveLength(1);
});

test('real Expo mods enable both release switches and optimized resource shrinking once', async () => {
  const properties: Property[] = originalProperties.split('\n').filter(line => line && !line.startsWith('#')).map(line => {
    const index = line.indexOf('=');
    return { type: 'property', key: line.slice(0, index), value: line.slice(index + 1) };
  });
  properties.push({ type: 'property', key: 'android.r8.optimizedResourceShrinking', value: 'false' });
  const generated = await applyProperties(properties);
  const values = Object.fromEntries(generated.filter((item): item is Extract<Property, { type: 'property' }> => item.type === 'property').map(item => [item.key, item.value]));
  expect(values['android.enableMinifyInReleaseBuilds']).toBe('true');
  expect(values['android.enableShrinkResourcesInReleaseBuilds']).toBe('true');
  expect(values['android.r8.optimizedResourceShrinking']).toBe('true');
  expect(values['android.enablePngCrunchInReleaseBuilds']).toBe('false');
  expect(values['expo.useLegacyPackaging']).toBe('false');
  expect(values['hermesEnabled']).toBe('true');
  expect(values['reactNativeArchitectures']).toBe('armeabi-v7a,arm64-v8a,x86,x86_64');
  expect(values['android.enableR8.fullMode']).not.toBe('false');
  expect(await applyProperties(generated)).toEqual(generated);
});

test('unexpected release defaults, ambiguous templates, or a language migration require explicit review', async () => {
  await expect(applyGradle(originalGradle, 'kotlin')).rejects.toThrow('language changed');
  await expect(applyGradle(originalGradle.replace('        release {', '        production {'))).rejects.toThrow('release block');
  await expect(applyGradle(originalGradle.replace('proguard-android.txt', 'custom-defaults.txt'))).rejects.toThrow('default ProGuard');
  await expect(applyGradle(`${originalGradle}\nrelease {\n}\n`)).rejects.toThrow('release block');
});

test('the pinned toolchain supports the documented optimized-resource opt-in', () => {
  const versionFile = path.resolve(path.dirname(require.resolve('@react-native/gradle-plugin/package.json')), 'gradle/libs.versions.toml');
  const version = fs.readFileSync(versionFile, 'utf8').match(/^agp = "([^"]+)"/m)?.[1];
  const [major, minor] = (version ?? '0.0').split('.').map(Number);
  expect(major > 8 || (major === 8 && minor >= 12)).toBe(true);
});
