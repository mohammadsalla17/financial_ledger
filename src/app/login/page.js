'use client'
import { useActionState } from 'react'
import { login } from '@/app/actions/auth'

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined)

  return (
    <div className="app-bg grid place-items-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 w-full max-w-sm shadow-xl">
        <div className="hero-card w-11 h-11 rounded-xl flex items-center justify-center text-[16px] font-bold tracking-tight mb-4 mx-auto">FL</div>
        <h1 className="text-[20px] font-semibold text-gray-900 mb-1 text-center">Financial Ledger</h1>
        <p className="text-[13px] text-gray-400 mb-6 text-center">Enter your password to continue.</p>

        <form action={action} className="space-y-4">
          <div>
            <label className="block text-[13px] text-gray-600 mb-1.5" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              autoFocus
              required
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg bg-white text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
              placeholder="admin"
            />
          </div>
          <div>
            <label className="block text-[13px] text-gray-600 mb-1.5" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg bg-white text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
              placeholder="••••••••"
            />
          </div>

          {state?.error && (
            <p className="text-[12px] text-red-500">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full py-2 text-[13px] font-medium bg-primary text-on-primary rounded-lg hover:opacity-90 disabled:opacity-50 cursor-pointer transition-colors"
          >
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
