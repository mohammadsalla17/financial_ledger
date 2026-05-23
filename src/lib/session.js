import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const encodedKey = new TextEncoder().encode(process.env.SESSION_SECRET)
const EXPIRES_IN = 7 * 24 * 60 * 60 * 1000 // 7 days

export async function encrypt(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey)
}

export async function decrypt(token) {
  try {
    const { payload } = await jwtVerify(token, encodedKey, { algorithms: ['HS256'] })
    return payload
  } catch {
    return null
  }
}

export async function createSession() {
  const expiresAt = new Date(Date.now() + EXPIRES_IN)
  const token = await encrypt({ authenticated: true, expiresAt })
  const store = await cookies()
  store.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })
}

export async function deleteSession() {
  const store = await cookies()
  store.delete('session')
}

export async function getSession() {
  const store = await cookies()
  const token = store.get('session')?.value
  return token ? decrypt(token) : null
}
