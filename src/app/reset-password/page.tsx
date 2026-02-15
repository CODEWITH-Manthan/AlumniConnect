'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Loader2, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ResetPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const auth = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email.trim()) {
            toast({
                variant: "destructive",
                title: "Email required",
                description: "Please enter your email address.",
            });
            return;
        }

        setIsLoading(true);

        try {
            await sendPasswordResetEmail(auth, email, {
                url: `${window.location.origin}/login`,
                handleCodeInApp: false,
            });

            setEmailSent(true);
            toast({
                title: "Reset email sent!",
                description: "Check your inbox for password reset instructions.",
            });
        } catch (error: any) {
            let errorMessage = "An error occurred. Please try again.";

            if (error.code === 'auth/user-not-found') {
                errorMessage = "No account found with this email address.";
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = "Please enter a valid email address.";
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = "Too many requests. Please try again later.";
            }

            toast({
                variant: "destructive",
                title: "Reset failed",
                description: errorMessage,
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (emailSent) {
        return (
            <div className="container flex items-center justify-center min-h-[calc(100vh-80px)] py-12">
                <Card className="w-full max-w-md border-none shadow-xl">
                    <CardHeader className="space-y-1 flex flex-col items-center">
                        <div className="bg-green-100 p-3 rounded-2xl mb-4">
                            <CheckCircle2 className="h-8 w-8 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl font-bold font-headline">Check your email</CardTitle>
                        <CardDescription className="text-center">
                            We've sent password reset instructions to <span className="font-semibold text-foreground">{email}</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-muted/50 p-4 rounded-lg border space-y-2">
                            <p className="text-sm text-muted-foreground">
                                <strong className="text-foreground">Next steps:</strong>
                            </p>
                            <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                                <li>Open the email from AlumniConnect</li>
                                <li>Click the password reset link</li>
                                <li>Create a new password</li>
                                <li>Sign in with your new password</li>
                            </ol>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                            Didn't receive the email? Check your spam folder or{' '}
                            <button
                                onClick={() => setEmailSent(false)}
                                className="text-primary font-semibold hover:underline"
                            >
                                try again
                            </button>
                        </p>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-2">
                        <Button
                            className="w-full"
                            onClick={() => router.push('/login')}
                        >
                            Return to Sign In
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="container flex items-center justify-center min-h-[calc(100vh-80px)] py-12">
            <Card className="w-full max-w-md border-none shadow-xl">
                <CardHeader className="space-y-1 flex flex-col items-center">
                    <div className="bg-primary p-3 rounded-2xl mb-4">
                        <Mail className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-2xl font-bold font-headline">Reset your password</CardTitle>
                    <CardDescription className="text-center">
                        Enter your email address and we'll send you a link to reset your password
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleResetPassword}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                                autoFocus
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4">
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Send reset link
                        </Button>
                        <div className="flex items-center justify-center gap-2">
                            <Link
                                href="/login"
                                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                            >
                                <ArrowLeft className="h-3 w-3" />
                                Back to Sign In
                            </Link>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
