'use server'
import { redirect } from 'next/navigation'
import { createSession, deleteSession } from '@/lib/session'

export async function login(prevState, formData) {
  const username = formData.get('username')
  const password = formData.get('password')

  if (username !== process.env.AUTH_USERNAME || password !== process.env.AUTH_PASSWORD) {
    return { error: 'Incorrect username or password.' }
  }

  await createSession()
  redirect('/')
}

export async function logout() {
  await deleteSession()
  redirect('/login')
}
