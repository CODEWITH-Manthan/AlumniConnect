
'use client';

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { MessageCircle, ThumbsUp, Plus, Loader2, Send, MessageSquareQuote } from "lucide-react"
import { useUser, useFirestore, useMemoFirebase, useCollection, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, limit, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { incrementStat } from '@/lib/stats';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from "@/components/ui/scroll-area";
import UserProfileModal from "@/components/UserProfileModal";
import PendingVerificationState from "@/components/ui/PendingVerificationState";

function ReplySection({ requestId }: { requestId: string }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [replyText, setReplyText] = useState("");
  const [mounted, setMounted] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userData } = useDoc(userDocRef);

  const repliesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'guidanceRequests', requestId, 'replies'),
      orderBy('timestamp', 'asc')
    );
  }, [firestore, requestId, user]);
  const { data: replies, isLoading } = useCollection(repliesQuery);

  const handlePostReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore || !replyText.trim()) return;

    const newReply = {
      id: crypto.randomUUID(),
      requestId,
      authorId: user.uid,
      authorName: `${userData?.firstName || 'User'} ${userData?.lastName || ''}`,
      authorRole: userData?.role || 'member',
      content: replyText.trim(),
      timestamp: new Date().toISOString()
    };

    addDocumentNonBlocking(collection(firestore, 'guidanceRequests', requestId, 'replies'), newReply);
    
    setReplyText("");
    toast({
      title: "Reply posted",
      description: "Thanks for sharing your wisdom!",
    });
  };

  return (
    <div className="mt-6 space-y-6">
      <div className="flex items-center gap-2 border-b pb-2 mb-4">
        <MessageCircle className="h-4 w-4 text-primary dark:text-accent" />
        <h3 className="text-sm font-bold font-headline uppercase tracking-wider">Discussion</h3>
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin opacity-20" /></div>
        ) : replies && replies.length > 0 ? (
          replies.map((reply) => (
            <div key={reply.id} className="bg-muted/30 p-4 rounded-xl relative group">
              <div className="flex justify-between items-start mb-2">
                <button 
                  onClick={() => { setSelectedUserId(reply.authorId); setIsProfileModalOpen(true); }}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary hover:bg-primary/40 transition-colors">
                    {reply.authorName?.[0]}
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold hover:text-primary transition-colors">{reply.authorName}</span>
                    <Badge variant="outline" className="ml-2 text-[8px] py-0 h-4 bg-background uppercase font-bold tracking-tighter">
                      {reply.authorRole}
                    </Badge>
                  </div>
                </button>
                <span className="text-[10px] text-muted-foreground">
                  {mounted ? new Date(reply.timestamp).toLocaleDateString('en-GB') : '...'}
                </span>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">{reply.content}</p>
            </div>
          ))
        ) : (
          <div className="text-center py-8 opacity-40 italic text-sm">
            No replies yet. Be the first to share your perspective.
          </div>
        )}
      </div>

      <UserProfileModal 
        userId={selectedUserId} 
        open={isProfileModalOpen} 
        onOpenChange={setIsProfileModalOpen}
      />

      <form onSubmit={handlePostReply} className="mt-4 pt-4 border-t">
        <div className="relative">
          <Textarea 
            placeholder="Type your reply here..." 
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            className="min-h-[100px] bg-card resize-none pr-12 focus-visible:ring-primary/20"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!replyText.trim()}
            className="absolute bottom-3 right-3 rounded-full h-8 w-8 shadow-sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function GuidancePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  const guidanceQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'guidanceRequests'), orderBy('datePosted', 'desc'), limit(50));
  }, [firestore, user]);

  const { data: requests, isLoading } = useCollection(guidanceQuery);

  if (isUserDataLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading guidance board...</p>
      </div>
    );
  }

  if (userData?.role === 'alumni' && !userData.isVerifiedAlumni) {
    return <PendingVerificationState />;
  }

  const handlePostQuestion = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !firestore) return;

    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;

    const newRequest = {
      id: crypto.randomUUID(),
      studentId: user.uid,
      studentName: `${userData?.firstName || 'Anonymous'} ${userData?.lastName || ''}`,
      title,
      description,
      category: "General Advice",
      datePosted: new Date().toISOString(),
      likes: 0
    };

    addDocumentNonBlocking(collection(firestore, 'guidanceRequests'), newRequest);
    // Increment the global discussions counter
    incrementStat(firestore, { activeDiscussions: 1 });
    
    toast({
      title: "Question posted!",
      description: "The community has been notified of your request.",
    });
    setIsPostDialogOpen(false);
  };

  const likedRequests: string[] = userData?.likedRequests || [];

  const handleLike = (requestId: string, postAuthorId: string) => {
    if (!firestore || !user || !userDocRef) return;
    // Block self-likes
    if (user.uid === postAuthorId) {
      toast({ title: "Can't like your own post", description: "Ask others to upvote your question!" });
      return;
    }

    const requestRef = doc(firestore, 'guidanceRequests', requestId);

    if (likedRequests.includes(requestId)) {
      // Unlike
      updateDocumentNonBlocking(requestRef, { likes: increment(-1) });
      updateDocumentNonBlocking(userDocRef, { likedRequests: arrayRemove(requestId) });
    } else {
      // Like
      updateDocumentNonBlocking(requestRef, { likes: increment(1) });
      updateDocumentNonBlocking(userDocRef, { likedRequests: arrayUnion(requestId) });
    }
  };

  const filteredRequests = requests?.filter(req => 
    req.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    req.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedRequest = requests?.find(r => r.id === selectedRequestId);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 font-headline text-primary dark:text-accent">Community Wisdom</h1>
          <p className="text-muted-foreground">Ask questions, share advice, and grow with your network.</p>
        </div>
        
        <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 rounded-full shadow-lg h-11 px-6 transition-transform active:scale-95 font-bold">
              <Plus className="mr-2 h-5 w-5" /> Ask a Question
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <form onSubmit={handlePostQuestion}>
              <DialogHeader>
                <DialogTitle className="font-headline text-xl">Ask the Community</DialogTitle>
                <DialogDescription>
                  Alumni and mentors are waiting to help you with your career and academic journey.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Headline</Label>
                  <Input id="title" name="title" placeholder="e.g. Best way to network at tech conferences?" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Details</Label>
                  <Textarea 
                    id="description" 
                    name="description" 
                    placeholder="Provide context so mentors can give specific advice..." 
                    className="min-h-[120px]" 
                    required 
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full h-11 font-bold">
                  Post to Community
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <Input 
            placeholder="Search discussions and wisdom..." 
            className="bg-card shadow-sm h-14 text-lg rounded-2xl border-none ring-1 ring-border focus-visible:ring-primary/40" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid gap-6">
          {isLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col border border-border/40 rounded-[2rem] shadow-sm overflow-hidden h-[180px] animate-pulse bg-card/40 backdrop-blur-3xl relative">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 dark:via-white/5 to-transparent"></div>
                  <div className="p-6 pb-2">
                     <div className="h-3 w-16 bg-primary/20 rounded-md mb-4"></div>
                     <div className="h-6 w-3/4 bg-foreground/10 rounded-md"></div>
                  </div>
                  <div className="px-6 pb-6 space-y-2">
                    <div className="h-3 bg-muted/60 rounded-md w-full"></div>
                    <div className="h-3 bg-muted/60 rounded-md w-2/3"></div>
                  </div>
                  <div className="p-4 bg-muted/10 h-[68px] mt-auto border-t border-border/20"></div>
                </div>
              ))}
            </div>
          ) : filteredRequests && filteredRequests.length > 0 ? (
            filteredRequests.map((q) => (
              <Card key={q.id} className="group relative border border-border/40 overflow-hidden bg-card/40 backdrop-blur-3xl shadow-sm transition-all duration-500 hover:shadow-xl hover:border-primary/30 rounded-[2rem]">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/10 blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                <CardHeader className="pb-3 relative z-10">
                  <div className="flex justify-between items-center mb-4">
                    <Badge variant="secondary" className="bg-primary/5 text-primary border border-primary/10 uppercase text-[9px] tracking-widest font-black py-0.5 px-3">
                      {q.category || "GENERAL"}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-semibold tracking-wider uppercase">
                      {mounted ? new Date(q.datePosted).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '...'}
                    </span>
                  </div>
                  <CardTitle 
                    className="text-2xl font-headline group-hover:text-primary cursor-pointer transition-colors leading-tight tracking-tight"
                    onClick={() => setSelectedRequestId(q.id)}
                  >
                    {q.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-6 relative z-10">
                  <p className="text-foreground/70 line-clamp-2 text-base leading-relaxed">{q.description}</p>
                </CardContent>
                <CardFooter className="border-t border-border/40 bg-muted/10 pt-4 pb-4 flex justify-between items-center px-6 relative z-10 backdrop-blur-xl">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs border border-primary/20 shadow-sm">
                      {q.studentName?.[0] || 'S'}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-foreground">{q.studentName}</span>
                      <span className="text-[9px] uppercase tracking-tighter text-muted-foreground font-bold">Author</span>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleLike(q.id, q.studentId)}
                      disabled={user?.uid === q.studentId}
                      title={user?.uid === q.studentId ? "Can't like your own post" : likedRequests.includes(q.id) ? 'Unlike' : 'Like'}
                      className={cn(
                        "flex items-center gap-1.5 text-xs font-bold transition-colors px-2.5 py-1 rounded-full border shadow-sm active:scale-95",
                        likedRequests.includes(q.id)
                          ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                          : user?.uid === q.studentId
                          ? "bg-muted text-muted-foreground/50 border-muted cursor-not-allowed"
                          : "bg-background text-muted-foreground hover:text-primary hover:border-primary/30"
                      )}
                    >
                      <ThumbsUp className={cn("h-3.5 w-3.5", likedRequests.includes(q.id) && "fill-primary")} />
                      {q.likes || 0}
                    </button>
                    <button 
                      onClick={() => setSelectedRequestId(q.id)}
                      className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 transition-colors bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20 shadow-sm hover:bg-blue-500/20"
                    >
                      <MessageSquareQuote className="h-3.5 w-3.5" /> View Advice
                    </button>
                  </div>
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="text-center py-24 bg-card/30 backdrop-blur-xl rounded-[2rem] border border-dashed border-border/60 flex flex-col items-center shadow-inner">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
                <div className="bg-background p-4 rounded-full relative border border-border shadow-md">
                  <MessageCircle className="h-10 w-10 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-2xl font-bold font-headline mb-2 text-foreground">The feed is quiet...</h3>
              <p className="text-muted-foreground max-w-sm mx-auto mb-6 text-sm">Be the first to spark a conversation and help others grow.</p>
              <Button variant="outline" className="rounded-full shadow-sm hover:bg-primary hover:text-primary-foreground transition-all" onClick={() => setIsPostDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Post a Question
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Reply Modal */}
      <Dialog open={!!selectedRequestId} onOpenChange={(open) => !open && setSelectedRequestId(null)}>
        <DialogContent className="sm:max-w-[700px] h-[90vh] flex flex-col p-0 overflow-hidden">
          {selectedRequest && (
            <>
              <DialogHeader className="p-8 pb-4 bg-muted/10 border-b relative">
                <div className="flex justify-between items-start mb-4">
                  <Badge className="bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-widest">
                    {selectedRequest.category}
                  </Badge>
                </div>
                <DialogTitle className="text-2xl font-headline leading-tight pr-6">
                  {selectedRequest.title}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-4">
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary dark:text-accent">
                    {selectedRequest.studentName?.[0]}
                  </div>
                  <span className="text-xs font-bold">{selectedRequest.studentName}</span>
                  <span className="text-[10px] text-muted-foreground">•</span>
                  <span className="text-[10px] text-muted-foreground">
                    Asked {mounted ? new Date(selectedRequest.datePosted).toLocaleDateString('en-GB') : '...'}
                  </span>
                </div>
              </DialogHeader>
              
              <ScrollArea className="flex-1 p-8 pt-6">
                <div className="mb-6">
                  <p className="text-foreground/80 leading-relaxed text-base italic border-l-4 border-primary/20 pl-4 py-2 bg-primary/5 rounded-r-lg">
                    "{selectedRequest.description}"
                  </p>
                </div>

                <ReplySection requestId={selectedRequest.id} />
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
