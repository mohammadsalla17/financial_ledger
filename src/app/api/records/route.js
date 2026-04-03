import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
    }

    const records = await prisma.record.findMany({
      where:   { accountId },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      include: { transactions: true },
    })

    const withValues = records.map((record) => {
      let value

      if (record.kind === 'pot') {
        // Pot value is the live sum of all its transactions
        value = record.transactions.reduce(
          (s, t) => s + parseFloat(t.amount.toString()),
          0
        )
      } else {
        value = parseFloat((record.fixedAmount ?? '0').toString())
      }

      return {
        id:          record.id,
        accountId:   record.accountId,
        label:       record.label,
        kind:        record.kind,
        fixedAmount: record.fixedAmount?.toString() ?? null,
        note:        record.note,
        value:       Math.round(value * 100) / 100,
      }
    })

    return NextResponse.json(withValues)
  } catch (err) {
    console.error('[GET /api/records]', err)
    return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { accountId, label, kind, fixedAmount, note } = body

    if (!accountId || !label?.trim() || !kind) {
      return NextResponse.json(
        { error: 'accountId, label, and kind are required' },
        { status: 400 }
      )
    }

    if (kind !== 'pot' && fixedAmount === undefined) {
      return NextResponse.json(
        { error: 'fixedAmount is required for non-pot records' },
        { status: 400 }
      )
    }

    const record = await prisma.record.create({
      data: {
        accountId,
        label:       label.trim(),
        kind,
        fixedAmount: kind === 'pot' ? null : fixedAmount.toString(),
        note:        note?.trim() ?? '',
      },
    })

    // Log the initial value as the first transaction for non-pot records
    if (kind !== 'pot') {
      await prisma.transaction.create({
        data: {
          recordId:    record.id,
          description: `${record.label} (initial value)`,
          amount:      fixedAmount.toString(),
          txnDate:     new Date(),
        },
      })
    }

    return NextResponse.json(record, { status: 201 })
  } catch (err) {
    console.error('[POST /api/records]', err)
    return NextResponse.json({ error: 'Failed to create record' }, { status: 500 })
  }
}