import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

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

    const due = await prisma.scheduledTransfer.findMany({
      where: { nextRun: { lte: today } },
    })

    if (due.length === 0) {
      return NextResponse.json({ executed: 0 })
    }

    let executed = 0

    for (const schedule of due) {
      const amt  = parseFloat(schedule.amount.toString())
      const date = new Date()
      const ref  = schedule.kind === 'transfer' ? randomUUID() : null

      if (schedule.kind === 'income') {
        await prisma.transaction.create({
          data: {
            recordId:    schedule.toId,
            description: schedule.label,
            amount:      amt.toString(),
            txnDate:     date,
            transferRef: null,
          },
        })
      } else {
        // transfer: debit from, credit to
        await prisma.transaction.createMany({
          data: [
            {
              recordId:    schedule.fromId,
              description: schedule.label,
              amount:      (-amt).toString(),
              txnDate:     date,
              transferRef: ref,
            },
            {
              recordId:    schedule.toId,
              description: schedule.label,
              amount:      amt.toString(),
              txnDate:     date,
              transferRef: ref,
            },
          ],
        })
      }

      await prisma.scheduledTransfer.update({
        where: { id: schedule.id },
        data: {
          lastRun: date,
          nextRun: advanceDate(schedule.nextRun, schedule.frequency),
        },
      })

      executed++
    }

    return NextResponse.json({ executed })
  } catch (err) {
    console.error('[POST /api/scheduled-transfers/run]', err)
    return NextResponse.json({ error: 'Failed to run scheduled transfers' }, { status: 500 })
  }
}
