import { clearEvents } from '../services/eventLogger';
import NativeStorage from '@react-native-async-storage/async-storage';
import { collectLocalSaveData, invalidateRestoredServiceCaches, restoreFromCloudData } from '../services/cloudSave';
import { recoverPendingStorageTransaction, STORAGE_COMMIT_KEY } from '../services/persistenceStorage';
import { recordDurableVictory, recoverPendingVictory, createVictoryInput, PENDING_VICTORY_KEY } from '../services/victoryPersistence';
import { loadProgress } from '../services/amberCurrency';
import { getCumulativeStats } from '../services/starRating';
import { getHarvestState } from '../services/wordHarvest';
import { loadStoryState } from '../services/storySpine';
import { runMigrations } from '../services/dataMigration';

jest.mock('@react-native-async-storage/async-storage', () => require('./helpers/mockAsyncStorage').createMockAsyncStorage());
const originalRead = (NativeStorage.getItem as jest.Mock).getMockImplementation()!;
const originalWrite = (NativeStorage.setItem as jest.Mock).getMockImplementation()!;
beforeEach(async () => {
  (NativeStorage.getItem as jest.Mock).mockImplementation(originalRead);
  (NativeStorage.setItem as jest.Mock).mockImplementation(originalWrite);
  await NativeStorage.clear(); invalidateRestoredServiceCaches();
});
const input = (id = 'board-1') => createVictoryInput({ completionId: id,
  difficulty: 'EASY', hintsUsed: 0, invalidAttempts: 0, gameMode: 'standard',
  completedWords: ['LIME', 'TIME'], variant: 'standard', isDaily: false, undosUsed: 0,
  blind: false, isSharedChallenge: false, resonantChoiceCount: 0, lexicon: false,
  maxStack: false, undoLimited: false, speed: false,
});

test.each([
  { version: 999, data: {} },
  { version: 1, data: { wordshift_entitlements: '{}' } },
  { version: 1, data: { wordshift_cloud_owner: 'untrusted' } },
  { version: 1, data: { wordshift_home_progress: '{"amber":-1}' } },
  { version: 1, data: { wordshift_home_progress: 'broken' } },
  { version: 1, data: { wordshift_schema_version: '999' } },
])('invalid save never changes current progress: %p', async bad => {
  await NativeStorage.setItem('wordshift_home_progress', '{"amber":50}');
  expect(await restoreFromCloudData({ timestamp: 1, deviceId: 'test', ...bad } as any)).toBe(false);
  expect(await NativeStorage.getItem('wordshift_home_progress')).toBe('{"amber":50}');
  expect(await NativeStorage.getItem(STORAGE_COMMIT_KEY)).toBeNull();
});

test('one failed local read aborts backup collection', async () => {
  (NativeStorage.getItem as jest.Mock).mockImplementation(async key => {
    if (key === 'wordshift_home_progress') throw new Error('read failed');
    return originalRead(key);
  });
  await expect(collectLocalSaveData()).rejects.toThrow('read failed');
});

test('an interrupted restore finishes completely before services rehydrate', async () => {
  await NativeStorage.setItem('wordshift_home_progress', '{"amber":10}');
  await NativeStorage.setItem('wordshift_in_progress_puzzle', '{"old":true}');
  let failed = false;
  (NativeStorage.setItem as jest.Mock).mockImplementation(async (key, value) => {
    if (key === 'wordshift_home_progress' && !failed) { failed = true; throw new Error('interrupted'); }
    return originalWrite(key, value);
  });
  await expect(restoreFromCloudData({ version: 1, timestamp: 20, deviceId: 'other', data: {
    wordshift_schema_version: '6', wordshift_home_progress: '{"amber":100}',
  }})).rejects.toThrow('need recovery');
  expect(await NativeStorage.getItem(STORAGE_COMMIT_KEY)).not.toBeNull();
  await recoverPendingStorageTransaction(); invalidateRestoredServiceCaches();
  expect((await loadProgress()).amber).toBe(100);
  expect(await NativeStorage.getItem('wordshift_in_progress_puzzle')).toBeNull();
});

test('migration write failure leaves its schema retryable', async () => {
  await NativeStorage.setItem('wordshift_schema_version', '3');
  await NativeStorage.setItem('wordshift_home_progress', '{"lastDialogueRead":{"fox":12}}');
  (NativeStorage.setItem as jest.Mock).mockImplementation(async (key, value) => {
    if (key === 'wordshift_home_progress') throw new Error('full disk');
    return originalWrite(key, value);
  });
  await expect(runMigrations()).rejects.toThrow('need recovery');
  expect(await NativeStorage.getItem('wordshift_schema_version')).toBe('3');
  (NativeStorage.setItem as jest.Mock).mockImplementation(originalWrite);
  await runMigrations();
  expect(await NativeStorage.getItem('wordshift_schema_version')).toBe('6');
  expect(JSON.parse((await NativeStorage.getItem('wordshift_home_progress'))!).lastDialogueRead.fox).toBe(24);
});

test('interrupted victory commit recovers one completion and one harvest reward', async () => {
  let failed = false;
  (NativeStorage.setItem as jest.Mock).mockImplementation(async (key, value) => {
    if (key === 'wordshift_home_progress' && !failed) { failed = true; throw new Error('power loss'); }
    return originalWrite(key, value);
  });
  await expect(recordDurableVictory(input())).rejects.toThrow('need recovery');
  expect(await NativeStorage.getItem(STORAGE_COMMIT_KEY)).not.toBeNull();
  await recoverPendingStorageTransaction(); invalidateRestoredServiceCaches();
  expect(await recoverPendingVictory()).toBeNull();
  const result = await recordDurableVictory(input());
  expect(result.puzzlesSolved).toBe(1);
  expect((await getCumulativeStats()).totalPuzzlesCompleted).toBe(1);
  expect((await getHarvestState()).pendingBatches).toHaveLength(1);
  expect(await NativeStorage.getItem(PENDING_VICTORY_KEY)).toBeNull();
});

test('a failure before commit preserves the intent and replays it once', async () => {
  let failed = false;
  (NativeStorage.getItem as jest.Mock).mockImplementation(async key => {
    if (key === 'wordshift_word_harvest' && !failed) { failed = true; throw new Error('read interrupted'); }
    return originalRead(key);
  });
  await expect(recordDurableVictory(input())).rejects.toThrow('read interrupted');
  expect(await NativeStorage.getItem(STORAGE_COMMIT_KEY)).toBeNull();
  expect(await NativeStorage.getItem(PENDING_VICTORY_KEY)).not.toBeNull();
  expect(await NativeStorage.getItem('wordshift_star_stats')).toBeNull();
  const recovered = await recoverPendingVictory();
  expect(recovered?.puzzlesSolved).toBe(1);
  expect((await getCumulativeStats()).totalPuzzlesCompleted).toBe(1);
  expect((await getHarvestState()).pendingBatches).toHaveLength(1);
});

test('final word boundary and final-board completion persist together', async () => {
  const progress = { ...await loadProgress(), currentPhase: 4, puzzlesSolved: 115,
    phaseProgress: 124, finaleArmed: true, pendingPhaseTransition: null, unlockedAnimals: ['fox'] };
  await NativeStorage.setItem('wordshift_home_progress', JSON.stringify(progress));
  invalidateRestoredServiceCaches();
  const result = await recordDurableVictory({ ...input(), finalBoard: true, ritualWord: 'CLOSED', phaseBefore: 4 });
  expect(result.endgame?.kind).toBe('arrival');
  expect((await loadProgress()).finalPuzzleCompleted).toBe(true);
  expect((await loadStoryState({ phase: 4, puzzlesSolved: 116, cycleCount: 0, unlockedAnimals: ['fox'] })).boundary).toBe('remember');
});

test('daily milestones and original solve-day streak survive a later recovery exactly once', async () => {
  await NativeStorage.setItem('wordshift_home_progress', JSON.stringify({
    amber:0, puzzlesSolved:10, phaseProgress:10, currentPhase:0,
    currentStreak:2, lastPlayDate:'2026-06-19', completedDifficulties:['EASY'],
  }));
  await NativeStorage.setItem('wordshift_daily_challenge', JSON.stringify({
    totalCompleted:2, currentStreak:2, bestStreak:2, lastCompletedDate:'2026-06-19',
    completedChallenges:[{date:'2026-06-18'},{date:'2026-06-19'}],
  }));
  const dailyInput = {...input(), isDaily:true, dailyDate:'2026-06-20', completedDate:'2026-06-20'};
  let failed = false;
  (NativeStorage.setItem as jest.Mock).mockImplementation(async (key,value) => {
    if(key==='wordshift_daily_challenge' && !failed) {failed=true; throw new Error('power loss');}
    return originalWrite(key,value);
  });
  await expect(recordDurableVictory(dailyInput)).rejects.toThrow('need recovery');
  await recoverPendingStorageTransaction(); invalidateRestoredServiceCaches();
  const receipt = await recordDurableVictory(dailyInput);
  expect(receipt.dailyOutcome?.milestone?.amber).toBe(15);
  expect(receipt.dailyOutcome?.progress.currentStreak).toBe(3);
  expect((await loadProgress()).lastPlayDate).toBe('2026-06-20');
  const balance = (await loadProgress()).amber;
  await recordDurableVictory(dailyInput);
  expect((await loadProgress()).amber).toBe(balance);
  expect(JSON.parse((await NativeStorage.getItem('wordshift_daily_challenge'))!).totalCompleted).toBe(3);
});

test('Weave mastery is committed with the same puzzle receipt', async () => {
  const weaveInput = {...input(), unbrokenWeave:true};
  const receipt = await recordDurableVictory(weaveInput);
  expect(receipt.unbrokenWeaveRank).toBeGreaterThanOrEqual(1);
  const raw = await NativeStorage.getItem('wordshift_mastery');
  await recordDurableVictory(weaveInput);
  expect(await NativeStorage.getItem('wordshift_mastery')).toBe(raw);
});

test('a harvested credit interrupted after balance write is not paid twice on retry', async () => {
  const {offerBatch, settleBatchCredit} = await import('../services/wordHarvest');
  const receipt = await recordDurableVictory(input());
  const offered = await offerBatch(receipt.harvestBatchId!);
  const before = (await loadProgress()).amber;
  let failed = false;
  (NativeStorage.setItem as jest.Mock).mockImplementation(async (key,value) => {
    if(key==='wordshift_word_harvest' && !failed) {failed=true; throw new Error('power loss after balance');}
    return originalWrite(key,value);
  });
  await expect(settleBatchCredit(offered!.creditId)).rejects.toThrow('need recovery');
  await recoverPendingStorageTransaction(); invalidateRestoredServiceCaches();
  await settleBatchCredit(offered!.creditId);
  expect((await loadProgress()).amber).toBe(before + offered!.amberAwarded);
  expect((await getHarvestState()).pendingCredits).toHaveLength(0);
});

test.each(['amber','hints'])('paid %s grant credit and receipt recover without duplication', async kind => {
  const {settleConsumableGrant} = await import('../services/iap');
  const grantId = `paid-${kind}-1`;
  await NativeStorage.setItem('wordshift_pending_iap_grants', JSON.stringify([
    {grantId, productId:'test_pack',reward:{kind,amount:25},purchasedAt:1},
  ]));
  let failed = false;
  (NativeStorage.setItem as jest.Mock).mockImplementation(async (key,value) => {
    if(key==='wordshift_applied_iap_grants' && !failed) {failed=true;throw new Error('power loss after credit');}
    return originalWrite(key,value);
  });
  await expect(settleConsumableGrant(grantId)).rejects.toThrow('need recovery');
  await recoverPendingStorageTransaction(); invalidateRestoredServiceCaches();
  const settled = await settleConsumableGrant(grantId);
  expect(kind==='amber' ? settled.amberBalance : settled.hintBalance).toBe(25);
  const again = await settleConsumableGrant(grantId);
  expect(again).toEqual(settled);
  expect(JSON.parse((await NativeStorage.getItem('wordshift_pending_iap_grants'))!)).toEqual([]);
  expect(JSON.parse((await NativeStorage.getItem('wordshift_applied_iap_grants'))!)).toEqual([grantId]);
});

test('cancelling a restore during staging preserves every old key', async () => {
  await NativeStorage.setItem('wordshift_home_progress', '{"amber":25}');
  let checks = 0;
  const restored = await restoreFromCloudData({version:1,timestamp:1,deviceId:'other',data:{
    wordshift_home_progress:'{"amber":100}',wordshift_schema_version:'6',
  }}, undefined, () => ++checks <= 2);
  expect(restored).toBe(false);
  expect(await NativeStorage.getItem('wordshift_home_progress')).toBe('{"amber":25}');
  expect(await NativeStorage.getItem(STORAGE_COMMIT_KEY)).toBeNull();
});

test('an ambient reward waits for restore and credits the new save', async () => {
  const {awardBonusAmber} = await import('../services/amberCurrency');
  await NativeStorage.setItem('wordshift_home_progress', '{"amber":25}');
  await loadProgress();
  let release!:()=>void;
  let reached!:()=>void;
  const ready = new Promise<void>(resolve=>{reached=resolve;});
  const held = new Promise<void>(resolve=>{release=resolve;});
  (NativeStorage.setItem as jest.Mock).mockImplementation(async (key,value) => {
    if(key===STORAGE_COMMIT_KEY && JSON.parse(value).label==='cloud_restore') {reached();await held;}
    return originalWrite(key,value);
  });
  const restore = restoreFromCloudData({version:1,timestamp:1,deviceId:'other',data:{
    wordshift_home_progress:'{"amber":100}',wordshift_schema_version:'6',
  }});
  await ready;
  const reward = awardBonusAmber(5,'test_async_reward');
  release();
  expect(await restore).toBe(true);
  expect(await reward).toBe(105);
  expect((await loadProgress()).amber).toBe(105);
});

test('an upload started before Reset cannot clear the newer reset marker', async () => {
  const cloud = await import('../services/cloudSave');
  const {commitFullLocalReset} = await import('../services/resetStorage');
  const oldProvider = cloud.getCloudProvider();
  let begin!:()=>void;
  let finish!:()=>void;
  const started = new Promise<void>(resolve=>{begin=resolve;});
  const held = new Promise<void>(resolve=>{finish=resolve;});
  cloud.setCloudProvider({getName:()=> 'test',isReady:async()=>true,upload:async()=>false,
    download:async()=>null,hasNewerSave:async()=>false,
    uploadConditional:async()=>{begin();await held;return {status:'saved',revision:1};},
  });
  try {
    await NativeStorage.setItem('wordshift_home_progress','{"amber":100}');
    const upload = cloud.uploadToCloud();
    await started;
    await commitFullLocalReset();
    const resetMarker = await NativeStorage.getItem('wordshift_local_reset_at');
    expect(resetMarker).not.toBeNull();
    finish(); expect(await upload).toBe(true);
    expect(await NativeStorage.getItem('wordshift_local_reset_at')).toBe(resetMarker);
    expect((await cloud.getSyncStatus()).pendingChanges).toBe(true);
  } finally {finish();cloud.setCloudProvider(oldProvider);}
});

test('manual restore waits for an earlier upload acknowledgement before fetching', async () => {
  const cloud = await import('../services/cloudSave');
  const oldProvider = cloud.getCloudProvider();
  const {formatSecureRecoveryCode} = await import('../services/secureIdentity');
  const owner = 'ws2_'+'e'.repeat(32);
  let begin!:()=>void;
  let finish!:()=>void;
  const started = new Promise<void>(resolve=>{begin=resolve;});
  const held = new Promise<void>(resolve=>{finish=resolve;});
  const download = jest.fn(async()=>({version:1,timestamp:1,deviceId:'other',revision:3,
    data:{wordshift_home_progress:'{"amber":777}',wordshift_schema_version:'6'},
  }));
  cloud.setCloudProvider({getName:()=> 'test',isReady:async()=>true,upload:async()=>false,
    download,hasNewerSave:async()=>false,
    uploadConditional:async()=>{begin();await held;return {status:'saved',revision:1};},
  });
  try {
    const upload = cloud.uploadToCloud();
    await started;
    const restore = cloud.restoreFromRecoveryCode(formatSecureRecoveryCode(owner));
    for(let n=0;n<10;n++) await Promise.resolve();
    expect(download).not.toHaveBeenCalled();
    finish();await upload;
    expect(await restore).toBe(true);
    expect(await cloud.getCloudOwnerId()).toBe(owner);
    expect((await loadProgress()).amber).toBe(777);
    expect((await cloud.getSyncStatus()).remoteRevision).toBe(3);
  } finally {finish();cloud.setCloudProvider(oldProvider);}
});


test.each(['before_commit', 'after_progress_write'])('New Cycle preserves its archive across %s failure', async failurePoint => {
  const { commitNewCycle } = await import('../services/resetStorage');
  const { openStoryScene, recordStoryBoundary, STORY_STORAGE_KEY } = await import('../services/storySpine');
  const progress = { ...await loadProgress(), currentPhase: 5, puzzlesSolved: 120, amber: 250,
    postRevelation: true, finalPuzzleCompleted: true, houseCompleted: true };
  await NativeStorage.setItem('wordshift_home_progress', JSON.stringify(progress));
  const context = { phase: 5 as const, puzzlesSolved: 120, cycleCount: 0, unlockedAnimals: progress.unlockedAnimals };
  await openStoryScene(context);
  await recordStoryBoundary(context, 'CLOSER');
  const oldStory = await NativeStorage.getItem(STORY_STORAGE_KEY);
  const narrativeKeys = ['wordshift_dialogue_sessions', 'wordshift_narrative_delivery',
    'wordshift_dialogue_choices', 'wordshift_micro_beats_seen', 'wordshift_cycle_beats_seen',
    'wordshift_offering_requests'];
  for (const key of narrativeKeys) await NativeStorage.setItem(key, '{"oldCycle":true}');
  invalidateRestoredServiceCaches();
  let failed = false;
  (NativeStorage.setItem as jest.Mock).mockImplementation(async (key, value) => {
    const target = failurePoint === 'before_commit' ? STORAGE_COMMIT_KEY : STORY_STORAGE_KEY;
    if (key === target && !failed) { failed = true; throw new Error('cycle storage interrupted'); }
    return originalWrite(key, value);
  });
  await expect(commitNewCycle()).rejects.toThrow(failurePoint === 'before_commit' ? 'cycle storage interrupted' : 'need recovery');
  if (failurePoint === 'before_commit') {
    expect(await NativeStorage.getItem(STORAGE_COMMIT_KEY)).toBeNull();
    expect(await NativeStorage.getItem('wordshift_home_progress')).toBe(JSON.stringify(progress));
    expect(await NativeStorage.getItem(STORY_STORAGE_KEY)).toBe(oldStory);
    expect(await NativeStorage.getItem(narrativeKeys[0]!)).not.toBeNull();
  } else {
    expect(await NativeStorage.getItem(STORAGE_COMMIT_KEY)).not.toBeNull();
  }
  await commitNewCycle();
  const next = await loadProgress();
  expect(next.cycleCount).toBe(1);
  expect(next.amber).toBe(250);
  expect(next.puzzlesSolved).toBe(120);
  expect(next.currentPhase).toBe(0);
  const story = await loadStoryState({ ...context, phase: 0, cycleCount: 1, cycleStartPuzzles: 120 });
  expect(story.boundary).toBeNull();
  expect(story.carriedBoundary).toBe('release');
  expect(story.memories).toEqual({});
  expect(story.previousCycles).toHaveLength(1);
  expect(story.previousCycles![0]!.memories.after).toBeDefined();
  for (const key of narrativeKeys) expect(await NativeStorage.getItem(key)).toBeNull();
  expect(await NativeStorage.getItem(STORAGE_COMMIT_KEY)).toBeNull();
});

// The service owns a debounced telemetry timer; do not let it outlive its test environment.
afterAll(() => clearEvents());
