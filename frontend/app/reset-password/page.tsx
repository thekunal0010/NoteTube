"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, CheckCircle, Lock, Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { apiPost } from "@/lib/api"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token") || ""

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    setLoading(true)
    try {
      await apiPost("/reset-password", { token, password })
      setDone(true)
      toast.success("Password reset successful")
    } catch (error: any) {
      toast.error(error?.message || "Could not reset password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="relative w-full max-w-md animate-fade-up">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <img src="/logo.png" alt="NoteTube AI" className="w-10 h-10 object-contain" />
            <span className="text-xl font-serif-display font-semibold tracking-tight text-foreground">NoteTube AI</span>
          </Link>
        </div>

        <div className="panel rounded-2xl p-8">
          {!token ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-6">
                This reset link is invalid or missing. Please request a new one.
              </p>
              <Link
                href="/forgot-password"
                className="gradient-button px-6 py-3 rounded-xl text-primary-foreground font-medium inline-block"
              >
                Request new link
              </Link>
            </div>
          ) : done ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-primary/8 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-2xl font-serif-display font-semibold text-foreground mb-2 tracking-tight">Password updated</h2>
              <p className="text-muted-foreground mb-6">You can now sign in with your new password.</p>
              <button
                onClick={() => router.push("/login")}
                className="gradient-button px-6 py-3 rounded-xl text-primary-foreground font-medium"
              >
                Go to login
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-primary/8 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-7 h-7 text-primary" />
                </div>
                <h1 className="text-2xl font-serif-display font-semibold text-foreground mb-2 tracking-tight">Set a new password</h1>
                <p className="text-muted-foreground">Choose a strong password for your account.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new password"
                      minLength={6}
                      className="w-full px-4 py-3 rounded-xl bg-black/[0.02] border border-black/10 text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-muted-foreground mb-2">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    minLength={6}
                    className="w-full px-4 py-3 rounded-xl bg-black/[0.02] border border-black/10 text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full gradient-button py-4 rounded-xl text-primary-foreground font-medium transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? "Updating..." : "Update Password"}
                </button>
              </form>
            </>
          )}
        </div>

        <Link
          href="/login"
          className="flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground mt-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </Link>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  )
}
