'use client';

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Search, Filter, Linkedin, Mail, MessageSquare, Loader2, User, X, RotateCcw, BadgeCheck } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useFirestore, useMemoFirebase, useCollection, useUser, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import UserProfileModal from "@/components/UserProfileModal";
import PendingVerificationState from "@/components/ui/PendingVerificationState";
import { cn } from "@/lib/utils"

const DEPARTMENTS = ["CMPN", "IT", "EXTC", "INST", "ETRX", "AIDS", "Other"]

export default function DirectoryPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  const alumniQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users'), where('role', '==', 'alumni'));
  }, [firestore, user]);

  const { data: allUsers, isLoading } = useCollection(alumniQuery);

  const filteredUsers = allUsers?.filter(person => {
    if (!person.emailVerified || !person.isVerifiedAlumni) return false;

    const fullName = `${person.firstName} ${person.lastName}`.toLowerCase();
    const email = (person.email || "").toLowerCase();
    const skills = (person.skills || []).map((s: string) => s.toLowerCase());
    const fieldOfWorking = (person.fieldOfWorking || "").toLowerCase();
    const bio = (person.bio || "").toLowerCase();
    const dept = person.department || "";
    const queryStr = searchTerm.toLowerCase();

    const matchesSearch = 
      fullName.includes(queryStr) ||
      email.includes(queryStr) ||
      bio.includes(queryStr) ||
      fieldOfWorking.includes(queryStr) ||
      skills.some((skill: string) => skill.includes(queryStr));

    const matchesDepartment = selectedDepartment === "all" || dept === selectedDepartment;

    return matchesSearch && matchesDepartment;
  });

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedDepartment("all");
  };

  const activeFiltersCount = selectedDepartment !== "all" ? 1 : 0;

  if (isUserDataLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading directory...</p>
      </div>
    );
  }

  if (userData?.role === 'alumni' && !userData.isVerifiedAlumni) {
    return <PendingVerificationState />;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 font-headline text-primary dark:text-accent">Alumni Directory</h1>
          <p className="text-muted-foreground">Connect with graduates by name, role, or technical expertise.</p>
        </div>
        <div className="flex w-full md:w-auto gap-2">
          <div className="relative flex-1 md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              className="pl-9 bg-card" 
              placeholder="Search by name, skill, or field of work (e.g. Google)..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("relative", activeFiltersCount > 0 && "border-primary text-primary bg-primary/5")}>
                <Filter className="mr-2 h-4 w-4" /> 
                Filter
                {activeFiltersCount > 0 && (
                  <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px]">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold font-headline">Refine Directory</h4>
                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 px-2 text-xs text-muted-foreground hover:text-primary dark:text-accent">
                      <RotateCcw className="mr-1 h-3 w-3" /> Reset
                    </Button>
                  )}
                </div>
                
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest opacity-60">Department</Label>
                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {DEPARTMENTS.map(dept => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex flex-col border border-border/40 rounded-[1.5rem] shadow-sm overflow-hidden h-[240px] animate-pulse bg-card/40 backdrop-blur-3xl relative">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 dark:via-white/5 to-transparent"></div>
              <div className="p-6 flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/5"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-5 bg-primary/10 rounded-md w-3/4"></div>
                  <div className="h-3 bg-secondary/10 rounded-md w-1/2"></div>
                </div>
              </div>
              <div className="px-6 pb-6 space-y-3 flex-1">
                <div className="h-3 bg-muted/50 rounded-md w-full"></div>
                <div className="h-3 bg-muted/50 rounded-md w-4/5"></div>
              </div>
              <div className="p-4 bg-muted/10 h-[68px] border-t border-border/20"></div>
            </div>
          ))}
        </div>
      ) : filteredUsers && filteredUsers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((person) => (
            <Card key={person.id} className="group relative flex flex-col overflow-hidden border border-border/40 bg-card/40 backdrop-blur-3xl shadow-lg transition-all duration-500 hover:shadow-2xl hover:border-primary/30 hover:-translate-y-1 rounded-[1.5rem]">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-primary/10 blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
              <CardHeader className="flex flex-row items-center gap-4 space-y-0 cursor-pointer relative z-10" onClick={() => { setSelectedUserId(person.id); setIsProfileModalOpen(true); }}>
                <button className="relative h-16 w-16 overflow-hidden rounded-full border-[3px] border-background shadow-md transition-all group-hover:border-primary/50 bg-primary/5 flex items-center justify-center flex-shrink-0 group-hover:scale-105 duration-300">
                  {person.photoURL ? (
                    <Image 
                      src={person.photoURL} 
                      alt={`${person.firstName} ${person.lastName}`} 
                      fill
                      priority
                      className="object-cover" 
                    />
                  ) : person.image ? (
                    <Image 
                      src={person.image} 
                      alt={`${person.firstName} ${person.lastName}`} 
                      fill
                      className="object-cover" 
                    />
                  ) : (
                    <User className="h-8 w-8 text-primary/50" />
                  )}
                </button>
                <div className="flex-1">
                  <button onClick={() => { setSelectedUserId(person.id); setIsProfileModalOpen(true); }} className="text-lg font-bold font-headline group-hover:text-primary transition-colors text-left flex items-center gap-1.5">
                    {person.firstName} {person.lastName}
                    {person.emailVerified && <span title="Verified"><BadgeCheck className="h-4 w-4 text-blue-500" /></span>}
                  </button>
                  <p className="text-[11px] font-black text-secondary uppercase tracking-widest mt-0.5">{person.role === 'alumni' ? 'Alumni' : person.role}</p>
                  {person.fieldOfWorking && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{person.fieldOfWorking}</p>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 relative z-10 pb-4">
                <p className="text-sm text-foreground/80 mb-4 line-clamp-3 leading-relaxed">
                  {person.bio || "No bio available for this alumni member yet."}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-auto">
                  {(person.skills || ["Mentorship"]).map((skill: string) => (
                    <Badge key={skill} variant="secondary" className="bg-primary/5 text-primary border border-primary/10 hover:bg-primary/10 transition-colors text-[10px] py-0.5 px-2 font-semibold">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/40 bg-muted/10 pt-4 pb-4 flex justify-between relative z-10 backdrop-blur-xl">
                <div className="flex gap-2">
                  {person.linkedinUrl && (
                    <Button variant="outline" size="icon" className="h-9 w-9 rounded-full bg-background/50 hover:bg-[#0A66C2] hover:text-white hover:border-[#0A66C2] transition-colors" asChild>
                      <a href={person.linkedinUrl} target="_blank" rel="noopener noreferrer">
                        <Linkedin className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-full bg-background/50 hover:bg-primary hover:text-primary-foreground transition-colors" asChild>
                    <a href={`mailto:${person.email}`}>
                      <Mail className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-md font-bold px-4 transition-transform active:scale-95" asChild>
                  <Link href={`/messages?recipientId=${person.id}`}>
                    <MessageSquare className="mr-2 h-4 w-4" /> Message
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center py-24 bg-card/30 backdrop-blur-xl rounded-[2rem] border border-dashed border-border/60 shadow-inner">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
            <div className="bg-background p-4 rounded-full relative border border-border shadow-md">
              <Search className="h-10 w-10 text-muted-foreground" />
            </div>
          </div>
          <h3 className="text-2xl font-bold font-headline mb-2 text-foreground">No alumni found</h3>
          <p className="text-muted-foreground max-w-sm mb-6 text-sm">We couldn't find anyone matching your current filters. Try adjusting your search or selecting a different department.</p>
          <Button variant="outline" onClick={resetFilters} className="rounded-full shadow-sm hover:bg-primary hover:text-primary-foreground transition-all">
            <RotateCcw className="mr-2 h-4 w-4" /> Reset Filters
          </Button>
        </div>
      )}

      <UserProfileModal 
        userId={selectedUserId} 
        open={isProfileModalOpen} 
        onOpenChange={setIsProfileModalOpen}
      />
    </div>
  )
}
