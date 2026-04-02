/**
 * Stats utility — reads and writes to /stats/global in Firestore.
 *
 * Instead of fetching entire collections just to count them,
 * we maintain a single document with atomic counters using Firestore increment().
 *
 * Document shape:
 *   /stats/global  →  { alumniCount: number, openRoles: number, activeDiscussions: number }
 */

import {
  doc,
  setDoc,
  updateDoc,
  increment,
  getDoc,
  Firestore,
} from 'firebase/firestore';

export const STATS_DOC_PATH = 'stats/global';

export type GlobalStats = {
  alumniCount: number;
  openRoles: number;
  activeDiscussions: number;
};

/**
 * Atomically increments one or more stat fields by 1.
 * Safe to call non-blocking (fire and forget).
 */
export function incrementStat(
  firestore: Firestore,
  fields: Partial<Record<keyof GlobalStats, number>>
) {
  const ref = doc(firestore, STATS_DOC_PATH);
  const updates: Record<string, ReturnType<typeof increment>> = {};
  for (const [key, delta] of Object.entries(fields)) {
    updates[key] = increment(delta ?? 1);
  }

  // setDoc with merge:true so it creates the doc if it doesn't exist yet
  setDoc(ref, updates, { merge: true }).catch((err) => {
    console.error('[stats] Failed to increment stat:', err);
  });
}

/**
 * Atomically decrements one or more stat fields by 1 (floors at 0 via rules).
 */
export function decrementStat(
  firestore: Firestore,
  fields: Partial<Record<keyof GlobalStats, number>>
) {
  const ref = doc(firestore, STATS_DOC_PATH);
  const updates: Record<string, ReturnType<typeof increment>> = {};
  for (const [key, delta] of Object.entries(fields)) {
    updates[key] = increment(-(delta ?? 1));
  }
  updateDoc(ref, updates).catch((err) => {
    console.error('[stats] Failed to decrement stat:', err);
  });
}
