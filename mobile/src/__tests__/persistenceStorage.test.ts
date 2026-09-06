import NativeStorage from '@react-native-async-storage/async-storage';
import storage, { runStorageTransaction, recoverPendingStorageTransaction, STORAGE_COMMIT_KEY } from '../services/persistenceStorage';
jest.mock('@react-native-async-storage/async-storage', () => require('./helpers/mockAsyncStorage').createMockAsyncStorage());

const originalRead = (NativeStorage.getItem as jest.Mock).getMockImplementation()!;
const originalWrite = (NativeStorage.setItem as jest.Mock).getMockImplementation()!;
beforeEach(async () => {
  (NativeStorage.getItem as jest.Mock).mockImplementation(originalRead);
  (NativeStorage.setItem as jest.Mock).mockImplementation(originalWrite);
  await NativeStorage.clear();
});

test('failed computation leaves original keys and deletions untouched', async () => {
  await NativeStorage.setItem('wordshift_example', 'before');
  await expect(runStorageTransaction('test', async () => {
    await storage.removeItem('wordshift_example');
    await storage.setItem('wordshift_second', 'after');
    expect(await NativeStorage.getItem('wordshift_example')).toBe('before');
    throw new Error('failure');
  })).rejects.toThrow('failure');
  expect(await NativeStorage.getItem('wordshift_example')).toBe('before');
  expect(await NativeStorage.getItem('wordshift_second')).toBeNull();
  expect(await NativeStorage.getItem(STORAGE_COMMIT_KEY)).toBeNull();
});

test('interrupted commit rolls forward all keys exactly once', async () => {
  const write = originalWrite;
  let failed = false;
  jest.spyOn(NativeStorage, 'setItem').mockImplementation(async (key, value) => {
    if (key === 'wordshift_second' && !failed) { failed = true; throw new Error('full disk'); }
    await write(key, value);
  });
  await expect(runStorageTransaction('test', async () => {
    await storage.setItem('wordshift_first', '1');
    await storage.setItem('wordshift_second', '2');
  })).rejects.toThrow('need recovery');
  expect(await NativeStorage.getItem(STORAGE_COMMIT_KEY)).not.toBeNull();
  expect(await recoverPendingStorageTransaction()).toBe(true);
  expect(await NativeStorage.getItem('wordshift_first')).toBe('1');
  expect(await NativeStorage.getItem('wordshift_second')).toBe('2');
  expect(await recoverPendingStorageTransaction()).toBe(false);
});

test('a swallowed read failure cannot commit a fabricated default', async () => {
  const read = originalRead;
  jest.spyOn(NativeStorage, 'getItem').mockImplementation(async key => {
    if (key === 'wordshift_example') throw new Error('unreadable');
    return read(key);
  });
  await expect(runStorageTransaction('test', async () => {
    await storage.getItem('wordshift_example').catch(() => null);
    await storage.setItem('wordshift_example', '{}');
  })).rejects.toThrow('unreadable');
  expect(await NativeStorage.getItem(STORAGE_COMMIT_KEY)).toBeNull();
});

test('queued operations read the preceding committed value', async () => {
  await Promise.all([1, 2, 3].map(() => runStorageTransaction('increment', async () => {
    const value = Number(await storage.getItem('wordshift_count'));
    await storage.setItem('wordshift_count', String(value + 1));
  })));
  expect(await NativeStorage.getItem('wordshift_count')).toBe('3');
});
