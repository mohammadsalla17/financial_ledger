import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const accounts = await prisma.account.findMany({
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        records: {
          include: { transactions: true },
        },
      },
    })

    const withBalances = accounts.map((account) => {
      const balance = account.records.reduce((accSum, record) => {
        if (record.kind === 'pot') {
          const potTotal = record.transactions.reduce(
            (s, t) => s + parseFloat(t.amount.toString()),
            0
          )
          return accSum + potTotal
        }
        return accSum + parseFloat((record.fixedAmount ?? '0').toString())
      }, 0)

      return {
        id:      account.id,
        name:    account.name,
        color:   account.color,
        balance: Math.round(balance * 100) / 100,
      }
    })

    return NextResponse.json(withBalances)
  } catch (err) {
    console.error('[GET /api/accounts]', err)
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const account = await prisma.account.create({
      data: {
        name:  body.name.trim(),
        color: body.color ?? '#378ADD',
      },
    })

    return NextResponse.json(account, { status: 201 })
  } catch (err) {
    console.error('[POST /api/accounts]', err)
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}