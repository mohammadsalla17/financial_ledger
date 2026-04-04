import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const recordId = searchParams.get('recordId')
    const recent   = searchParams.get('recent')
    const limit    = parseInt(searchParams.get('limit') ?? (recent ? recent : '5'), 10)

    if (!recordId && !recent) {
      return NextResponse.json({ error: 'recordId or recent is required' }, { status: 400 })
    }

    const txns = await prisma.transaction.findMany({
      where:   recordId ? { recordId } : undefined,
      orderBy: [{ txnDate: 'desc' }, { createdAt: 'desc' }],
      take:    limit,
      include: recent ? { record: { include: { account: true } } } : undefined,
    })

    const mapped = txns.map((t) => ({
      id:          t.id,
      recordId:    t.recordId,
      recordLabel: t.record?.label ?? null,
      accountName: t.record?.account?.name ?? null,
      description: t.description,
      amount:      parseFloat(t.amount.toString()),
      txnDate:     t.txnDate instanceof Date
                     ? t.txnDate.toISOString().split('T')[0]
                     : String(t.txnDate),
      transferRef: t.transferRef ?? null,
    }))

    return NextResponse.json(mapped)
  } catch (err) {
    console.error('[GET /api/transactions]', err)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()

    // ── Transfer between two records ─────────────────────────────────────────
    if (body.type === 'transfer') {
      const { fromRecordId, toRecordId, amount, description } = body

      if (!fromRecordId || !toRecordId || amount === undefined) {
        return NextResponse.json(
          { error: 'fromRecordId, toRecordId, and amount are required' },
          { status: 400 }
        )
      }

      if (fromRecordId === toRecordId) {
        return NextResponse.json(
          { error: 'fromRecordId and toRecordId must be different' },
          { status: 400 }
        )
      }

      const ref  = randomUUID()
      const amt  = Math.abs(parseFloat(amount))
      const date = new Date()

      await prisma.transaction.createMany({
        data: [
          {
            recordId:    fromRecordId,
            description: description ?? 'Transfer out',
            amount:      (-amt).toString(),
            txnDate:     date,
            transferRef: ref,
          },
          {
            recordId:    toRecordId,
            description: description ?? 'Transfer in',
            amount:      amt.toString(),
            txnDate:     date,
            transferRef: ref,
          },
        ],
      })

      return NextResponse.json({ ok: true, transferRef: ref }, { status: 201 })
    }

    // ── Regular transaction ───────────────────────────────────────────────────
    const { recordId, description, amount, txnDate } = body

    if (!recordId || !description?.trim() || amount === undefined) {
      return NextResponse.json(
        { error: 'recordId, description, and amount are required' },
        { status: 400 }
      )
    }

    const tx = await prisma.transaction.create({
      data: {
        recordId,
        description: description.trim(),
        amount:      parseFloat(amount).toString(),
        txnDate:     txnDate ? new Date(txnDate) : new Date(),
      },
    })

    return NextResponse.json({
      id:          tx.id,
      recordId:    tx.recordId,
      description: tx.description,
      amount:      parseFloat(tx.amount.toString()),
      txnDate:     tx.txnDate instanceof Date
                     ? tx.txnDate.toISOString().split('T')[0]
                     : String(tx.txnDate),
      transferRef: tx.transferRef ?? null,
    }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/transactions]', err)
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
  }
}