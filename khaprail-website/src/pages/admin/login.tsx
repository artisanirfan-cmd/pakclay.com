import { useState, type FormEvent } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"

export function AdminLogin() {
  const { session, signIn } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (session) {
    const from = (location.state as { from?: Location })?.from
    return <Navigate to={from?.pathname ?? "/admin"} replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)
    const { error: signInError } = await signIn(email, password)
    if (signInError) setError(signInError)
    setIsSubmitting(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted px-4">
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4 rounded-xl bg-background p-8 shadow-md">
        <div className="text-center">
          <h1 className="font-heading text-2xl">PAKCLAY.COM Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to manage the site.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? "Signing in..." : "Sign In"}
        </Button>
      </form>
    </main>
  )
}
