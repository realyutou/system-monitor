import type {
  CpuMetricDto,
  DiskMetricDto,
  MemoryMetricDto,
} from '../../src/lib/api';
import type { CpuChartRow } from '../../src/lib/toCpuSeries';
import type { DiskMountBar } from '../../src/lib/toDiskSnapshot';
import type {
  MemoryChartRow,
  StampedMemoryDto,
} from '../../src/lib/toMemorySeries';

export const scenarioNames = ['idle', 'medium-load', 'peak'] as const;

export type ScenarioName = (typeof scenarioNames)[number];

type CpuRawSample = {
  timestamp: string;
  load: {
    currentLoad: number;
    cpus: unknown[];
  };
};

type MemoryRawSample = {
  timestamp: string;
  mem: {
    active: number;
    total: number;
  };
};

type DiskRawRow = {
  fs: string;
  type: string;
  size: number;
  used: number;
  use: number;
  mount: string;
};

export type ScenarioFixture = {
  name: ScenarioName;
  description: string;
  cpu: {
    rawSamples: CpuRawSample[];
    expectedDtos: CpuMetricDto[];
    expectedChartRows: CpuChartRow[];
  };
  memory: {
    rawSamples: MemoryRawSample[];
    expectedDtos: MemoryMetricDto[];
    expectedStampedDtos: StampedMemoryDto[];
    expectedChartRows: MemoryChartRow[];
  };
  disk: {
    rawRows: DiskRawRow[];
    expectedDto: DiskMetricDto;
    expectedChartRows: DiskMountBar[];
  };
};

const makeCpus = (count: number) => Array.from({ length: count }, () => ({}));

const toCpuRows = (dtos: CpuMetricDto[]): CpuChartRow[] =>
  dtos.map((dto) => ({
    time: Date.parse(dto.timestamp),
    usage: dto.usagePercent,
  }));

const stampMemory = (
  rawSamples: MemoryRawSample[],
  dtos: MemoryMetricDto[],
): StampedMemoryDto[] =>
  dtos.map((dto, index) => ({
    ...dto,
    timestamp: rawSamples[index].timestamp,
  }));

const toMemoryRows = (dtos: StampedMemoryDto[]): MemoryChartRow[] =>
  dtos.map((dto) => ({
    time: Date.parse(dto.timestamp),
    usage: dto.usagePercent,
  }));

const toDiskRows = (dto: DiskMetricDto): DiskMountBar[] =>
  dto.mounts.map((mount) => ({
    fs: mount.fs,
    usage: mount.usagePercent,
  }));

const createScenario = (
  fixture: Omit<ScenarioFixture, 'cpu' | 'memory' | 'disk'> & {
    cpu: {
      rawSamples: CpuRawSample[];
      expectedDtos: CpuMetricDto[];
    };
    memory: {
      rawSamples: MemoryRawSample[];
      expectedDtos: MemoryMetricDto[];
    };
    disk: {
      rawRows: DiskRawRow[];
      expectedDto: DiskMetricDto;
    };
  },
): ScenarioFixture => {
  const stampedMemory = stampMemory(
    fixture.memory.rawSamples,
    fixture.memory.expectedDtos,
  );

  return {
    ...fixture,
    cpu: {
      ...fixture.cpu,
      expectedChartRows: toCpuRows(fixture.cpu.expectedDtos),
    },
    memory: {
      ...fixture.memory,
      expectedStampedDtos: stampedMemory,
      expectedChartRows: toMemoryRows(stampedMemory),
    },
    disk: {
      ...fixture.disk,
      expectedChartRows: toDiskRows(fixture.disk.expectedDto),
    },
  };
};

export const scenarios = [
  createScenario({
    name: 'idle',
    description: 'Low foreground activity with stable memory and light disk use.',
    cpu: {
      rawSamples: [
        {
          timestamp: '2026-05-20T10:00:00.000Z',
          load: { currentLoad: 6, cpus: makeCpus(8) },
        },
        {
          timestamp: '2026-05-20T10:00:02.000Z',
          load: { currentLoad: 8, cpus: makeCpus(8) },
        },
        {
          timestamp: '2026-05-20T10:00:04.000Z',
          load: { currentLoad: 5, cpus: makeCpus(8) },
        },
      ],
      expectedDtos: [
        {
          usagePercent: 6,
          cores: 8,
          timestamp: '2026-05-20T10:00:00.000Z',
        },
        {
          usagePercent: 8,
          cores: 8,
          timestamp: '2026-05-20T10:00:02.000Z',
        },
        {
          usagePercent: 5,
          cores: 8,
          timestamp: '2026-05-20T10:00:04.000Z',
        },
      ],
    },
    memory: {
      rawSamples: [
        {
          timestamp: '2026-05-20T10:00:00.000Z',
          mem: { active: 6400, total: 16000 },
        },
        {
          timestamp: '2026-05-20T10:00:02.000Z',
          mem: { active: 6720, total: 16000 },
        },
        {
          timestamp: '2026-05-20T10:00:04.000Z',
          mem: { active: 6240, total: 16000 },
        },
      ],
      expectedDtos: [
        { usedBytes: 6400, totalBytes: 16000, usagePercent: 40 },
        { usedBytes: 6720, totalBytes: 16000, usagePercent: 42 },
        { usedBytes: 6240, totalBytes: 16000, usagePercent: 39 },
      ],
    },
    disk: {
      rawRows: [
        {
          fs: 'rootfs',
          type: 'apfs',
          size: 10000,
          used: 4500,
          use: 45,
          mount: '/',
        },
        {
          fs: 'datafs',
          type: 'apfs',
          size: 20000,
          used: 10000,
          use: 50,
          mount: '/Users',
        },
        {
          fs: 'devfs',
          type: 'devfs',
          size: 100,
          used: 100,
          use: 100,
          mount: '/dev',
        },
        {
          fs: 'snapshot',
          type: 'apfs',
          size: 10000,
          used: 8000,
          use: 80,
          mount: '/System/Volumes/Data',
        },
      ],
      expectedDto: {
        mounts: [
          {
            fs: 'rootfs',
            usedBytes: 4500,
            totalBytes: 10000,
            usagePercent: 45,
          },
          {
            fs: 'datafs',
            usedBytes: 10000,
            totalBytes: 20000,
            usagePercent: 50,
          },
        ],
      },
    },
  }),
  createScenario({
    name: 'medium-load',
    description: 'Sustained everyday work with moderate CPU and memory pressure.',
    cpu: {
      rawSamples: [
        {
          timestamp: '2026-05-20T10:10:00.000Z',
          load: { currentLoad: 38, cpus: makeCpus(8) },
        },
        {
          timestamp: '2026-05-20T10:10:02.000Z',
          load: { currentLoad: 47, cpus: makeCpus(8) },
        },
        {
          timestamp: '2026-05-20T10:10:04.000Z',
          load: { currentLoad: 43, cpus: makeCpus(8) },
        },
      ],
      expectedDtos: [
        {
          usagePercent: 38,
          cores: 8,
          timestamp: '2026-05-20T10:10:00.000Z',
        },
        {
          usagePercent: 47,
          cores: 8,
          timestamp: '2026-05-20T10:10:02.000Z',
        },
        {
          usagePercent: 43,
          cores: 8,
          timestamp: '2026-05-20T10:10:04.000Z',
        },
      ],
    },
    memory: {
      rawSamples: [
        {
          timestamp: '2026-05-20T10:10:00.000Z',
          mem: { active: 9600, total: 16000 },
        },
        {
          timestamp: '2026-05-20T10:10:02.000Z',
          mem: { active: 10240, total: 16000 },
        },
        {
          timestamp: '2026-05-20T10:10:04.000Z',
          mem: { active: 9920, total: 16000 },
        },
      ],
      expectedDtos: [
        { usedBytes: 9600, totalBytes: 16000, usagePercent: 60 },
        { usedBytes: 10240, totalBytes: 16000, usagePercent: 64 },
        { usedBytes: 9920, totalBytes: 16000, usagePercent: 62 },
      ],
    },
    disk: {
      rawRows: [
        {
          fs: 'rootfs',
          type: 'ext4',
          size: 10000,
          used: 6800,
          use: 68,
          mount: '/',
        },
        {
          fs: 'workspace',
          type: 'xfs',
          size: 30000,
          used: 21900,
          use: 73,
          mount: '/workspace',
        },
        {
          fs: 'tmpfs',
          type: 'tmpfs',
          size: 5000,
          used: 1000,
          use: 20,
          mount: '/run',
        },
        {
          fs: 'empty',
          type: 'ext4',
          size: 0,
          used: 0,
          use: 0,
          mount: '/empty',
        },
      ],
      expectedDto: {
        mounts: [
          {
            fs: 'rootfs',
            usedBytes: 6800,
            totalBytes: 10000,
            usagePercent: 68,
          },
          {
            fs: 'workspace',
            usedBytes: 21900,
            totalBytes: 30000,
            usagePercent: 73,
          },
        ],
      },
    },
  }),
  createScenario({
    name: 'peak',
    description: 'Short burst near saturation with high CPU, memory, and disk usage.',
    cpu: {
      rawSamples: [
        {
          timestamp: '2026-05-20T10:20:00.000Z',
          load: { currentLoad: 88, cpus: makeCpus(8) },
        },
        {
          timestamp: '2026-05-20T10:20:02.000Z',
          load: { currentLoad: 96, cpus: makeCpus(8) },
        },
        {
          timestamp: '2026-05-20T10:20:04.000Z',
          load: { currentLoad: 91, cpus: makeCpus(8) },
        },
      ],
      expectedDtos: [
        {
          usagePercent: 88,
          cores: 8,
          timestamp: '2026-05-20T10:20:00.000Z',
        },
        {
          usagePercent: 96,
          cores: 8,
          timestamp: '2026-05-20T10:20:02.000Z',
        },
        {
          usagePercent: 91,
          cores: 8,
          timestamp: '2026-05-20T10:20:04.000Z',
        },
      ],
    },
    memory: {
      rawSamples: [
        {
          timestamp: '2026-05-20T10:20:00.000Z',
          mem: { active: 13120, total: 16000 },
        },
        {
          timestamp: '2026-05-20T10:20:02.000Z',
          mem: { active: 14400, total: 16000 },
        },
        {
          timestamp: '2026-05-20T10:20:04.000Z',
          mem: { active: 13920, total: 16000 },
        },
      ],
      expectedDtos: [
        { usedBytes: 13120, totalBytes: 16000, usagePercent: 82 },
        { usedBytes: 14400, totalBytes: 16000, usagePercent: 90 },
        { usedBytes: 13920, totalBytes: 16000, usagePercent: 87 },
      ],
    },
    disk: {
      rawRows: [
        {
          fs: 'rootfs',
          type: 'ntfs',
          size: 10000,
          used: 9200,
          use: 92,
          mount: '/',
        },
        {
          fs: 'media',
          type: 'exfat',
          size: 50000,
          used: 47500,
          use: 95,
          mount: '/Volumes/media',
        },
        {
          fs: 'network',
          type: 'smbfs',
          size: 50000,
          used: 25000,
          use: 50,
          mount: '/Volumes/network',
        },
        {
          fs: 'snapshot',
          type: 'apfs',
          size: 20000,
          used: 19000,
          use: 95,
          mount: '/System/Volumes/Preboot',
        },
      ],
      expectedDto: {
        mounts: [
          {
            fs: 'rootfs',
            usedBytes: 9200,
            totalBytes: 10000,
            usagePercent: 92,
          },
          {
            fs: 'media',
            usedBytes: 47500,
            totalBytes: 50000,
            usagePercent: 95,
          },
        ],
      },
    },
  }),
] satisfies ScenarioFixture[];

const scenarioByName = new Map<ScenarioName, ScenarioFixture>(
  scenarios.map((scenario) => [scenario.name, scenario]),
);

export function loadFixture(name: string): ScenarioFixture {
  const fixture = scenarioByName.get(name as ScenarioName);

  if (!fixture) {
    throw new Error(`Unknown scenario fixture: ${name}`);
  }

  return fixture;
}
