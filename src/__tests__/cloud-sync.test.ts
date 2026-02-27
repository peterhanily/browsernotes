/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BackupDestination } from '../types';

// ---- Mock cloud-providers module ----

const mockValidateUrl = vi.fn<(url: string) => { valid: boolean; error?: string }>();
const mockBuildObjectUrl = vi.fn<(baseUrl: string, objectPath: string) => string>();
const mockExtraHeaders = vi.fn<() => Record<string, string>>();

vi.mock('../lib/cloud-providers', () => ({
  CLOUD_PROVIDERS: {
    oci: {
      name: 'Oracle Cloud (OCI)',
      validateUrl: (...args: Parameters<typeof mockValidateUrl>) => mockValidateUrl(...args),
      buildObjectUrl: (...args: Parameters<typeof mockBuildObjectUrl>) => mockBuildObjectUrl(...args),
      extraHeaders: (...args: Parameters<typeof mockExtraHeaders>) => mockExtraHeaders(...args),
    },
  } as Record<string, unknown>,
}));

// ---- Mock global fetch ----

const mockFetch = vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>();
vi.stubGlobal('fetch', mockFetch);

// ---- Import after mocks are set up ----

import { cloudPut, multiCloudPut, testDestination } from '../lib/cloud-sync';

// ---- Helpers ----

function makeDestination(overrides: Partial<BackupDestination> = {}): BackupDestination {
  return {
    id: 'dest-1',
    provider: 'oci',
    label: 'My OCI Bucket',
    url: 'https://objectstorage.us-ashburn-1.oraclecloud.com/p/abc/o/',
    enabled: true,
    ...overrides,
  };
}

function makeOkResponse(status = 200): Response {
  return { ok: true, status, statusText: 'OK' } as Response;
}

function makeErrorResponse(status: number, statusText: string): Response {
  return { ok: false, status, statusText } as Response;
}

// ── cloudPut ────────────────────────────────────────────────────────

describe('cloudPut', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateUrl.mockReturnValue({ valid: true });
    mockBuildObjectUrl.mockReturnValue('https://example.com/object/path');
    mockExtraHeaders.mockReturnValue({});
    mockFetch.mockResolvedValue(makeOkResponse());
  });

  it('returns error for unknown provider', async () => {
    const dest = makeDestination({ provider: 'aws-s3' as BackupDestination['provider'] });
    const result = await cloudPut(dest, 'path/obj.json', '{}');

    expect(result.ok).toBe(false);
    expect(result.status).toBe(0);
    expect(result.error).toContain('Unknown provider');
    expect(result.error).toContain('aws-s3');
    expect(result.destinationId).toBe(dest.id);
    expect(result.label).toBe(dest.label);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns error when URL validation fails', async () => {
    mockValidateUrl.mockReturnValue({ valid: false, error: 'URL must use HTTPS' });
    const dest = makeDestination();
    const result = await cloudPut(dest, 'path/obj.json', '{}');

    expect(result.ok).toBe(false);
    expect(result.status).toBe(0);
    expect(result.error).toBe('URL must use HTTPS');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns error when data exceeds 50 MB', async () => {
    const dest = makeDestination();
    // Create a string larger than 50 MB (50 * 1024 * 1024 + 1 bytes)
    const oversized = 'x'.repeat(50 * 1024 * 1024 + 1);
    const result = await cloudPut(dest, 'path/obj.json', oversized);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(0);
    expect(result.error).toContain('too large');
    expect(result.error).toContain('50 MB');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('performs successful PUT and returns ok result', async () => {
    mockBuildObjectUrl.mockReturnValue('https://example.com/bucket/notes/file.json');
    mockExtraHeaders.mockReturnValue({ 'x-custom': 'value' });
    mockFetch.mockResolvedValue(makeOkResponse(201));

    const dest = makeDestination();
    const result = await cloudPut(dest, 'notes/file.json', '{"data":1}', 'application/json');

    expect(result.ok).toBe(true);
    expect(result.status).toBe(201);
    expect(result.destinationId).toBe(dest.id);
    expect(result.label).toBe(dest.label);
    expect(result.error).toBeUndefined();

    expect(mockFetch).toHaveBeenCalledOnce();
    const [fetchUrl, fetchInit] = mockFetch.mock.calls[0]!;
    expect(fetchUrl).toBe('https://example.com/bucket/notes/file.json');
    expect(fetchInit).toMatchObject({
      method: 'PUT',
      body: '{"data":1}',
      headers: {
        'Content-Type': 'application/json',
        'x-custom': 'value',
      },
    });
  });

  it('returns error on non-ok HTTP response', async () => {
    mockFetch.mockResolvedValue(makeErrorResponse(403, 'Forbidden'));

    const dest = makeDestination();
    const result = await cloudPut(dest, 'path/obj.json', '{}');

    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(result.error).toContain('HTTP 403');
    expect(result.error).toContain('Forbidden');
  });

  it('returns error when fetch throws a network error', async () => {
    mockFetch.mockRejectedValue(new Error('Failed to fetch'));

    const dest = makeDestination();
    const result = await cloudPut(dest, 'path/obj.json', '{}');

    expect(result.ok).toBe(false);
    expect(result.status).toBe(0);
    expect(result.error).toBe('Failed to fetch');
  });

  it('returns generic message when fetch throws a non-Error', async () => {
    mockFetch.mockRejectedValue('some string error');

    const dest = makeDestination();
    const result = await cloudPut(dest, 'path/obj.json', '{}');

    expect(result.ok).toBe(false);
    expect(result.status).toBe(0);
    expect(result.error).toBe('Network error');
  });

  it('uses default content type application/json', async () => {
    const dest = makeDestination();
    await cloudPut(dest, 'path/obj.json', '{}');

    const [, fetchInit] = mockFetch.mock.calls[0]!;
    expect((fetchInit!.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('accepts custom content type', async () => {
    const dest = makeDestination();
    await cloudPut(dest, 'path/report.xml', '<xml/>', 'application/xml');

    const [, fetchInit] = mockFetch.mock.calls[0]!;
    expect((fetchInit!.headers as Record<string, string>)['Content-Type']).toBe('application/xml');
  });
});

// ── multiCloudPut ───────────────────────────────────────────────────

describe('multiCloudPut', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateUrl.mockReturnValue({ valid: true });
    mockBuildObjectUrl.mockReturnValue('https://example.com/object/path');
    mockExtraHeaders.mockReturnValue({});
    mockFetch.mockResolvedValue(makeOkResponse());
  });

  it('filters to enabled destinations only', async () => {
    const destinations = [
      makeDestination({ id: 'd1', enabled: true }),
      makeDestination({ id: 'd2', enabled: false }),
      makeDestination({ id: 'd3', enabled: true }),
    ];

    const results = await multiCloudPut(destinations, 'path/obj.json', '{}');

    expect(results).toHaveLength(2);
    expect(results[0]!.destinationId).toBe('d1');
    expect(results[1]!.destinationId).toBe('d3');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('returns empty array when no destinations are enabled', async () => {
    const destinations = [
      makeDestination({ id: 'd1', enabled: false }),
      makeDestination({ id: 'd2', enabled: false }),
    ];

    const results = await multiCloudPut(destinations, 'path/obj.json', '{}');

    expect(results).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns empty array for empty destinations list', async () => {
    const results = await multiCloudPut([], 'path/obj.json', '{}');

    expect(results).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('calls onProgress with initial message and per-destination updates', async () => {
    const destinations = [
      makeDestination({ id: 'd1', label: 'Bucket A', enabled: true }),
      makeDestination({ id: 'd2', label: 'Bucket B', enabled: true }),
    ];
    const onProgress = vi.fn();

    await multiCloudPut(destinations, 'path/obj.json', '{}', 'application/json', onProgress);

    // First call: initial "Uploading to N destination(s)..." message
    expect(onProgress).toHaveBeenCalledWith('Uploading to 2 destination(s)...');

    // Per-destination progress updates
    const calls = onProgress.mock.calls.map((c) => c[0] as string);
    expect(calls).toContainEqual(expect.stringContaining('Bucket A'));
    expect(calls).toContainEqual(expect.stringContaining('Bucket B'));
    expect(calls).toContainEqual(expect.stringContaining('1/2'));
    expect(calls).toContainEqual(expect.stringContaining('2/2'));
  });

  it('does not call onProgress when no destinations are enabled', async () => {
    const onProgress = vi.fn();

    await multiCloudPut(
      [makeDestination({ enabled: false })],
      'path/obj.json',
      '{}',
      'application/json',
      onProgress,
    );

    expect(onProgress).not.toHaveBeenCalled();
  });

  it('handles mixed success and failure across destinations', async () => {
    // First fetch succeeds, second fails with HTTP error
    mockFetch
      .mockResolvedValueOnce(makeOkResponse(200))
      .mockResolvedValueOnce(makeErrorResponse(500, 'Internal Server Error'));

    const destinations = [
      makeDestination({ id: 'd1', label: 'Good', enabled: true }),
      makeDestination({ id: 'd2', label: 'Bad', enabled: true }),
    ];

    const results = await multiCloudPut(destinations, 'path/obj.json', '{}');

    expect(results).toHaveLength(2);
    expect(results[0]!.ok).toBe(true);
    expect(results[0]!.destinationId).toBe('d1');
    expect(results[1]!.ok).toBe(false);
    expect(results[1]!.destinationId).toBe('d2');
    expect(results[1]!.error).toContain('500');
  });

  it('works without onProgress callback', async () => {
    const destinations = [makeDestination({ id: 'd1', enabled: true })];

    // Should not throw when onProgress is undefined
    const results = await multiCloudPut(destinations, 'path/obj.json', '{}');
    expect(results).toHaveLength(1);
    expect(results[0]!.ok).toBe(true);
  });
});

// ── testDestination ─────────────────────────────────────────────────

describe('testDestination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateUrl.mockReturnValue({ valid: true });
    mockBuildObjectUrl.mockReturnValue('https://example.com/.connectivity-test');
    mockExtraHeaders.mockReturnValue({});
    mockFetch.mockResolvedValue(makeOkResponse());
  });

  it('returns error for unknown provider', async () => {
    const dest = makeDestination({ provider: 'azure-blob' as BackupDestination['provider'] });
    const result = await testDestination(dest);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('Unknown provider');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns error when URL validation fails', async () => {
    mockValidateUrl.mockReturnValue({ valid: false, error: 'Invalid URL format' });
    const dest = makeDestination();
    const result = await testDestination(dest);

    expect(result.ok).toBe(false);
    expect(result.error).toBe('Invalid URL format');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns ok when connectivity test PUT succeeds', async () => {
    const dest = makeDestination();
    const result = await testDestination(dest);

    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledOnce();

    // Verify it puts to the connectivity-test key
    expect(mockBuildObjectUrl).toHaveBeenCalledWith(
      dest.url,
      'threatcaddy/.connectivity-test',
    );
  });

  it('returns error when connectivity test PUT fails', async () => {
    mockFetch.mockResolvedValue(makeErrorResponse(401, 'Unauthorized'));

    const dest = makeDestination();
    const result = await testDestination(dest);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('401');
  });

  it('returns error when fetch throws during connectivity test', async () => {
    mockFetch.mockRejectedValue(new Error('DNS resolution failed'));

    const dest = makeDestination();
    const result = await testDestination(dest);

    expect(result.ok).toBe(false);
    expect(result.error).toBe('DNS resolution failed');
  });
});
