"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Github, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { apiPost } from "@/lib/api"
import { LegalDialog } from "@/components/legal-dialog"

export default function SignupPage() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  // Clicking "Create Account" without ticking the box only raised a toast,
  // which vanishes; the form just looked broken. This marks the checkbox
  // itself until it is ticked.
  const [termsError, setTermsError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [legalDoc, setLegalDoc] = useState<"privacy" | "terms" | null>(null)
  const router = useRouter()

  const passwordStrength = () => {
    if (password.length === 0) return { level: 0, text: "", color: "" }
    if (password.length < 6) return { level: 1, text: "Weak", color: "bg-red-500" }
    if (password.length < 10) return { level: 2, text: "Medium", color: "bg-amber-500" }
    return { level: 3, text: "Strong", color: "bg-primary" }
  }

  const strength = passwordStrength()

const handleSignup = async (e: React.FormEvent) => {

  e.preventDefault()

  if (password !== confirmPassword) {
    toast.error("Passwords do not match")
    return
  }

  if (!agreeToTerms) {
    setTermsError(true)
    toast.error("Please agree to the Terms of Service and Privacy Policy")
    return
  }

  setTermsError(false)

  setLoading(true)

  try {

    const data = await apiPost("/signup", {
      name: fullName,
      email,
      password,
    })

    toast.success(data.message || "Signup successful")

    router.push("/login")

  } catch (error: any) {
    toast.error(error?.message || "Error connecting to the server")
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
          <h1 className="text-2xl font-serif-display font-semibold text-foreground mb-2 tracking-tight">Create your account</h1>
          <p className="text-muted-foreground">Start transforming lectures into knowledge</p>
        </div>

        {/* Signup Form */}
        <div className="panel rounded-2xl p-8">
          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-3 rounded-xl bg-black/[0.02] border border-black/10 text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all"
                required
              />
            </div>

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

            <div>
              <label className="block text-sm text-muted-foreground mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  className="w-full px-4 py-3 rounded-xl bg-black/[0.02] border border-black/10 text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {/* Password Strength Indicator. The wrapper keeps its height even
                  when empty: appearing on first keystroke used to push Confirm
                  Password down mid-click, so people missed the field. */}
              <div className="mt-2 h-6">
                {password.length > 0 && (
                  <>
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full ${
                            level <= strength.level ? strength.color : "bg-black/10"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{strength.text}</p>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="w-full px-4 py-3 rounded-xl bg-black/[0.02] border border-black/10 text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all"
                required
              />
              {/* Fixed height for the same reason as the strength meter: this
                  line appearing used to nudge the terms checkbox out from
                  under the cursor. */}
              <div className="h-5 mt-1">
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-500">Passwords do not match</p>
                )}
                {confirmPassword && password === confirmPassword && (
                  <p className="text-xs text-primary flex items-center gap-1">
                    <Check className="w-3 h-3" /> Passwords match
                  </p>
                )}
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreeToTerms}
                onChange={(e) => {
                  setAgreeToTerms(e.target.checked)
                  if (e.target.checked) setTermsError(false)
                }}
                className={`w-4 h-4 mt-1 rounded bg-black/[0.02] border text-primary focus:ring-primary/40 ${
                  termsError ? "border-red-500 ring-2 ring-red-500/30" : "border-black/10"
                }`}
                required
              />
              <span className="text-sm text-muted-foreground">
                I agree to the{" "}
                <button
                  type="button"
                  onClick={() => setLegalDoc("terms")}
                  className="text-primary hover:text-primary/80 underline-offset-2 hover:underline"
                >
                  Terms of Service
                </button>{" "}
                and{" "}
                <button
                  type="button"
                  onClick={() => setLegalDoc("privacy")}
                  className="text-primary hover:text-primary/80 underline-offset-2 hover:underline"
                >
                  Privacy Policy
                </button>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full gradient-button py-4 rounded-xl text-primary-foreground font-medium transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 divider-fade" />
            <span className="text-sm text-muted-foreground">or continue with</span>
            <div className="flex-1 divider-fade" />
          </div>

          {/* Social Login */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => toast.info("Google signup isn't available yet")}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-black/[0.02] border border-black/10 text-foreground hover:bg-black/[0.04] hover:border-black/20 transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={() => toast.info("GitHub signup isn't available yet")}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-black/[0.02] border border-black/10 text-foreground hover:bg-black/[0.04] hover:border-black/20 transition-all"
            >
              <Github className="w-5 h-5" />
              GitHub
            </button>
          </div>
        </div>

        {/* Login Link */}
        <p className="text-center text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-primary hover:text-primary/80 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>

      <LegalDialog type={legalDoc} onOpenChange={(open) => !open && setLegalDoc(null)} />
    </div>
  )
}
