import { createContext, useContext } from 'react';

export interface ScreenshareState {
  maxLevel: string | null;
  effectiveLevels: string[];
}

const defaultState: ScreenshareState = { maxLevel: null, effectiveLevels: [] };

export const ScreenshareContext = createContext<ScreenshareState>(defaultState);

export function useScreenshare(): ScreenshareState {
  return useContext(ScreenshareContext);
}
