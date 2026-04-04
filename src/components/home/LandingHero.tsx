"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowRight, GraduationCap, Users, Briefcase } from "lucide-react"

export default function LandingHero() {
  return (
    <section className="relative min-h-[100vh] flex items-center justify-center overflow-hidden bg-mesh">
      {/* Decorative Elements */}
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />

      <div className="container mx-auto px-4 relative z-10 text-center">
        <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white border border-slate-200 shadow-md mb-8 animate-fade-in hover:shadow-lg transition-shadow">
          <div className="bg-white p-1 rounded-sm">
            <Image
              src="/vesit-logo.png"
              alt="VESIT Logo"
              width={160}
              height={160}
              quality={100}
              className="h-10 md:h-12 w-auto object-contain"
            />
          </div>
          <div className="w-[1px] h-8 bg-slate-200 mx-1" />
          <span className="text-[10px] md:text-xs font-bold tracking-widest uppercase text-[#3b5998] pr-2">
            Official Alumni Network of VESIT
          </span>
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-[1.1] animate-fade-up">
          Connecting Generations, <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/80 to-secondary animate-gradient-shift">
            Building Excellence.
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-10 animate-fade-up" style={{ animationDelay: '0.2s' }}>
          Welcome to the official Alumni-Student Connect Platform of Vivekanand Education Society's Institute of Technology. Bridge the gap between academia and industry.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: '0.4s' }}>
          <Button asChild size="lg" className="rounded-full h-14 px-8 text-base font-bold shadow-xl hover:shadow-primary/20 transition-all group">
            <Link href="/register">
              Join Now <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full h-14 px-8 text-base font-bold bg-white/50 backdrop-blur-md border-primary/20 text-primary hover:bg-primary hover:text-white transition-all shadow-sm hover:shadow-md">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>

        {/* Stats Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-4xl mx-auto animate-fade-up" style={{ animationDelay: '0.6s' }}>
          <div className="p-6 rounded-2xl bg-white/40 backdrop-blur-lg border border-white/40 shadow-sm flex items-center gap-4 text-left">
            <div className="bg-primary/10 p-3 rounded-xl text-primary">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">5000+</p>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest leading-none">Verified Alumni</p>
            </div>
          </div>
          <div className="p-6 rounded-2xl bg-white/40 backdrop-blur-lg border border-white/40 shadow-sm flex items-center gap-4 text-left">
            <div className="bg-secondary/10 p-3 rounded-xl text-secondary">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">1200+</p>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest leading-none">Open Careers</p>
            </div>
          </div>
          <div className="p-6 rounded-2xl bg-white/40 backdrop-blur-lg border border-white/40 shadow-sm flex items-center gap-4 text-left">
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
