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
  TimerIcon,
  type LucideIcon,
} from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/logo"
import { ScaleHypeIcon } from "@/components/scalehype-icon"
import { ThemeToggle } from "@/components/theme-toggle"
import { Reveal } from "@/components/reveal"

type Hue = { chip: string; glow: string }

const STEP_HUES: Hue[] = [
  {
    chip: "from-[#00F2FE] to-[#25F4EE]",
    glow: "shadow-[#00F2FE]/30",
  },
  {
    chip: "from-[#8B5CF6] to-[#6366F1]",
    glow: "shadow-[#8B5CF6]/30",
  },
  {
    chip: "from-[#FE2C55] to-[#FF5757]",
    glow: "shadow-[#FE2C55]/30",
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
  { chip: "from-[#00F2FE] to-[#25F4EE]", glow: "shadow-[#00F2FE]/30" },
  { chip: "from-[#8B5CF6] to-[#D946EF]", glow: "shadow-[#8B5CF6]/30" },
  { chip: "from-[#1877F2] to-[#6366F1]", glow: "shadow-[#1877F2]/30" },
  { chip: "from-[#FE2C55] to-[#FF5757]", glow: "shadow-[#FE2C55]/30" },
  { chip: "from-[#25F4EE] to-[#1877F2]", glow: "shadow-[#25F4EE]/30" },
  { chip: "from-[#8B5CF6] to-[#FE2C55]", glow: "shadow-[#FE2C55]/30" },
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
        "rounded-xl border border-border/70 bg-card/60 p-2.5 sm:p-3 text-left backdrop-blur-sm",
        hue
      )}
    >
      <p className="text-[10px] sm:text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg sm:text-xl font-bold text-foreground">{value}</p>
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
    <div className="flex items-center gap-2.5 sm:gap-3 rounded-lg border border-border/60 bg-card/75 px-2.5 sm:px-3 py-2 sm:py-2.5 backdrop-blur-sm">
      <span className={cn("size-2 shrink-0 rounded-full", dot)} />
      <span className="min-w-0 flex-1 truncate text-left text-xs text-foreground/90">
        {title}
      </span>
      <span className="shrink-0 text-[10px] sm:text-[11px] text-muted-foreground">{time}</span>
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
      <span className="glass rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest text-primary uppercase">
        {eyebrow}
      </span>
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {sub ? <p className="text-muted-foreground">{sub}</p> : null}
    </div>
  )
}

function BrandPills() {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
      <span className="rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300">
        TikTok
      </span>
      <span className="rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-1 text-xs font-semibold">
        <span className="bg-gradient-to-r from-[#25F4EE] via-[#1877F2] to-[#FE2C55] bg-clip-text text-transparent">
          Instagram
        </span>
      </span>
      <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
        Facebook
      </span>
    </div>
  )
}

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-40 px-3 sm:px-0">
        <div className="glass mx-auto mt-3 flex w-full max-w-6xl items-center justify-between rounded-2xl px-3.5 py-2.5 sm:px-5">
          <Logo />
          <nav
            aria-label="Landing"
            className="hidden items-center gap-1 md:flex"
          >
            <a
              href="#how"
              className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              How it works
            </a>
            <a
              href="#features"
              className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Features
            </a>
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            <a
              href="/login"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "px-2.5 sm:px-3 text-xs sm:text-sm")}
            >
              Sign in
            </a>
            <a
              href="/login"
              className={cn(
                buttonVariants({ size: "sm" }),
                "btn-hero rounded-lg px-3 sm:px-4 text-xs sm:text-sm"
              )}
            >
              Get started
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-4 pt-12 pb-16 text-center sm:gap-12 sm:px-6 sm:pt-20 sm:pb-24 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:text-left">
        <div className="flex flex-col items-center lg:items-start">
          <Reveal>
            <span className="glass inline-flex items-center gap-2.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-foreground/90">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#FE2C55] opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-[#FE2C55]" />
              </span>
              TikTok → Instagram Reels + Facebook — on autopilot
            </span>
            <BrandPills />
          </Reveal>

          <Reveal delay={100}>
            <h1 className="mt-6 sm:mt-8 max-w-3xl text-4xl leading-[1.1] font-black tracking-tight sm:text-6xl lg:text-7xl">
              Post once.
              <br />
              <span className="text-gradient">Reach everywhere.</span>
            </h1>
          </Reveal>

          <Reveal delay={200}>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground sm:text-xl">
              ScaleHypex watches your TikTok for new videos, downloads them
              watermark-free, publishes them to Instagram Reels and Facebook
              Pages — then auto-replies to the comments.
            </p>
          </Reveal>

          <Reveal delay={300}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
              <a
                href="/login"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "btn-3d h-12 px-8 text-base"
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
        </div>

        {/* App preview mockup */}
        <Reveal delay={250} className="w-full">
          <div className="glass-card card-lift relative rounded-3xl p-2.5 sm:p-3">
            <div className="rounded-2xl border border-border/70 bg-card/80 p-4 sm:p-5 backdrop-blur-md">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-[#FE2C55]/80" />
                <span className="size-2.5 rounded-full bg-[#F58529]/80" />
                <span className="size-2.5 rounded-full bg-[#25F4EE]/80" />
                <span className="ml-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ScaleHypeIcon size={14} variant="badge" />
                  scalehypex — dashboard
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                <MiniStat
                  label="Videos tracked"
                  value="128"
                  hue="from-[#00F2FE]/20 to-[#00F2FE]/5"
                />
                <MiniStat
                  label="Published"
                  value="121"
                  hue="from-[#8B5CF6]/20 to-[#8B5CF6]/5"
                />
                <MiniStat
                  label="Replies sent"
                  value="342"
                  hue="from-[#FE2C55]/20 to-[#FE2C55]/5"
                />
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <FakeRow
                  dot="bg-[#8B5CF6]"
                  title="Video published to Reels + 2 Pages"
                  time="2m ago"
                />
                <FakeRow
                  dot="bg-[#00F2FE]"
                  title="New TikTok detected & downloaded"
                  time="21m ago"
                />
                <FakeRow
                  dot="bg-[#FE2C55]"
                  title="Auto-reply sent · @yourpage"
                  time="1h ago"
                />
              </div>
            </div>
            <div className="glass animate-float absolute -top-4 right-1 sm:-top-5 sm:-right-3 flex items-center gap-2 rounded-xl px-3 py-1.5 sm:py-2 text-xs font-medium shadow-xl shadow-[#25F4EE]/25">
              <RocketIcon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              Reel published
            </div>
            <div className="glass animate-float-slow absolute -bottom-4 left-1 sm:-bottom-5 sm:-left-3 flex items-center gap-2 rounded-xl px-3 py-1.5 sm:py-2 text-xs font-medium shadow-xl shadow-sky-500/25">
              <MessageSquareTextIcon className="size-3.5 text-sky-600 dark:text-sky-400" />
              Comment auto-replied
            </div>
            <div
              className="glass animate-float absolute -top-5 -left-4 hidden items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium shadow-xl shadow-purple-500/25 sm:flex"
              style={{ animationDelay: "-3s" }}
            >
              <DownloadIcon className="size-3.5 text-violet-600 dark:text-violet-400" />
              Watermark removed
            </div>
          </div>
        </Reveal>
      </section>

      {/* Marquee */}
      <section className="marquee glass border-y border-[var(--glass-border)] bg-card/50 py-4">
        <div className="marquee-track items-center">
          {[...MARQUEE, ...MARQUEE].map((item, i) => (
            <span
              key={`${item.label}-${i}`}
              className="mx-5 flex items-center gap-2 text-sm whitespace-nowrap text-muted-foreground"
            >
              <item.icon className="size-4 text-[#FE2C55]" />
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
                <span className="absolute -top-5 -right-2 text-8xl font-black text-foreground/5 select-none">
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
        className="border-t border-[var(--glass-border)] bg-card/40 backdrop-blur-sm"
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
          <div className="glass-card grid grid-cols-1 divide-y divide-border/60 rounded-3xl sm:grid-cols-3 sm:divide-x sm:divide-y-0">
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
            <div className="relative overflow-hidden rounded-[calc(1.5rem-1px)] bg-card px-6 py-16 text-center text-card-foreground">
              <div
                aria-hidden
                className="orb animate-aurora absolute -top-16 left-1/4 size-64"
                style={{ background: "rgb(0 242 254 / 0.25)" }}
              />
              <div
                aria-hidden
                className="orb animate-aurora-slow absolute -bottom-20 right-1/5 size-64"
                style={{ background: "rgb(254 44 85 / 0.25)" }}
              />
              <div className="relative">
                <div className="mx-auto mb-4 flex justify-center">
                  <ScaleHypeIcon size={48} variant="badge" />
                </div>
                <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                  Ready to scale your reach?
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Connect your accounts and let ScaleHypex do the rest.
                </p>
                <a
                  href="/login"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "btn-3d mt-8 inline-flex h-12 px-8 text-base"
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
      <footer className="border-t border-[var(--glass-border)]">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-6 text-xs text-muted-foreground">
          <Logo />
          <span>Not affiliated with TikTok, Instagram, or Meta.</span>
        </div>
      </footer>
    </main>
  )
}
