import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req, { params }) {
  try {
    const { id } = await params
    const { label, kind, fromId, toId, amount, frequency, nextRun } = await req.json()

    if (!label?.trim() || !kind || !toId || amount === undefined || !frequency || !nextRun) {
      return NextResponse.json({ error: 'label, kind, toId, amount, frequency, and nextRun are required' }, { status: 400 })
    }

    if (kind === 'transfer' && !fromId) {
      return NextResponse.json({ error: 'fromId is required for transfer kind' }, { status: 400 })
    }

    const schedule = await prisma.scheduledTransfer.update({
      where: { id },
      data: {
        label:   label.trim(),
        kind,
        fromId:  kind === 'transfer' ? fromId : null,
        toId,
        amount:  Math.abs(parseFloat(amount)).toString(),
        frequency,
        nextRun: new Date(nextRun),
      },
    })

    return NextResponse.json({ id: schedule.id })
  } catch (err) {
    console.error('[PATCH /api/scheduled-transfers/[id]]', err)
    return NextResponse.json({ error: 'Failed to update scheduled transfer' }, { status: 500 })
  }
}

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
