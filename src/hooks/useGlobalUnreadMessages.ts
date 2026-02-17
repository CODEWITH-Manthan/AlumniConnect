'use client';

/**
 * Hook to check if the user has ANY unread messages across ALL conversations
 * 
 * NOTE: This feature is disabled due to Firestore collectionGroup security rule limitations.
 * The sidebar per-conversation red dots work perfectly and provide the same functionality.
 * 
 * @param userId - The current user's ID
 * @returns Object with hasUnread boolean and isLoading state
 */
export function useGlobalUnreadMessages(userId: string | null) {
    // Disabled to prevent Firestore permission errors
    // Sidebar indicators still work perfectly
    return {
        hasUnread: false,
        isLoading: false
    };
}
