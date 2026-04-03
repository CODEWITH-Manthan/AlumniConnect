'use client';

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, Filter, Linkedin, Mail, MessageSquare, Loader2, User } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useFirestore, useMemoFirebase, useCollection, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import UserProfileModal from "@/components/UserProfileModal";

export default function DirectoryPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const alumniQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users'), where('role', '==', 'alumni'));
  }, [firestore, user]);

  const { data: allUsers, isLoading } = useCollection(alumniQuery);

  const filteredUsers = allUsers?.filter(person => {
    const fullName = `${person.firstName} ${person.lastName}`.toLowerCase();
    const email = (person.email || "").toLowerCase();
    const skills = (person.skills || []).map((s: string) => s.toLowerCase());
    const bio = (person.bio || "").toLowerCase();
    const queryStr = searchTerm.toLowerCase();

    return (
      fullName.includes(queryStr) ||
      email.includes(queryStr) ||
      bio.includes(queryStr) ||
      skills.some((skill: string) => skill.includes(queryStr))
    );
  });

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 font-headline text-primary">Alumni Directory</h1>
          <p className="text-muted-foreground">Connect with graduates by name, role, or technical expertise.</p>
        </div>
        <div className="flex w-full md:w-auto gap-2">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              className="pl-9 bg-card" 
              placeholder="Search name or skill (e.g. React)..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" /> Filter
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading directory...</p>
        </div>
      ) : filteredUsers && filteredUsers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((person) => (
            <Card key={person.id} className="flex flex-col border-none shadow-sm hover:shadow-md transition-shadow group overflow-hidden">
              <CardHeader className="flex flex-row items-center gap-4 space-y-0 cursor-pointer" onClick={() => { setSelectedUserId(person.id); setIsProfileModalOpen(true); }}>
                <button className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-muted transition-colors group-hover:border-primary bg-primary/5 flex items-center justify-center flex-shrink-0 hover:border-primary">
                  {person.photoURL ? (
                    <Image 
                      src={person.photoURL} 
                      alt={`${person.firstName} ${person.lastName}`} 
                      width={64}
                      height={64}
                      priority
                      className="object-cover w-full h-full" 
                      onError={(result) => {
                        console.error('Image failed to load:', result);
                      }}
                    />
                  ) : person.image ? (
                    <Image 
                      src={person.image} 
                      alt={`${person.firstName} ${person.lastName}`} 
                      width={64}
                      height={64}
                      className="object-cover w-full h-full" 
                      data-ai-hint="portrait"
                      onError={(result) => {
                        console.error('Image failed to load:', result);
                      }}
                    />
                  ) : (
                    <User className="h-8 w-8 text-primary/40" />
                  )}
                </button>
                <div className="flex-1">
                  <button onClick={() => { setSelectedUserId(person.id); setIsProfileModalOpen(true); }} className="text-lg font-bold hover:text-primary transition-colors text-left">
                    {person.firstName} {person.lastName}
                  </button>
                  <p className="text-xs font-semibold text-secondary uppercase tracking-wider">{person.role === 'alumni' ? 'Alumni' : person.role}</p>
                  {person.fieldOfWorking && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{person.fieldOfWorking}</p>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {person.bio || "No bio available for this alumni member yet."}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(person.skills || ["Mentorship"]).map((skill: string) => (
                    <Badge key={skill} variant="secondary" className="bg-muted/50 text-[10px] py-0">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="border-t bg-muted/20 pt-4 flex justify-between">
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                    <Linkedin className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                    <Mail className="h-4 w-4" />
                  </Button>
                </div>
                <Button size="sm" variant="default" className="bg-primary" asChild>
                  <Link href={`/messages?recipientId=${person.id}`}>
                    <MessageSquare className="mr-2 h-3.5 w-3.5" /> Message
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-muted/10 rounded-xl border border-dashed">
          <p className="text-muted-foreground">No alumni found matching your criteria.</p>
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
