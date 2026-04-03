import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req, { params }) {
  try {
    const { id } = await params
    const body   = await req.json()

    if (body.fixedAmount === undefined) {
      return NextResponse.json({ error: 'fixedAmount is required' }, { status: 400 })
    }

    // Fetch previous value so we can log it in the transaction history
    const existing = await prisma.record.findUnique({ where: { id } })

    if (!existing) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    if (existing.kind === 'pot') {
      return NextResponse.json(
        { error: 'Pot record values cannot be set directly — add a transaction instead' },
        { status: 400 }
      )
    }

    const updated = await prisma.record.update({
      where: { id },
      data:  { fixedAmount: body.fixedAmount.toString() },
    })

    // Log the change as a transaction so history stays accurate
    await prisma.transaction.create({
      data: {
        recordId:    id,
        description: `Value updated (was ${existing.fixedAmount ?? '0'})`,
        amount:      body.fixedAmount.toString(),
        txnDate:     new Date(),
      },
    })

    return NextResponse.json({
      ...updated,
      fixedAmount: updated.fixedAmount?.toString() ?? null,
    })
  } catch (err) {
    console.error('[PATCH /api/records/:id]', err)
    return NextResponse.json({ error: 'Failed to update record' }, { status: 500 })
  }
}

export async function DELETE(_req, { params }) {
  try {
    const { id } = await params

    await prisma.record.delete({
      where: { id },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/records/:id]', err)
    return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 })
  }
}