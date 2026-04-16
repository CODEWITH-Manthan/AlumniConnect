'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { User, Mail, MessageSquare, Linkedin, Loader2, Code, Briefcase, BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserProfileModalProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function UserProfileModal({ userId, open, onOpenChange }: UserProfileModalProps) {
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return doc(firestore, 'users', userId);
  }, [firestore, userId]);

  const { data: userData, isLoading } = useDoc(userDocRef);

  const role = userData?.role || 'student';
  const fullName = userData ? `${userData.firstName} ${userData.lastName}` : 'User';
  const userSkills = userData?.skills || [];
  
  const isProfileAvailable = userData && !(role === 'alumni' && !userData.isVerifiedAlumni);

  if (!open || !userId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">{fullName}'s Profile</DialogTitle>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        ) : isProfileAvailable ? (
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="flex flex-col items-center text-center space-y-3">
            <div className="relative h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-primary border-4 border-background shadow-lg overflow-hidden shrink-0">
                {userData?.photoURL ? (
                  <Image
                    src={userData.photoURL}
                    alt={fullName}
                    width={96}
                    height={96}
                    priority
                    className="object-cover w-full h-full"
                    onError={(result) => {
                      console.error('Image failed to load:', result);
                    }}
                  />
                ) : (
                  <User className="h-12 w-12" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold font-headline flex items-center justify-center gap-2">
                  {fullName}
                  {userData?.emailVerified && <BadgeCheck className="h-5 w-5 text-blue-500" title="Verified" />}
                </h2>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <Badge className={cn(
                    "uppercase text-[10px] tracking-widest",
                    role === 'alumni' ? "bg-secondary" : "bg-primary"
                  )}>
                    {role === 'alumni' ? 'ALUMNI' : role}
                  </Badge>
                  {userData?.major && userData?.gdy && (
                    <span className="text-sm text-muted-foreground font-medium">{userData.major} • Class of {userData.gdy}</span>
                  )}
                  {userData?.fieldOfWorking && (
                    <span className="text-sm text-muted-foreground font-medium">{userData.fieldOfWorking}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Bio */}
            {userData?.bio && (
              <div>
                <h3 className="font-semibold text-sm mb-2">Bio</h3>
                <p className="text-sm text-muted-foreground">{userData.bio}</p>
              </div>
            )}

            {/* Expertise */}
            {userSkills.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Code className="h-4 w-4 text-secondary" />
                  <h3 className="font-semibold text-sm">Expertise</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {userSkills.map((skill: string) => (
                    <Badge key={skill} variant="secondary" className="bg-muted text-xs py-1">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Career Interests */}
            {(userData?.careerInterests || []).length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="h-4 w-4 text-primary dark:text-accent" />
                <h3 className="font-semibold text-sm">Career Interests</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {(userData?.careerInterests || []).map((i: string) => (
                  <Badge key={i} className="bg-teal-500/10 text-teal-600 border-none text-xs py-1">
                    {i}
                  </Badge>
                ))}
              </div>
            </div>
            )}

            {/* Contact Information */}
            {userData?.email && (
              <div className="pt-4 border-t">
                <h3 className="font-semibold text-sm mb-3">Contact</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{userData.email}</span>
                  </div>
                  {userData?.linkedinUrl ? (
                    <a href={userData.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <Linkedin className="h-4 w-4" />
                      <span>LinkedIn Profile</span>
                    </a>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground opacity-50">
                      <Linkedin className="h-4 w-4" />
                      <span>Not connected</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 border-t flex gap-2">
              <Button variant="outline" className="flex-1 rounded-full" asChild>
                <a href={`mailto:${userData?.email}`}>
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </a>
              </Button>
              <Button className="flex-1 rounded-full" asChild>
                <Link href={`/messages?recipientId=${userId}`}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Message
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-muted-foreground">User profile not found.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
