import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function AuthPanel() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle',
  )
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [showEmail, setShowEmail] = useState(false)

  const redirectTo = new URL(
    import.meta.env.BASE_URL,
    window.location.origin,
  ).toString()

  async function continueWithProvider(
    provider: 'google' | 'github',
  ) {
    setMessage('')
    setStatus('sending')

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    })

    if (error) {
      setStatus('error')
      setMessage(error.message)
      return
    }

    // Usually Supabase will redirect the browser. This is just a fallback.
    setStatus('sent')
    setMessage('Redirecting…')
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setStatus('sending')

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: redirectTo,
        // Treat magic-link as "quick login": create user if needed.
        shouldCreateUser: true,
      },
    })

    if (error) {
      setStatus('error')
      setMessage(error.message)
      return
    }

    setStatus('sent')
    setMessage('Check your email for a sign-in link.')
  }

  return (
    <div className="glass rounded-2xl p-6 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-900">Continue to FlowDesk</div>
          <div className="mt-1 text-sm text-slate-600">
            Quick sign-in. New users will be created automatically.
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <button
          type="button"
          onClick={() => continueWithProvider('google')}
          disabled={status === 'sending'}
          className="inline-flex items-center justify-center gap-3 rounded-xl bg-white/80 px-5 py-3 text-sm font-semibold text-slate-900 ring-1 ring-slate-900/10 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white ring-1 ring-slate-900/10">
            G
          </span>
          Continue with Google
        </button>

        <button
          type="button"
          onClick={() => continueWithProvider('github')}
          disabled={status === 'sending'}
          className="inline-flex items-center justify-center gap-3 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-crisp transition enabled:hover:-translate-y-0.5 enabled:hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Continue with GitHub
        </button>

        <button
          type="button"
          onClick={() => {
            setShowEmail((v) => !v)
            setStatus('idle')
            setMessage('')
          }}
          className="mt-1 text-left text-xs font-semibold text-slate-700 hover:text-slate-900"
        >
          {showEmail ? 'Hide email link option' : 'Use an email magic link instead'}
        </button>
      </div>

      {showEmail && (
        <form onSubmit={sendMagicLink} className="mt-4 flex flex-col gap-3">
          <label>
            <div className="text-xs font-semibold text-slate-800">Email magic link</div>
            <div className="mt-0.5 text-xs text-slate-600">
              We’ll email you a sign-in link. No password needed.
            </div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              type="email"
              required
              className="mt-2 w-full rounded-xl bg-white/70 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 ring-1 ring-slate-900/10 outline-none focus:ring-indigo-600/30"
            />
          </label>
          <button
            type="submit"
            disabled={status === 'sending'}
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-crisp transition enabled:hover:-translate-y-0.5 enabled:hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === 'sending' ? 'Sending…' : 'Send magic link'}
          </button>
        </form>
      )}

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

