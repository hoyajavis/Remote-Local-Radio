import { RadioStation, ScheduleSlot, TimeShiftInfo } from '../types/radio';

export interface TimeShiftStatusResponse {
  success: boolean;
  data: TimeShiftInfo & {
    userLocalSec: number;
    bufferStats: {
      totalBufferedMinutes: number;
      activeListeners: number;
      lastStreamSync: number;
      bufferHealth: number;
    };
  };
}

export async function fetchStations(): Promise<RadioStation[]> {
  const res = await fetch('/api/stations');
  if (!res.ok) throw new Error('Failed to fetch stations');
  const data = await res.json();
  return data.stations;
}

export async function fetchSchedule(): Promise<ScheduleSlot[]> {
  const res = await fetch('/api/schedule');
  if (!res.ok) throw new Error('Failed to fetch schedule');
  const data = await res.json();
  return data.schedule;
}

export async function saveSchedule(schedule: ScheduleSlot[]): Promise<ScheduleSlot[]> {
  const res = await fetch('/api/schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schedule }),
  });
  if (!res.ok) throw new Error('Failed to save schedule');
  const data = await res.json();
  return data.schedule;
}

export async function saveSlot(slot: ScheduleSlot): Promise<ScheduleSlot[]> {
  const res = await fetch('/api/schedule/slot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(slot),
  });
  if (!res.ok) throw new Error('Failed to save slot');
  const data = await res.json();
  return data.schedule;
}

export async function deleteSlot(id: string): Promise<ScheduleSlot[]> {
  const res = await fetch(`/api/schedule/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete slot');
  const data = await res.json();
  return data.schedule;
}

export async function resetSchedule(): Promise<ScheduleSlot[]> {
  const res = await fetch('/api/schedule/reset', {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to reset schedule');
  const data = await res.json();
  return data.schedule;
}

export async function fetchTimeShiftStatus(
  timezone: string,
  liveSync: boolean,
  scrubbedHour?: number,
  scrubbedMinute?: number
): Promise<TimeShiftStatusResponse['data']> {
  const params = new URLSearchParams({
    timezone,
    liveSync: String(liveSync)
  });
  if (scrubbedHour !== undefined) {
    params.append('scrubbedHour', String(scrubbedHour));
  }
  if (scrubbedMinute !== undefined) {
    params.append('scrubbedMinute', String(scrubbedMinute));
  }

  const res = await fetch(`/api/timeshift/status?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch time-shift status');
  const json: TimeShiftStatusResponse = await res.json();
  return json.data;
}
