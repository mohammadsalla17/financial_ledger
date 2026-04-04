import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const schedules = await prisma.scheduledTransfer.findMany({
      orderBy: { nextRun: 'asc' },
      include: {
        fromRecord: { include: { account: true } },
        toRecord:   { include: { account: true } },
      },
    })

    return NextResponse.json(schedules.map(s => ({
      id:           s.id,
      label:        s.label,
      kind:         s.kind,
      fromId:       s.fromId,
      fromLabel:    s.fromRecord ? `${s.fromRecord.account.name} — ${s.fromRecord.label}` : null,
      toId:         s.toId,
      toLabel:      `${s.toRecord.account.name} — ${s.toRecord.label}`,
      amount:       parseFloat(s.amount.toString()),
      frequency:    s.frequency,
      nextRun:      s.nextRun instanceof Date ? s.nextRun.toISOString().split('T')[0] : String(s.nextRun),
      lastRun:      s.lastRun
                      ? (s.lastRun instanceof Date ? s.lastRun.toISOString().split('T')[0] : String(s.lastRun))
                      : null,
    })))
  } catch (err) {
    console.error('[GET /api/scheduled-transfers]', err)
    return NextResponse.json({ error: 'Failed to fetch scheduled transfers' }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const { label, kind, fromId, toId, amount, frequency, startDate } = await req.json()

    if (!label?.trim() || !kind || !toId || amount === undefined || !frequency || !startDate) {
      return NextResponse.json({ error: 'label, kind, toId, amount, frequency, and startDate are required' }, { status: 400 })
    }

    if (kind === 'transfer' && !fromId) {
      return NextResponse.json({ error: 'fromId is required for transfer kind' }, { status: 400 })
    }

    if (kind === 'transfer' && fromId === toId) {
      return NextResponse.json({ error: 'fromId and toId must be different' }, { status: 400 })
    }

    const schedule = await prisma.scheduledTransfer.create({
      data: {
        label:     label.trim(),
        kind,
        fromId:    kind === 'transfer' ? fromId : null,
        toId,
        amount:    Math.abs(parseFloat(amount)).toString(),
        frequency,
        nextRun:   new Date(startDate),
      },
    })

    return NextResponse.json({ id: schedule.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/scheduled-transfers]', err)
    return NextResponse.json({ error: 'Failed to create scheduled transfer' }, { status: 500 })
  }
}
