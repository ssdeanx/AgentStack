"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { Route } from "next"
import { Button } from "@/ui/button"
import { Input } from "@/ui/input"
import { Label } from "@/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/ui/card"
import { Separator } from "@/ui/separator"
import { Activity, Github, Mail, Loader2 } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const getNextPath = () => {
    if (typeof window === "undefined") {return "/admin" as Route}
    const params = new URLSearchParams(window.location.search)
    const next = params.get("next")?.trim()
    if (next?.startsWith("/") === true) {
      return next as Route
    }
    return "/admin" as Route
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Stub: simulate login delay then redirect to dashboard
    await new Promise((resolve) => setTimeout(resolve, 1000))
    router.push(getNextPath())
  }

  const handleSocialLogin = async () => {
    setIsLoading(true)

    // Stub: simulate social login then redirect to dashboard
    await new Promise((resolve) => setTimeout(resolve, 800))
    router.push(getNextPath())
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-background to-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo & Title */}
        <div className="flex flex-col items-center space-y-2 text-center">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary shadow-lg transition-transform group-hover:scale-105">
              <Activity className="size-6 text-primary-foreground" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold">Welcome to AgentStack</h1>
          <p className="text-muted-foreground text-sm">
            Sign in to access the Mastra Admin Dashboard
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-border/50 shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Sign in</CardTitle>
            <CardDescription>
              Choose your preferred sign-in method
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Social Login Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleSocialLogin()}
                disabled={isLoading}
              >
                <Github className="mr-2 h-4 w-4" />
                GitHub
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleSocialLogin()}
                disabled={isLoading}
              >
                <Mail className="mr-2 h-4 w-4" />
                Google
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="#"
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 pt-0">
            <div className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="#"
                className="text-primary hover:underline font-medium"
              >
                Sign up
              </Link>
            </div>
          </CardFooter>
        </Card>

        {/* Dev Notice */}
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-center">
          <p className="text-xs text-amber-600 dark:text-amber-400">
            <strong>Development Mode:</strong> This is a stub login page.
            Click any button to proceed to the dashboard.
          </p>
        </div>

        {/* Footer Links */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  )
}
