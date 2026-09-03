'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError('')
    const result = await authClient.signIn.email({ email, password })
    if (result.error) setError('Unable to sign in. Check your credentials.')
    else { router.push('/'); router.refresh() }
    setPending(false)
  }

  return <main className="flex min-h-screen items-center justify-center bg-background p-6"><form onSubmit={submit} className="flex w-full max-w-md flex-col gap-5 rounded-2xl border border-border bg-card p-8 shadow-xl"><div><p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">CloudDesk</p><h1 className="mt-3 text-3xl font-semibold text-foreground">Sign in to your workspace</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Manage enrolled Windows agents and remote sessions securely.</p></div><label className="flex flex-col gap-2 text-sm font-medium">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2.5 text-foreground outline-none focus:ring-2 focus:ring-primary" /></label><label className="flex flex-col gap-2 text-sm font-medium">Password<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2.5 text-foreground outline-none focus:ring-2 focus:ring-primary" /></label>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<button disabled={pending} className="rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-60">{pending ? 'Signing in…' : 'Sign in'}</button></form></main>
}
