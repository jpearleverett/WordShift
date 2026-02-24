import { createClient } from '@supabase/supabase-js';
import { getRuntimeConfig } from '../config/runtime';
import { CloudProvider, CloudSaveData } from './cloudSave';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_USER_ID_KEY = 'wordshift_supabase_user_id';

type SupabaseClientLike = ReturnType<typeof createClient>;

export class SupabaseCloudProvider implements CloudProvider {
  private client: SupabaseClientLike | null = null;
  private userId: string | null = null;
  private initialized = false;

  private async ensureClient(): Promise<boolean> {
    if (this.initialized && this.client && this.userId) {
      return true;
    }

    const runtime = getRuntimeConfig();
    if (!runtime.enableCloudSync || !runtime.supabaseUrl || !runtime.supabaseAnonKey) {
      return false;
    }

    this.client = createClient(runtime.supabaseUrl, runtime.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storage: AsyncStorage as any,
      },
    });

    try {
      const sessionResult = await this.client.auth.getSession();
      let user = sessionResult.data?.session?.user ?? null;
      if (!user) {
        const signInResult = await this.client.auth.signInAnonymously();
        user = signInResult.data?.user ?? null;
      }
      if (!user) {
        return false;
      }
      this.userId = user.id;
      await AsyncStorage.setItem(SUPABASE_USER_ID_KEY, this.userId).catch(() => {});
      this.initialized = true;
      return true;
    } catch {
      return false;
    }
  }

  private tableName(): string {
    return getRuntimeConfig().supabaseSaveTable || 'game_saves';
  }

  async upload(data: CloudSaveData): Promise<boolean> {
    const ok = await this.ensureClient();
    if (!ok || !this.client || !this.userId) return false;

    const payload = {
      user_id: this.userId,
      save_data: data,
      updated_at: new Date().toISOString(),
    };

    const { error } = await this.client
      .from(this.tableName())
      .upsert(payload, { onConflict: 'user_id' });

    return !error;
  }

  async download(): Promise<CloudSaveData | null> {
    const ok = await this.ensureClient();
    if (!ok || !this.client || !this.userId) return null;

    const { data, error } = await this.client
      .from(this.tableName())
      .select('save_data')
      .eq('user_id', this.userId)
      .single();

    if (error || !data?.save_data) return null;
    return data.save_data as CloudSaveData;
  }

  async hasNewerSave(localTimestamp: number): Promise<boolean> {
    const ok = await this.ensureClient();
    if (!ok || !this.client || !this.userId) return false;

    const { data, error } = await this.client
      .from(this.tableName())
      .select('updated_at')
      .eq('user_id', this.userId)
      .single();

    if (error || !data?.updated_at) return false;
    const remoteTimestamp = Date.parse(data.updated_at as string);
    if (Number.isNaN(remoteTimestamp)) return false;
    return remoteTimestamp > localTimestamp;
  }

  getName(): string {
    return 'Supabase';
  }

  async isReady(): Promise<boolean> {
    return this.ensureClient();
  }
}
