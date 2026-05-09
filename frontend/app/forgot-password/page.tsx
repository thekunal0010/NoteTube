"use client"

import { useState } from "react"
import Link from "next/link"
import { Sparkles, ArrowLeft, CheckCircle, Mail } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement actual password reset
    setIsSubmitted(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl gradient-purple flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-white">NoteTube AI</span>
          </Link>
        </div>

        {/* Form Card */}
        <div className="glass-card rounded-2xl p-8 border border-white/10">
          {!isSubmitted ? (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-7 h-7 text-purple-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  Forgot Password?
                </h1>
                <p className="text-gray-400">
                  {"No worries, we'll send you reset instructions."}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full gradient-button py-4 rounded-xl text-white font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Reset Password
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
              <p className="text-gray-400 mb-6">
                {"We've sent password reset instructions to "}
                <span className="text-white">{email}</span>
              </p>
              <button
                onClick={() => setIsSubmitted(false)}
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                {"Didn't receive the email? Click to resend"}
              </button>
            </div>
          )}
        </div>

        {/* Back to Login */}
        <Link
          href="/login"
          className="flex items-center justify-center gap-2 text-gray-400 hover:text-white mt-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </Link>
      </div>
    </div>
  )
}
