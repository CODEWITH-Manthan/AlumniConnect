
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, MapPin, Clock, PlusCircle, Share2, MessageCircle, Loader2, Send, Users, MessageSquareQuote, Search, Filter, X, Bookmark, BookmarkCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, orderBy, limit, where } from 'firebase/firestore';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All");

  useEffect(() => {
    setMounted(true);
  }, []);

  // User Profile
  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  // Opportunities Collection
  const opportunitiesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'opportunities'), orderBy('datePosted', 'desc'), limit(50));
  }, [firestore, user]);
  const { data: opportunities, isLoading: isOppLoading } = useCollection(opportunitiesQuery);

  // Network Stats Queries
  const alumniCountQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users'), where('role', 'in', ['mentor', 'alumni']));
  }, [firestore, user]);
  const { data: alumniList } = useCollection(alumniCountQuery);

  const discussionsCountQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'guidanceRequests'));
  }, [firestore, user]);
  const { data: discussionsList } = useCollection(discussionsCountQuery);

  const isMentor = userData?.role === 'mentor' || userData?.role === 'alumni';
  const bookmarks = userData?.bookmarkedOpportunities || [];

  const handlePostOpportunity = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !firestore) return;

    const formData = new FormData(e.currentTarget);
    const newOpp = {
      id: crypto.randomUUID(),
      alumniId: user.uid,
      postedBy: `${userData?.firstName} ${userData?.lastName}`,
      title: formData.get('title') as string,
      company: formData.get('company') as string,
      location: formData.get('location') as string,
      type: formData.get('type') as string,
      description: formData.get('description') as string,
      datePosted: new Date().toISOString(),
      image: `https://picsum.photos/seed/${crypto.randomUUID()}/800/400`
    };

    addDocumentNonBlocking(collection(firestore, 'opportunities'), newOpp);

    toast({
      title: "Opportunity posted!",
      description: "Your post is now live in the feed.",
    });
    setIsDialogOpen(false);
  };

  const toggleBookmark = (oppId: string) => {
    if (!userDocRef || !userData) return;

    const isBookmarked = bookmarks.includes(oppId);
    const newBookmarks = isBookmarked
      ? bookmarks.filter((id: string) => id !== oppId)
      : [...bookmarks, oppId];

    updateDocumentNonBlocking(userDocRef, { bookmarkedOpportunities: newBookmarks });

    toast({
      title: isBookmarked ? "Removed from bookmarks" : "Added to bookmarks",
      description: isBookmarked ? "The opportunity has been removed from your list." : "You can find this in your profile now.",
    });
  };

  const filteredOpportunities = opportunities?.filter(opp => {
    const matchesSearch =
      opp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = activeFilter === "All" || opp.type === activeFilter;

    return matchesSearch && matchesFilter;
  });

  const filters = ["All", "Internship", "Referral", "Project"];

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 font-headline text-primary">Opportunity Feed</h1>
          <p className="text-muted-foreground">Discover internships, referrals, and projects posted by your alumni network.</p>
        </div>

        {isUserLoading || isUserDataLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Checking permissions...</span>
          </div>
        ) : (
          isMentor && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 rounded-full shadow-lg h-11 px-6">
                  <PlusCircle className="mr-2 h-5 w-5" /> Post Opportunity
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <form onSubmit={handlePostOpportunity}>
                  <DialogHeader>
                    <DialogTitle className="font-headline text-xl">Post New Opportunity</DialogTitle>
                    <DialogDescription>
                      Share a job opening, internship, or project with the student community.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title">Title</Label>
                      <Input id="title" name="title" placeholder="e.g. Software Engineering Intern" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="company">Company</Label>
                        <Input id="company" name="company" placeholder="Company Name" required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="location">Location</Label>
                        <Input id="location" name="location" placeholder="e.g. Remote" required />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="type">Opportunity Type</Label>
                      <Select name="type" defaultValue="Internship">
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Internship">Internship</SelectItem>

                          <SelectItem value="Referral">Referral</SelectItem>
                          <SelectItem value="Project">Project</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" name="description" placeholder="Tell us about the role..." className="min-h-[100px]" required />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full h-11 font-bold">
                      <Send className="mr-2 h-4 w-4" /> Publish Opportunity
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card p-4 rounded-2xl shadow-sm border space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, company, or skills..."
                className="pl-10 h-11 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <Button
                  key={filter}
                  variant={activeFilter === filter ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter(filter)}
                  className={cn(
                    "rounded-full px-4 font-medium transition-all",
                    activeFilter === filter ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-primary/5 hover:text-primary"
                  )}
                >
                  {filter}
                </Button>
              ))}
            </div>
          </div>

          {isOppLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-xl border border-dashed">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading the latest opportunities...</p>
            </div>
          ) : filteredOpportunities && filteredOpportunities.length > 0 ? (
            filteredOpportunities.map((opp) => (
              <Card key={opp.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow group">
                <div className="relative h-48 w-full overflow-hidden">
                  <Image
                    src={opp.image || `https://picsum.photos/seed/${opp.id}/800/400`}
                    alt={opp.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    data-ai-hint="office tech"
                  />
                  <div className="absolute top-4 right-4 flex gap-2">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 rounded-full shadow-md bg-white/80 hover:bg-white text-primary"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleBookmark(opp.id);
                      }}
                    >
                      {bookmarks.includes(opp.id) ? (
                        <BookmarkCheck className="h-4 w-4 fill-primary" />
                      ) : (
                        <Bookmark className="h-4 w-4" />
                      )}
                    </Button>
                    <Badge className={cn(
                      "font-bold shadow-md px-3 py-1 uppercase tracking-tighter text-[10px]",
                      opp.type === "Internship" ? "bg-secondary text-white" :
                        opp.type === "Referral" ? "bg-primary text-white" : "bg-teal-600 text-white"
                    )}>
                      {opp.type}
                    </Badge>
                  </div>
                </div>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl mb-1 font-headline group-hover:text-primary transition-colors">{opp.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <span className="font-bold text-primary">{opp.company}</span>
                        <span className="text-muted-foreground/30">•</span>
                        <span className="flex items-center gap-1 font-medium"><MapPin className="h-3 w-3" /> {opp.location}</span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed">{opp.description}</p>
                </CardContent>
                <CardFooter className="flex justify-between border-t bg-muted/10 pt-4 px-6">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold border border-primary/20 shadow-sm">
                      {opp.postedBy?.split(' ').map((n: string) => n[0]).join('') || 'A'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{opp.postedBy}</p>
                      <p className="text-[9px] text-muted-foreground flex items-center gap-1 uppercase font-black tracking-widest opacity-60">
                        <Clock className="h-2 w-2" /> {mounted ? new Date(opp.datePosted).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '...'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/5"
                      onClick={() => {
                        const shareUrl = `${window.location.origin}/?opportunity=${opp.id}`;
                        navigator.clipboard.writeText(shareUrl).then(() => {
                          toast({
                            title: "Link copied!",
                            description: "Opportunity link copied to clipboard.",
                          });
                        }).catch((err) => {
                          console.error('Failed to copy:', err);
                          toast({
                            variant: "destructive",
                            title: "Copy failed",
                            description: "Could not copy link. Please try again.",
                          });
                        });
                      }}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    {user && user.uid !== opp.alumniId && (
                      <Button size="sm" className="bg-primary hover:bg-primary/90 rounded-full font-bold shadow-sm" asChild>
                        <Link href={`/messages?recipientId=${opp.alumniId}`}>
                          <MessageCircle className="mr-2 h-4 w-4" /> Connect
                        </Link>
                      </Button>
                    )}
                    {user && user.uid === opp.alumniId && (
                      <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-black py-1 px-3 border-primary/20 text-primary bg-primary/5">
                        Your Post
                      </Badge>
                    )}
                  </div>
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="text-center py-24 bg-muted/10 rounded-2xl border border-dashed flex flex-col items-center">
              <Briefcase className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-10" />
              <h3 className="text-xl font-bold font-headline">No opportunities found</h3>
              <p className="text-muted-foreground max-w-xs mx-auto mt-2">Try adjusting your search terms or filter to see more results.</p>
              <Button
                variant="outline"
                className="mt-6 rounded-full"
                onClick={() => { setSearchTerm(""); setActiveFilter("All"); }}
              >
                Clear all filters
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-card overflow-hidden">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="text-lg font-headline flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Network Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="flex justify-between items-center p-4 bg-primary/5 rounded-xl border border-primary/10">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Verified Alumni</span>
                  <span className="text-2xl font-black text-primary font-headline">
                    {alumniList ? alumniList.length.toLocaleString() : "..."}
                  </span>
                </div>
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="flex justify-between items-center p-4 bg-secondary/5 rounded-xl border border-secondary/10">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Open Roles</span>
                  <span className="text-2xl font-black text-secondary font-headline">
                    {opportunities ? opportunities.length.toLocaleString() : "..."}
                  </span>
                </div>
                <div className="bg-secondary/10 p-2 rounded-lg">
                  <Briefcase className="h-5 w-5 text-secondary" />
                </div>
              </div>
              <div className="flex justify-between items-center p-4 bg-accent/5 rounded-xl border border-accent/10">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Active Discussions</span>
                  <span className="text-2xl font-black text-accent font-headline">
                    {discussionsList ? discussionsList.length.toLocaleString() : "..."}
                  </span>
                </div>
                <div className="bg-accent/10 p-2 rounded-lg">
                  <MessageSquareQuote className="h-5 w-5 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary text-primary-foreground border-none shadow-xl overflow-hidden relative">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <CardHeader>
              <CardTitle className="text-lg font-headline">Community Wisdom</CardTitle>
              <CardDescription className="text-primary-foreground/80">
                Browse our guidance feed to find advice and insights from experienced graduates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full bg-white/10 border-white/20 hover:bg-white/20 text-white font-bold rounded-full" asChild>
                <Link href="/guidance">View Guidance Feed</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
