import type { DiskMountBar } from '../lib/toDiskSnapshot';

export const disk = {
  idle: [
    { fs: '/', usage: 45 },
    { fs: '/System/Volumes/Data', usage: 68 },
  ] satisfies DiskMountBar[],
};
