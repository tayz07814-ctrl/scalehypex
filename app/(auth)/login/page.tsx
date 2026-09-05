"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { createBrowserSupabaseClient } from "@/lib/supabase/browser"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

type Mode = "signin" | "signup"

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = React.useState<Mode>("signin")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [needsEmailConfirm, setNeedsEmailConfirm] = React.useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setNeedsEmailConfirm(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return

    if (!email || !password) {
      toast.error("Enter your email and password.")
      return
    }
    if (mode === "signup" && password !== confirmPassword) {
      toast.error("Passwords do not match.")
      return
    }

    setLoading(true)
    setNeedsEmailConfirm(false)
    const supabase = createBrowserSupabaseClient()

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          toast.error(error.message)
          return
        }
        toast.success("Signed in.")
        router.replace("/dashboard")
        router.refresh()
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) {
          toast.error(error.message)
          return
        }
        if (data.session && data.user) {
          // Email confirmation disabled: a session was issued, go straight in.
          toast.success("Account created.")
          router.replace("/dashboard")
          router.refresh()
        } else {
          setNeedsEmailConfirm(true)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="relative w-full max-w-sm">
        <div
          aria-hidden
          className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-[#00F2FE]/25 via-[#8B5CF6]/30 to-[#FE2C55]/30 blur-2xl"
        />
        <Card className="glass-card card-lift relative w-full rounded-2xl bg-transparent">
          <CardHeader className="items-center text-center">
            <Logo />
            <CardTitle className="text-xl">
              {mode === "signin" ? "Sign in" : "Create your account"}
            </CardTitle>
            <CardDescription>
              {mode === "signin"
                ? "Welcome back to ScaleHypex."
                : "Start auto-posting your TikToks in minutes."}
            </CardDescription>
          </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {mode === "signup" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            )}
            <Button
              type="submit"
              className="btn-hero h-10 w-full rounded-xl text-sm font-semibold"
              disabled={loading}
            >
              {loading
                ? "Please wait…"
                : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
            </Button>
          </form>

          {needsEmailConfirm && (
            <div className="mt-4 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              Check your email — we sent you a confirmation link. Sign in after
              confirming.
            </div>
          )}

          <Separator className="my-4" />

          <p className="text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                  onClick={() => switchMode("signup")}
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                  onClick={() => switchMode("signin")}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
