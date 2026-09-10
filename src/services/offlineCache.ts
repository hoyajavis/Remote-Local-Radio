/**
 * Client-side IndexedDB Cache for TimeShift Radio
 * Provides offline caching for unstable network conditions, prebuffering upcoming broadcast segments
 */

const DB_NAME = 'TimeShiftRadioCache';
const DB_VERSION = 1;
const STORE_SEGMENTS = 'audio_segments';
const STORE_SCHEDULE = 'schedule_cache';

class OfflineStorageService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  private async getDb(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_SEGMENTS)) {
          db.createObjectStore(STORE_SEGMENTS, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORE_SCHEDULE)) {
          db.createObjectStore(STORE_SCHEDULE, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => {
        console.error('IndexedDB open error:', request.error);
        reject(request.error);
      };
    });

    return this.initPromise;
  }

  /**
   * Save an audio segment ArrayBuffer in IndexedDB
   */
  public async saveSegment(key: string, buffer: ArrayBuffer, metadata: Record<string, any> = {}): Promise<void> {
    try {
      const db = await this.getDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_SEGMENTS, 'readwrite');
        const store = tx.objectStore(STORE_SEGMENTS);
        const item = {
          key,
          buffer,
          metadata,
          timestamp: Date.now()
        };
        const req = store.put(item);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Could not cache segment to IndexedDB:', e);
    }
  }

  /**
   * Retrieve a cached audio segment
   */
  public async getSegment(key: string): Promise<ArrayBuffer | null> {
    try {
      const db = await this.getDb();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_SEGMENTS, 'readonly');
        const store = tx.objectStore(STORE_SEGMENTS);
        const req = store.get(key);
        req.onsuccess = () => {
          if (req.result && req.result.buffer) {
            resolve(req.result.buffer);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  /**
   * Check if a segment is cached
   */
  public async hasSegment(key: string): Promise<boolean> {
    try {
      const segment = await this.getSegment(key);
      return segment !== null;
    } catch {
      return false;
    }
  }

  /**
   * Pre-buffer/cache next specified duration of audio segments (e.g. 15-30 minutes)
   */
  public async prebufferUpcoming(
    stationId: string,
    startHour: number,
    numSegments: number = 20, // 20 segments * 6 sec = 2 minutes per batch
    onProgress?: (loaded: number, total: number) => void
  ): Promise<number> {
    let successCount = 0;

    for (let i = 0; i < numSegments; i++) {
      const hour = (startHour + Math.floor(i / 600)) % 24;
      const segmentId = i % 100;
      const key = `seg_${stationId}_${hour}_${segmentId}`;

      const exists = await this.hasSegment(key);
      if (exists) {
        successCount++;
        onProgress?.(successCount, numSegments);
        continue;
      }

      try {
        const res = await fetch(`/api/audio/segment/${stationId}/${hour}/${segmentId}`);
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          await this.saveSegment(key, arrayBuffer, { stationId, hour, segmentId });
          successCount++;
        }
      } catch (err) {
        console.warn(`Failed to pre-cache segment ${key}:`, err);
      }

      onProgress?.(successCount, numSegments);
    }

    return successCount;
  }

  /**
   * Get total number of cached segments and estimated storage in MB
   */
  public async getCacheMetrics(): Promise<{ count: number; estimatedMb: number; estimatedMinutes: number }> {
    try {
      const db = await this.getDb();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_SEGMENTS, 'readonly');
        const store = tx.objectStore(STORE_SEGMENTS);
        const req = store.getAll();

        req.onsuccess = () => {
          const items = req.result || [];
          let totalBytes = 0;
          for (const it of items) {
            if (it.buffer && it.buffer.byteLength) {
              totalBytes += it.buffer.byteLength;
            }
          }
          const estimatedMb = +(totalBytes / (1024 * 1024)).toFixed(2);
          // each segment is ~6 seconds
          const estimatedMinutes = Math.round((items.length * 6) / 60);
          resolve({ count: items.length, estimatedMb, estimatedMinutes });
        };

        req.onerror = () => resolve({ count: 0, estimatedMb: 0, estimatedMinutes: 0 });
      });
    } catch {
      return { count: 0, estimatedMb: 0, estimatedMinutes: 0 };
    }
  }

  /**
   * Clear all cached radio audio data
   */
  public async clearCache(): Promise<void> {
    try {
      const db = await this.getDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_SEGMENTS, 'readwrite');
        const store = tx.objectStore(STORE_SEGMENTS);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Error clearing cache:', err);
    }
  }
}

export const offlineStorage = new OfflineStorageService();
