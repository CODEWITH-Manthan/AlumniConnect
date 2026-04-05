"use client"

import Link from 'next/link'
import { GraduationCap, Briefcase, Users, MessageSquare, BookOpen, ExternalLink, Heart } from 'lucide-react'
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { doc } from 'firebase/firestore'

const quickLinks = [
  { name: 'Opportunities', href: '/', icon: Briefcase },
  { name: 'Directory', href: '/directory', icon: Users },
  { name: 'Guidance', href: '/guidance', icon: BookOpen },
  { name: 'Messages', href: '/messages', icon: MessageSquare },
]

const accountLinks = [
  { name: 'Sign In', href: '/login' },
  { name: 'Join Now', href: '/register' },
  { name: 'My Profile', href: '/profile' },
  { name: 'Verify Email', href: '/verify-email' },
]

export default function Footer() {
  const currentYear = new Date().getFullYear()
  const { user } = useUser()
  const firestore = useFirestore()

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userData } = useDoc(userDocRef);

  const isAdmin = userData?.role === 'admin';

  // Standalone Footer for Landing Page (Guests)
  if (!user) {
    return (
      <footer className="py-10 bg-card border-t items-center justify-center flex flex-col text-center">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
          © {currentYear} AlumniConnect · Vivekanand Education Society Institute of Technology.
        </p>
      </footer>
    );
  }

  return (
    <footer className="relative mt-auto border-t border-emerald-500/20 bg-black text-primary-foreground overflow-hidden">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-24 -left-16 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl opacity-40 shadow-[0_0_50px_rgba(16,185,129,0.1)]" />
      <div className="pointer-events-none absolute -bottom-16 right-0 w-64 h-64 rounded-full bg-emerald-600/10 blur-3xl opacity-30 shadow-[0_0_50px_rgba(16,185,129,0.1)]" />

      <div className="relative container mx-auto px-4 pt-14 pb-8">
        {/* Main grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

          {/* Brand column */}
          <div className="lg:col-span-1 space-y-4">
            <Link href="/" className="flex items-center gap-2.5 group w-fit">
              <div className="bg-emerald-500 p-2 rounded-lg transition-transform group-hover:scale-110 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-headline font-bold tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                AlumniConnect
              </span>
            </Link>
            <p className="text-sm text-white/60 leading-relaxed max-w-xs">
              Bridging the gap between students and alumni at{' '}
              <span className="text-white/80 font-medium">
                Vivekanand Education Society Institute of Technology
              </span>
              .
            </p>
            {/* VESIT link */}
            <a
              href="https://vesit.ves.ac.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-500 hover:text-emerald-400 transition-colors"
            >
              Visit VESIT <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Quick Links */}
          {!isAdmin && (
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-white/40">
                Platform
              </h3>
              <ul className="space-y-2.5">
                {quickLinks.map(({ name, href, icon: Icon }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors group"
                    >
                      <Icon className="h-3.5 w-3.5 text-secondary opacity-70 group-hover:opacity-100 transition-opacity" />
                      {name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Account */}
          {!isAdmin && (
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-white/40">
                Account
              </h3>
              <ul className="space-y-2.5">
                {accountLinks.map(({ name, href }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-white/60 hover:text-white transition-colors"
                    >
                      {name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* About */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-white/40">
              About
            </h3>
            <ul className="space-y-2.5 text-sm text-white/60">
              <li>
                <span className="font-semibold text-white/80">Vivekanand Education Society</span>
              </li>
              <li>Chembur, Mumbai — 400 071</li>
              <li>Maharashtra, India</li>
              <li className="pt-1">
                <a
                  href="mailto:alumni@ves.ac.in"
                  className="hover:text-emerald-400 transition-colors"
                >
                  alumni@ves.ac.in
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-white/10 mb-6" />

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-white/40">
          <p>
            © {currentYear} AlumniConnect · Vivekanand Education Society Institute of Technology.
            All rights reserved.
          </p>
          <p className="flex items-center gap-1">
            Built with <Heart className="h-3 w-3 text-red-400 fill-red-400 mx-0.5" /> for the VESIT community
          </p>
        </div>
      </div>
    </footer>
  )
}
