import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function AuthPanel() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [method, setMethod] = useState<'magic' | 'password'>('magic')
  const [authType, setAuthType] = useState<'signin' | 'signup'>('signin')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle',
  )
  const [message, setMessage] = useState('')

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setStatus('sending')

    // Use Vite's BASE_URL so GitHub Pages subpaths (e.g. /todo/) work.
    const redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).toString()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: redirectTo,
        // Make the difference explicit:
        // - Sign in: do NOT create a new user
        // - Sign up: create user (then user confirms via email)
        shouldCreateUser: authType === 'signup',
      },
    })

    if (error) {
      setStatus('error')
      setMessage(error.message)
      return
    }

    setStatus('sent')
    setMessage(
      authType === 'signup'
        ? 'Check your email to confirm your account.'
        : 'Check your email for a sign-in link.',
    )
  }

  async function signInOrUpWithPassword(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setStatus('sending')

    if (authType === 'signup') {
      const { error, data } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })

      if (error) {
        setStatus('error')
        setMessage(error.message)
        return
      }

      setStatus('sent')
      if (data.session) {
        setMessage('Signed up successfully!')
      } else {
        setMessage('Check your email for a confirmation link.')
      }
    } else {
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
  }

  return (
    <div className="glass rounded-2xl p-6 shadow-soft">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-900">
            {authType === 'signin' ? 'Sign in' : 'Create an account'}
          </div>
          <div className="mt-1 text-sm text-slate-600">Choose sign-in method.</div>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="inline-flex rounded-full bg-slate-100 p-1 text-xs ring-1 ring-slate-900/10">
            <button
              type="button"
              onClick={() => {
                setMethod('magic')
                setStatus('idle')
                setMessage('')
              }}
              className={`rounded-full px-3 py-1 font-medium ${
                method === 'magic'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Magic link
            </button>
            <button
              type="button"
              onClick={() => {
                setMethod('password')
                setStatus('idle')
                setMessage('')
              }}
              className={`rounded-full px-3 py-1 font-medium ${
                method === 'password'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Password
            </button>
          </div>

          <div className="inline-flex rounded-full bg-white/70 p-1 text-xs ring-1 ring-slate-900/10">
            <button
              type="button"
              onClick={() => {
                setAuthType('signin')
                setStatus('idle')
                setMessage('')
              }}
              className={`rounded-full px-3 py-1.5 font-semibold ${
                authType === 'signin'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthType('signup')
                setStatus('idle')
                setMessage('')
              }}
              className={`rounded-full px-3 py-1.5 font-semibold ${
                authType === 'signup'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign up
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-white/60 px-4 py-3 text-xs font-medium text-slate-700 ring-1 ring-slate-900/10">
        {method === 'magic' ? (
          <div>
            <span className="font-semibold text-slate-900">Magic link:</span> we email you a link. No password needed.
            {authType === 'signup' ? (
              <span className="text-slate-600"> (Creates your account, then you confirm via email.)</span>
            ) : (
              <span className="text-slate-600"> (Only works if your account already exists.)</span>
            )}
          </div>
        ) : (
          <div>
            <span className="font-semibold text-slate-900">Password:</span> sign in or create an account with email + password.
          </div>
        )}
      </div>

      <form
        onSubmit={method === 'magic' ? sendMagicLink : signInOrUpWithPassword}
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
            className="w-full rounded-xl bg-white/70 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 ring-1 ring-slate-900/10 outline-none focus:ring-indigo-600/30"
          />
        </label>

        {method === 'password' && (
          <label>
            <span className="sr-only">Password</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              type="password"
              required
              className="w-full rounded-xl bg-white/70 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 ring-1 ring-slate-900/10 outline-none focus:ring-indigo-600/30"
            />
          </label>
        )}

        <button
          type="submit"
          disabled={status === 'sending'}
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-crisp transition enabled:hover:-translate-y-0.5 enabled:hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'sending'
            ? 'Sending…'
            : method === 'magic'
              ? authType === 'signup'
                ? 'Send sign-up link'
                : 'Send sign-in link'
              : authType === 'signin' ? 'Sign in' : 'Sign up'}
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

