
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { User, GraduationCap, Code, Briefcase, Edit2, LogOut, Loader2, Save, X, Plus, Bookmark, MapPin, ArrowRight, Camera, ShieldAlert, CheckCircle, Moon, Sun, Monitor, Settings } from "lucide-react"
import { useUser, useDoc, useFirestore, useMemoFirebase, useAuth, useCollection } from '@/firebase';
import { doc, collection, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { cn } from "@/lib/utils";
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from '@/components/ThemeProvider';

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [newCareerInterest, setNewCareerInterest] = useState("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc(userDocRef);

  // Clear photo preview when userData is loaded to show saved photo
  useEffect(() => {
    if (userData?.photoURL) {
      setPhotoPreview(null);
    }
  }, [userData?.photoURL]);

  // Fetch all opportunities to filter bookmarked ones
  const opportunitiesRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'opportunities');
  }, [firestore, user]);
  const { data: allOpportunities } = useCollection(opportunitiesRef);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !firestore) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload an image file.",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please upload an image smaller than 5MB.",
      });
      return;
    }

    try {
      setIsUploadingPhoto(true);

      // Show preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to Firebase Storage
      const storage = getStorage();
      const photoRef = ref(storage, `profile-photos/${user.uid}/${Date.now()}-${file.name}`);
      
      console.log('Uploading file to:', photoRef.fullPath);
      await uploadBytes(photoRef, file);
      console.log('File uploaded successfully');
      
      const photoURL = await getDownloadURL(photoRef);
      console.log('Download URL:', photoURL);

      // Update user profile with photo URL
      if (userDocRef) {
        console.log('Updating Firestore with photoURL:', photoURL);
        await updateDoc(userDocRef, { photoURL });
        console.log('Firestore updated successfully');
      }

      toast({
        title: "Photo uploaded",
        description: "Your profile photo has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "Failed to upload photo.",
      });
    } finally {
      setIsUploadingPhoto(false);
      // Reset file input
      if (e.target) e.target.value = '';
    }
  };

  // Redirect to login if not authenticated (must be before any conditional returns)
  useEffect(() => {
    if (!user && !isUserLoading) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
      router.push('/login');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error signing out",
        description: error.message,
      });
    }
  };

  const handleSaveProfile = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userDocRef) return;

    const formData = new FormData(e.currentTarget);
    const updates: any = {
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      bio: formData.get('bio'),
      department: formData.get('department'),
      graduationYear: formData.get('graduationYear'),
      linkedinUrl: formData.get('linkedinUrl') || '',
    };

    // Include fieldOfWorking for alumni
    if (role === 'alumni') {
      updates.fieldOfWorking = formData.get('fieldOfWorking') || '';
    }

    updateDocumentNonBlocking(userDocRef, updates);

    toast({
      title: "Profile updated",
      description: "Your changes have been saved successfully.",
    });
    setIsEditing(false);
  };

  const handleAddSkill = () => {
    if (!newSkill.trim() || !userDocRef || !userData) return;
    const currentSkills = userData.skills || [];
    if (currentSkills.includes(newSkill.trim())) return;

    updateDocumentNonBlocking(userDocRef, {
      skills: [...currentSkills, newSkill.trim()]
    });
    setNewSkill("");
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    if (!userDocRef || !userData) return;
    const currentSkills = userData.skills || [];
    updateDocumentNonBlocking(userDocRef, {
      skills: currentSkills.filter((s: string) => s !== skillToRemove)
    });
  };

  const handleAddCareerInterest = () => {
    if (!newCareerInterest.trim() || !userDocRef || !userData) return;
    const current = userData.careerInterests || [];
    if (current.includes(newCareerInterest.trim())) return;

    updateDocumentNonBlocking(userDocRef, {
      careerInterests: [...current, newCareerInterest.trim()]
    });
    setNewCareerInterest("");
  };

  const handleRemoveCareerInterest = (interest: string) => {
    if (!userDocRef || !userData) return;
    const current = userData.careerInterests || [];
    updateDocumentNonBlocking(userDocRef, {
      careerInterests: current.filter((i: string) => i !== interest)
    });
  };

  if (isUserLoading || isUserDataLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const role = userData?.role || 'student';
  const isAdmin = role === 'admin';
  const fullName = userData ? `${userData.firstName} ${userData.lastName}` : 'User';
  const userSkills = userData?.skills || [];
  const bookmarkedIds = userData?.bookmarkedOpportunities || [];
  const bookmarkedOpps = allOpportunities?.filter(opp => bookmarkedIds.includes(opp.id)) || [];

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <Tabs defaultValue="overview" className="space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-card/50 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-blue-500/10">
            <div className="flex items-center gap-6">
              <div className="relative h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-primary border-4 border-background shadow-xl overflow-hidden group shrink-0 transition-transform hover:scale-105">
                {photoPreview || userData?.photoURL ? (
                  <Image
                    src={photoPreview || userData?.photoURL || ''}
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
                {isEditing && (
                  <div className="absolute inset-0 bg-black/60 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <label htmlFor="photo-upload" className="cursor-pointer p-2 bg-blue-500 rounded-full hover:bg-blue-600 transition-colors shadow-lg">
                      <Camera className="h-5 w-5 text-white" />
                      <input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                        disabled={isUploadingPhoto}
                      />
                    </label>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl font-bold font-headline tracking-tight">{fullName}</h1>
                <div className="flex items-center gap-2">
                  <Badge className={cn(
                    "uppercase text-[10px] tracking-widest font-black py-0.5 px-2.5",
                    role === 'alumni' ? "bg-blue-500 text-white" : "bg-primary text-primary-foreground"
                  )}>
                    {role === 'alumni' ? 'ALUMNI' : role}
                  </Badge>
                  {!isAdmin && (
                    <span className="text-muted-foreground text-sm font-bold opacity-80">{userData?.department} • Class of {userData?.graduationYear || userData?.gdy}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <Button variant="outline" className="flex-1 md:flex-none rounded-full border-blue-500/20 hover:bg-blue-500/5 hover:text-blue-500 transition-all font-bold" onClick={() => setIsEditing(!isEditing)}>
                <Edit2 className="mr-2 h-4 w-4" /> Edit Profile
              </Button>
              <Button variant="ghost" className="flex-1 md:flex-none rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/5 font-bold transition-all" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </Button>
            </div>
          </div>

          {!isAdmin && (
            <TabsList className="bg-transparent border-b rounded-none w-full justify-start h-auto p-0 space-x-8">
              <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-4 px-0 font-bold text-base">Overview</TabsTrigger>
              <TabsTrigger value="saved" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-4 px-0 font-bold text-base">
                Saved Opportunities <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary dark:text-accent">{bookmarkedOpps.length}</Badge>
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="overview" className="mt-0 space-y-8 animate-in fade-in-50 duration-500">
            {isAdmin ? (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-8">
                   <form onSubmit={handleSaveProfile}>
                     <Card className="border shadow-sm">
                       <CardHeader>
                         <CardTitle className="flex items-center gap-2 font-headline">
                           <User className="h-5 w-5 text-primary dark:text-accent" /> Identity Details
                         </CardTitle>
                         <CardDescription>Manage your administrative identity.</CardDescription>
                       </CardHeader>
                       <CardContent className="space-y-6">
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                           <div className="space-y-2">
                             <Label htmlFor="firstName">First Name</Label>
                             <Input id="firstName" name="firstName" defaultValue={userData?.firstName} disabled={!isEditing} required className="bg-muted/30" suppressHydrationWarning />
                           </div>
                           <div className="space-y-2">
                             <Label htmlFor="lastName">Last Name</Label>
                             <Input id="lastName" name="lastName" defaultValue={userData?.lastName} disabled={!isEditing} required className="bg-muted/30" suppressHydrationWarning />
                           </div>
                         </div>
                         <div className="space-y-2">
                           <Label>Email Address</Label>
                           <Input value={user.email || ""} disabled className="bg-muted/50 text-muted-foreground" />
                         </div>
                       </CardContent>
                       {isEditing && (
                         <CardFooter className="flex justify-end border-t pt-6 bg-muted/10">
                           <Button type="submit" className="bg-primary px-8 rounded-full">
                             <Save className="mr-2 h-4 w-4" /> Save Changes
                           </Button>
                         </CardFooter>
                       )}
                     </Card>
                   </form>
                 </div>
                 
                 <div className="space-y-8">
                   <Card className="border shadow-sm bg-primary/5">
                     <CardHeader>
                       <CardTitle className="text-lg font-headline flex items-center gap-2">
                         <ShieldAlert className="h-5 w-5 text-primary dark:text-accent" /> Security & Access
                       </CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-4">
                       <div className="bg-white dark:bg-black/20 p-4 rounded-xl border border-primary/10">
                         <h4 className="font-bold text-sm mb-1">Administrative Privileges</h4>
                         <p className="text-xs text-muted-foreground mb-3">Your account is granted top-level access to the AlumniConnect framework.</p>
                         <ul className="text-xs space-y-2 font-medium">
                           <li className="flex items-center gap-2 text-blue-600 dark:text-blue-500"><CheckCircle className="h-3 w-3" /> Full user moderation</li>
                           <li className="flex items-center gap-2 text-blue-600 dark:text-blue-500"><CheckCircle className="h-3 w-3" /> Role assignments</li>
                           <li className="flex items-center gap-2 text-blue-600 dark:text-blue-500"><CheckCircle className="h-3 w-3" /> Content lifecycle control</li>
                         </ul>
                       </div>
                       <div className="bg-white dark:bg-black/20 p-4 rounded-xl border border-primary/10">
                         <h4 className="font-bold text-sm mb-1 text-primary dark:text-accent">System Notification</h4>
                         <p className="text-xs text-muted-foreground flex items-center gap-2">
                           Remember to lock your terminal when away. All actions taken by your account are logged and directly affect users.
                         </p>
                       </div>
                     </CardContent>
                   </Card>

                   <Card className="border shadow-sm mt-8">
                     <CardHeader>
                       <CardTitle className="text-lg font-headline flex items-center gap-2">
                         <Settings className="h-5 w-5 text-primary dark:text-accent" /> App Preferences
                       </CardTitle>
                       <CardDescription>Customize your AlumniConnect experience.</CardDescription>
                     </CardHeader>
                     <CardContent>
                       <div className="space-y-4">
                         <div>
                           <Label className="text-base mb-3 block">Theme Preference</Label>
                           <RadioGroup 
                             value={theme} 
                             onValueChange={(val) => setTheme(val as 'light' | 'dark' | 'system')}
                             className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                           >
                             <div>
                               <RadioGroupItem value="light" id="admin-theme-light" className="peer sr-only" />
                               <Label
                                 htmlFor="admin-theme-light"
                                 className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer transition-all"
                               >
                                 <Sun className="mb-3 h-6 w-6" />
                                 Light
                               </Label>
                             </div>
                             <div>
                               <RadioGroupItem value="dark" id="admin-theme-dark" className="peer sr-only" />
                               <Label
                                 htmlFor="admin-theme-dark"
                                 className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer transition-all"
                               >
                                 <Moon className="mb-3 h-6 w-6" />
                                 Dark
                               </Label>
                             </div>
                             <div>
                               <RadioGroupItem value="system" id="admin-theme-system" className="peer sr-only" />
                               <Label
                                 htmlFor="admin-theme-system"
                                 className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer transition-all"
                               >
                                 <Monitor className="mb-3 h-6 w-6" />
                                 System
                               </Label>
                             </div>
                           </RadioGroup>
                         </div>
                       </div>
                     </CardContent>
                   </Card>
                 </div>
               </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-1 space-y-8">
                <Card className="border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-headline flex items-center gap-2">
                      <Code className="h-5 w-5 text-secondary" /> Expertise
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {userSkills.length > 0 ? (
                        userSkills.map((s: string) => (
                          <Badge key={s} variant="secondary" className="bg-muted text-xs flex items-center gap-1 group py-1 px-3">
                            {s}
                            {isEditing && (
                              <button onClick={() => handleRemoveSkill(s)} className="hover:text-destructive">
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No skills listed yet.</p>
                      )}
                    </div>
                    {isEditing && (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a skill..."
                          value={newSkill}
                          onChange={(e) => setNewSkill(e.target.value)}
                          className="h-10 text-sm"
                          onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                          suppressHydrationWarning
                        />
                        <Button size="icon" variant="secondary" onClick={handleAddSkill}>
                          <Plus className="h-5 w-5" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-headline flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-primary dark:text-accent" />
                      {role === 'alumni' ? 'Field of Working' : 'Career Interests'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {role === 'alumni' ? (
                      <>
                        {isEditing ? null : (
                          <p className="text-sm font-medium text-foreground">
                            {userData?.fieldOfWorking || <span className="text-muted-foreground italic">Not specified yet.</span>}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-2">
                          {(userData?.careerInterests || []).length > 0 ? (
                            (userData?.careerInterests || []).map((i: string) => (
                              <Badge key={i} className="bg-primary/10 text-primary border-primary/20 flex items-center gap-1 py-1 px-3 font-bold">
                                {i}
                                {isEditing && (
                                  <button onClick={() => handleRemoveCareerInterest(i)} className="hover:text-destructive transition-colors">
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </Badge>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground italic">No career interests listed yet.</p>
                          )}
                        </div>
                        {isEditing && (
                          <div className="flex gap-2">
                            <Input
                              placeholder="Add an interest..."
                              value={newCareerInterest}
                              onChange={(e) => setNewCareerInterest(e.target.value)}
                              className="h-10 text-sm"
                              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCareerInterest())}
                              suppressHydrationWarning
                            />
                            <Button size="icon" variant="secondary" onClick={handleAddCareerInterest}>
                              <Plus className="h-5 w-5" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="md:col-span-2 space-y-8">
                <form onSubmit={handleSaveProfile}>
                  <Card className="border shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 font-headline">
                        <GraduationCap className="h-5 w-5 text-primary dark:text-accent" /> Personal Information
                      </CardTitle>
                      <CardDescription>Public identity and academic background.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input id="firstName" name="firstName" defaultValue={userData?.firstName} disabled={!isEditing} required className="bg-muted/30" suppressHydrationWarning />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input id="lastName" name="lastName" defaultValue={userData?.lastName} disabled={!isEditing} required className="bg-muted/30" suppressHydrationWarning />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="department">Department</Label>
                          <Input id="department" name="department" defaultValue={userData?.department || ""} disabled={!isEditing} className="bg-muted/30" suppressHydrationWarning />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="graduationYear">Graduation Year</Label>
                          <Input id="graduationYear" name="graduationYear" defaultValue={userData?.graduationYear || userData?.gdy || ""} disabled={!isEditing} className="bg-muted/30" suppressHydrationWarning />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="linkedinUrl">LinkedIn Profile URL</Label>
                        <Input id="linkedinUrl" name="linkedinUrl" defaultValue={userData?.linkedinUrl || ""} disabled={!isEditing} className="bg-muted/30" placeholder="https://linkedin.com/in/username" suppressHydrationWarning />
                      </div>
                      {role === 'alumni' && (
                        <div className="space-y-2">
                          <Label htmlFor="fieldOfWorking">Field of Working</Label>
                          <Input id="fieldOfWorking" name="fieldOfWorking" defaultValue={userData?.fieldOfWorking || ""} disabled={!isEditing} className="bg-muted/30" placeholder="e.g. Software Engineering at Google" suppressHydrationWarning />
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="bio">Professional Bio</Label>
                        <Textarea
                          id="bio"
                          name="bio"
                          defaultValue={userData?.bio || "Tell us about your goals..."}
                          className="min-h-[120px] bg-muted/30"
                          disabled={!isEditing}
                        />
                      </div>
                    </CardContent>
                    {isEditing && (
                      <CardFooter className="flex justify-end border-t pt-6 bg-muted/10">
                        <Button type="submit" className="bg-primary px-8 rounded-full">
                          <Save className="mr-2 h-4 w-4" /> Save Changes
                        </Button>
                      </CardFooter>
                    )}
                  </Card>
                </form>

                <Card className="border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-headline flex items-center gap-2">
                      <Settings className="h-5 w-5 text-primary dark:text-accent" /> App Preferences
                    </CardTitle>
                    <CardDescription>Customize your AlumniConnect experience.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-base mb-3 block">Theme Preference</Label>
                        <RadioGroup 
                          value={theme} 
                          onValueChange={(val) => setTheme(val as 'light' | 'dark' | 'system')}
                          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                        >
                          <div>
                            <RadioGroupItem value="light" id="theme-light" className="peer sr-only" />
                            <Label
                              htmlFor="theme-light"
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer transition-all"
                            >
                              <Sun className="mb-3 h-6 w-6" />
                              Light
                            </Label>
                          </div>
                          <div>
                            <RadioGroupItem value="dark" id="theme-dark" className="peer sr-only" />
                            <Label
                              htmlFor="theme-dark"
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer transition-all"
                            >
                              <Moon className="mb-3 h-6 w-6" />
                              Dark
                            </Label>
                          </div>
                          <div>
                            <RadioGroupItem value="system" id="theme-system" className="peer sr-only" />
                            <Label
                              htmlFor="theme-system"
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer transition-all"
                            >
                              <Monitor className="mb-3 h-6 w-6" />
                              System
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            )}
          </TabsContent>

          {!isAdmin && (
            <TabsContent value="saved" className="mt-0 animate-in slide-in-from-bottom-4 duration-500">
              {bookmarkedOpps.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {bookmarkedOpps.map((opp) => (
                  <Card key={opp.id} className="overflow-hidden border shadow-sm hover:shadow-md transition-all group">
                    <div className="flex flex-col sm:flex-row h-full">
                      <div className="relative w-full sm:w-40 h-32 sm:h-auto">
                        <Image
                          src={opp.image || `https://picsum.photos/seed/${opp.id}/400/300`}
                          alt={opp.title}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-primary/90 text-white text-[9px] uppercase tracking-tighter">{opp.type}</Badge>
                        </div>
                      </div>
                      <div className="flex-1 p-5 flex flex-col justify-between">
                        <div>
                          <h3 className="font-headline font-bold text-lg mb-1 leading-tight">{opp.title}</h3>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                            <span className="font-bold text-primary dark:text-accent">{opp.company}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {opp.location}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-4 pt-4 border-t">
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/5 px-2" onClick={() => {
                            if (!userDocRef) return;
                            const newBookmarks = bookmarkedIds.filter((id: string) => id !== opp.id);
                            updateDocumentNonBlocking(userDocRef, { bookmarkedOpportunities: newBookmarks });
                            toast({ title: "Removed", description: "Opportunity removed from bookmarks." });
                          }}>
                            <X className="mr-1.5 h-3.5 w-3.5" /> Remove
                          </Button>
                          <Button size="sm" variant="default" className="rounded-full h-8 px-4" asChild>
                            <Link href="/">View Feed <ArrowRight className="ml-1.5 h-3 w-3" /></Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-muted/10 rounded-3xl border border-dashed flex flex-col items-center">
                <Bookmark className="h-16 w-16 text-muted-foreground opacity-20 mb-4" />
                <h3 className="text-xl font-bold font-headline">No bookmarks yet</h3>
                <p className="text-muted-foreground max-w-xs mx-auto mt-2">Opportunities you save from the feed will appear here for easy access.</p>
                <Button variant="outline" className="mt-6 rounded-full" asChild>
                  <Link href="/">Browse Opportunities</Link>
                </Button>
              </div>
            )}
          </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}
