/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from 'vitest';
import {
  buildNoteEnvelope,
  buildIOCReportEnvelope,
  buildFullBackupEnvelope,
  buildObjectKey,
} from '../lib/cloud-sync';
import type { Note, ExportData } from '../types';

// ---- Envelope Helpers ----

const mockNote: Note = {
  id: 'n1',
  title: 'Test Note',
  content: '# Hello',
  tags: ['test'],
  pinned: false,
  archived: false,
  trashed: false,
  createdAt: 1000,
  updatedAt: 2000,
};

const mockNoteWithIOC: Note = {
  ...mockNote,
  folderId: 'clips-folder',
  iocAnalysis: {
    extractedAt: 1000,
    iocs: [
      {
        id: 'ioc1',
        type: 'ipv4',
        value: '192.168.1.1',
        confidence: 'high',
        firstSeen: 1000,
        dismissed: false,
      },
    ],
    analysisSummary: 'Found 1 IOC',
  },
};

describe('buildNoteEnvelope', () => {
  it('creates correct envelope for a regular note', () => {
    const envelope = buildNoteEnvelope(mockNote, 'Alice');
    expect(envelope.version).toBe(1);
    expect(envelope.type).toBe('note');
    expect(envelope.sharedBy).toBe('Alice');
    expect(envelope.sharedAt).toBeGreaterThan(0);
    expect(envelope.payload).toEqual(mockNote);
  });

  it('detects clip type when note is in clips folder', () => {
    const clipNote = { ...mockNote, folderId: 'clips-folder' };
    const envelope = buildNoteEnvelope(clipNote, 'Bob', 'clips-folder');
    expect(envelope.type).toBe('clip');
  });

  it('uses "anonymous" when label is empty', () => {
    const envelope = buildNoteEnvelope(mockNote, '');
    expect(envelope.sharedBy).toBe('anonymous');
  });
});

describe('buildIOCReportEnvelope', () => {
  it('creates correct envelope with iocAnalysis', () => {
    const envelope = buildIOCReportEnvelope(mockNoteWithIOC, 'Alice');
    expect(envelope.version).toBe(1);
    expect(envelope.type).toBe('ioc-report');
    expect(envelope.sharedBy).toBe('Alice');
    const payload = envelope.payload as Note;
    expect(payload.iocAnalysis).toBeDefined();
    expect(payload.iocAnalysis!.iocs).toHaveLength(1);
  });
});

describe('buildFullBackupEnvelope', () => {
  it('wraps ExportData correctly', () => {
    const exportData: ExportData = {
      version: 1,
      exportedAt: Date.now(),
      notes: [mockNote],
      tasks: [],
      folders: [],
      tags: [],
    };
    const envelope = buildFullBackupEnvelope(exportData, 'Charlie');
    expect(envelope.version).toBe(1);
    expect(envelope.type).toBe('full-backup');
    expect(envelope.sharedBy).toBe('Charlie');
    const payload = envelope.payload as ExportData;
    expect(payload.version).toBe(1);
    expect(payload.notes).toHaveLength(1);
  });
});

// ---- buildObjectKey ----

describe('buildObjectKey', () => {
  it('creates backup key with label', () => {
    const key = buildObjectKey('full-backup', '', 'MyTeam');
    expect(key).toMatch(/^threatcaddy\/backups\/MyTeam-\d+\.json$/);
  });

  it('creates note key with id', () => {
    const key = buildObjectKey('note', 'n1', 'Alice');
    expect(key).toMatch(/^threatcaddy\/shared\/notes\/n1-\d+\.json$/);
  });

  it('creates clip key', () => {
    const key = buildObjectKey('clip', 'c1', 'Bob');
    expect(key).toMatch(/^threatcaddy\/shared\/clips\/c1-\d+\.json$/);
  });

  it('creates ioc-report key', () => {
    const key = buildObjectKey('ioc-report', 'n2', 'Alice');
    expect(key).toMatch(/^threatcaddy\/shared\/ioc-reports\/n2-\d+\.json$/);
  });

  it('falls back to default label when label is empty', () => {
    const key = buildObjectKey('full-backup', '', '');
    expect(key).toMatch(/^threatcaddy\/backups\/default-\d+\.json$/);
  });

  it('sanitizes unsafe label characters', () => {
    const key = buildObjectKey('full-backup', '', 'My Team / Backup!');
    // The label portion should not contain slashes or special chars
    const labelPart = key.replace('threatcaddy/backups/', '').replace(/-\d+\.json$/, '');
    expect(labelPart).not.toContain('/');
    expect(labelPart).not.toContain('!');
    expect(key).toMatch(/^threatcaddy\/backups\//);
  });
});
