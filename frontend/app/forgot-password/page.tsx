"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle, Mail, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { apiPost } from "@/lib/api"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resetLink, setResetLink] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await apiPost("/forgot-password", { email })
      // No email provider is configured for this project, so the backend
      // returns the reset link directly for local/demo use instead of emailing it.
      if (data.resetToken) {
        setResetLink(`/reset-password?token=${encodeURIComponent(data.resetToken)}`)
      }
      setIsSubmitted(true)
    } catch (error: any) {
      toast.error(error?.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="relative w-full max-w-md animate-fade-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <img src="/logo.png" alt="NoteTube AI" className="w-10 h-10 object-contain" />
            <span className="text-xl font-serif-display font-semibold tracking-tight text-foreground">NoteTube AI</span>
          </Link>
        </div>

        {/* Form Card */}
        <div className="panel rounded-2xl p-8">
          {!isSubmitted ? (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-primary/8 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-7 h-7 text-primary" />
                </div>
                <h1 className="text-2xl font-serif-display font-semibold text-foreground mb-2 tracking-tight">
                  Forgot Password?
                </h1>
                <p className="text-muted-foreground">
                  {"No worries, we'll send you reset instructions."}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
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
                  {loading ? "Sending..." : "Reset Password"}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-primary/8 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-2xl font-serif-display font-semibold text-foreground mb-2 tracking-tight">Check your email</h2>
              <p className="text-muted-foreground mb-6">
                {"If an account exists for "}
                <span className="text-foreground">{email}</span>
                {", reset instructions have been generated."}
              </p>
              {resetLink && (
                <div className="mb-6 p-4 rounded-xl bg-black/[0.02] border border-black/10 text-left">
                  <p className="text-xs text-muted-foreground mb-2">
                    No email service is configured for this project, so here's your reset link directly:
                  </p>
                  <Link href={resetLink} className="text-sm text-primary hover:text-primary/80 break-all underline">
                    {resetLink}
                  </Link>
                </div>
              )}
              <button
                onClick={() => setIsSubmitted(false)}
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                {"Didn't get it? Try again"}
              </button>
            </div>
          )}
        </div>

        {/* Back to Login */}
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
