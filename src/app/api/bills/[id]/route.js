import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req, { params }) {
  try {
    const { id } = await params
    const { label, potId, amount, frequency, nextRun } = await req.json()

    if (!label?.trim() || !potId || amount === undefined || !frequency || !nextRun) {
      return NextResponse.json(
        { error: 'label, potId, amount, frequency, and nextRun are required' },
        { status: 400 }
      )
    }

    const bill = await prisma.bill.update({
      where: { id },
      data: {
        label:   label.trim(),
        potId,
        amount:  Math.abs(parseFloat(amount)).toString(),
        frequency,
        nextRun: new Date(nextRun),
      },
    })

    return NextResponse.json({ id: bill.id })
  } catch (err) {
    console.error('[PATCH /api/bills/[id]]', err)
    return NextResponse.json({ error: 'Failed to update bill' }, { status: 500 })
  }
}

export async function DELETE(_req, { params }) {
  try {
    const { id } = await params
    await prisma.bill.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/bills/[id]]', err)
    return NextResponse.json({ error: 'Failed to delete bill' }, { status: 500 })
  }
}
