'use client';

import { useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Hook to manage user presence (online status)
 * Sets user as online when component mounts and offline when it unmounts
 */
export function usePresence() {
  const { user } = useUser();
  const firestore = useFirestore();

  useEffect(() => {
    if (!user || !firestore) return;

    try {
      const presenceRef = doc(firestore, 'presence', user.uid);

      // Set user as online
      setDoc(presenceRef, {
        userId: user.uid,
        online: true,
        lastSeen: serverTimestamp(),
      });

      // Set offline when component unmounts
      return () => {
        setDoc(presenceRef, {
          online: false,
          lastSeen: serverTimestamp(),
        });
      };
    } catch (error) {
      console.error('Error setting presence:', error);
    }
  }, [user, firestore]);
}
