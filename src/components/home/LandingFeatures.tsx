"use client"

import { Briefcase, GraduationCap, Users, MessageSquareQuote, Search, ShieldCheck } from "lucide-react"

const features = [
  {
    title: "Verified Alumni Network",
    description: "Connect with graduates who are currently working at top companies globally. Every profile is verified.",
    icon: ShieldCheck,
    color: "bg-blue-500/10 text-blue-600"
  },
  {
    title: "Exclusive Job Postings",
    description: "Get access to internships and job roles posted directly by alumni within their companies.",
    icon: Briefcase,
    color: "bg-teal-500/10 text-teal-600"
  },
  {
    title: "1-on-1 Mentorship",
    description: "Schedule sessions with experienced mentors to guide you through your career journey.",
    icon: GraduationCap,
    color: "bg-amber-500/10 text-amber-600"
  },
  {
    title: "Active Discussions",
    description: "Join threads on the latest industry trends, tech stacks, and interview preparation.",
    icon: MessageSquareQuote,
    color: "bg-rose-500/10 text-rose-600"
  },
  {
    title: "Smart Directory",
    description: "Find alumni by skills, industry, or graduation year with our advanced search filters.",
    icon: Search,
    color: "bg-indigo-500/10 text-indigo-600"
  },
  {
    title: "Community Wisdom",
    description: "Browse a feed of insights and advice curated from the most active community members.",
    icon: Users,
    color: "bg-violet-500/10 text-violet-600"
  }
]

export default function LandingFeatures() {
  return (
    <section className="py-24 bg-white">
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
              className="p-8 rounded-3xl border border-muted bg-neutral-50/50 hover:bg-white hover:shadow-xl hover:shadow-neutral-200/50 transition-all group animate-fade-up"
              style={{ animationDelay: `${0.1 * index}s` }}
            >
              <div className={`p-4 rounded-2xl w-fit mb-6 transition-transform group-hover:scale-110 ${feature.color}`}>
                <feature.icon className="h-6 w-6" />
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
