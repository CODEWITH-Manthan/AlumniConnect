
'use client';

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { MessageCircle, ThumbsUp, Plus, Loader2, Send, MessageSquareQuote } from "lucide-react"
import { useUser, useFirestore, useMemoFirebase, useCollection, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, limit, increment, arrayUnion } from 'firebase/firestore';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { incrementStat } from '@/lib/stats';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from "@/components/ui/scroll-area";
import UserProfileModal from "@/components/UserProfileModal";

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
        <MessageCircle className="h-4 w-4 text-primary" />
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
                  {mounted ? new Date(reply.timestamp).toLocaleDateString() : '...'}
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
  const { data: userData } = useDoc(userDocRef);

  const guidanceQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'guidanceRequests'), orderBy('datePosted', 'desc'), limit(50));
  }, [firestore, user]);

  const { data: requests, isLoading } = useCollection(guidanceQuery);

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
    // Block re-likes (already liked)
    if (likedRequests.includes(requestId)) return;

    // Atomically increment the like count on the guidance request
    const requestRef = doc(firestore, 'guidanceRequests', requestId);
    updateDocumentNonBlocking(requestRef, { likes: increment(1) });

    // Track this like in the user's profile to prevent re-liking
    updateDocumentNonBlocking(userDocRef, { likedRequests: arrayUnion(requestId) });
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
          <h1 className="text-3xl font-bold tracking-tight mb-2 font-headline text-primary">Community Wisdom</h1>
          <p className="text-muted-foreground">Ask questions, share advice, and grow with your network.</p>
        </div>
        
        <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 rounded-full shadow-lg h-11 px-6">
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
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary/30 mb-4" />
              <p className="text-muted-foreground animate-pulse">Gathering community insights...</p>
            </div>
          ) : filteredRequests && filteredRequests.length > 0 ? (
            filteredRequests.map((q) => (
              <Card key={q.id} className="border-none shadow-sm hover:shadow-md transition-all group overflow-hidden bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center mb-3">
                    <Badge variant="secondary" className="bg-secondary/10 text-secondary border-none uppercase text-[9px] tracking-widest font-black py-0.5">
                      {q.category || "GENERAL"}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {mounted ? new Date(q.datePosted).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '...'}
                    </span>
                  </div>
                  <CardTitle 
                    className="text-xl font-headline group-hover:text-primary cursor-pointer transition-colors leading-tight"
                    onClick={() => setSelectedRequestId(q.id)}
                  >
                    {q.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-6">
                  <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">{q.description}</p>
                </CardContent>
                <CardFooter className="border-t bg-muted/20 pt-4 flex justify-between items-center px-6">
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
                      disabled={likedRequests.includes(q.id) || user?.uid === q.studentId}
                      title={likedRequests.includes(q.id) ? 'Already liked' : user?.uid === q.studentId ? "Can't like your own post" : 'Like'}
                      className={cn(
                        "flex items-center gap-1.5 text-xs font-bold transition-colors px-2.5 py-1 rounded-full border shadow-sm active:scale-95",
                        likedRequests.includes(q.id)
                          ? "bg-primary/10 text-primary border-primary/20 cursor-not-allowed"
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
                      className="flex items-center gap-1.5 text-xs font-bold text-primary transition-colors bg-primary/5 px-2.5 py-1 rounded-full border border-primary/10 shadow-sm hover:bg-primary/10"
                    >
                      <MessageSquareQuote className="h-3.5 w-3.5" /> View Advice
                    </button>
                  </div>
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="text-center py-24 bg-muted/10 rounded-3xl border border-dashed flex flex-col items-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
              <h3 className="text-lg font-bold">The feed is quiet...</h3>
              <p className="text-muted-foreground max-w-xs mx-auto">Be the first to spark a conversation and help others grow.</p>
              <Button variant="outline" className="mt-6 rounded-full" onClick={() => setIsPostDialogOpen(true)}>
                Post a Question
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
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                    {selectedRequest.studentName?.[0]}
                  </div>
                  <span className="text-xs font-bold">{selectedRequest.studentName}</span>
                  <span className="text-[10px] text-muted-foreground">•</span>
                  <span className="text-[10px] text-muted-foreground">
                    Asked {mounted ? new Date(selectedRequest.datePosted).toLocaleDateString() : '...'}
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
