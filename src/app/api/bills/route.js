import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const bills = await prisma.bill.findMany({
      orderBy: { nextRun: 'asc' },
      include: { pot: { include: { account: true } } },
    })

    return NextResponse.json(bills.map(b => ({
      id:        b.id,
      label:     b.label,
      potId:     b.potId,
      potLabel:  `${b.pot.account.name} — ${b.pot.label}`,
      amount:    parseFloat(b.amount.toString()),
      frequency: b.frequency,
      nextRun:   b.nextRun instanceof Date ? b.nextRun.toISOString().split('T')[0] : String(b.nextRun),
      lastRun:   b.lastRun
                   ? (b.lastRun instanceof Date ? b.lastRun.toISOString().split('T')[0] : String(b.lastRun))
                   : null,
    })))
  } catch (err) {
    console.error('[GET /api/bills]', err)
    return NextResponse.json({ error: 'Failed to fetch bills' }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const { label, potId, amount, frequency, startDate } = await req.json()

    if (!label?.trim() || !potId || amount === undefined || !frequency || !startDate) {
      return NextResponse.json(
        { error: 'label, potId, amount, frequency, and startDate are required' },
        { status: 400 }
      )
    }

    const bill = await prisma.bill.create({
      data: {
        label:     label.trim(),
        potId,
        amount:    Math.abs(parseFloat(amount)).toString(),
        frequency,
        nextRun:   new Date(startDate),
      },
    })

    return NextResponse.json({ id: bill.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/bills]', err)
    return NextResponse.json({ error: 'Failed to create bill' }, { status: 500 })
  }
}
