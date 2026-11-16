import { useEffect, useReducer } from 'react';
import { loadTrip, saveTrip } from './storage';
import { tripReducer } from './tripReducer';

export function useTrip() {
  const [trip, dispatch] = useReducer(tripReducer, undefined, () => loadTrip());

  useEffect(() => {
    saveTrip(trip);
  }, [trip]);

  return { trip, dispatch };
}
