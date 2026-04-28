import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req, { params }) {
  try {
    const { id } = await params
    const body   = await req.json()

    if (body.displayOrder === undefined) {
      return NextResponse.json({ error: 'displayOrder is required' }, { status: 400 })
    }

    const updated = await prisma.account.update({
      where: { id },
      data:  { displayOrder: body.displayOrder },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[PATCH /api/accounts/:id]', err)
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 })
  }
}

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