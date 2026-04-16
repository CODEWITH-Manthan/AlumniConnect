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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
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
    <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-background shadow-2xl">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex h-16 md:h-20 items-center justify-between gap-2 lg:gap-6">
          <div className="flex items-center gap-3 lg:gap-6">
            <Link href="/" className="shrink-0 flex items-center h-full py-2">
              <div className="bg-white p-1 md:p-1.5 rounded-xl overflow-hidden border border-blue-500/20 shadow-sm transition-transform hover:scale-105">
                <Image
                  src="/vesit-logo.png"
                  alt="VESIT Logo"
                  width={300}
                  height={80}
                  priority
                  className="h-10 md:h-12 lg:h-14 w-auto object-contain"
                />
              </div>
            </Link>
            <Link href="/" className="flex items-center gap-2 group shrink-0">
              <div className="bg-blue-500 p-1.5 rounded-lg transition-all group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(13,59,102,0.4)]">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-headline font-bold text-foreground dark:text-white tracking-tight group-hover:text-blue-500 transition-colors">
                AlumniConnect
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-0.5 flex-1 justify-center overflow-hidden">
            {hasPlatformAccess && userData?.role !== 'admin' && navItems.map((item) => {
              const Icon = item.icon
              const isMessages = item.name === "Messages"
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 px-2 lg:px-4 py-2 rounded-md text-sm lg:text-base font-medium transition-all hover:bg-blue-500/10 relative whitespace-nowrap",
                    pathname === item.href
                      ? "text-blue-400 bg-blue-500/10"
                      : "text-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 lg:h-5 lg:w-5" />
                  {item.name}
                  {/* Show red dot for Messages if there are unread messages */}
                  {isMessages && hasGlobalUnread && (
                    <div className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                </Link>
              )
            })}
            {/* Admin link — only visible to verified admins */}
            {isEmailVerified && userData?.role === 'admin' && (
              <Link
                href="/admin"
                className={cn(
                  "flex items-center gap-1.5 px-2 lg:px-4 py-2 rounded-md text-sm lg:text-base font-medium transition-all relative whitespace-nowrap",
                  pathname === '/admin'
                    ? "text-red-600 bg-red-50"
                    : "text-red-500 hover:bg-red-50 hover:text-red-600"
                )}
              >
                <LayoutDashboard className="h-4 w-4 lg:h-5 lg:w-5" />
                Admin
              </Link>
            )}
          </div>

          <div className="md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <div className="flex flex-col gap-6 py-6">
                  <h2 className="text-lg font-bold font-headline">Menu</h2>
                  {hasPlatformAccess && userData?.role !== 'admin' && navItems.map((item) => {
                    const Icon = item.icon
                    const isMessages = item.name === "Messages"
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-2 py-2 rounded-md text-sm font-medium transition-all relative",
                          pathname === item.href
                            ? "text-primary bg-primary/5"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.name}
                        {/* Show red dot for Messages if there are unread messages */}
                        {isMessages && hasGlobalUnread && (
                          <div className="ml-auto h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                        )}
                      </Link>
                    )
                  })}
                  {/* Admin link — only visible to verified admins */}
                  {isEmailVerified && userData?.role === 'admin' && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-2 py-2 rounded-md text-sm font-medium transition-all",
                        pathname === '/admin'
                          ? "text-red-600 bg-red-50"
                          : "text-red-500 hover:text-red-600 hover:bg-red-50"
                      )}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Admin Panel
                    </Link>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="flex items-center gap-1.5 md:gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full mr-1 lg:mr-2 shrink-0"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-4 w-4 md:h-5 md:w-5" />
              ) : (
                <Moon className="h-4 w-4 md:h-5 md:w-5" />
              )}
            </Button>
            
            {isUserLoading ? (
              <div className="h-8 w-20 md:w-24 bg-muted animate-pulse rounded-md" />
            ) : user ? (
              <>
                {/* Email Verification Badge */}
                {!isEmailVerified && (
                  <Link
                    href="/verify-email"
                    className="hidden sm:flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:bg-yellow-900/30 px-2 md:px-3 py-1.5 rounded-full transition-colors border border-yellow-200 dark:border-yellow-800"
                  >
                    <ShieldAlert className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                    <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400 hidden md:inline-block">Verify Email</span>
                  </Link>
                )}

                {isEmailVerified && !isPendingVerification && (
                  <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-500" />
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-400 hidden lg:inline-block">
                      Verified {userData?.role === 'alumni' ? 'Alumni' : ''}
                    </span>
                  </div>
                )}

                {isPendingVerification && (
                  <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 shadow-sm animate-pulse">
                    <ShieldAlert className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-500" />
                    <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400 hidden lg:inline-block">
                      Pending Approval
                    </span>
                  </div>
                )}

                {isEmailVerified && (
                  <Link href="/profile" className="flex items-center gap-1 md:gap-2 bg-muted hover:bg-muted/80 p-1 md:pr-3 lg:pr-4 rounded-full transition-colors border whitespace-nowrap">
                    <div className="bg-primary/10 p-1 rounded-full text-primary dark:text-accent">
                      <User className="h-4 w-4 md:h-5 md:w-5" />
                    </div>
                    <span className="text-[10px] md:text-xs lg:text-sm font-medium hidden sm:inline-block">My Profile</span>
                  </Link>
                )}
              </>
            ) : (
              <div className="flex items-center gap-1 md:gap-2">
                <Button variant="ghost" asChild className="hidden sm:inline-flex h-9 text-xs md:text-sm">
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild className="h-9 text-xs md:text-sm px-3 md:px-4">
                  <Link href="/register">Join Now</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
