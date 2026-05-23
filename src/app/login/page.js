'use client'
import { useActionState } from 'react'
import { login } from '@/app/actions/auth'

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl border border-gray-200 p-8 w-full max-w-sm shadow-sm">
        <h1 className="text-[18px] font-semibold text-gray-900 mb-1">Financial Ledger</h1>
        <p className="text-[13px] text-gray-400 mb-6">Enter your password to continue.</p>

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
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-colors"
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
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {state?.error && (
            <p className="text-[12px] text-red-500">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full py-2 text-[13px] font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 cursor-pointer transition-colors"
          >
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
