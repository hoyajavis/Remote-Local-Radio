import { StationArchiveConfig } from './types.js';
import { SEOUL_ARCHIVE_CONFIGS } from './seoulConfigs.js';
import { CALIFORNIA_ARCHIVE_CONFIGS } from './californiaConfigs.js';

export * from './types.js';
export { SEOUL_ARCHIVE_CONFIGS } from './seoulConfigs.js';
export { CALIFORNIA_ARCHIVE_CONFIGS } from './californiaConfigs.js';

export const STATION_ARCHIVE_CONFIGS: Record<string, StationArchiveConfig> = {
  ...SEOUL_ARCHIVE_CONFIGS,
  ...CALIFORNIA_ARCHIVE_CONFIGS
};

export function getStationArchiveConfig(stationId: string): StationArchiveConfig {
  return STATION_ARCHIVE_CONFIGS[stationId] || STATION_ARCHIVE_CONFIGS['mbc-919'];
}
