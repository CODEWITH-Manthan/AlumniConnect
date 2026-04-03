'use client';

import { doc } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';

/**
 * Hook to check if the user has ANY unread messages across ALL conversations.
 * 
 * Uses a simple `hasUnreadMessages` boolean field on the user document.
 * This field is set to `true` when someone sends the user a message,
 * and set to `false` when the user opens the messages page.
 * 
 * @param userId - The current user's ID
 * @returns Object with hasUnread boolean and isLoading state
 */
export function useGlobalUnreadMessages(userId: string | null) {
    const firestore = useFirestore();

    const userDocRef = useMemoFirebase(() => {
        if (!firestore || !userId) return null;
        return doc(firestore, 'users', userId);
    }, [firestore, userId]);

    const { data: userData, isLoading } = useDoc(userDocRef);

    return {
        hasUnread: userData?.hasUnreadMessages === true,
        isLoading
    };
}
