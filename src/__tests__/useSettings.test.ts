import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSettings } from '../hooks/useSettings';
import { DEFAULT_SETTINGS } from '../types';

const SETTINGS_KEY = 'browsernotes-settings';

describe('useSettings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns DEFAULT_SETTINGS when no localStorage data', () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('loads persisted settings from localStorage', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ theme: 'light', editorMode: 'preview' }));
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings.theme).toBe('light');
    expect(result.current.settings.editorMode).toBe('preview');
    // Non-persisted values come from defaults
    expect(result.current.settings.defaultView).toBe('notes');
  });

  it('falls back to defaults on corrupted localStorage', () => {
    localStorage.setItem(SETTINGS_KEY, 'not valid json');
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('updates settings and persists to localStorage', () => {
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.updateSettings({ theme: 'light', sidebarCollapsed: true });
    });

    expect(result.current.settings.theme).toBe('light');
    expect(result.current.settings.sidebarCollapsed).toBe(true);

    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY)!);
    expect(stored.theme).toBe('light');
    expect(stored.sidebarCollapsed).toBe(true);
  });

  it('toggles theme from dark to light and back', () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings.theme).toBe('dark');

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.settings.theme).toBe('light');

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.settings.theme).toBe('dark');
  });

  it('preserves unmodified settings on partial update', () => {
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.updateSettings({ editorMode: 'edit' });
    });

    expect(result.current.settings.theme).toBe('dark');
    expect(result.current.settings.defaultView).toBe('notes');
    expect(result.current.settings.editorMode).toBe('edit');
  });

  it('stores OCI PAR settings', () => {
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.updateSettings({
        ociWritePAR: 'https://example.com/p/write/o/',
        ociLabel: 'my-device',
      });
    });

    expect(result.current.settings.ociWritePAR).toBe('https://example.com/p/write/o/');
    expect(result.current.settings.ociLabel).toBe('my-device');
  });
});
