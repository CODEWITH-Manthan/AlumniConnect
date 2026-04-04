'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { incrementStat } from '@/lib/stats';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { GraduationCap, Briefcase, User, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    department: '',
    gdy: '',
    role: 'student' as 'student' | 'alumni',
    skills: '' as string,
    careerInterests: '' as string,
    jobTitle: '' as string,
    fieldOfWorking: '' as string,
  });
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // VES email restriction for students
    if (formData.role === 'student' && !formData.email.toLowerCase().endsWith('@ves.ac.in')) {
      toast({
        variant: "destructive",
        title: "Invalid email domain",
        description: "Students must register with a @ves.ac.in email address.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      const user = userCredential.user;

      // Create user profile in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        id: user.uid,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: formData.role,
        department: formData.department,
        graduationYear: formData.gdy,
        skills: formData.skills ? formData.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
        careerInterests: formData.role === 'student' && formData.careerInterests ? formData.careerInterests.split(',').map(s => s.trim()).filter(Boolean) : [],
        jobTitle: formData.role === 'alumni' ? formData.jobTitle.trim() : '',
        fieldOfWorking: formData.role === 'alumni' ? formData.fieldOfWorking.trim() : '',
        createdAt: new Date().toISOString()
      });

      // Increment alumni counter (only for mentor/alumni role)
      if (formData.role === 'alumni') {
        incrementStat(db, { alumniCount: 1 });
      }

      // Send email verification - always redirect to verification page
      let emailSentSuccessfully = false;
      try {
        await sendEmailVerification(user, {
          url: `${window.location.origin}/`,
          handleCodeInApp: false,
        });
        emailSentSuccessfully = true;
      } catch (verifyError: any) {
        console.error('Error sending verification email:', verifyError);
      }

      // Always redirect to verification page regardless
      toast({
        title: "Account created!",
        description: emailSentSuccessfully
          ? "Please check your email to verify your account."
          : "Account created! Click 'Resend email' on the next page.",
      });

      router.push('/verify-email');
    } catch (error: any) {
      let errorMessage = "An error occurred during registration.";

      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email is already registered. Please sign in.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password should be at least 6 characters.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        variant: "destructive",
        title: "Registration failed",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex w-full items-center justify-center min-h-[calc(100vh-80px)] py-8 md:py-12 px-4 md:px-6">
      <Card className="w-full max-w-lg border-none shadow-xl">
        <CardHeader className="space-y-1 flex flex-col items-center text-center">
          <div className="bg-primary p-3 rounded-2xl mb-4">
            <GraduationCap className="h-6 md:h-8 w-6 md:w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl md:text-2xl font-bold font-headline">Create an account</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Join the network and start connecting
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4 md:space-y-6">
            <div className="space-y-3">
              <Label className="text-sm md:text-base">I am a...</Label>
              <RadioGroup
                defaultValue="student"
                className="grid grid-cols-2 gap-2 md:gap-4"
                onValueChange={(val) => setFormData({ ...formData, role: val as any })}
              >
                <div>
                  <RadioGroupItem
                    value="student"
                    id="student"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="student"
                    className={cn(
                      "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all",
                      formData.role === 'student' && "border-primary bg-primary/5"
                    )}
                  >
                    <User className="mb-3 h-6 w-6" />
                    <span className="font-bold">Student</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="alumni"
                    id="alumni"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="alumni"
                    className={cn(
                      "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all",
                      formData.role === 'alumni' && "border-primary bg-primary/5"
                    )}
                  >
                    <Briefcase className="mb-3 h-6 w-6" />
                    <span className="font-bold">Alumni</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-xs md:text-sm">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  required
                  className="h-8 md:h-10 text-xs md:text-sm"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-xs md:text-sm">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  required
                  className="h-8 md:h-10 text-xs md:text-sm"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs md:text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder={formData.role === 'student' ? "you@ves.ac.in" : "m@example.com"}
                required
                className="h-8 md:h-10 text-xs md:text-sm"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs md:text-sm">Password</Label>
              <Input
                id="password"
                type="password"
                required
                className="h-8 md:h-10 text-xs md:text-sm"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department" className="text-xs md:text-sm">Department</Label>
              <Input
                id="department"
                placeholder="CMPN, IT, AIDS, ECS, EXTC, ETRX, AURO"
                required
                className="h-8 md:h-10 text-xs md:text-sm"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gdy" className="text-xs md:text-sm">Graduation Year</Label>
              <Input
                id="gdy"
                placeholder="2024,2025..."
                required
                className="h-8 md:h-10 text-xs md:text-sm"
                value={formData.gdy}
                onChange={(e) => setFormData({ ...formData, gdy: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="skills" className="text-xs md:text-sm">Skills <span className="text-muted-foreground font-normal">(comma separated)</span></Label>
              <Input
                id="skills"
                placeholder="e.g. React, Python, Machine Learning"
                className="h-8 md:h-10 text-xs md:text-sm"
                value={formData.skills}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
              />
            </div>

            {formData.role === 'student' && (
              <div className="space-y-2">
                <Label htmlFor="careerInterests" className="text-xs md:text-sm">Career Interests <span className="text-muted-foreground font-normal">(comma separated)</span></Label>
                <Input
                  id="careerInterests"
                  placeholder="e.g. AI/ML, FinTech, Open Source, DevOps"
                  className="h-8 md:h-10 text-xs md:text-sm"
                  value={formData.careerInterests}
                  onChange={(e) => setFormData({ ...formData, careerInterests: e.target.value })}
                />
              </div>
            )}

            {formData.role === 'alumni' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="jobTitle" className="text-xs md:text-sm">Job Title</Label>
                  <Input
                    id="jobTitle"
                    placeholder="e.g. Software Engineer"
                    required={formData.role === 'alumni'}
                    className="h-8 md:h-10 text-xs md:text-sm"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fieldOfWorking" className="text-xs md:text-sm">Field of Working / Company</Label>
                  <Input
                    id="fieldOfWorking"
                    placeholder="e.g. Software Engineering at Google"
                    required={formData.role === 'alumni'}
                    className="h-8 md:h-10 text-xs md:text-sm"
                    value={formData.fieldOfWorking}
                    onChange={(e) => setFormData({ ...formData, fieldOfWorking: e.target.value })}
                  />
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full h-8 md:h-10 text-xs md:text-sm font-semibold" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
            <div className="text-center text-xs md:text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-semibold hover:underline">
                Sign in
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
