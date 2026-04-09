'use client';

import { useState, useEffect, Suspense, useRef, useCallback } from "react"
import { useSearchParams } from 'next/navigation'
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Send, MoreVertical, Loader2, MessageSquare, LogIn, Trash2, ImageIcon, X } from "lucide-react"
import { useUser, useFirestore, useMemoFirebase, useCollection, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, limit, getDocs, where, updateDoc, arrayRemove, deleteDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import UserProfileModal from "@/components/UserProfileModal";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useToast } from "@/hooks/use-toast";

// Helper component to show unread indicator for a conversation
function UnreadIndicator({ personId, currentUserId }: { personId: string; currentUserId: string }) {
  const conversationId = [currentUserId, personId].sort().join('_');
  const { hasUnread } = useUnreadMessages(conversationId, currentUserId);

  if (!hasUnread) return null;

  return (
    <div className="h-2.5 w-2.5 bg-red-500 rounded-full shrink-0 animate-pulse" />
  );
}

function ChatContent() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const initialRecipientId = searchParams.get('recipientId');

  const [activeRecipientId, setActiveRecipientId] = useState<string | null>(initialRecipientId);
  const [messageText, setMessageText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [mounted, setMounted] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update active recipient if URL param changes — but block self-messaging
  useEffect(() => {
    if (initialRecipientId && initialRecipientId !== user?.uid) {
      setActiveRecipientId(initialRecipientId);
    }
  }, [initialRecipientId, user?.uid]);

  // Get recipient profile
  const recipientDocRef = useMemoFirebase(() => {
    if (!firestore || !activeRecipientId || !user) return null;
    return doc(firestore, 'users', activeRecipientId);
  }, [firestore, activeRecipientId, user]);
  const { data: recipientData } = useDoc(recipientDocRef);

  // Derive conversation ID
  const conversationId = activeRecipientId && user
    ? [user.uid, activeRecipientId].sort().join('_')
    : null;

  // Messages in current conversation
  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !conversationId || !user) return null;
    return query(
      collection(firestore, 'conversations', conversationId, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(100)
    );
  }, [firestore, conversationId, user]);
  const { data: messages, isLoading: isMessagesLoading } = useCollection(messagesQuery);

  // Auto-scroll to bottom only when new messages are added — target scroll container, not window
  const prevMessageCountRef = useRef<number>(0);
  useEffect(() => {
    const currentCount = messages?.length || 0;
    if (currentCount > prevMessageCountRef.current && scrollAreaRef.current) {
      // Find the actual scrollable viewport inside ScrollArea
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
    prevMessageCountRef.current = currentCount;
  }, [messages]);

  // Get all users first (must be before checkAndClearGlobalUnread)
  const allUsersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users'), limit(100));
  }, [firestore, user]);
  const { data: allUsers, isLoading: isAllUsersLoading } = useCollection(allUsersQuery);

  // Helper: check all conversations for remaining unread messages
  // and update the hasUnreadMessages flag accordingly
  const checkAndClearGlobalUnread = useCallback(async () => {
    if (!user || !firestore || !allUsers) return;

    let hasAnyUnread = false;
    for (const otherUser of allUsers) {
      if (otherUser.id === user.uid) continue;
      const convId = [user.uid, otherUser.id].sort().join('_');
      try {
        const q = query(
          collection(firestore, 'conversations', convId, 'messages'),
          where('unreadBy', 'array-contains', user.uid),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          hasAnyUnread = true;
          break;
        }
      } catch { /* skip conversations that don't exist */ }
    }

    const userRef = doc(firestore, 'users', user.uid);
    updateDoc(userRef, { hasUnreadMessages: hasAnyUnread }).catch(() => {});
  }, [user, firestore, allUsers]);

  // Sync: when messages page loads, detect existing unread messages and set flag
  // This ensures the Navbar red dot works for old messages sent before migration
  useEffect(() => {
    if (allUsers && allUsers.length > 0) {
      checkAndClearGlobalUnread();
    }
  }, [allUsers, checkAndClearGlobalUnread]);

  // Mark messages as read when conversation is opened
  useEffect(() => {
    if (!conversationId || !user || !firestore) return;

    const markMessagesAsRead = async () => {
      try {
        const unreadQuery = query(
          collection(firestore, 'conversations', conversationId, 'messages'),
          where('unreadBy', 'array-contains', user.uid)
        );

        const snapshot = await getDocs(unreadQuery);

        const updatePromises = snapshot.docs.map((docSnapshot) =>
          updateDoc(docSnapshot.ref, {
            unreadBy: arrayRemove(user.uid)
          })
        );

        await Promise.all(updatePromises);

        // After marking this conversation as read, check if there are
        // still unread messages in OTHER conversations. If not, clear the flag.
        await checkAndClearGlobalUnread();
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    };

    markMessagesAsRead();
  }, [conversationId, user, firestore, checkAndClearGlobalUnread]);

  // Filter users to only those with conversations
  const [usersWithConversations, setUsersWithConversations] = useState<any[]>([]);
  const [isFilteringUsers, setIsFilteringUsers] = useState(false);

  useEffect(() => {
    if (!allUsers || !user || !firestore) {
      setUsersWithConversations([]);
      return;
    }

    setIsFilteringUsers(true);

    const checkConversations = async () => {
      const usersWithMessages: any[] = [];

      for (const otherUser of allUsers) {
        if (otherUser.id === user.uid) continue;

        const conversationId = [user.uid, otherUser.id].sort().join('_');
        const messagesRef = collection(firestore, 'conversations', conversationId, 'messages');
        const messagesQuery = query(messagesRef, limit(1));

        try {
          const snapshot = await getDocs(messagesQuery);
          if (!snapshot.empty) {
            usersWithMessages.push(otherUser);
          }
        } catch (error) {
          console.error(`Error checking conversation with ${otherUser.id}:`, error);
        }
      }

      setUsersWithConversations(usersWithMessages);
      setIsFilteringUsers(false);
    };

    checkConversations();
  }, [allUsers, user, firestore]);

  const usersList = usersWithConversations;
  const isUsersLoading = isAllUsersLoading || isFilteringUsers;

  // Check if trying to message self
  const isSelfMessage = activeRecipientId === user?.uid;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !user || !activeRecipientId || !conversationId || !firestore) return;
    if (isSelfMessage) return; // Block self-messaging

    const newMessage = {
      id: crypto.randomUUID(),
      senderId: user.uid,
      senderName: user.displayName || 'Someone',
      senderEmail: user.email || '',
      receiverId: activeRecipientId,
      content: messageText.trim(),
      message: messageText.trim(),
      type: 'text',
      timestamp: new Date().toISOString(),
      unreadBy: [activeRecipientId]
    };

    addDocumentNonBlocking(
      collection(firestore, 'conversations', conversationId, 'messages'),
      newMessage
    );

    // Set hasUnreadMessages flag on recipient
    const recipientRef = doc(firestore, 'users', activeRecipientId);
    updateDocumentNonBlocking(recipientRef, { hasUnreadMessages: true });

    setMessageText("");
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!firestore || !conversationId) return;
    if (!window.confirm('Delete this message?')) return;

    try {
      await deleteDoc(doc(firestore, 'conversations', conversationId, 'messages', messageId));
      toast({
        title: "Message deleted",
        description: "The message has been removed.",
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: "Could not delete the message. Please try again.",
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !activeRecipientId || !conversationId || !firestore) return;
    if (isSelfMessage) return;

    if (!file.type.startsWith('image/')) {
      toast({ variant: "destructive", title: "Invalid file", description: "Please select an image file." });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Image must be under 5MB." });
      return;
    }

    setIsUploadingImage(true);

    try {
      const storage = getStorage();
      const imageRef = ref(storage, `chat-images/${conversationId}/${Date.now()}-${file.name}`);
      await uploadBytes(imageRef, file);
      const imageUrl = await getDownloadURL(imageRef);

      const newMessage = {
        id: crypto.randomUUID(),
        senderId: user.uid,
        senderName: user.displayName || 'Someone',
        senderEmail: user.email || '',
        receiverId: activeRecipientId,
        content: '📷 Image',
        message: '📷 Image',
        type: 'image',
        imageUrl,
        timestamp: new Date().toISOString(),
        unreadBy: [activeRecipientId]
      };

      addDocumentNonBlocking(
        collection(firestore, 'conversations', conversationId, 'messages'),
        newMessage
      );

      // Set hasUnreadMessages flag on recipient
      const recipientRef = doc(firestore, 'users', activeRecipientId);
      updateDocumentNonBlocking(recipientRef, { hasUnreadMessages: true });

      toast({ title: "Image sent", description: "Your image has been sent." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Upload failed", description: error.message || "Failed to send image." });
    } finally {
      setIsUploadingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    const f = firstName?.[0] || '';
    const l = lastName?.[0] || '';
    return (f + l).toUpperCase() || '?';
  };

  if (!mounted || isUserLoading) {
    return (
      <div className="container mx-auto py-6 px-4 h-[calc(100vh-80px)] flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary dark:text-accent/20 mb-4" />
        <p className="text-muted-foreground text-sm font-medium animate-pulse">Syncing communications...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-6 px-4 h-[calc(100vh-80px)] flex flex-col items-center justify-center">
        <div className="bg-card p-8 rounded-2xl shadow-xl text-center max-w-md border">
          <MessageSquare className="h-12 w-12 text-primary dark:text-accent/30 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Sign in to Message</h2>
          <p className="text-muted-foreground mb-6">You need to be logged in to connect with mentors and peers.</p>
          <Button asChild className="w-full h-11">
            <Link href="/login"><LogIn className="mr-2 h-4 w-4" /> Sign In Now</Link>
          </Button>
        </div>
      </div>
    );
  }

  const filteredUsers = usersList?.filter(u =>
    u.id !== user?.uid &&
    (`${u.firstName || ''} ${u.lastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const recipientName = recipientData
    ? `${recipientData.firstName || ''} ${recipientData.lastName || ''}`.trim() || "User"
    : "Select a Contact";

  return (
    <div className="container mx-auto py-6 px-4 h-[calc(100vh-80px)] overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-border bg-background rounded-xl shadow-2xl h-full overflow-hidden">
        {/* Sidebar */}
        <div className="md:col-span-1 border-r border-border flex flex-col h-full bg-card/30">
          <div className="p-4 border-b">
            <h2 className="text-xl font-bold mb-4 font-headline text-primary dark:text-accent">Messages</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 bg-muted/50 border-none ring-1 ring-border focus-visible:ring-primary/20 text-foreground"
                placeholder="Find a person..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                suppressHydrationWarning
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            {isUsersLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary dark:text-accent/30" /></div>
            ) : (
              <div className="divide-y divide-border/50">
                {filteredUsers?.map((person) => (
                  <div
                    key={person.id}
                    className={cn(
                      "p-4 hover:bg-primary/5 transition-all relative group",
                      activeRecipientId === person.id && "bg-primary/10"
                    )}
                  >
                    {activeRecipientId === person.id && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                    )}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => { setSelectedUserId(person.id); setIsProfileModalOpen(true); }}
                        className="relative h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0 border border-primary/20 hover:border-primary transition-colors"
                      >
                        {getInitials(person.firstName, person.lastName)}
                        <div className="absolute bottom-0 right-0 h-3 w-3 bg-blue-500 dark:bg-blue-500 rounded-full border-2 border-card" />
                      </button>
                      <button
                        onClick={() => setActiveRecipientId(person.id)}
                        className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity cursor-pointer"
                      >
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="font-bold text-sm truncate">{person.firstName} {person.lastName}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate uppercase tracking-tighter font-black opacity-60">{person.role || 'Member'}</p>
                      </button>
                      {/* Unread indicator at the right edge */}
                      {user && <UnreadIndicator personId={person.id} currentUserId={user.uid} />}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!isUsersLoading && (!filteredUsers || filteredUsers.length === 0) && (
              <div className="p-8 text-center text-muted-foreground text-sm italic">
                No users found.
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="hidden md:flex md:col-span-2 flex-col h-full bg-background relative">
          {!activeRecipientId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-white/[0.02]">
              <div className="bg-primary/10 p-6 rounded-full mb-4">
                <MessageSquare className="h-12 w-12 text-primary opacity-40" />
              </div>
              <h3 className="text-xl font-bold text-foreground font-headline mb-2">Connect with your Network</h3>
              <p className="max-w-xs mx-auto text-sm">Select a mentor or student to start a direct conversation and share insights.</p>
            </div>
          ) : isSelfMessage ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-muted/5">
              <div className="bg-destructive/10 p-6 rounded-full mb-4">
                <X className="h-12 w-12 text-destructive opacity-40" />
              </div>
              <h3 className="text-xl font-bold text-foreground font-headline mb-2">Can't message yourself</h3>
              <p className="max-w-xs mx-auto text-sm">Select another user from the sidebar to start a conversation.</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border flex justify-between items-center bg-background/80 backdrop-blur-sm z-10 sticky top-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0 border border-primary/10">
                    {getInitials(recipientData?.firstName, recipientData?.lastName)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm leading-none mb-1">{recipientName}</h3>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-blue-500 dark:bg-blue-500 animate-pulse" />
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Active Now</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-primary dark:text-accent" suppressHydrationWarning><MoreVertical className="h-4 w-4" /></Button>
                </div>
              </div>

              {/* Chat Messages */}
              <ScrollArea ref={scrollAreaRef} className="flex-1 p-6 bg-muted/5 max-h-[calc(100vh-280px)]">
                {isMessagesLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary dark:text-accent/20" /></div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {messages && messages.length > 0 ? (
                      messages.map((msg) => {
                        const isMe = msg.senderId === user?.uid;
                        return (
                          <div key={msg.id} className={cn("flex group", isMe ? 'justify-end' : 'justify-start')}>
                            <div className={cn(
                              "max-w-[75%] p-3 px-4 rounded-2xl text-sm shadow-md transition-all relative",
                              isMe
                                ? 'bg-primary text-primary-foreground rounded-tr-none'
                                : 'bg-card border border-white/10 text-foreground rounded-tl-none'
                            )}>
                              {/* Image message */}
                              {msg.type === 'image' && msg.imageUrl && (
                                <div className="mb-2 rounded-lg overflow-hidden">
                                  <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer">
                                    <Image
                                      src={msg.imageUrl}
                                      alt="Shared image"
                                      width={300}
                                      height={200}
                                      className="object-cover rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                                    />
                                  </a>
                                </div>
                              )}
                              {/* Text message (skip for image-only messages) */}
                              {msg.type !== 'image' && msg.message}
                              <div className={cn(
                                "text-[10px] mt-1.5 font-medium opacity-60",
                                isMe ? 'text-right' : 'text-left'
                              )}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>

                              {/* Delete button — only for sender's own messages */}
                              {isMe && (
                                <button
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                  title="Delete message"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="bg-primary/5 p-4 rounded-full mb-3">
                          <Send className="h-6 w-6 text-primary opacity-30" />
                        </div>
                        <p className="text-sm font-bold text-muted-foreground italic">
                          Start the conversation with {recipientData?.firstName || 'this member'}!
                        </p>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Chat Input */}
              <div className="p-4 border-t border-border bg-background">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-4xl mx-auto">
                  {/* Image upload button */}
                  <label className="cursor-pointer p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-primary flex-shrink-0">
                    {isUploadingImage ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <ImageIcon className="h-5 w-5" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={isUploadingImage}
                    />
                  </label>
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Write a message..."
                    className="bg-muted/30 h-11 border-none focus-visible:ring-2 focus-visible:ring-primary/10"
                    suppressHydrationWarning
                  />
                  <Button type="submit" size="icon" className="bg-primary hover:bg-primary/90 rounded-full shrink-0 h-11 w-11 shadow-md transition-all active:scale-95 disabled:opacity-50" disabled={!messageText.trim()} suppressHydrationWarning>
                    <Send className="h-5 w-5" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      <UserProfileModal
        userId={selectedUserId}
        open={isProfileModalOpen}
        onOpenChange={setIsProfileModalOpen}
      />
    </div>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-20 flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4 opacity-20" />
        <p className="text-muted-foreground font-bold tracking-widest uppercase text-xs animate-pulse">Connecting to network...</p>
      </div>
    }>
      <ChatContent />
    </Suspense>
  )
}
