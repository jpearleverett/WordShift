#!/usr/bin/env node
/**
 * Promotional house study assembled from unchanged shipped artwork.
 * This is an offline illustration, NOT an app render or a gameplay capture.
 * Importing this module never starts a browser, server, or subprocess.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import sharp from 'sharp';
import ts from 'typescript';

const MOBILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const p = (...parts) => path.join(MOBILE, ...parts);
const relative = value => path.relative(MOBILE, value).split(path.sep).join('/');
const svg = (width, height, content) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${content}</svg>`);
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));

/** Read only literal/arithmetic asset metadata; never execute application code. */
async function constants(filename) {
  const absolute = p(filename);
  const source = ts.createSourceFile(filename, await fs.readFile(absolute, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations = new Map();
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.initializer) declarations.set(declaration.name.text, declaration.initializer);
    }
  }
  const cache = new Map();
  const read = name => {
    if (cache.has(name)) return cache.get(name);
    if (!declarations.has(name)) throw new Error(`Missing ${name} in ${filename}`);
    const result = value(declarations.get(name));
    cache.set(name, result);
    return result;
  };
  const value = node => {
    if (ts.isNumericLiteral(node)) return Number(node.text);
    if (ts.isStringLiteral(node)) return node.text;
    if (ts.isIdentifier(node)) return read(node.text);
    if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node)) return value(node.expression);
    if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken) return -value(node.operand);
    if (ts.isArrayLiteralExpression(node)) return node.elements.map(value);
    if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.map(prop => {
      if (!ts.isPropertyAssignment(prop)) throw new Error(`Unsupported property in ${filename}`);
      return [prop.name.text, value(prop.initializer)];
    }));
    if (ts.isBinaryExpression(node)) {
      const left = value(node.left), right = value(node.right);
      switch (node.operatorToken.kind) {
        case ts.SyntaxKind.PlusToken: return left + right;
        case ts.SyntaxKind.MinusToken: return left - right;
        case ts.SyntaxKind.AsteriskToken: return left * right;
        case ts.SyntaxKind.SlashToken: return left / right;
        default: throw new Error(`Unsupported arithmetic in ${filename}`);
      }
    }
    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression) && node.expression.text === 'require') return path.resolve(path.dirname(absolute), value(node.arguments[0]));
      if (node.expression.getText(source) === 'Math.round') return Math.round(value(node.arguments[0]));
    }
    throw new Error(`Unsupported metadata expression in ${filename}: ${node.getText(source).slice(0, 80)}`);
  };
  return { read, absolute };
}

async function tint(input, color, opacity) {
  if (!opacity) return input;
  return sharp(input).ensureAlpha().linear([1 - opacity, 1 - opacity, 1 - opacity, 1], [...rgb(color).map(c => c * opacity), 0]).png({ compressionLevel: 1 }).toBuffer();
}

async function tintedMask(input, color, opacity) {
  return sharp(input).ensureAlpha().linear([0, 0, 0, opacity], [...rgb(color), 0]).png({ compressionLevel: 1 }).toBuffer();
}

/**
 * Three-room editorial diorama. t drives real sprite frames on a deterministic
 * left/right route with pauses; the app's random route scheduler is not run.
 */
export async function createHouseRenderer({ width = 1080, height = 1540, phase = 1, includePit = false, bottomClearance = 70 } = {}) {
  if (![1, 3].includes(phase)) throw new Error('House study supports phase 1 or 3 only; reveal artwork is excluded.');
  if (![width, height].every(v => Number.isInteger(v) && v >= 120)) throw new Error('width and height must be integer pixels >= 120');

  const [world, rooms, animals] = await Promise.all([
    constants('src/components/home/HouseWorld.tsx'),
    constants('src/components/home/RoomView.tsx'),
    constants('src/components/home/AnimalSprite.tsx'),
  ]);
  const assets = new Set([world.absolute, rooms.absolute, animals.absolute, p('src/services/homeWorldData.ts')]);
  const source = filename => { assets.add(filename); return filename; };
  const rw = world.read('ROOM_WIDTH'), rh = world.read('ROOM_HEIGHT');
  const gap = world.read('ROOM_GAP'), connector = world.read('ROOM_CONNECTOR_HEIGHT');
  const padding = world.read('HOUSE_PADDING');
  const bw = world.read('HOUSE_BODY_WIDTH'), fw = world.read('HOUSE_WIDTH');
  const roofW = world.read('ROOF_WIDTH'), roofH = world.read('ROOF_RENDER_HEIGHT');
  const foundationH = world.read('FOUNDATION_RENDER_HEIGHT');
  const houseTint = world.read('PHASE_HOUSE_TINT')[phase];
  const windowTint = rooms.read('WINDOW_TINT')[phase];
  const backgrounds = rooms.read('ROOM_BACKGROUNDS');
  const windows = rooms.read('ROOM_WINDOW_MASKS');
  const sprites = animals.read('CHARACTER_SPRITES');
  const floorOffsets = animals.read('FLOOR_OFFSET');
  const speeds = animals.read('MOVEMENT_SPEED');
  const spriteBox = animals.read('WALK_SPRITE_BOX');
  const foxMatch = animals.read('WALK_MATCH_SCALE');
  const foxFeet = animals.read('WALK_FEET_CORRECTION');
  const foxFrameMs = animals.read('WALK_FRAME_MS');

  // The three earliest rooms retain their real bottom-up order. This is an
  // illustrative selection, deliberately not a claim of reachable phase-3 state.
  const selection = [
    { room: 'study', animal: 'owl', name: 'Archimedes', offset: 1.5 },
    { room: 'kitchen', animal: 'pangolin', name: 'Panko', offset: 0.9 },
    { room: 'cozy_den', animal: 'fox', name: 'Ember', offset: 0 },
  ];
  const bodyH = rh * selection.length + gap * selection.length + connector * (selection.length - 1) + padding;
  const pitW = includePit ? world.read('PIT_RENDER_WIDTH') : 0;
  const pitH = includePit ? world.read('PIT_RENDER_HEIGHT') : 0;
  const pitGap = includePit ? world.read('PIT_MARGIN_TOP') : 0;
  const fullH = roofH - 6 + bodyH + foundationH - 2 + pitH + pitGap;
  const scale = includePit ? Math.min(width / 390, (height - bottomClearance - 82) / fullH) : Math.min(width / 390, height / 690);
  const n = value => Math.round(value * scale);
  const bottom = includePit ? height - bottomClearance : Math.round(height - height * 0.04);
  const houseTop = Math.round(bottom - fullH * scale);
  const bodyTop = houseTop + n(roofH - 6);
  const bodyLeft = Math.round((width - n(bw)) / 2);
  const roomLeft = Math.round((width - n(rw)) / 2);
  const foundationTop = bodyTop + n(bodyH - 2);
  const roomWidth = n(rw), roomHeight = n(rh);
  const roomMask = svg(roomWidth, roomHeight, `<rect width="100%" height="100%" rx="${n(8)}" fill="white"/>`);

  // Reframe the source sky, preserving aspect ratio and placing the foundation
  // below its painted river. This is an editorial crop, not the app viewport.
  const skyFile = source(world.read(phase === 1 ? 'SKY_AFTERNOON' : 'SKY_STORM'));
  const skyMeta = await sharp(skyFile).metadata();
  const skyCropTop = Math.round(width * (240 / 1080));
  const skyScale = Math.max(width / skyMeta.width, (height + skyCropTop) / skyMeta.height);
  const skyWidth = Math.ceil(skyMeta.width * skyScale), skyHeight = Math.ceil(skyMeta.height * skyScale);
  const background = await sharp(skyFile).resize(skyWidth, skyHeight).extract({ left: Math.floor((skyWidth - width) / 2), top: skyCropTop, width, height }).ensureAlpha().png().toBuffer();

  const exteriorLayers = [];
  const shadowFile = source(world.read('HOUSE_SHADOW_IMG'));
  const shadowStyle = world.read('CONTACT_SHADOW')[phase];
  const shadow = await tintedMask(await sharp(shadowFile).resize(n(fw + 40), n(54)).png().toBuffer(), shadowStyle.color, 0.55 * shadowStyle.mult);
  exteriorLayers.push({ input: shadow, left: Math.round((width - n(fw + 40)) / 2), top: bottom - n(pitH + pitGap + 12) });

  let wall = await sharp(source(world.read('WALL_IMG'))).resize(n(bw), n(bodyH), { fit: 'cover' }).png().toBuffer();
  wall = await tint(wall, houseTint.color, houseTint.ext);
  exteriorLayers.push({ input: wall, left: bodyLeft, top: bodyTop });

  for (let i = 0; i < selection.length; i += 1) {
    const selected = selection[i];
    selected.top = bodyTop + n(padding / 2 + i * (rh + gap + connector));
    let room = await sharp(source(backgrounds[selected.room])).resize(roomWidth, roomHeight, { fit: 'cover' }).ensureAlpha().png().toBuffer();
    if (windows[selected.room]) {
      const mask = await sharp(source(windows[selected.room])).resize(roomWidth, roomHeight, { fit: 'cover' }).png().toBuffer();
      room = await sharp(room).composite([{ input: await tintedMask(mask, windowTint.color, windowTint.opacity) }]).png().toBuffer();
    }
    room = await tint(room, houseTint.color, houseTint.room);
    room = await sharp(room).composite([{ input: roomMask, blend: 'dest-in' }]).png({ compressionLevel: 1 }).toBuffer();
    exteriorLayers.push({ input: room, left: roomLeft, top: selected.top });
  }

  const edge = await sharp(source(world.read('EDGE_SHADOW_IMG'))).resize(n(24), n(bodyH)).png().toBuffer();
  exteriorLayers.push({ input: edge, left: bodyLeft, top: bodyTop });
  exteriorLayers.push({ input: await sharp(edge).flop().png().toBuffer(), left: bodyLeft + n(bw) - n(24), top: bodyTop });
  const roof = await tint(await sharp(source(world.read('ROOF_IMG'))).resize(n(roofW), n(roofH)).png().toBuffer(), houseTint.color, houseTint.ext);
  exteriorLayers.push({ input: roof, left: Math.round((width - n(roofW)) / 2), top: houseTop });
  const foundation = await sharp(source(world.read('FOUNDATION_IMGS')[phase])).resize(n(fw), n(foundationH)).png().toBuffer();
  exteriorLayers.push({ input: foundation, left: Math.round((width - n(fw)) / 2), top: foundationTop });
  const pitTop = foundationTop + n(foundationH + pitGap);
  if (includePit) {
    const pit = await tint(await sharp(source(world.read('PIT_ENTRANCE_IMG'))).resize(n(pitW), n(pitH)).png().toBuffer(), houseTint.color, houseTint.ext);
    if (pitTop + n(pitH) > height - bottomClearance + 2) throw new Error('Pit and path must fit above the lower safe margin');
    exteriorLayers.push({ input: pit, left: Math.round((width - n(pitW)) / 2), top: pitTop });
  }

  // Clip the below-foundation contact shadow to the image bounds before Sharp's
  // composite operation, which requires every overlay to fit on the canvas.
  for (const layer of exteriorLayers) {
    const meta = await sharp(layer.input).metadata();
    if (layer.top + meta.height > height) layer.input = await sharp(layer.input).extract({ left: 0, top: 0, width: meta.width, height: height - layer.top }).png().toBuffer();
  }
  const base = await sharp(background).composite(exteriorLayers).png({ compressionLevel: 1 }).toBuffer();
  const dread = phase === 3 ? { color: '#2B2450', opacity: 0.20 } : { color: '#3A4378', opacity: 0.12 };

  for (const selected of selection) {
    const metadata = sprites[selected.animal];
    const walk = [];
    if (metadata.walkAtlas) {
      const atlasFile = source(metadata.walkAtlas.source);
      const atlasMeta = await sharp(atlasFile).metadata();
      const cellW = atlasMeta.width / metadata.walkAtlas.columns, cellH = atlasMeta.height / metadata.walkAtlas.rows;
      if (!Number.isInteger(cellW) || !Number.isInteger(cellH)) throw new Error('Walk atlas is not an integral grid');
      for (let i = 0; i < metadata.walkAtlas.frameCount; i += 1) walk.push(await sharp(atlasFile).extract({ left: (i % metadata.walkAtlas.columns) * cellW, top: Math.floor(i / metadata.walkAtlas.columns) * cellH, width: cellW, height: cellH }).png().toBuffer());
    } else {
      for (const filename of metadata.walk) walk.push(await fs.readFile(source(filename)));
    }
    const prepare = async (input, size) => {
      let image = await sharp(input).resize(size, size, { fit: 'contain', background: '#00000000' }).ensureAlpha().png().toBuffer();
      image = await tint(image, dread.color, dread.opacity);
      return tint(image, houseTint.color, houseTint.room);
    };
    const walkSize = n(spriteBox * (metadata.walk ? foxMatch : 1));
    selected.frameSize = walkSize;
    selected.idleSize = n(spriteBox);
    selected.frames = await Promise.all(walk.map(input => prepare(input, walkSize)));
    selected.framesLeft = await Promise.all(selected.frames.map(input => sharp(input).flop().png({ compressionLevel: 1 }).toBuffer()));
    selected.idle = await prepare(source(metadata.idle), selected.idleSize);
    selected.idleLeft = await sharp(selected.idle).flop().png().toBuffer();
    selected.frameMs = metadata.walkAtlas?.frameMs ?? (metadata.walkAtlas ? Math.max(100, Math.min(200, speeds[selected.animal] * 0.032)) : foxFrameMs);
    selected.legSeconds = speeds[selected.animal] / 1000 * (phase === 3 ? 1.4 : 1);
    selected.nativeFacing = metadata.nativeFacing?.walk ?? 'right';
  }
  const spriteShadow = svg(n(60), n(12), `<ellipse cx="${n(30)}" cy="${n(6)}" rx="${n(30)}" ry="${n(6)}" fill="#000" opacity="0.3"/>`);
  const assetsAndHashes = await Promise.all([...assets].sort().map(async filename => ({ file: relative(filename), sha256: createHash('sha256').update(await fs.readFile(filename)).digest('hex') })));
  const provenance = {
    kind: 'assembled-source-art-promotional-study', nativeScreenshot: false, actualGameplayCapture: false,
    width, height, phase,
    assets: assetsAndHashes,
    geometry: { source: relative(world.absolute), roomWidthDp: rw, roomHeightDp: rh, roomGapDp: gap, connectorDp: connector, scalePixelsPerDp: scale, skyCropTopPx: skyCropTop, pit: includePit ? { widthDp: pitW, heightDp: pitH, marginTopDp: pitGap, topPx: pitTop, bottomPx: pitTop + n(pitH), clearancePx: height - pitTop - n(pitH), fullPathVisible: true } : null },
    rooms: selection.map(item => ({ room: item.room, animal: item.animal, name: item.name, frameCount: item.frames.length, frameMs: item.frameMs })),
    motion: 'Real shipped normal walk frames; deterministic 30-unit left/right travel, source species cadence, source phase-3 1.4× slowdown and pauses. Does not run the random app scheduler.',
    limitations: [
      'Illustrative three-room selection, not a reachable phase-3 saved game or screenshot.',
      'Editorial sky crop and house framing; no in-game HUD, name plaques, notifications or controls.',
      includePit ? 'Source pit entrance/path is shown fully; no offering animation, robed sprites, shadow figure or story reveal.' : 'No robed sprites, shadow figure, offering pit or story reveal.',
      'Room depth lighting, upgrades, ambient motes, smoke and arrangement sigils omitted.',
      'Sharp raster composition approximates native alpha tinting, resampling and sprite placement; no Android renderer verification.',
    ],
  };

  const render = async (timeSeconds = 0) => {
    if (!Number.isFinite(timeSeconds)) throw new Error('timeSeconds must be finite');
    const moving = [];
    for (const selected of selection) {
      const pause = phase === 3 ? 1.4 : 1;
      const half = selected.legSeconds + pause;
      const t = ((timeSeconds + selected.offset) % (half * 2) + half * 2) % (half * 2);
      const goingRight = t < half;
      const local = t % half;
      const walking = local < selected.legSeconds;
      const progress = Math.min(local / selected.legSeconds, 1);
      const xUnits = goingRight ? 35 + 30 * progress : 65 - 30 * progress;
      const x = 10 + (rw - 110) * xUnits / 100 + 5;
      const y = (rh * 0.3 + rh - 95) / 2 + floorOffsets[selected.animal] + 5;
      const frameIndex = Math.floor(local * 1000 / (selected.frameMs * (phase === 3 ? 1.4 : 1))) % selected.frames.length;
      const facesLeft = goingRight === (selected.nativeFacing === 'left');
      const frame = walking ? (facesLeft ? selected.framesLeft : selected.frames)[frameIndex] : (facesLeft ? selected.idleLeft : selected.idle);
      const extra = selected.animal === 'fox' && walking ? (foxMatch - 1) * spriteBox / 2 : 0;
      const left = n(x - extra), top = n(y - extra + (selected.animal === 'fox' && walking ? foxFeet : 0));
      const frameMeta = await sharp(frame).metadata();
      const clippingHeight = Math.min(frameMeta.height, roomHeight - top);
      const clippedFrame = clippingHeight === frameMeta.height ? frame : await sharp(frame).extract({ left: 0, top: 0, width: frameMeta.width, height: clippingHeight }).png().toBuffer();
      const shadowY = Math.min(roomHeight - n(12), n(y + 78));
      let roomSprite = await sharp({ create: { width: roomWidth, height: roomHeight, channels: 4, background: '#00000000' } }).composite([
        { input: spriteShadow, left: n(x + 15), top: shadowY },
        { input: clippedFrame, left, top },
      ]).png({ compressionLevel: 1 }).toBuffer();
      roomSprite = await sharp(roomSprite).composite([{ input: roomMask, blend: 'dest-in' }]).png({ compressionLevel: 1 }).toBuffer();
      moving.push({ input: roomSprite, left: roomLeft, top: selected.top });
    }
    return sharp(base).composite(moving).removeAlpha().png({ compressionLevel: 1 }).toBuffer();
  };
  return { render, provenance };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const index = process.argv.indexOf('--out-dir');
  if (process.argv.includes('--help') || index < 0 || !process.argv[index + 1]) {
    console.log('Usage: node scripts/store/assembledHouse.mjs --out-dir PATH\nWrites two clearly named source-art composition proofs and provenance, not gameplay captures.');
  } else {
    const out = path.resolve(process.argv[index + 1]);
    await fs.mkdir(out, { recursive: true });
    for (const phase of [1, 3]) {
      const renderer = await createHouseRenderer({ phase });
      const basename = `assembled-house-phase-${phase}`;
      await fs.writeFile(path.join(out, `${basename}.png`), await renderer.render(0.7));
      await fs.writeFile(path.join(out, `${basename}.json`), `${JSON.stringify(renderer.provenance, null, 2)}\n`);
      console.log(path.join(out, `${basename}.png`));
    }
  }
}
