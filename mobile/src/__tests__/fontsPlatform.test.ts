import fs from 'fs';
import path from 'path';

const THEME_DIR = path.join(__dirname, '..', 'theme');
const FONTS_SOURCE = fs.readFileSync(path.join(THEME_DIR, 'fonts.ts'), 'utf8');
const NATIVE_INSTALLER = path.join(THEME_DIR, 'installGlobalFont.ts');
const WEB_INSTALLER = path.join(THEME_DIR, 'installGlobalFont.web.ts');

describe('global font platform boundary', () => {
  test('keeps React Native internals out of the web module graph', () => {
    expect(fs.existsSync(NATIVE_INSTALLER)).toBe(true);
    expect(fs.existsSync(WEB_INSTALLER)).toBe(true);

    const nativeSource = fs.readFileSync(NATIVE_INSTALLER, 'utf8');
    const webSource = fs.readFileSync(WEB_INSTALLER, 'utf8');

    expect(FONTS_SOURCE).toMatch(/from '\.\/installGlobalFont'/);
    expect(FONTS_SOURCE).not.toContain('react-native/Libraries/');
    expect(webSource).not.toContain('react-native/Libraries/');
    expect(nativeSource).toContain("require('react-native/Libraries/Text/Text')");
    expect(nativeSource).toContain(
      "require('react-native/Libraries/Components/TextInput/TextInput')",
    );
  });
});
