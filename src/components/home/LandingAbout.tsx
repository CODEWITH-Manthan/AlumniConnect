"use client"

import Image from "next/image"

export default function LandingAbout() {
  return (
    <section className="py-24 bg-neutral-50 overflow-hidden relative">
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2" />
      
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 relative animate-fade-up px-6 pb-6">
            <div className="relative z-20 rounded-3xl overflow-hidden shadow-2xl border-8 border-white">
              <Image 
                src="/vesit-campus.jpg"
                alt="Vivekanand Education Society Institute of Technology Campus"
                width={600}
                height={450}
                className="object-cover h-[450px]"
              />
            </div>
            
            {/* Glass Card Overlay */}
            <div className="absolute -bottom-4 -right-2 z-30 p-8 rounded-3xl bg-white/80 backdrop-blur-xl border border-white/40 shadow-2xl max-w-xs animate-float">
              <p className="text-3xl font-black text-primary mb-2">40+ Years</p>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest leading-tight">
                Legacy of Vivekanand Education Society
              </p>
            </div>

            {/* Decorative Card Behind */}
            <div className="absolute -top-6 -left-6 z-0 w-full h-full border-2 border-primary/20 rounded-3xl opacity-50" />
          </div>

          <div className="flex-1 space-y-8 animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-widest">
              Our Vision
            </div>
            <h2 className="text-3xl md:text-5xl font-black leading-tight">
              Empowering the next <br />
              <span className="text-primary italic">Generation of Innovators.</span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Vivekanand Education Society's Institute of Technology (VESIT) has a rich heritage of producing world-class engineers. AlumniConnect is our initiative to bring our global alumni network back to the campus.
            </p>
            
            <div className="space-y-6 pt-4">
              <div className="flex gap-4">
                <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-lg">Mentorship Beyond Borders</h4>
                  <p className="text-muted-foreground">Connecting students with alumni across 50+ countries for global perspectives.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-lg">Industry Integration</h4>
                  <p className="text-muted-foreground">Aligning our academic curriculum with real-world industry requirements through alumni feedback.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
