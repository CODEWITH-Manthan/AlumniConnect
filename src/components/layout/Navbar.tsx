"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { GraduationCap, Briefcase, Users, MessageSquare, User, ShieldAlert, ShieldCheck, Menu, X, LayoutDashboard, Sun, Moon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { doc } from 'firebase/firestore'
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { useGlobalUnreadMessages } from "@/hooks/useGlobalUnreadMessages"
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates'
import { useTheme } from '@/components/ThemeProvider'

const navItems = [
  { name: "Opportunities", href: "/", icon: Briefcase },
  { name: "Directory", href: "/directory", icon: Users },
  { name: "Guidance", href: "/guidance", icon: GraduationCap },
  { name: "Messages", href: "/messages", icon: MessageSquare },
]

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const { resolvedTheme, setTheme } = useTheme();

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userData } = useDoc(userDocRef);

  // Check for global unread messages
  const { hasUnread: hasGlobalUnread } = useGlobalUnreadMessages(user?.uid || null);

  // Core baseline: User must be signed in and email verified.
  const isEmailVerified = !user || user.emailVerified;
  
  // Platform access logic: 
  // - Students get access if email is verified.
  // - Alumni get access only if email is verified AND they are dataset-verified.
  // - Admins get full admin access.
  const hasPlatformAccess = isEmailVerified && (
    !userData || 
    userData.role !== 'alumni' || 
    userData.isVerifiedAlumni === true
  );

  const isPendingVerification = isEmailVerified && userData?.role === 'alumni' && !userData.isVerifiedAlumni;

  // Sync email verified status to Firestore if needed
  useEffect(() => {
    if (user && user.emailVerified && userData && !userData.emailVerified && firestore) {
      updateDocumentNonBlocking(doc(firestore, 'users', user.uid), { emailVerified: true });
    }
  }, [user, userData, firestore]);

  // Hide Navbar for unauthenticated users (Landing Page)
  if (isUserLoading || !user) {
    return null;
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/40 transition-all duration-300">
      <div className="container mx-auto px-2 sm:px-6">
        <div className="flex h-16 md:h-20 items-center justify-between gap-4">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3 lg:gap-5">
            <Link href="/" className="shrink-0 flex items-center h-full py-2 group">
              <div className="bg-white p-1 md:p-1.5 rounded-2xl overflow-hidden border border-border shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:scale-105 group-hover:-rotate-2">
                <Image
                  src="/vesit-logo.png"
                  alt="VESIT Logo"
                  width={300}
                  height={80}
                  priority
                  className="h-10 md:h-11 lg:h-12 w-auto object-contain"
                />
              </div>
            </Link>
            <Link href="/" className="flex items-center gap-2 md:gap-2.5 group shrink-0">
              <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 p-1.5 rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]">
                <GraduationCap className="h-4 w-4 md:h-5 md:w-5 text-white" />
              </div>
              <span className="hidden sm:inline-block text-lg md:text-xl font-headline font-black tracking-tight text-foreground dark:text-white transition-colors duration-300">
                Alumni<span className="text-blue-600 dark:text-blue-400">Connect</span>
              </span>
            </Link>
          </div>

          {/* Core Navigation (Desktop) */}
          <div className="hidden md:flex items-center p-1 bg-muted/40 border border-border/50 rounded-full">
            {hasPlatformAccess && userData?.role !== 'admin' && navItems.map((item) => {
              const Icon = item.icon
              const isMessages = item.name === "Messages"
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 group overflow-hidden",
                    isActive
                      ? "text-primary bg-background shadow-sm border border-border/50"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  <Icon className={cn("h-4 w-4 transition-transform duration-300", isActive ? "scale-110" : "group-hover:scale-110")} />
                  {item.name}
                  {/* Show red dot for Messages if there are unread messages */}
                  {isMessages && hasGlobalUnread && (
                    <div className="absolute top-1.5 right-2 h-2 w-2 bg-red-500 rounded-full animate-bounce shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                  )}
                </Link>
              )
            })}
            
            {/* Admin link — only visible to verified admins */}
            {isEmailVerified && userData?.role === 'admin' && (
              <Link
                href="/admin"
                className={cn(
                  "relative flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-all duration-300 border",
                  pathname === '/admin'
                    ? "text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800/50 shadow-sm"
                    : "text-red-600 bg-red-50/50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/40 border-transparent hover:border-red-200 dark:hover:border-red-800/50"
                )}
              >
                <LayoutDashboard className="h-4 w-4" />
                Admin Console
              </Link>
            )}
          </div>

          {/* Actions & Profiles */}
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full border-border/50 bg-background/50 backdrop-blur-sm hidden sm:flex shrink-0 transition-colors hover:bg-muted"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              <div className="relative flex items-center justify-center h-full w-full">
                {resolvedTheme === 'dark' ? (
                  <Sun className="h-4 w-4 md:h-5 md:w-5 absolute transition-all rotate-0 scale-100" />
                ) : (
                  <Moon className="h-4 w-4 md:h-5 md:w-5 absolute transition-all rotate-0 scale-100" />
                )}
              </div>
            </Button>
            
            {isUserLoading ? (
              <div className="h-10 w-24 bg-muted animate-pulse rounded-full" />
            ) : user ? (
              <div className="flex items-center gap-2">
                {/* Email Verification Badge */}
                {!isEmailVerified && (
                  <Link
                    href="/verify-email"
                    className="hidden sm:flex items-center gap-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 px-3 py-1.5 rounded-full transition-colors border border-yellow-500/20 group"
                  >
                    <ShieldAlert className="h-4 w-4 text-yellow-600 dark:text-yellow-500 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-yellow-700 dark:text-yellow-400 hidden md:inline-block tracking-tight">Verify Email</span>
                  </Link>
                )}

                {isEmailVerified && !isPendingVerification && (
                  <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-sm cursor-default">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 tracking-tight">
                      Verified {userData?.role === 'alumni' ? 'Alumni' : ''}
                    </span>
                  </div>
                )}

                {isPendingVerification && (
                  <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 shadow-sm cursor-default">
                    <div className="relative flex h-3 w-3 items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </div>
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400 tracking-tight">
                      Pending Verification
                    </span>
                  </div>
                )}

                {isEmailVerified && (
                  <Link 
                    href="/profile" 
                    className="flex items-center gap-2.5 bg-primary hover:bg-primary/90 text-primary-foreground p-1.5 pr-4 rounded-full transition-all shadow-md hover:shadow-lg active:scale-95 group border border-primary/20"
                  >
                    <div className="bg-background/20 p-1.5 rounded-full backdrop-blur-sm group-hover:bg-background/30 transition-colors">
                      <User className="h-4 w-4" />
                    </div>
                    <span className="text-xs lg:text-sm font-bold tracking-tight hidden sm:inline-block">My Profile</span>
                  </Link>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 md:gap-3">
                <Button variant="ghost" asChild className="hidden sm:inline-flex h-10 px-4 text-sm font-semibold rounded-full hover:bg-muted">
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild className="h-9 md:h-10 px-4 md:px-5 text-sm font-bold rounded-full shadow-md hover:shadow-lg transition-all active:scale-95">
                  <Link href="/register">Join Platform</Link>
                </Button>
              </div>
            )}

            {/* Mobile Menu */}
            <div className="md:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9 md:h-10 md:w-10 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm">
                    <Menu className="h-5 w-5 text-foreground" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 border-l border-border/50 bg-background/95 backdrop-blur-xl">
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                  <div className="flex flex-col gap-6 py-8">
                    <div className="flex items-center gap-3 pb-4 border-b border-border/50">
                      <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 p-2 rounded-xl shadow-md">
                        <GraduationCap className="h-6 w-6 text-white" />
                      </div>
                      <span className="text-xl font-headline font-black tracking-tight">Navigation</span>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      {hasPlatformAccess && userData?.role !== 'admin' && navItems.map((item) => {
                        const Icon = item.icon
                        const isMessages = item.name === "Messages"
                        const isActive = pathname === item.href
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-all active:scale-95",
                              isActive
                                ? "text-primary bg-primary/10 border border-primary/20 shadow-sm"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                          >
                            <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
                            {item.name}
                            {isMessages && hasGlobalUnread && (
                              <div className="ml-auto h-2.5 w-2.5 bg-red-500 rounded-full animate-pulse shadow-sm" />
                            )}
                          </Link>
                        )
                      })}

                      {isEmailVerified && userData?.role === 'admin' && (
                        <Link
                          href="/admin"
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-xl text-base font-bold transition-all active:scale-95 mt-2 border",
                            pathname === '/admin'
                              ? "text-red-700 bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800/50"
                              : "text-red-600 bg-red-50/50 hover:bg-red-100 dark:bg-red-900/10 border-red-100 dark:border-red-900/30"
                          )}
                        >
                          <LayoutDashboard className="h-5 w-5" />
                          Admin Console
                        </Link>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
