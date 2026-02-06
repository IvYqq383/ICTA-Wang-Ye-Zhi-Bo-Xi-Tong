import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Radio, Play, MessageCircle, BarChart3, Zap, Users, Clock,
  Shield, ArrowRight, CheckCircle2, MousePointerClick, Bot,
  Globe, ChevronRight, Layers
} from "lucide-react";

const features = [
  {
    icon: Play,
    title: "Vimeo Video Playback",
    desc: "Use pre-recorded Vimeo videos to create a seamless live webinar experience.",
  },
  {
    icon: MessageCircle,
    title: "Simulated Live Chat",
    desc: "Pre-schedule chat messages with fake personas to create authentic audience engagement.",
  },
  {
    icon: MousePointerClick,
    title: "Timed CTA Buttons",
    desc: "Display call-to-action buttons at the perfect moment to drive conversions.",
  },
  {
    icon: BarChart3,
    title: "Polls & Interactions",
    desc: "Trigger polls, tip cards, and Q&A at specific video timestamps.",
  },
  {
    icon: Bot,
    title: "Full Automation",
    desc: "Set it up once. Your webinar runs on autopilot 24/7 with recurring schedules.",
  },
  {
    icon: Globe,
    title: "Embed Anywhere",
    desc: "Embed registration forms and webinar rooms on any website with a simple script.",
  },
];

const steps = [
  { num: "01", title: "Upload Your Video", desc: "Paste your Vimeo URL and configure your webinar settings." },
  { num: "02", title: "Set Up Interactions", desc: "Add chat personas, CTAs, polls, and tip cards timed to your video." },
  { num: "03", title: "Schedule & Share", desc: "Set recurring schedules or on-demand access, then share your registration link." },
];

const plans = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    desc: "Get started with automated webinars",
    features: ["1 Webinar", "Up to 50 registrations", "Basic chat simulation", "Email notifications", "Embed support"],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Professional",
    price: "$49",
    period: "/mo",
    desc: "For growing businesses and marketers",
    features: ["Unlimited Webinars", "Unlimited registrations", "Advanced chat & polls", "CTA buttons & tip cards", "Analytics dashboard", "Webhook integrations", "CSV export", "Priority support"],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "For large teams and organizations",
    features: ["Everything in Pro", "Custom branding", "Dedicated support", "SLA guarantee", "API access", "SSO integration"],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function Landing() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title = "ICTA-WEBINAR - Automated Webinar Platform | Turn Videos Into Live Experiences";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute("content", "Create automated webinars that feel live. Engage your audience with simulated chat, timed CTAs, polls, and more — all running on autopilot with ICTA-WEBINAR.");
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Radio className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight" data-testid="text-brand-name">ICTA-WEBINAR</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground transition-colors" data-testid="link-features">Features</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground transition-colors" data-testid="link-how">How It Works</a>
            <a href="#pricing" className="text-sm text-muted-foreground transition-colors" data-testid="link-pricing">Pricing</a>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setLocation("/admin")} data-testid="button-sign-in">
              Sign In
            </Button>
            <Button onClick={() => setLocation("/admin")} data-testid="button-get-started-nav">
              Get Started
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto px-4 pt-20 pb-24 md:pt-28 md:pb-32 relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6" data-testid="badge-hero">
              <Zap className="w-3 h-3 mr-1" />
              Automated Webinar Platform
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6" data-testid="text-hero-title">
              Turn Pre-Recorded Videos Into{" "}
              <span className="text-primary">Live Webinar</span>{" "}
              Experiences
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed" data-testid="text-hero-desc">
              Create automated webinars that feel live. Engage your audience with simulated chat, 
              timed CTAs, polls, and more — all running on autopilot.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" onClick={() => setLocation("/admin")} data-testid="button-hero-start">
                Start For Free
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })} data-testid="button-hero-demo">
                <Play className="mr-1 h-4 w-4" />
                See How It Works
              </Button>
            </div>

            <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground" data-testid="hero-trust-signals">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> No credit card required</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Free tier available</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Set up in minutes</span>
            </div>
          </div>

          <div className="mt-16 max-w-4xl mx-auto">
            <Card className="overflow-visible">
              <CardContent className="p-0">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-md aspect-video flex items-center justify-center relative">
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400/70" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
                    <div className="w-3 h-3 rounded-full bg-green-400/70" />
                  </div>
                  <div className="text-center px-4">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                      <Play className="w-7 h-7 text-primary" />
                    </div>
                    <p className="text-white/60 text-sm">Your webinar plays here — complete with live chat, CTAs, and polls</p>
                  </div>
                  <div className="absolute right-4 top-12 bottom-4 w-56 bg-white/5 backdrop-blur rounded-md border border-white/10 hidden lg:flex flex-col">
                    <div className="px-3 py-2 border-b border-white/10">
                      <p className="text-white/80 text-xs font-medium">Live Chat</p>
                    </div>
                    <div className="flex-1 p-2 space-y-2 overflow-hidden">
                      {["Great content!", "This is so helpful", "Where can I learn more?"].map((msg, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-5 h-5 rounded-full bg-primary/30 flex-shrink-0 mt-0.5" />
                          <p className="text-white/50 text-[10px] leading-tight">{msg}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <Badge variant="secondary" className="mb-4">
              <Layers className="w-3 h-3 mr-1" />
              Features
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" data-testid="text-features-title">
              Everything You Need to Run Automated Webinars
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A complete toolkit to create, manage, and analyze webinars that convert — without going live.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {features.map((f) => (
              <Card key={f.title} className="hover-elevate" data-testid={`card-feature-${f.title.toLowerCase().replace(/\s+/g, "-")}`}>
                <CardContent className="p-6">
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 md:py-28 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <Badge variant="secondary" className="mb-4">
              <Clock className="w-3 h-3 mr-1" />
              How It Works
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" data-testid="text-how-title">
              Up and Running in 3 Simple Steps
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From setup to your first automated webinar in under 10 minutes.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {steps.map((s) => (
              <div key={s.num} className="text-center" data-testid={`step-${s.num}`}>
                <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold mx-auto mb-5">
                  {s.num}
                </div>
                <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-5">
            <Badge variant="secondary" className="mb-4">
              <Shield className="w-3 h-3 mr-1" />
              Built for Scale
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" data-testid="text-trust-title">
              Trusted by Marketers & Educators
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto text-center mt-10">
            {[
              { value: "10K+", label: "Webinars hosted" },
              { value: "500K+", label: "Attendees served" },
              { value: "99.9%", label: "Uptime" },
              { value: "24/7", label: "Automation" },
            ].map((stat) => (
              <div key={stat.label} data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}>
                <p className="text-3xl md:text-4xl font-bold text-primary mb-1">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 md:py-28 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <Badge variant="secondary" className="mb-4">
              <Users className="w-3 h-3 mr-1" />
              Pricing
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" data-testid="text-pricing-title">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Start free and scale as you grow. No hidden fees.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto items-start">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={plan.popular ? "border-primary relative" : ""}
                data-testid={`card-plan-${plan.name.toLowerCase()}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge>Most Popular</Badge>
                  </div>
                )}
                <CardContent className={`p-6 ${plan.popular ? "pt-8" : ""}`}>
                  <h3 className="font-semibold text-lg mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{plan.desc}</p>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                  </div>
                  <Button
                    className="w-full mb-6"
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => setLocation("/admin")}
                    data-testid={`button-plan-${plan.name.toLowerCase()}`}
                  >
                    {plan.cta}
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                  <ul className="space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <Card className="max-w-3xl mx-auto overflow-visible">
            <CardContent className="p-8 md:p-12 text-center">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4" data-testid="text-cta-title">
                Ready to Automate Your Webinars?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                Join thousands of marketers and educators who use ICTA-WEBINAR to run engaging, 
                automated webinars around the clock.
              </p>
              <Button size="lg" onClick={() => setLocation("/admin")} data-testid="button-cta-final">
                Create Your First Webinar
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <Radio className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold">ICTA-WEBINAR</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} ICTA-WEBINAR. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
