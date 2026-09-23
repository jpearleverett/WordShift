/**
 * The OTA publish workflow (.eas/workflows/publish-update.yml) exists because
 * an update cannot be bundled on an Android phone (Termux has no Hermes
 * compiler). app.config.js derives the runtime and ad mode from
 * WORDSHIFT_RELEASE_CHANNEL, so the workflow must set that variable from the
 * same input it publishes to, and must run the config check first.
 */
import fs from 'fs';
import path from 'path';

const wf = fs.readFileSync(path.join(__dirname, '../../.eas/workflows/publish-update.yml'), 'utf8');
const eas = JSON.parse(fs.readFileSync(path.join(__dirname, '../../eas.json'), 'utf8'));

describe('OTA publish workflow', () => {
  it('publishes to the channel it sets WORDSHIFT_RELEASE_CHANNEL from', () => {
    expect(wf).toContain('type: update');
    expect(wf).toContain('WORDSHIFT_RELEASE_CHANNEL: ${{ inputs.channel }}');
    // Without this, eas update in the archive stops on a 'git init' prompt.
    expect(wf).toContain("EAS_NO_VCS: '1'");
    expect(wf).toContain('channel: ${{ inputs.channel }}');
    expect(wf).toContain('platform: android');
  });

  it('offers only channels that an EAS build profile actually produces', () => {
    const block = wf.slice(wf.indexOf('options:'), wf.indexOf('required: true'));
    const options = [...block.matchAll(/- ([a-z-]+)/g)].map(m => m[1]);
    expect(options).toEqual(['production', 'internal-testing']);
    const profileChannels = Object.values(eas.build as Record<string, { channel?: string }>).map(p => p.channel);
    for (const option of options) expect(profileChannels).toContain(option);
  });

  it('checks the resolved config before publishing', () => {
    expect(wf).toMatch(/before_update:[\s\S]*node scripts\/tools\/checkOtaConfig\.mjs/);
    expect(fs.existsSync(path.join(__dirname, '../../scripts/tools/checkOtaConfig.mjs'))).toBe(true);
  });
});
