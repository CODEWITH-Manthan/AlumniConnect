'use client';

import { useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc, onDisconnect } from 'firebase/firestore';
import { serverTimestamp } from 'firebase/firestore';

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
      // Set user as online
      const presenceRef = doc(firestore, 'presence', user.uid);
      
      setDoc(presenceRef, {
        userId: user.uid,
        online: true,
        lastSeen: serverTimestamp(),
      });

      // Set user as offline when they disconnect
      onDisconnect(presenceRef).setData({
        online: false,
        lastSeen: serverTimestamp(),
      });

      // Also set offline when component unmounts (for graceful logout)
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
