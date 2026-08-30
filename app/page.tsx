import {
  ArrowRightIcon,
  BotIcon,
  ClapperboardIcon,
  DownloadIcon,
  MegaphoneIcon,
  MessageSquareTextIcon,
  Music2Icon,
  RocketIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TimerIcon,
  type LucideIcon,
} from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/logo"
import { Reveal } from "@/components/reveal"

type Hue = { chip: string; glow: string }

const STEP_HUES: Hue[] = [
  {
    chip: "from-cyan-400 to-blue-500",
    glow: "shadow-cyan-500/30",
  },
  {
    chip: "from-rose-500 to-orange-400",
    glow: "shadow-rose-500/30",
  },
  {
    chip: "from-blue-500 to-indigo-500",
    glow: "shadow-blue-500/30",
  },
]

const STEPS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Music2Icon,
    title: "Connect TikTok",
    text: "Link your account with TikTok's official Login Kit. ScaleHypex watches for new videos around the clock.",
  },
  {
    icon: DownloadIcon,
    title: "Watermark-free download",
    text: "Every new video is downloaded clean — no TikTok watermark — and stored ready to publish.",
  },
  {
    icon: RocketIcon,
    title: "Auto-publish + auto-reply",
    text: "Videos go live on Instagram Reels and Facebook Pages with your original caption, and new comments get an instant reply.",
  },
]

const FEATURE_HUES: Hue[] = [
  { chip: "from-cyan-400 to-blue-500", glow: "shadow-cyan-500/30" },
  { chip: "from-rose-500 to-orange-400", glow: "shadow-rose-500/30" },
  { chip: "from-blue-500 to-indigo-500", glow: "shadow-blue-500/30" },
  {
    chip: "from-amber-400 via-[#dd2a7b] to-purple-600",
    glow: "shadow-rose-500/30",
  },
  { chip: "from-emerald-400 to-teal-500", glow: "shadow-emerald-500/30" },
  { chip: "from-rose-400 to-pink-500", glow: "shadow-rose-500/30" },
]

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: DownloadIcon,
    title: "Watermark-free MP4",
    text: "Clean CDN downloads — no TikTok watermark, no re-encoding, ready for Meta's video APIs.",
  },
  {
    icon: ClapperboardIcon,
    title: "Instagram Reels",
    text: "New videos publish as Reels with your original caption, automatically.",
  },
  {
    icon: MegaphoneIcon,
    title: "Facebook Pages",
    text: "The same video lands on every connected Facebook Page at the same time.",
  },
  {
    icon: BotIcon,
    title: "Comment auto-reply",
    text: "New comments on your posts get a friendly reply, with rate limits built in.",
  },
  {
    icon: TimerIcon,
    title: "Always watching",
    text: "A background job checks for new TikToks every 20 minutes — nothing to run, nothing to forget.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Private by default",
    text: "Videos live at random, unguessable URLs. Account tokens never leave the server.",
  },
]

const MARQUEE: { icon: LucideIcon; label: string }[] = [
  { icon: Music2Icon, label: "TikTok detection" },
  { icon: ClapperboardIcon, label: "Instagram Reels" },
  { icon: MegaphoneIcon, label: "Facebook Pages" },
  { icon: DownloadIcon, label: "Watermark-free MP4" },
  { icon: BotIcon, label: "Comment auto-reply" },
  { icon: TimerIcon, label: "24/7 monitoring" },
  { icon: ShieldCheckIcon, label: "Private by default" },
]

function MiniStat({
  label,
  value,
  hue,
}: {
  label: string
  value: string
  hue: string
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-gradient-to-b p-3 text-left",
        hue
      )}
    >
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xl font-bold text-slate-900">{value}</p>
    </div>
  )
}

function FakeRow({
  dot,
  title,
  time,
}: {
  dot: string
  title: string
  time: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white/70 px-3 py-2.5">
      <span className={cn("size-2 shrink-0 rounded-full", dot)} />
      <span className="min-w-0 flex-1 truncate text-left text-xs text-foreground/90">
        {title}
      </span>
      <span className="shrink-0 text-[11px] text-muted-foreground">{time}</span>
    </div>
  )
}

function SectionHeading({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string
  title: React.ReactNode
  sub?: string
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
      <span className="glass rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest text-cyan-600 uppercase">
        {eyebrow}
      </span>
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {sub ? <p className="text-muted-foreground">{sub}</p> : null}
    </div>
  )
}

function BrandPills() {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
      <span className="rounded-full bg-[#25f4ee]/15 px-3 py-1 text-xs font-semibold text-cyan-700">
        TikTok
      </span>
      <span className="rounded-full bg-pink-500/10 px-3 py-1 text-xs font-semibold">
        <span className="bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] bg-clip-text text-transparent">
          Instagram
        </span>
      </span>
      <span className="rounded-full bg-[#1877f2]/15 px-3 py-1 text-xs font-semibold text-blue-700">
        Facebook
      </span>
    </div>
  )
}

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-40">
        <div className="glass mx-auto mt-3 flex w-full max-w-6xl items-center justify-between rounded-2xl px-4 py-2.5 sm:px-5">
          <Logo />
          <nav
            aria-label="Landing"
            className="hidden items-center gap-1 md:flex"
          >
            <a
              href="#how"
              className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground"
            >
              How it works
            </a>
            <a
              href="#features"
              className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground"
            >
              Features
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <a
              href="/login"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Sign in
            </a>
            <a
              href="/login"
              className={cn(
                buttonVariants({ size: "sm" }),
                "btn-hero rounded-lg px-4"
              )}
            >
              Get started
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-6 pt-16 pb-20 text-center sm:pt-24">
        <Reveal>
          <span className="glass inline-flex items-center gap-2.5 rounded-full px-4 py-1.5 text-xs font-medium text-slate-600">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#25f4ee] opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-[#25f4ee]" />
            </span>
            TikTok → Instagram Reels + Facebook — on autopilot
          </span>
          <BrandPills />
        </Reveal>

        <Reveal delay={100}>
          <h1 className="mt-8 max-w-3xl text-5xl leading-[1.05] font-black tracking-tight sm:text-7xl">
            Post once.
            <br />
            <span className="text-gradient">Reach everywhere.</span>
          </h1>
        </Reveal>

        <Reveal delay={200}>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground sm:text-xl">
            ScaleHypex watches your TikTok for new videos, downloads them
            watermark-free, publishes them to Instagram Reels and Facebook Pages
            — then auto-replies to the comments.
          </p>
        </Reveal>

        <Reveal delay={300}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href="/login"
              className={cn(
                buttonVariants({ size: "lg" }),
                "btn-hero h-12 rounded-xl px-8 text-base"
              )}
            >
              Get started free
              <ArrowRightIcon className="size-4" />
            </a>
            <a
              href="#how"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "glass h-12 rounded-xl px-8 text-base"
              )}
            >
              See how it works
            </a>
          </div>
        </Reveal>

        <Reveal delay={400}>
          <p className="mt-8 text-xs tracking-wide text-muted-foreground">
            Watermark-free · Auto-reply bot · Watching 24/7 · No manual
            cross-posting
          </p>
        </Reveal>

        {/* App preview mockup */}
        <Reveal delay={250} className="mt-16 w-full max-w-3xl">
          <div className="glass-card card-lift relative rounded-3xl p-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-rose-500/80" />
                <span className="size-2.5 rounded-full bg-amber-400/80" />
                <span className="size-2.5 rounded-full bg-emerald-400/80" />
                <span className="ml-3 text-xs text-muted-foreground">
                  scalehypex — dashboard
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <MiniStat
                  label="Videos tracked"
                  value="128"
                  hue="from-cyan-500/10 to-cyan-500/5"
                />
                <MiniStat
                  label="Published"
                  value="121"
                  hue="from-emerald-500/10 to-emerald-500/5"
                />
                <MiniStat
                  label="Replies sent"
                  value="342"
                  hue="from-rose-500/10 to-rose-500/5"
                />
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <FakeRow
                  dot="bg-emerald-400"
                  title="Video published to Reels + 2 Pages"
                  time="2m ago"
                />
                <FakeRow
                  dot="bg-cyan-400"
                  title="New TikTok detected & downloaded"
                  time="21m ago"
                />
                <FakeRow
                  dot="bg-rose-400"
                  title="Auto-reply sent · @yourpage"
                  time="1h ago"
                />
              </div>
            </div>
            <div className="glass animate-float absolute -top-5 -right-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium shadow-xl shadow-rose-500/15">
              <RocketIcon className="size-3.5 text-emerald-500" />
              Reel published
            </div>
            <div className="glass animate-float-slow absolute -bottom-5 -left-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium shadow-xl shadow-cyan-500/15">
              <MessageSquareTextIcon className="size-3.5 text-cyan-600" />
              Comment auto-replied
            </div>
            <div
              className="glass animate-float absolute -top-5 -left-4 hidden items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium shadow-xl shadow-blue-500/15 sm:flex"
              style={{ animationDelay: "-3s" }}
            >
              <DownloadIcon className="size-3.5 text-blue-600" />
              Watermark removed
            </div>
          </div>
        </Reveal>
      </section>

      {/* Marquee */}
      <section className="marquee border-y border-slate-200 bg-slate-50/70 py-4">
        <div className="marquee-track items-center">
          {[...MARQUEE, ...MARQUEE].map((item, i) => (
            <span
              key={`${item.label}-${i}`}
              className="mx-5 flex items-center gap-2 text-sm whitespace-nowrap text-muted-foreground"
            >
              <item.icon className="size-4 text-rose-500" />
              {item.label}
            </span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto w-full max-w-6xl px-6 py-24">
        <Reveal>
          <SectionHeading
            eyebrow="How it works"
            title={
              <>
                Three steps.{" "}
                <span className="text-gradient">
                  Zero manual cross-posting.
                </span>
              </>
            }
          />
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 120} className="h-full">
              <div className="glass-card card-lift relative h-full overflow-hidden rounded-2xl p-6">
                <span className="absolute -top-5 -right-2 text-8xl font-black text-slate-200">
                  {i + 1}
                </span>
                <div
                  className={cn(
                    "flex size-11 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg",
                    STEP_HUES[i].chip,
                    STEP_HUES[i].glow
                  )}
                >
                  <step.icon className="size-5 text-white" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {step.text}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="border-t border-slate-200 bg-slate-50/40"
      >
        <div className="mx-auto w-full max-w-6xl px-6 py-24">
          <Reveal>
            <SectionHeading
              eyebrow="Features"
              title={
                <>
                  Everything runs on{" "}
                  <span className="text-gradient">autopilot</span>
                </>
              }
              sub="Connect once. ScaleHypex handles detection, downloads, publishing, and replies from then on."
            />
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, i) => (
              <Reveal key={feature.title} delay={(i % 3) * 100} className="h-full">
                <div className="glass-card card-lift group h-full rounded-2xl p-6">
                  <div
                    className={cn(
                      "flex size-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg transition-transform duration-300 group-hover:scale-110",
                      FEATURE_HUES[i].chip,
                      FEATURE_HUES[i].glow
                    )}
                  >
                    <feature.icon className="size-5 text-white" />
                  </div>
                  <h3 className="mt-4 font-semibold">{feature.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {feature.text}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section className="mx-auto w-full max-w-6xl px-6 pt-24">
        <Reveal>
          <div className="glass-card grid grid-cols-1 divide-y divide-slate-200 rounded-3xl sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              { value: "24/7", label: "Watching for new TikToks" },
              { value: "0", label: "Watermarks, ever" },
              { value: "1 → 3", label: "One post to TikTok, IG & FB" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center gap-1 px-6 py-8 text-center"
              >
                <span className="text-gradient text-4xl font-black tracking-tight">
                  {stat.value}
                </span>
                <span className="text-sm text-muted-foreground">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-6xl px-6 py-24">
        <Reveal>
          <div className="gradient-panel">
            <div className="relative overflow-hidden rounded-[calc(1.5rem-1px)] bg-white px-6 py-16 text-center">
              <div
                aria-hidden
                className="orb animate-aurora absolute -top-16 left-1/4 size-64"
                style={{ background: "rgb(37 244 238 / 0.18)" }}
              />
              <div
                aria-hidden
                className="orb animate-aurora-slow absolute -bottom-20 right-1/5 size-64"
                style={{ background: "rgb(254 44 85 / 0.14)" }}
              />
              <div className="relative">
                <SparklesIcon className="mx-auto size-8 text-rose-500" />
                <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                  Ready to scale your reach?
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Connect your accounts and let ScaleHypex do the rest.
                </p>
                <a
                  href="/login"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "btn-hero mt-8 inline-flex h-12 rounded-xl px-8 text-base"
                  )}
                >
                  Get started — it&apos;s free
                  <ArrowRightIcon className="size-4" />
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-6 text-xs text-muted-foreground">
          <Logo />
          <span>Not affiliated with TikTok, Instagram, or Meta.</span>
        </div>
      </footer>
    </main>
  )
}