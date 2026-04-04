import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(_req, { params }) {
  try {
    const { id } = await params
    await prisma.scheduledTransfer.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/scheduled-transfers/[id]]', err)
    return NextResponse.json({ error: 'Failed to delete scheduled transfer' }, { status: 500 })
  }
}
