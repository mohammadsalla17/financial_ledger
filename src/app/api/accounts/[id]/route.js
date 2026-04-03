import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(_req, { params }) {
  try {
    const { id } = await params

    await prisma.account.delete({
      where: { id },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/accounts/:id]', err)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}