import { createContext, useContext } from 'react';
import type { ActivityCategory, ActivityAction } from '../types';

export type LogFn = (
  category: ActivityCategory,
  action: ActivityAction,
  detail: string,
  itemId?: string,
  itemTitle?: string,
) => void;

const noop: LogFn = () => {};

export const ActivityLogContext = createContext<LogFn>(noop);

export function useLogActivity(): LogFn {
  return useContext(ActivityLogContext);
}
