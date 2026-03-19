import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function AuthPanel() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'magic' | 'password'>('magic')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle',
  )
  const [message, setMessage] = useState('')

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setMode('magic')
    setMessage('')
    setStatus('sending')

    const redirectTo = `${window.location.origin}/`
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    })

    if (error) {
      setStatus('error')
      setMessage(error.message)
      return
    }

    setStatus('sent')
    setMessage('Check your email for a sign-in link.')
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault()
    setMode('password')
    setMessage('')
    setStatus('sending')

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      setStatus('error')
      setMessage(error.message)
      return
    }

    setStatus('sent')
    setMessage('Signed in successfully.')
  }

  return (
    <div className="glass rounded-2xl p-6 shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-charcoal-950">Sign in</div>
          <div className="mt-1 text-sm text-charcoal-700">
            Magic link or password.
          </div>
        </div>
        <div className="inline-flex rounded-full bg-paper-100 p-1 text-xs ring-1 ring-charcoal-950/10">
          <button
            type="button"
            onClick={() => setMode('magic')}
            className={`rounded-full px-3 py-1 font-medium ${
              mode === 'magic'
                ? 'bg-charcoal-950 text-paper-50'
                : 'text-charcoal-700 hover:text-charcoal-950'
            }`}
          >
            Magic link
          </button>
          <button
            type="button"
            onClick={() => setMode('password')}
            className={`rounded-full px-3 py-1 font-medium ${
              mode === 'password'
                ? 'bg-charcoal-950 text-paper-50'
                : 'text-charcoal-700 hover:text-charcoal-950'
            }`}
          >
            Password
          </button>
        </div>
      </div>

      <form
        onSubmit={mode === 'magic' ? sendMagicLink : signInWithPassword}
        className="mt-5 flex flex-col gap-3"
      >
        <label>
          <span className="sr-only">Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            type="email"
            required
            className="w-full rounded-xl bg-white/70 px-4 py-3 text-sm text-charcoal-950 placeholder:text-charcoal-500 ring-1 ring-charcoal-950/10 outline-none focus:ring-charcoal-950/20"
          />
        </label>

        {mode === 'password' && (
          <label>
            <span className="sr-only">Password</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              type="password"
              required
              className="w-full rounded-xl bg-white/70 px-4 py-3 text-sm text-charcoal-950 placeholder:text-charcoal-500 ring-1 ring-charcoal-950/10 outline-none focus:ring-charcoal-950/20"
            />
          </label>
        )}

        <button
          type="submit"
          disabled={status === 'sending'}
          className="inline-flex items-center justify-center rounded-xl bg-charcoal-950 px-5 py-3 text-sm font-semibold text-paper-50 shadow-crisp transition enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'sending'
            ? mode === 'magic'
              ? 'Sending…'
              : 'Signing in…'
            : mode === 'magic'
              ? 'Send magic link'
              : 'Sign in'}
        </button>
      </form>

      {message && (
        <p
          className={`mt-3 text-sm ${
            status === 'sent' ? 'text-moss-600' : 'text-rose-700'
          }`}
          role={status === 'error' ? 'alert' : 'status'}
        >
          {message}
        </p>
      )}
    </div>
  )
}

