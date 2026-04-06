"use client"

import { Briefcase, GraduationCap, Users, MessageSquareQuote, Search, ShieldCheck } from "lucide-react"

const features = [
  {
    title: "Verified Alumni Network",
    description: "Connect with graduates who are currently working at top companies globally. Every profile is verified.",
    icon: ShieldCheck,
  },
  {
    title: "Exclusive Job Postings",
    description: "Get access to internships and job roles posted directly by alumni within their companies.",
    icon: Briefcase,
  },
  {
    title: "1-on-1 Mentorship",
    description: "Schedule sessions with experienced mentors to guide you through your career journey.",
    icon: GraduationCap,
  },
  {
    title: "Active Discussions",
    description: "Join threads on the latest industry trends, tech stacks, and interview preparation.",
    icon: MessageSquareQuote,
  },
  {
    title: "Smart Directory",
    description: "Find alumni by skills, industry, or graduation year with our advanced search filters.",
    icon: Search,
  },
  {
    title: "Community Wisdom",
    description: "Browse a feed of insights and advice curated from the most active community members.",
    icon: Users,
  }
]

export default function LandingFeatures() {
  return (
    <section className="py-24 bg-background transition-colors duration-300">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black mb-6 animate-fade-up">
            Everything you need for <br />
            <span className="text-primary">Career Success.</span>
          </h2>
          <p className="max-w-xl mx-auto text-muted-foreground animate-fade-up" style={{ animationDelay: '0.1s' }}>
            Our platform provides the tools and connections necessary for students to thrive in the professional world.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="group p-8 rounded-3xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-500/10 hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:bg-emerald-100/50 dark:hover:bg-emerald-500/5 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(16,185,129,0.1)]"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 border border-emerald-200 dark:border-emerald-500/20 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all duration-500">
                <feature.icon className="w-7 h-7 text-emerald-500 group-hover:text-white transition-colors duration-500" />
              </div>
              <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
