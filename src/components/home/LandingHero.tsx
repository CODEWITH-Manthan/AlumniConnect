"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowRight, GraduationCap, Users, Briefcase, Sun, Moon } from "lucide-react"
import { useTheme } from "@/components/ThemeProvider"

export default function LandingHero() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <section className="relative min-h-[100vh] flex items-center justify-center overflow-hidden bg-mesh pt-24 pb-20">
      <div className="absolute top-4 md:top-8 right-4 md:right-8 z-50">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-full bg-white/50 dark:bg-black/20 backdrop-blur-md border-emerald-200 dark:border-white/10 text-emerald-900 dark:text-white shadow-sm hover:bg-white/80 dark:hover:bg-white/10 transition-all hover:scale-105"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-float shadow-[0_0_50px_rgba(16,185,129,0.1)]" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl animate-float-delayed shadow-[0_0_50px_rgba(16,185,129,0.1)]" />

      <div className="container mx-auto px-4 relative z-10 text-center">
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-500/20 mb-8 animate-fade-up shadow-[0_0_20px_rgba(16,185,129,0.05)] backdrop-blur-sm">
          <div className="bg-white/90 dark:bg-white/10 backdrop-blur-md p-1 rounded-xl border border-emerald-500/20 shadow-sm transition-transform hover:scale-105">
            <Image
              src="/vesit-logo.png"
              alt="VESIT Logo"
              width={160}
              height={160}
              quality={100}
              className="h-8 md:h-10 w-auto object-contain"
            />
          </div>
          <div className="w-[1px] h-8 bg-emerald-500/20 mx-1" />
          <span className="text-[10px] md:text-xs font-bold tracking-widest uppercase text-emerald-500/80 pr-2">
            Official Alumni Network of VESIT
          </span>
        </div>

        <div className="flex justify-center mb-6 animate-fade-in group">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <div className="bg-emerald-500 p-1.5 rounded-lg shadow-lg">
              <GraduationCap className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              AlumniConnect
            </span>
          </div>
        </div>

        <div className="relative p-8 md:p-12 rounded-[2.5rem] bg-emerald-50/50 dark:bg-emerald-950/20 backdrop-blur-sm border border-emerald-500/10 shadow-[0_0_100px_rgba(16,185,129,0.08)] animate-fade-up">
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-[1.1]">
            Connecting Generations, <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 animate-gradient-shift">
              Building Excellence.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-10" style={{ animationDelay: '0.2s' }}>
            Welcome to the official Alumni-Student Connect Platform of Vivekanand Education Society's Institute of Technology. Bridge the gap between academia and industry.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4" style={{ animationDelay: '0.4s' }}>
            <Button asChild size="lg" className="rounded-full h-14 px-8 text-base font-bold shadow-xl hover:shadow-emerald-500/20 transition-all group bg-emerald-500 hover:bg-emerald-600 border-none">
              <Link href="/register">
                Join Now <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full h-14 px-8 text-base font-bold bg-white/50 dark:bg-white/5 backdrop-blur-md border-emerald-200 dark:border-white/10 text-emerald-900 dark:text-white hover:bg-emerald-50 dark:hover:bg-white hover:text-emerald-950 dark:hover:text-black transition-all shadow-sm hover:shadow-md">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>

        {/* Stats Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-4xl mx-auto animate-fade-up" style={{ animationDelay: '0.6s' }}>
          <div className="p-6 rounded-2xl bg-white/60 dark:bg-white/[0.03] backdrop-blur-lg border border-emerald-100 dark:border-white/10 shadow-sm flex items-center gap-4 text-left hover:bg-emerald-50 dark:hover:bg-white/[0.05] transition-all">
            <div className="bg-primary/10 p-3 rounded-xl text-primary">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">5000+</p>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest leading-none">Verified Alumni</p>
            </div>
          </div>
          <div className="p-6 rounded-2xl bg-white/60 dark:bg-white/[0.03] backdrop-blur-lg border border-emerald-100 dark:border-white/10 shadow-sm flex items-center gap-4 text-left hover:bg-emerald-50 dark:hover:bg-white/[0.05] transition-all">
            <div className="bg-secondary/10 p-3 rounded-xl text-secondary">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">1200+</p>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest leading-none">Open Careers</p>
            </div>
          </div>
          <div className="p-6 rounded-2xl bg-white/60 dark:bg-white/[0.03] backdrop-blur-lg border border-emerald-100 dark:border-white/10 shadow-sm flex items-center gap-4 text-left hover:bg-emerald-50 dark:hover:bg-white/[0.05] transition-all">
            <div className="bg-accent/10 p-3 rounded-xl text-accent">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">300+</p>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest leading-none">Grad Projects</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
