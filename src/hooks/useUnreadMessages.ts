'use client';

import { collection, query, where, limit } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';

/**
 * Hook to check if a conversation has unread messages for the current user
 * @param conversationId - The ID of the conversation to check
 * @param userId - The current user's ID
 * @returns Object with hasUnread boolean and isLoading state
 */
export function useUnreadMessages(conversationId: string | null, userId: string | null) {
    const firestore = useFirestore();

    // Create the query to check for unread messages
    const unreadQuery = useMemoFirebase(() => {
        if (!firestore || !conversationId || !userId) return null;

        return query(
            collection(firestore, 'conversations', conversationId, 'messages'),
            where('unreadBy', 'array-contains', userId),
            limit(1) // We only need to know if ANY unread messages exist
        );
    }, [firestore, conversationId, userId]);

    const { data: unreadMessages, isLoading } = useCollection(unreadQuery);

    return {
        hasUnread: (unreadMessages?.length ?? 0) > 0,
        isLoading
    };
}
