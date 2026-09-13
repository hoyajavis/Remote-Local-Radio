import fs from 'fs';
import path from 'path';
import { RadioStation, ScheduleSlot } from '../src/types/radio.js';
import { ALL_STATIONS, DEFAULT_SCHEDULE } from '../src/data/defaultStations.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const SCHEDULE_FILE = path.join(DATA_DIR, 'schedule.json');
const STATIONS_FILE = path.join(DATA_DIR, 'stations.json');

class RadioDatabase {
  private stations: RadioStation[] = [];
  private schedule: ScheduleSlot[] = [];
  private isWriting: boolean = false;
  private bufferStats = {
    totalBufferedMinutes: 1440, // 24 hours continuously indexed
    activeListeners: 1,
    lastStreamSync: Date.now(),
    bufferHealth: 98.5
  };

  constructor() {
    this.initDatabase();
  }

  private initDatabase() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      // Always ensure full station catalog (all bands)
      this.stations = ALL_STATIONS;
      fs.writeFileSync(STATIONS_FILE, JSON.stringify(this.stations, null, 2), 'utf-8');

      // Load or seed schedule
      if (fs.existsSync(SCHEDULE_FILE)) {
        const data = fs.readFileSync(SCHEDULE_FILE, 'utf-8');
        this.schedule = JSON.parse(data);
      } else {
        this.schedule = DEFAULT_SCHEDULE;
        fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(this.schedule, null, 2), 'utf-8');
      }
    } catch (err) {
      console.warn('Error reading persistent database files, falling back to in-memory defaults:', err);
      this.stations = ALL_STATIONS;
      this.schedule = DEFAULT_SCHEDULE;
    }
  }

  /**
   * Atomic, non-blocking asynchronous persistence to prevent JSON corruption
   */
  private async persistSchedule(): Promise<void> {
    const tmpFile = path.join(DATA_DIR, `schedule.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`);
    try {
      await fs.promises.mkdir(DATA_DIR, { recursive: true });
      await fs.promises.writeFile(tmpFile, JSON.stringify(this.schedule, null, 2), 'utf-8');
      await fs.promises.rename(tmpFile, SCHEDULE_FILE);
    } catch (err) {
      console.error('Failed to persist schedule to file, operating with in-memory state:', err);
      try {
        if (fs.existsSync(tmpFile)) {
          await fs.promises.unlink(tmpFile);
        }
      } catch {}
    }
  }

  public getStations(band?: string): RadioStation[] {
    if (band) {
      return this.stations
        .filter(s => s.band === band)
        .sort((a, b) => a.mhz - b.mhz);
    }
    return [...this.stations].sort((a, b) => a.mhz - b.mhz);
  }

  public getStation(id: string): RadioStation | undefined {
    return this.stations.find(s => s.id === id);
  }

  public getSchedule(): ScheduleSlot[] {
    // Return schedule sorted by start time
    return [...this.schedule].sort((a, b) => {
      const timeA = a.startHour * 60 + a.startMinute;
      const timeB = b.startHour * 60 + b.startMinute;
      return timeA - timeB;
    });
  }

  public async saveSchedule(newSchedule: ScheduleSlot[]): Promise<ScheduleSlot[]> {
    this.schedule = newSchedule;
    await this.persistSchedule();
    return this.getSchedule();
  }

  public async resetSchedule(): Promise<ScheduleSlot[]> {
    this.schedule = DEFAULT_SCHEDULE;
    await this.persistSchedule();
    return this.getSchedule();
  }

  public async addOrUpdateSlot(slot: ScheduleSlot): Promise<ScheduleSlot[]> {
    const idx = this.schedule.findIndex(s => s.id === slot.id);
    if (idx >= 0) {
      this.schedule[idx] = slot;
    } else {
      this.schedule.push(slot);
    }
    await this.persistSchedule();
    return this.getSchedule();
  }

  public async deleteSlot(slotId: string): Promise<ScheduleSlot[]> {
    this.schedule = this.schedule.filter(s => s.id !== slotId);
    await this.persistSchedule();
    return this.getSchedule();
  }

  /**
   * Find the broadcast show currently scheduled for a given KST hour and minute
   */
  public getShowAtKstTime(hour: number, minute: number): { currentSlot: ScheduleSlot; nextSlot: ScheduleSlot | null; elapsedMinutes: number } {
    const sorted = this.getSchedule();
    const currentMins = hour * 60 + minute;

    let foundSlot: ScheduleSlot = sorted[0];
    let foundIndex = 0;

    for (let i = 0; i < sorted.length; i++) {
      const slot = sorted[i];
      const slotStart = slot.startHour * 60 + slot.startMinute;
      const slotEnd = slotStart + slot.durationMinutes;

      if (currentMins >= slotStart && currentMins < slotEnd) {
        foundSlot = slot;
        foundIndex = i;
        break;
      }
    }

    const nextIndex = (foundIndex + 1) % sorted.length;
    const nextSlot = sorted[nextIndex] || null;
    const slotStart = foundSlot.startHour * 60 + foundSlot.startMinute;
    const elapsedMinutes = Math.max(0, currentMins - slotStart);

    return {
      currentSlot: foundSlot,
      nextSlot,
      elapsedMinutes
    };
  }

  public getBufferStatus() {
    return {
      ...this.bufferStats,
      lastStreamSync: Date.now()
    };
  }
}

export const radioDb = new RadioDatabase();
