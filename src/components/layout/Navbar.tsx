"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { GraduationCap, Briefcase, Users, MessageSquare, User, ShieldAlert, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { doc } from 'firebase/firestore'
import { Button } from "@/components/ui/button"

const navItems = [
  { name: "Opportunities", href: "/", icon: Briefcase },
  { name: "Directory", href: "/directory", icon: Users },
  { name: "Guidance", href: "/guidance", icon: GraduationCap },
  { name: "Messages", href: "/messages", icon: MessageSquare },
]

export default function Navbar() {
  const pathname = usePathname()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userData } = useDoc(userDocRef);

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="bg-primary p-2 rounded-lg transition-transform group-hover:scale-110">
                <GraduationCap className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-headline font-bold text-primary tracking-tight">AlumniConnect</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all hover:bg-muted",
                    pathname === item.href
                      ? "text-primary bg-primary/5"
                      : "text-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}
          </div>

          <div className="flex items-center gap-4">
            {isUserLoading ? (
              <div className="h-9 w-24 bg-muted animate-pulse rounded-md" />
            ) : user ? (
              <>
                {/* Email Verification Badge */}
                {!user.emailVerified && (
                  <Link
                    href="/verify-email"
                    className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 px-3 py-1.5 rounded-full transition-colors border border-yellow-200 dark:border-yellow-800"
                  >
                    <ShieldAlert className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                    <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400 hidden md:inline-block">Verify Email</span>
                  </Link>
                )}

                {user.emailVerified && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <ShieldCheck className="h-3.5 w-3.5 text-green-600 dark:text-green-500" />
                    <span className="text-xs font-medium text-green-700 dark:text-green-400 hidden lg:inline-block">Verified</span>
                  </div>
                )}

                <Link href="/profile" className="flex items-center gap-2 bg-muted hover:bg-muted/80 p-1.5 pr-4 rounded-full transition-colors border">
                  <div className="bg-primary/10 p-1 rounded-full text-primary">
                    <User className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium hidden sm:inline-block">My Profile</span>
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" asChild className="hidden sm:inline-flex">
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild>
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
