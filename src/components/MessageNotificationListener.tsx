'use client';

import { useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collectionGroup, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function MessageNotificationListener() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    if (!user || !firestore) return;

    // Track the last notification time to avoid duplicate notifications on initial load
    const lastNotificationTime = new Date();

    try {
      // Use collectionGroup to query all messages across all conversations
      // where the current user is the receiver
      const messagesQuery = query(
        collectionGroup(firestore, 'messages'),
        where('receiverId', '==', user.uid),
        orderBy('timestamp', 'desc')
      );

      const unsubscribe = onSnapshot(
        messagesQuery,
        (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const message = change.doc.data();

              // Only notify for messages sent after component mounted
              const messageTime = message.timestamp?.toDate?.() || new Date();

              if (messageTime > lastNotificationTime && message.senderId !== user.uid) {
                const senderName = message.senderName || message.senderEmail || 'Someone';

                toast({
                  title: `New message from ${senderName}`,
                  description:
                    (message.content || message.message)?.substring(0, 50) +
                    ((message.content || message.message)?.length > 50 ? '...' : '') ||
                    'You have a new message',
                  duration: 5000,
                });
              }
            }
          });
        },
        (error) => {
          // Silently handle permission errors - they're expected if user hasn't chatted with anyone yet
          if (error.code !== 'permission-denied') {
            console.error('Error setting up message listener:', error);
          }
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up message listeners:', error);
      return () => {};
    }
  }, [user, firestore, toast]);

  return null; // This component doesn't render anything
}
