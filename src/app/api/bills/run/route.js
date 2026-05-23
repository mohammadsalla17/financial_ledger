import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function advanceDate(date, frequency) {
  const d = new Date(date)
  if (frequency === 'weekly')   d.setDate(d.getDate() + 7)
  if (frequency === 'biweekly') d.setDate(d.getDate() + 14)
  if (frequency === 'monthly')  d.setMonth(d.getMonth() + 1)
  return d
}

export async function POST() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const due = await prisma.bill.findMany({
      where: { nextRun: { lte: today } },
    })

    if (due.length === 0) {
      return NextResponse.json({ executed: 0 })
    }

    let executed = 0

    for (const bill of due) {
      const amt  = parseFloat(bill.amount.toString())
      const date = new Date()

      await prisma.transaction.create({
        data: {
          recordId:    bill.potId,
          description: bill.label,
          amount:      (-amt).toString(),
          txnDate:     date,
        },
      })

      await prisma.bill.update({
        where: { id: bill.id },
        data: {
          lastRun: date,
          nextRun: advanceDate(bill.nextRun, bill.frequency),
        },
      })

      executed++
    }

    return NextResponse.json({ executed })
  } catch (err) {
    console.error('[POST /api/bills/run]', err)
    return NextResponse.json({ error: 'Failed to run bills' }, { status: 500 })
  }
}
