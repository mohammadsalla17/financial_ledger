import { NextResponse } from 'next/server'
import { decrypt } from '@/lib/session'

const publicRoutes = ['/login']

export default async function proxy(req) {
  const path = req.nextUrl.pathname
  const isPublicRoute = publicRoutes.includes(path)

  const token = req.cookies.get('session')?.value
  const session = token ? await decrypt(token) : null
  const isAuthenticated = !!session?.authenticated

  if (!isPublicRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  if (isPublicRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/', req.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
