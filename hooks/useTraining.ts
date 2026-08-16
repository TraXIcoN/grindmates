import { useEffect, useState } from 'react';

import {
  getActiveSession,
  getFavorites,
  getHistory,
  getRoutines,
  hydrateTraining,
  subscribeTraining,
  type Routine,
  type Session,
} from '@/lib/workout';

interface TrainingSnapshot {
  active: Session | null;
  history: Session[];
  routines: Routine[];
  favorites: string[];
}

function snap(): TrainingSnapshot {
  return {
    active: getActiveSession(),
    history: getHistory(),
    routines: getRoutines(),
    favorites: getFavorites(),
  };
}

/**
 * Live view of the training store. Hydration runs once app-wide; every
 * mutation in lib/workout emits and every subscribed screen re-snapshots.
 */
export function useTraining(): TrainingSnapshot {
  const [state, setState] = useState<TrainingSnapshot>(snap);

  useEffect(() => {
    void hydrateTraining();
    return subscribeTraining(() => setState(snap()));
  }, []);

  return state;
}
