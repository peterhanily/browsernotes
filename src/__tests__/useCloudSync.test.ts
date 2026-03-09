import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { BackupDestination } from '../types';

// ── Mocks ────────────────────────────────────────────────────────────

const mockExportJSON = vi.fn(async () => JSON.stringify({
  version: 1,
  exportedAt: Date.now(),
  notes: [],
  tasks: [],
  folders: [],
  tags: [],
  timelineEvents: [],
  timelines: [],
  whiteboards: [],
  standaloneIOCs: [],
  chatThreads: [],
}));

vi.mock('../lib/export', () => ({
  exportJSON: () => mockExportJSON(),
}));

const mockMultiCloudPut = vi.fn(async () => []);
const mockBuildFullBackupEnvelope = vi.fn(() => ({ type: 'full-backup', data: {} }));
const mockBuildNoteEnvelope = vi.fn(() => ({ type: 'note', data: {} }));
const mockBuildIOCReportEnvelope = vi.fn(() => ({ type: 'ioc-report', data: {} }));
const mockBuildObjectKey = vi.fn(() => 'threatcaddy/full-backup.json');

vi.mock('../lib/cloud-sync', () => ({
  multiCloudPut: (...args: unknown[]) => mockMultiCloudPut(...args),
  buildFullBackupEnvelope: (...args: unknown[]) => mockBuildFullBackupEnvelope(...args),
  buildNoteEnvelope: (...args: unknown[]) => mockBuildNoteEnvelope(...args),
  buildIOCReportEnvelope: (...args: unknown[]) => mockBuildIOCReportEnvelope(...args),
  buildObjectKey: (...args: unknown[]) => mockBuildObjectKey(...args),
}));

vi.mock('../lib/ioc-export', () => ({
  formatIOCsFlatJSON: vi.fn(() => '{"iocs":[]}'),
  slugify: vi.fn((s: string) => s.toLowerCase().replace(/\s+/g, '-')),
}));

// Import after mocks
import { useCloudSync } from '../hooks/useCloudSync';

// ── Helpers ──────────────────────────────────────────────────────────

function makeDest(overrides: Partial<BackupDestination> = {}): BackupDestination {
  return {
    id: 'dest-1',
    provider: 'oci',
    label: 'Test Bucket',
    url: 'https://bucket.example.com/',
    enabled: true,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe('useCloudSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with idle state', () => {
    const { result } = renderHook(() => useCloudSync([makeDest()]));
    expect(result.current.syncing).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.progress).toBe('');
    expect(result.current.lastSyncAt).toBeNull();
    expect(result.current.hasDestinations).toBe(true);
  });

  it('reports no destinations when all are disabled', () => {
    const { result } = renderHook(() => useCloudSync([makeDest({ enabled: false })]));
    expect(result.current.hasDestinations).toBe(false);
  });

  it('reports no destinations when list is empty', () => {
    const { result } = renderHook(() => useCloudSync([]));
    expect(result.current.hasDestinations).toBe(false);
  });

  it('pushFullBackup exports, builds envelope, and uploads', async () => {
    mockMultiCloudPut.mockResolvedValue([{ ok: true, status: 200, destinationId: 'dest-1', label: 'Test', statusText: 'OK' }]);

    const dest = makeDest();
    const { result } = renderHook(() => useCloudSync([dest]));

    await act(async () => {
      await result.current.pushFullBackup();
    });

    expect(mockExportJSON).toHaveBeenCalled();
    expect(mockBuildFullBackupEnvelope).toHaveBeenCalled();
    expect(mockMultiCloudPut).toHaveBeenCalled();
    expect(result.current.syncing).toBe(false);
    expect(result.current.lastSyncAt).not.toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('pushFullBackup sets error when no destinations are configured', async () => {
    const { result } = renderHook(() => useCloudSync([]));

    await act(async () => {
      await result.current.pushFullBackup();
    });

    expect(result.current.error).toContain('No backup destinations');
    expect(result.current.syncing).toBe(false);
  });

  it('pushFullBackup sets error when all destinations fail', async () => {
    mockMultiCloudPut.mockResolvedValue([
      { ok: false, status: 500, destinationId: 'dest-1', label: 'Test', statusText: 'Server Error' },
    ]);

    const { result } = renderHook(() => useCloudSync([makeDest()]));

    await act(async () => {
      await result.current.pushFullBackup();
    });

    expect(result.current.error).toBe('All destinations failed');
  });

  it('reports partial failure when some destinations fail', async () => {
    mockMultiCloudPut.mockResolvedValue([
      { ok: true, status: 200, destinationId: 'dest-1', label: 'A', statusText: 'OK' },
      { ok: false, status: 403, destinationId: 'dest-2', label: 'B', statusText: 'Forbidden' },
    ]);

    const dests = [
      makeDest({ id: 'dest-1', label: 'A' }),
      makeDest({ id: 'dest-2', label: 'B' }),
    ];
    const { result } = renderHook(() => useCloudSync(dests));

    await act(async () => {
      await result.current.pushFullBackup();
    });

    expect(result.current.error).toBe('1 of 2 destinations failed');
    // Still sets lastSyncAt since some succeeded
    expect(result.current.lastSyncAt).not.toBeNull();
  });

  it('pushIOCs returns true on success', async () => {
    mockMultiCloudPut.mockResolvedValue([
      { ok: true, status: 200, destinationId: 'dest-1', label: 'Test', statusText: 'OK' },
    ]);

    const { result } = renderHook(() => useCloudSync([makeDest()]));

    let success: boolean;
    await act(async () => {
      success = await result.current.pushIOCs([], 'test-slug');
    });

    expect(success!).toBe(true);
  });

  it('pushIOCs returns false when all destinations fail', async () => {
    mockMultiCloudPut.mockResolvedValue([
      { ok: false, status: 500, destinationId: 'dest-1', label: 'Test', statusText: 'Error' },
    ]);

    const { result } = renderHook(() => useCloudSync([makeDest()]));

    let success: boolean;
    await act(async () => {
      success = await result.current.pushIOCs([], 'test-slug');
    });

    expect(success!).toBe(false);
    expect(result.current.error).toBeTruthy();
  });
});
