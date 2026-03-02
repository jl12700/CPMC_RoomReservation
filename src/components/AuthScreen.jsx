import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function AuthScreen() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'signin') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) throw signInError
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })
        if (signUpError) throw signUpError
      }
    } catch (err) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-50 text-slate-900">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Smart Room Reservation
          </h1>
          <p className="text-sm text-slate-500">
            {mode === 'signin'
              ? 'Sign in to manage your reservations.'
              : 'Create an account to start booking rooms.'}
          </p>
        </div>

        <div className="flex gap-2 text-xs">
          <button
            type="button"
            className={`flex-1 rounded-md border px-2 py-1.5 font-medium ${
              mode === 'signin'
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-700'
            }`}
            onClick={() => setMode('signin')}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md border px-2 py-1.5 font-medium ${
              mode === 'signup'
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-700'
            }`}
            onClick={() => setMode('signup')}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-md px-2 py-1.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn-primary w-full mt-2"
            disabled={loading}
          >
            {loading
              ? mode === 'signin'
                ? 'Signing in...'
                : 'Signing up...'
              : mode === 'signin'
              ? 'Sign in'
              : 'Sign up'}
          </button>
        </form>
      </div>
    </div>
  )
}

