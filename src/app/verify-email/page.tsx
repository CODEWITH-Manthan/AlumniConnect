'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { sendEmailVerification } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, CheckCircle2, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function VerifyEmailPage() {
    const { user, isUserLoading } = useUser();
    const auth = useAuth();
    const db = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const [isResending, setIsResending] = useState(false);
    const [lastSentTime, setLastSentTime] = useState<number>(0);
    const [cooldownSeconds, setCooldownSeconds] = useState(0);
    const [isCheckingVerification, setIsCheckingVerification] = useState(false);

    // Cooldown timer
    useEffect(() => {
        if (cooldownSeconds > 0) {
            const timer = setTimeout(() => setCooldownSeconds(cooldownSeconds - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldownSeconds]);

    // Check if user is already verified and redirect
    useEffect(() => {
        if (user && user.emailVerified) {
            toast({
                title: "Email verified!",
                description: "Your email has been successfully verified.",
            });
            router.push('/');
        }
    }, [user, router, toast]);

    // If no user, redirect to login
    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/login');
        }
    }, [user, isUserLoading, router]);

    const handleResendEmail = async () => {
        if (!user || cooldownSeconds > 0) return;

        setIsResending(true);
        try {
            await sendEmailVerification(user, {
                url: `${window.location.origin}/`,
                handleCodeInApp: false,
            });

            setLastSentTime(Date.now());
            setCooldownSeconds(60); // 60 second cooldown

            toast({
                title: "Verification email sent!",
                description: "Please check your inbox and spam folder.",
            });
        } catch (error: any) {
            let errorMessage = "Failed to send verification email. Please try again.";

            if (error.code === 'auth/too-many-requests') {
                errorMessage = "Too many requests. Please wait a few minutes before trying again.";
                setCooldownSeconds(120);
            }

            toast({
                variant: "destructive",
                title: "Failed to send email",
                description: errorMessage,
            });
        } finally {
            setIsResending(false);
        }
    };

    const handleCheckVerification = async () => {
        if (!user) return;

        setIsCheckingVerification(true);
        try {
            await user.reload();

            if (user.emailVerified) {
                if (db) {
                    updateDocumentNonBlocking(doc(db, 'users', user.uid), { emailVerified: true });
                }
                toast({
                    title: "Email verified!",
                    description: "Your email has been successfully verified.",
                });
                router.push('/');
            } else {
                toast({
                    title: "Not verified yet",
                    description: "Please click the verification link in your email first.",
                });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to check verification status. Please try again.",
            });
        } finally {
            setIsCheckingVerification(false);
        }
    };

    if (isUserLoading || !user) {
        return (
            <div className="container flex items-center justify-center min-h-[calc(100vh-80px)] py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary dark:text-accent" />
            </div>
        );
    }

    if (user.emailVerified) {
        return null; // Will redirect in useEffect
    }

    return (
        <div className="container flex items-center justify-center min-h-[calc(100vh-80px)] py-12">
            <Card className="w-full max-w-md border-none shadow-xl">
                <CardHeader className="space-y-1 flex flex-col items-center">
                    <div className="bg-primary/10 p-3 rounded-2xl mb-4 relative">
                        <Mail className="h-8 w-8 text-primary dark:text-accent" />
                        <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1">
                            <AlertCircle className="h-4 w-4 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold font-headline text-center">Verify your email</CardTitle>
                    <CardDescription className="text-center">
                        We've sent a verification email to:
                    </CardDescription>
                    <p className="font-semibold text-foreground text-center">{user.email}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-muted/50 p-4 rounded-lg border space-y-2">
                        <p className="text-sm text-muted-foreground">
                            <strong className="text-foreground">Next steps:</strong>
                        </p>
                        <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                            <li>Open the email from AlumniConnect</li>
                            <li>Click the verification link</li>
                            <li>Return here and click "I've verified my email"</li>
                        </ol>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
                        <div className="flex gap-2">
                            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-500 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-800 dark:text-blue-200">
                                <p className="font-semibold mb-1">Can't find the email?</p>
                                <p className="text-xs">Check your <strong>Spam</strong> or <strong>Junk</strong> folder. Search for "noreply@" in your inbox. The email may take a minute to arrive.</p>
                            </div>
                        </div>
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                        Didn't receive the email? Check your spam folder or click below to resend.
                    </p>
                </CardContent>
                <CardFooter className="flex flex-col space-y-2">
                    <Button
                        className="w-full"
                        onClick={handleCheckVerification}
                        disabled={isCheckingVerification}
                    >
                        {isCheckingVerification && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        I've verified my email
                    </Button>

                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleResendEmail}
                        disabled={isResending || cooldownSeconds > 0}
                    >
                        {isResending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        {cooldownSeconds > 0
                            ? `Resend email (${cooldownSeconds}s)`
                            : "Resend verification email"}
                    </Button>


                </CardFooter>
            </Card>
        </div>
    );
}
