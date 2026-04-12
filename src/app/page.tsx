
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, MapPin, Clock, PlusCircle, Share2, MessageCircle, Loader2, Send, Users, MessageSquareQuote, Search, Filter, X, Bookmark, BookmarkCheck, ExternalLink, MoreVertical, Edit, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, orderBy, limit } from 'firebase/firestore';
import { incrementStat } from '@/lib/stats';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';

// Landing Page Components
import LandingHero from '@/components/home/LandingHero';
import LandingFeatures from '@/components/home/LandingFeatures';
import LandingAbout from '@/components/home/LandingAbout';
import PendingVerificationState from '@/components/ui/PendingVerificationState';

const typeImages: Record<string, string[]> = {
  "Internship": [
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=800&q=80"
  ],
  "Research": [
    "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?auto=format&fit=crop&w=800&q=80"
  ],
  "Project": [
    "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=800&q=80"
  ],

  "Hackathon": [
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1528901173705-1a8ab274b5b7?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80"
  ]
};

const getOppImage = (type: string, id: string) => {
  const images = typeImages[type] || typeImages["Project"];
  const charCodeSum = id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return images[charCodeSum % images.length];
};

export default function Home() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState<any>(null);
  const [oppToDelete, setOppToDelete] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

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

  // Redirect admin to admin panel
  useEffect(() => {
    if (userData?.role === 'admin') {
      router.replace('/admin');
    }
  }, [userData, router]);

  // Opportunities Collection
  const opportunitiesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'opportunities'), orderBy('datePosted', 'desc'), limit(50));
  }, [firestore, user]);
  const { data: opportunities, isLoading: isOppLoading } = useCollection(opportunitiesQuery);

  // Network Stats — single document read instead of full collection scans
  const statsDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'stats', 'global');
  }, [firestore, user]);
  const { data: globalStats } = useDoc(statsDocRef);

  const isMentor = userData?.role === 'alumni';
  const bookmarks = userData?.bookmarkedOpportunities || [];

  const handlePostOpportunity = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !firestore) return;

    const formData = new FormData(e.currentTarget);
    const oppType = formData.get('type') as string;
    
    if (editingOpp) {
      updateDocumentNonBlocking(doc(firestore, 'opportunities', editingOpp.id), {
        title: formData.get('title') as string,
        company: formData.get('company') as string,
        location: formData.get('location') as string,
        type: oppType,
        description: formData.get('description') as string,
        externalUrl: (formData.get('externalUrl') as string)?.trim() || null,
      });

      toast({
        title: "Opportunity updated!",
        description: "Your post changes have been saved.",
      });
    } else {
      const oppId = crypto.randomUUID();
      const newOpp = {
        id: oppId,
        alumniId: user.uid,
        postedBy: `${userData?.firstName} ${userData?.lastName}`,
        title: formData.get('title') as string,
        company: formData.get('company') as string,
        location: formData.get('location') as string,
        type: oppType,
        description: formData.get('description') as string,
        externalUrl: (formData.get('externalUrl') as string)?.trim() || null,
        datePosted: new Date().toISOString(),
        image: getOppImage(oppType, oppId)
      };

      addDocumentNonBlocking(collection(firestore, 'opportunities'), newOpp);
      // Increment the global open roles counter
      incrementStat(firestore, { openRoles: 1 });

      toast({
        title: "Opportunity posted!",
        description: "Your post is now live in the feed.",
      });
    }

    setIsDialogOpen(false);
    setEditingOpp(null);
  };

  const handleDeleteOpportunity = () => {
    if (!oppToDelete || !firestore) return;
    deleteDocumentNonBlocking(doc(firestore, 'opportunities', oppToDelete));
    toast({
      title: "Opportunity deleted",
      description: "Your post was removed from the feed.",
    });
    setOppToDelete(null);
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

  const filters = ["All", "Internship", "Project", "Research", "Hackathon"];

  // Loading State
  if (isUserLoading || (user && isUserDataLoading)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary dark:text-accent opacity-50" />
        <p className="text-sm font-bold tracking-widest text-muted-foreground uppercase animate-pulse">Initializing AlumniConnect...</p>
      </div>
    );
  }

  // Not Logged In State (Landing Page)
  if (!user) {
    return (
      <div className="flex flex-col">
        <LandingHero />
        <LandingFeatures />
        <LandingAbout />
      </div>
    );
  }

  // Pending Verification State
  if (userData?.role === 'alumni' && !userData.isVerifiedAlumni) {
    return <PendingVerificationState />;
  }

  // Logged In State (Opportunity Feed)
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 font-headline text-primary dark:text-accent">Opportunity Feed</h1>
          <p className="text-muted-foreground">Discover internships and projects posted by your alumni network.</p>
        </div>

        {isUserDataLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm font-bold tracking-tight uppercase opacity-60">Syncing Feed...</span>
          </div>
        ) : (
          isMentor && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) setEditingOpp(null);
            }}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 rounded-full shadow-lg h-11 px-6">
                  <PlusCircle className="mr-2 h-5 w-5" /> Post Opportunity
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <form onSubmit={handlePostOpportunity}>
                  <DialogHeader>
                    <DialogTitle className="font-headline text-xl">
                      {editingOpp ? "Edit Opportunity" : "Post New Opportunity"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingOpp ? "Update the details of your opportunity." : "Share a job opening, internship, or project with the student community."}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title">Title</Label>
                      <Input id="title" name="title" defaultValue={editingOpp?.title} placeholder="e.g. Software Engineering Intern" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="company">Company</Label>
                        <Input id="company" name="company" defaultValue={editingOpp?.company} placeholder="Company Name" required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="location">Location</Label>
                        <Input id="location" name="location" defaultValue={editingOpp?.location} placeholder="e.g. Remote" required />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="type">Opportunity Type</Label>
                      <Select name="type" defaultValue={editingOpp?.type || "Internship"}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Internship">Internship</SelectItem>

                          <SelectItem value="Project">Project</SelectItem>
                          <SelectItem value="Research">Research</SelectItem>
                          <SelectItem value="Hackathon">Hackathon</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" name="description" defaultValue={editingOpp?.description} placeholder="Tell us about the role..." className="min-h-[100px]" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="externalUrl">External Link <span className="text-muted-foreground font-normal">(optional)</span></Label>
                      <Input id="externalUrl" name="externalUrl" defaultValue={editingOpp?.externalUrl || ""} placeholder="e.g. https://unstop.com/... or LinkedIn URL" type="url" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full h-11 font-bold">
                      <Send className="mr-2 h-4 w-4" /> {editingOpp ? "Save Changes" : "Publish Opportunity"}
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
                    activeFilter === filter ? "shadow-md" : "hover:bg-primary/5 hover:text-primary dark:hover:text-accent"
                  )}
                >
                  {filter}
                </Button>
              ))}
            </div>
          </div>

          {isOppLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-xl border border-dashed">
              <Loader2 className="h-8 w-8 animate-spin text-primary dark:text-accent mb-4" />
              <p className="text-muted-foreground">Loading the latest opportunities...</p>
            </div>
          ) : filteredOpportunities && filteredOpportunities.length > 0 ? (
            filteredOpportunities.map((opp) => (
              <Card key={opp.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow group">
                <div className="relative h-48 w-full overflow-hidden">
                  <Image
                    src={opp.image && !opp.image.includes('picsum.photos') ? opp.image : getOppImage(opp.type, opp.id)}
                    alt={opp.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    data-ai-hint="office tech"
                  />
                  <div className="absolute top-4 right-4 flex gap-2">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 rounded-full shadow-md bg-white/80 hover:bg-white text-primary dark:text-accent"
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
                      opp.type === "Internship" ? "bg-blue-600 text-white" :
                        opp.type === "Research" ? "bg-amber-600 text-white" :
                        opp.type === "Hackathon" ? "bg-rose-600 text-white" :
                        "bg-teal-600 text-white"
                    )}>
                      {opp.type}
                    </Badge>
                  </div>
                </div>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl mb-1 font-headline group-hover:text-primary dark:group-hover:text-accent transition-colors">{opp.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <span className="font-bold text-primary dark:text-accent">{opp.company}</span>
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
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary dark:text-accent text-xs font-bold border border-primary/20 shadow-sm">
                      {opp.postedBy?.split(' ').map((n: string) => n[0]).join('') || 'A'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{opp.postedBy}</p>
                      <p className="text-[9px] text-muted-foreground flex items-center gap-1 uppercase font-black tracking-widest opacity-60">
                        <Clock className="h-2 w-2" /> {mounted ? new Date(opp.datePosted).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }) : '...'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full text-muted-foreground hover:text-primary dark:text-accent hover:bg-primary/5"
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
                    {opp.externalUrl && (
                      <Button size="sm" variant="outline" className="rounded-full font-bold shadow-sm text-xs h-9" asChild>
                        <a href={opp.externalUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Apply ↗
                        </a>
                      </Button>
                    )}
                    {user && user.uid !== opp.alumniId && (
                      <Button size="sm" className="bg-primary hover:bg-primary/90 rounded-full font-bold shadow-sm" asChild>
                        <Link href={`/messages?recipientId=${opp.alumniId}`}>
                          <MessageCircle className="mr-2 h-4 w-4" /> Connect
                        </Link>
                      </Button>
                    )}
                    {user && user.uid === opp.alumniId && (
                      <>
                        <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-black py-1 px-3 border-primary/20 text-primary dark:text-accent bg-primary/5">
                          Your Post
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => {
                              setTimeout(() => {
                                setEditingOpp(opp);
                                setIsDialogOpen(true);
                              }, 150);
                            }}>
                              <Edit className="mr-2 h-4 w-4" /> Edit Post
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onSelect={() => {
                              setTimeout(() => {
                                setOppToDelete(opp.id);
                              }, 150);
                            }}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Post
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
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

          <AlertDialog open={!!oppToDelete} onOpenChange={(open) => !open && setOppToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This opportunity will be permanently deleted from the feed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteOpportunity} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-card overflow-hidden">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="text-lg font-headline flex items-center gap-2">
                <Users className="h-5 w-5 text-primary dark:text-accent" /> Network Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="flex justify-between items-center p-4 bg-primary/5 rounded-xl border border-primary/10">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Verified Alumni</span>
                  <span className="text-2xl font-black text-primary dark:text-accent font-headline">
                    {globalStats ? (globalStats.alumniCount ?? 0).toLocaleString() : "..."}
                  </span>
                </div>
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Users className="h-5 w-5 text-primary dark:text-accent" />
                </div>
              </div>
              <div className="flex justify-between items-center p-4 bg-secondary/5 rounded-xl border border-secondary/10">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Open Roles</span>
                  <span className="text-2xl font-black text-primary dark:text-accent font-headline">
                    {globalStats ? (globalStats.openRoles ?? 0).toLocaleString() : "..."}
                  </span>
                </div>
                <div className="bg-secondary/10 p-2 rounded-lg">
                  <Briefcase className="h-5 w-5 text-primary dark:text-accent" />
                </div>
              </div>
              <div className="flex justify-between items-center p-4 bg-accent/5 rounded-xl border border-accent/10">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Active Discussions</span>
                  <span className="text-2xl font-black text-primary dark:text-accent font-headline">
                    {globalStats ? (globalStats.activeDiscussions ?? 0).toLocaleString() : "..."}
                  </span>
                </div>
                <div className="bg-accent/10 p-2 rounded-lg">
                  <MessageSquareQuote className="h-5 w-5 text-primary dark:text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary text-primary-foreground dark:text-accent-foreground border-none shadow-xl overflow-hidden relative">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <CardHeader>
              <CardTitle className="text-lg font-headline">Community Wisdom</CardTitle>
              <CardDescription className="text-primary-foreground/80 dark:text-accent-foreground/80">
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
