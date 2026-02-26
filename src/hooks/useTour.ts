import { useState, useCallback, useEffect, useRef } from 'react';
import { tourSteps } from '../components/Tour/tourSteps';
import type { ViewMode } from '../types';

export interface UseTourOptions {
  onComplete?: () => void;
  /** Called when a tour step requires navigating to a different view. */
  onNavigate?: (view: ViewMode) => void;
}

export interface TourState {
  isActive: boolean;
  currentStepIndex: number;
  targetRect: DOMRect | null;
}

export function useTour(options?: UseTourOptions) {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number | undefined>(undefined);
  /** The view that was active before the tour started — restored on finish/skip. */
  const preTourViewRef = useRef<ViewMode | null>(null);
  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; });

  const currentStep = tourSteps[currentStepIndex] ?? null;

  const updateRect = useCallback(() => {
    if (!isActive || !currentStep) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(currentStep.target);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [isActive, currentStep]);

  // Update rect on step change, scroll, resize
  useEffect(() => {
    if (!isActive) return;
    updateRect();

    const onUpdate = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateRect);
    };

    window.addEventListener('scroll', onUpdate, true);
    window.addEventListener('resize', onUpdate);
    return () => {
      window.removeEventListener('scroll', onUpdate, true);
      window.removeEventListener('resize', onUpdate);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isActive, updateRect]);

  /** Navigate to the view required by a step, if specified. */
  const navigateToStepView = useCallback((stepIndex: number) => {
    const step = tourSteps[stepIndex];
    if (step?.view && optionsRef.current?.onNavigate) {
      optionsRef.current.onNavigate(step.view);
    }
  }, []);

  /** Restore the view that was active before the tour started. */
  const restorePreTourView = useCallback(() => {
    if (preTourViewRef.current && optionsRef.current?.onNavigate) {
      optionsRef.current.onNavigate(preTourViewRef.current);
    }
    preTourViewRef.current = null;
  }, []);

  const start = useCallback((currentView?: ViewMode) => {
    preTourViewRef.current = currentView ?? null;
    const firstStep = tourSteps[0];
    if (firstStep?.view && optionsRef.current?.onNavigate) {
      optionsRef.current.onNavigate(firstStep.view);
    }
    setCurrentStepIndex(0);
    setIsActive(true);
  }, []);

  const stop = useCallback(() => {
    setIsActive(false);
    setCurrentStepIndex(0);
    setTargetRect(null);
    restorePreTourView();
  }, [restorePreTourView]);

  const next = useCallback(() => {
    if (currentStepIndex < tourSteps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      navigateToStepView(nextIndex);
      // Small delay to allow view to render before measuring target
      setTimeout(() => setCurrentStepIndex(nextIndex), 50);
    } else {
      setIsActive(false);
      setCurrentStepIndex(0);
      setTargetRect(null);
      restorePreTourView();
      optionsRef.current?.onComplete?.();
    }
  }, [currentStepIndex, navigateToStepView, restorePreTourView]);

  const prev = useCallback(() => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      navigateToStepView(prevIndex);
      setTimeout(() => setCurrentStepIndex(prevIndex), 50);
    }
  }, [currentStepIndex, navigateToStepView]);

  const skip = useCallback(() => {
    setIsActive(false);
    setCurrentStepIndex(0);
    setTargetRect(null);
    restorePreTourView();
    optionsRef.current?.onComplete?.();
  }, [restorePreTourView]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      else if (e.key === 'Escape') { e.preventDefault(); skip(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, next, prev, skip]);

  return {
    isActive,
    currentStepIndex,
    currentStep,
    targetRect,
    totalSteps: tourSteps.length,
    start,
    stop,
    next,
    prev,
    skip,
  };
}
