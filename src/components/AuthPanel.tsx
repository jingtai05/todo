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
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-900">
            {authType === 'signin' ? 'Sign in' : 'Create an account'}
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Magic link or password.
          </div>
        </div>
        <div className="inline-flex rounded-full bg-slate-100 p-1 text-xs ring-1 ring-slate-900/10">
          <button
            type="button"
            onClick={() => setMethod('magic')}
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
            onClick={() => setMethod('password')}
            className={`rounded-full px-3 py-1 font-medium ${
              method === 'password'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Password
          </button>
        </div>
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
              ? 'Send magic link'
              : authType === 'signin' ? 'Sign in' : 'Sign up'}
        </button>

        {method === 'password' && (
          <div className="mt-2 text-center text-xs text-slate-600">
            {authType === 'signin' ? "Don't have an account? " : "Already have an account? "}
            <button 
              type="button" 
              onClick={() => setAuthType(prev => prev === 'signin' ? 'signup' : 'signin')}
              className="font-semibold text-slate-900 hover:underline"
            >
              {authType === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        )}
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

