"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { GraduationCap, Briefcase, Users, MessageSquare, User, ShieldAlert, ShieldCheck, Menu, X, LayoutDashboard } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { doc } from 'firebase/firestore'
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useGlobalUnreadMessages } from "@/hooks/useGlobalUnreadMessages"

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

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userData } = useDoc(userDocRef);

  // Check for global unread messages
  const { hasUnread: hasGlobalUnread } = useGlobalUnreadMessages(user?.uid || null);

  // Block navigation for unverified users
  const isVerified = !user || user.emailVerified;

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6 -ml-2">
            <Image
              src="/vivekanand-logo.png"
              alt="Vivekanand Education Society Logo"
              width={80}
              height={80}
              priority
              className="h-auto w-auto"
            />
            <Link href="/" className="flex items-center gap-2 group">
              <div className="bg-primary p-2 rounded-lg transition-transform group-hover:scale-110">
                <GraduationCap className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-headline font-bold text-primary tracking-tight">AlumniConnect</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-1">
            {isVerified && userData?.role !== 'admin' && navItems.map((item) => {
              const Icon = item.icon
              const isMessages = item.name === "Messages"
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all hover:bg-muted relative",
                    pathname === item.href
                      ? "text-primary bg-primary/5"
                      : "text-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                  {/* Show red dot for Messages if there are unread messages */}
                  {isMessages && hasGlobalUnread && (
                    <div className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                </Link>
              )
            })}
            {/* Admin link — only visible to verified admins */}
            {isVerified && userData?.role === 'admin' && (
              <Link
                href="/admin"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all relative",
                  pathname === '/admin'
                    ? "text-red-600 bg-red-50"
                    : "text-red-500 hover:bg-red-50 hover:text-red-600"
                )}
              >
                <LayoutDashboard className="h-4 w-4" />
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
                  {isVerified && userData?.role !== 'admin' && navItems.map((item) => {
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
                  {isVerified && userData?.role === 'admin' && (
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

          <div className="flex items-center gap-2 md:gap-4">
            {isUserLoading ? (
              <div className="h-9 w-20 md:w-24 bg-muted animate-pulse rounded-md" />
            ) : user ? (
              <>
                {/* Email Verification Badge */}
                {!user.emailVerified && (
                  <Link
                    href="/verify-email"
                    className="hidden sm:flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 px-2 md:px-3 py-1.5 rounded-full transition-colors border border-yellow-200 dark:border-yellow-800"
                  >
                    <ShieldAlert className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                    <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400 hidden md:inline-block">Verify Email</span>
                  </Link>
                )}

                {user.emailVerified && (
                  <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <ShieldCheck className="h-3.5 w-3.5 text-green-600 dark:text-green-500" />
                    <span className="text-xs font-medium text-green-700 dark:text-green-400 hidden lg:inline-block">Verified</span>
                  </div>
                )}

                {isVerified && (
                  <Link href="/profile" className="flex items-center gap-1 md:gap-2 bg-muted hover:bg-muted/80 p-1.5 md:pr-4 rounded-full transition-colors border">
                    <div className="bg-primary/10 p-1 rounded-full text-primary">
                      <User className="h-4 md:h-5 w-4 md:w-5" />
                    </div>
                    <span className="text-xs md:text-sm font-medium hidden sm:inline-block">My Profile</span>
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
