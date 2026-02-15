'use client';

import { useState, useEffect, Suspense, useRef } from "react"
import { useSearchParams } from 'next/navigation'
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Send, MoreVertical, Loader2, MessageSquare, LogIn } from "lucide-react"
import { useUser, useFirestore, useMemoFirebase, useCollection, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, limit, getDocs } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { cn } from "@/lib/utils";
import Link from "next/link";

function ChatContent() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const initialRecipientId = searchParams.get('recipientId');

  const [activeRecipientId, setActiveRecipientId] = useState<string | null>(initialRecipientId);
  const [messageText, setMessageText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update active recipient if URL param changes
  useEffect(() => {
    if (initialRecipientId) {
      setActiveRecipientId(initialRecipientId);
    }
  }, [initialRecipientId]);

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

  // Auto-scroll to bottom only when new messages are added
  const prevMessageCountRef = useRef<number>(0);
  useEffect(() => {
    const currentCount = messages?.length || 0;
    if (currentCount > prevMessageCountRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessageCountRef.current = currentCount;
  }, [messages]);

  // Get all users first
  const allUsersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users'), limit(100));
  }, [firestore, user]);
  const { data: allUsers, isLoading: isAllUsersLoading } = useCollection(allUsersQuery);

  // Filter users to only those with conversations
  const [usersWithConversations, setUsersWithConversations] = useState<any[]>([]);
  const [isFilteringUsers, setIsFilteringUsers] = useState(false);

  useEffect(() => {
    if (!allUsers || !user || !firestore) {
      setUsersWithConversations([]);
      return;
    }

    setIsFilteringUsers(true);

    // Check each user for conversation existence
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
          // Skip users we can't check
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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !user || !activeRecipientId || !conversationId || !firestore) return;

    const newMessage = {
      id: crypto.randomUUID(),
      senderId: user.uid,
      receiverId: activeRecipientId,
      message: messageText.trim(),
      timestamp: new Date().toISOString()
    };

    addDocumentNonBlocking(
      collection(firestore, 'conversations', conversationId, 'messages'),
      newMessage
    );

    setMessageText("");
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    const f = firstName?.[0] || '';
    const l = lastName?.[0] || '';
    return (f + l).toUpperCase() || '?';
  };

  if (!mounted || isUserLoading) {
    return (
      <div className="container mx-auto py-6 px-4 h-[calc(100vh-80px)] flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary/20 mb-4" />
        <p className="text-muted-foreground text-sm font-medium animate-pulse">Syncing communications...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-6 px-4 h-[calc(100vh-80px)] flex flex-col items-center justify-center">
        <div className="bg-card p-8 rounded-2xl shadow-xl text-center max-w-md border">
          <MessageSquare className="h-12 w-12 text-primary/30 mx-auto mb-4" />
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border bg-card rounded-xl shadow-lg h-full overflow-hidden">
        {/* Sidebar */}
        <div className="md:col-span-1 border-r flex flex-col h-full bg-muted/10">
          <div className="p-4 border-b">
            <h2 className="text-xl font-bold mb-4 font-headline text-primary">Messages</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 bg-card border-none ring-1 ring-border focus-visible:ring-primary/20"
                placeholder="Find a person..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                suppressHydrationWarning
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            {isUsersLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary/30" /></div>
            ) : (
              <div className="divide-y divide-border/50">
                {filteredUsers?.map((person) => (
                  <div
                    key={person.id}
                    onClick={() => setActiveRecipientId(person.id)}
                    className={cn(
                      "p-4 hover:bg-muted/50 cursor-pointer transition-all relative group",
                      activeRecipientId === person.id && "bg-primary/5"
                    )}
                  >
                    {activeRecipientId === person.id && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                    )}
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0 border border-primary/20">
                        {getInitials(person.firstName, person.lastName)}
                        <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-card" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="font-bold text-sm truncate">{person.firstName} {person.lastName}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate uppercase tracking-tighter font-black opacity-60">{person.role || 'Member'}</p>
                      </div>
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
        <div className="hidden md:flex md:col-span-2 flex-col h-full bg-card relative">
          {!activeRecipientId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-muted/5">
              <div className="bg-primary/10 p-6 rounded-full mb-4">
                <MessageSquare className="h-12 w-12 text-primary opacity-40" />
              </div>
              <h3 className="text-xl font-bold text-foreground font-headline mb-2">Connect with your Network</h3>
              <p className="max-w-xs mx-auto text-sm">Select a mentor or student to start a direct conversation and share insights.</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b flex justify-between items-center bg-card/80 backdrop-blur-sm z-10 sticky top-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0 border border-primary/10">
                    {getInitials(recipientData?.firstName, recipientData?.lastName)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm leading-none mb-1">{recipientName}</h3>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Active Now</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-primary" suppressHydrationWarning><MoreVertical className="h-4 w-4" /></Button>
                </div>
              </div>

              {/* Chat Messages */}
              <ScrollArea className="flex-1 p-6 bg-muted/5 max-h-[calc(100vh-280px)]">
                {isMessagesLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary/20" /></div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {messages && messages.length > 0 ? (
                      messages.map((msg) => {
                        const isMe = msg.senderId === user?.uid;
                        return (
                          <div key={msg.id} className={cn("flex", isMe ? 'justify-end' : 'justify-start')}>
                            <div className={cn(
                              "max-w-[75%] p-3 px-4 rounded-2xl text-sm shadow-sm transition-all",
                              isMe
                                ? 'bg-primary text-primary-foreground rounded-tr-none'
                                : 'bg-white border text-foreground rounded-tl-none'
                            )}>
                              {msg.message}
                              <div className={cn(
                                "text-[10px] mt-1.5 font-medium opacity-60",
                                isMe ? 'text-right' : 'text-left'
                              )}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
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
              <div className="p-4 border-t bg-card">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-4xl mx-auto">
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
