/* export default function Dashboard() {
  return (
    <div>
      <h1>Welcome to My App 🚀</h1>
      <p>This component loads on app startup.</p>
    </div>
  );
}
 */
'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n) {
  const num = typeof n === 'string' ? parseFloat(n) : n
  if (isNaN(num)) return '$0.00'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num)
}

function fmtSigned(n) {
  const num = typeof n === 'string' ? parseFloat(n) : n
  if (isNaN(num)) return '+$0.00'
  return (num >= 0 ? '+' : '-') + fmt(Math.abs(num)).replace('$', '$')
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const COLORS = ['#378ADD','#1D9E75','#D85A30','#D4537E','#639922','#BA7517','#7F77DD','#E24B4A']

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function Badge({ kind }) {
  const map = {
    income:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
    expense:  'bg-red-50 text-red-600 border border-red-200',
    pot:      'bg-amber-50 text-amber-700 border border-amber-200',
    transfer: 'bg-blue-50 text-blue-700 border border-blue-200',
  }
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap ${map[kind] ?? ''}`}>
      {kind}
    </span>
  )
}

function Spinner() {
  return (
    <div className="flex justify-center py-10">
      <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
    </div>
  )
}

// ─── Modal shell ──────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl border border-gray-200 w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-medium text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none cursor-pointer">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div className="mb-4">
      <label className="block text-[12px] text-gray-500 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

const inp = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-gray-400'
const sel = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-gray-400'

function Actions({ onCancel, onSubmit, label = 'Save', disabled }) {
  return (
    <div className="flex gap-2 justify-end mt-5">
      <button onClick={onCancel} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 cursor-pointer">
        Cancel
      </button>
      <button onClick={onSubmit} disabled={disabled}
        className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 cursor-pointer">
        {label}
      </button>
    </div>
  )
}

// ─── Add Account ──────────────────────────────────────────────────────────────

function AddAccountModal({ onClose, onSaved }) {
  const [name,  setName]  = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [busy,  setBusy]  = useState(false)

  async function submit() {
    if (!name.trim() || busy) return
    setBusy(true)
    await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), color }),
    })
    onSaved()
    onClose()
  }

  return (
    <Modal title="Add account" onClose={onClose}>
      <Field label="Account name">
        <input className={inp} value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. Checking" autoFocus onKeyDown={e => e.key === 'Enter' && submit()} />
      </Field>
      <Field label="Colour">
        <div className="flex gap-2 flex-wrap">
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
              style={{ background: c }} />
          ))}
        </div>
      </Field>
      <Actions onCancel={onClose} onSubmit={submit} label={busy ? 'Adding…' : 'Add account'} disabled={busy} />
    </Modal>
  )
}

// ─── Add Record ───────────────────────────────────────────────────────────────

const KIND_HINT = {
  income:  'Fixed amount coming in each period (e.g. salary).',
  expense: 'Fixed amount going out each period (e.g. rent).',
  pot:     'Running bucket — value is the live sum of its transactions (e.g. credit card).',
}

function AddRecordModal({ accounts, defaultAccountId, onClose, onSaved }) {
  const [accountId, setAccountId] = useState(defaultAccountId || accounts[0]?.id || '')
  const [label,     setLabel]     = useState('')
  const [kind,      setKind]      = useState('expense')
  const [amount,    setAmount]    = useState('')
  const [note,      setNote]      = useState('')
  const [busy,      setBusy]      = useState(false)

  async function submit() {
    if (!label.trim() || busy) return
    if (kind !== 'pot' && amount === '') return
    setBusy(true)
    await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId,
        label: label.trim(),
        kind,
        fixedAmount: kind !== 'pot' ? parseFloat(amount) : undefined,
        note: note.trim(),
      }),
    })
    onSaved()
    onClose()
  }

  return (
    <Modal title="Add record" onClose={onClose}>
      <Field label="Account">
        <select className={sel} value={accountId} onChange={e => setAccountId(e.target.value)}>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </Field>
      <Field label="Label">
        <input className={inp} value={label} onChange={e => setLabel(e.target.value)}
          placeholder="e.g. Credit Card" autoFocus />
      </Field>
      <Field label="Type">
        <select className={sel} value={kind} onChange={e => setKind(e.target.value)}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="pot">Pot (running total)</option>
        </select>
        <p className="text-[11px] text-gray-400 mt-1.5">{KIND_HINT[kind]}</p>
      </Field>
      {kind !== 'pot' && (
        <Field label="Amount" hint="Positive = money in. Negative = money out.">
          <input className={inp} type="number" value={amount}
            onChange={e => setAmount(e.target.value)} placeholder="e.g. -1200 or 3500" />
        </Field>
      )}
      <Field label="Note (optional)">
        <input className={inp} value={note} onChange={e => setNote(e.target.value)} />
      </Field>
      <Actions onCancel={onClose} onSubmit={submit} label={busy ? 'Adding…' : 'Add record'} disabled={busy} />
    </Modal>
  )
}

// ─── Add Transaction ──────────────────────────────────────────────────────────

function AddTransactionModal({ recordId, recordLabel, onClose, onSaved }) {
  const [desc,   setDesc]   = useState('')
  const [amount, setAmount] = useState('')
  const [date,   setDate]   = useState(new Date().toISOString().split('T')[0])
  const [busy,   setBusy]   = useState(false)

  async function submit() {
    if (!desc.trim() || amount === '' || busy) return
    setBusy(true)
    await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId, description: desc.trim(), amount: parseFloat(amount), txnDate: date }),
    })
    onSaved()
    onClose()
  }

  return (
    <Modal title={`Add transaction — ${recordLabel}`} onClose={onClose}>
      <Field label="Description">
        <input className={inp} value={desc} onChange={e => setDesc(e.target.value)}
          placeholder="e.g. Groceries – Walmart" autoFocus />
      </Field>
      <Field label="Amount" hint="Negative = spending / deduction. Positive = payment in / credit.">
        <input className={inp} type="number" value={amount}
          onChange={e => setAmount(e.target.value)} placeholder="e.g. -54.20 or 500" />
      </Field>
      <Field label="Date">
        <input className={inp} type="date" value={date} onChange={e => setDate(e.target.value)} />
      </Field>
      <Actions onCancel={onClose} onSubmit={submit} label={busy ? 'Adding…' : 'Add'} disabled={busy} />
    </Modal>
  )
}

// ─── Transfer ─────────────────────────────────────────────────────────────────

function TransferModal({ accounts, onClose, onSaved }) {
  const [mode,   setMode]   = useState('account') // 'account' | 'pot'
  const [fromId, setFromId] = useState(accounts[0]?.id ?? '')
  const [toId,   setToId]   = useState(accounts[1]?.id ?? '')
  const [pots,   setPots]   = useState(null)
  const [amount, setAmount] = useState('')
  const [desc,   setDesc]   = useState('')
  const [busy,   setBusy]   = useState(false)

  useEffect(() => {
    fetch('/api/records?kind=pot')
      .then(r => r.json())
      .then(data => {
        setPots(data)
        if (mode === 'pot') {
          setFromId(data[0]?.id ?? '')
          setToId(data[1]?.id ?? '')
        }
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function switchMode(next) {
    setMode(next)
    setFromId('')
    setToId('')
    if (next === 'account') {
      setFromId(accounts[0]?.id ?? '')
      setToId(accounts[1]?.id ?? '')
    } else if (pots) {
      setFromId(pots[0]?.id ?? '')
      setToId(pots[1]?.id ?? '')
    }
  }

  async function submit() {
    if (!amount || fromId === toId || busy) return
    setBusy(true)
    await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'transfer',
        fromRecordId: fromId,
        toRecordId: toId,
        amount: Math.abs(parseFloat(amount)),
        description: desc.trim() || undefined,
      }),
    })
    onSaved()
    onClose()
  }

  const fromOptions = mode === 'account'
    ? accounts.map(a => ({ id: a.id, label: `${a.name} (${fmt(a.balance)})` }))
    : (pots ?? []).map(p => ({ id: p.id, label: `${p.accountName} — ${p.label} (${fmt(p.value)})` }))

  const toOptions = mode === 'account'
    ? accounts.map(a => ({ id: a.id, label: `${a.name} (${fmt(a.balance)})` }))
    : (pots ?? []).map(p => ({ id: p.id, label: `${p.accountName} — ${p.label} (${fmt(p.value)})` }))

  return (
    <Modal title="Transfer" onClose={onClose}>
      {/* Mode toggle */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-4">
        {[['account', 'Between accounts'], ['pot', 'Between pots']].map(([val, label]) => (
          <button key={val} onClick={() => switchMode(val)}
            className={`flex-1 text-[13px] py-1.5 rounded-md transition-colors cursor-pointer ${
              mode === val ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      <Field label="From">
        <select className={sel} value={fromId} onChange={e => setFromId(e.target.value)}>
          {fromOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </Field>
      <Field label="To">
        <select className={sel} value={toId} onChange={e => setToId(e.target.value)}>
          {toOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </Field>
      <Field label="Amount">
        <input className={inp} type="number" min="0" value={amount}
          onChange={e => setAmount(e.target.value)} placeholder="0.00" autoFocus />
      </Field>
      <Field label="Description (optional)">
        <input className={inp} value={desc} onChange={e => setDesc(e.target.value)} />
      </Field>
      <Actions onCancel={onClose} onSubmit={submit} label={busy ? 'Transferring…' : 'Transfer'} disabled={busy || fromId === toId || !amount} />
    </Modal>
  )
}

// ─── Three-dot menu ───────────────────────────────────────────────────────────

function RecordMenu({ record, onAddTransaction, onEditValue, onDelete }) {
  const [open,    setOpen]    = useState(false)
  const [txns,    setTxns]    = useState(null)
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [open])

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && txns === null) {
      setLoading(true)
      const res = await fetch(`/api/transactions?recordId=${record.id}&limit=3`)
      setTxns(await res.json())
      setLoading(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        className={cn(
          'w-7 h-7 flex items-center justify-center rounded-md text-[18px] tracking-widest leading-none',
          'text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer',
          open && 'bg-gray-100 text-gray-700'
        )}
      >···</button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-xl z-30 overflow-hidden shadow-sm">
          {/* Transactions */}
          <div className="px-3.5 py-3 border-b border-gray-100">
            <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-2">Recent transactions</p>
            {loading && <p className="text-[13px] text-gray-400 py-1">Loading…</p>}
            {!loading && txns?.length === 0 && (
              <p className="text-[13px] text-gray-400 py-1">No transactions yet.</p>
            )}
            {!loading && txns?.length > 0 && (
              <div className="space-y-2.5">
                {txns.map(t => (
                  <div key={t.id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13px] text-gray-800 truncate">{t.description}</p>
                      <p className="text-[11px] text-gray-400">{fmtDate(t.txnDate)}</p>
                    </div>
                    <span className={`text-[13px] font-medium shrink-0 ${t.amount >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {fmtSigned(t.amount)}
                    </span>
                  </div>
                ))}
                {record.kind === 'pot' && (
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <span className="text-[12px] text-gray-400">Running total</span>
                    <span className="text-[13px] font-medium text-gray-800">{fmt(record.value)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="py-1">
            <button onClick={() => { setOpen(false); onAddTransaction() }}
              className="w-full text-left px-3.5 py-2 text-[13px] text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer">
              <span className="text-gray-400 w-4 text-center">+</span> Add transaction
            </button>
            {record.kind !== 'pot' && (
              <button onClick={() => { setOpen(false); onEditValue() }}
                className="w-full text-left px-3.5 py-2 text-[13px] text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer">
                <span className="text-gray-400 w-4 text-center">✎</span> Edit value
              </button>
            )}
            <button onClick={() => { setOpen(false); onDelete() }}
              className="w-full text-left px-3.5 py-2 text-[13px] text-red-500 hover:bg-red-50 flex items-center gap-2.5 cursor-pointer">
              <span className="w-4 text-center">✕</span> Delete record
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Record Row ───────────────────────────────────────────────────────────────

function RecordRow({ record, onAddTransaction, onDelete, onRefresh }) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(String(record.value))
  const inputRef = useRef(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  async function commitEdit() {
    const val = parseFloat(draft)
    if (!isNaN(val) && record.kind !== 'pot') {
      await fetch(`/api/records/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixedAmount: val }),
      })
      onRefresh()
    }
    setEditing(false)
  }

  const pos = record.value >= 0

  return (
    <div className="grid items-center gap-2 px-4 py-2.5 border-t border-gray-100 hover:bg-gray-50/60 transition-colors"
      style={{ gridTemplateColumns: '1fr auto auto auto' }}>

      <div className="min-w-0">
        <p className="text-[14px] text-gray-800 truncate">{record.label}</p>
        {record.note && <p className="text-[12px] text-gray-400">{record.note}</p>}
      </div>

      <Badge kind={record.kind} />

      {editing && record.kind !== 'pot' ? (
        <input
          ref={inputRef}
          type="number"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false) }}
          className="w-28 text-right text-[14px] font-medium px-2 py-0.5 border border-gray-300 rounded-md focus:outline-none focus:border-gray-500"
        />
      ) : (
        <button
          onClick={() => record.kind !== 'pot' && setEditing(true)}
          title={record.kind !== 'pot' ? 'Click to edit' : undefined}
          className={cn(
            'text-[14px] font-medium text-right min-w-[90px] px-1.5 py-0.5 rounded-md transition-colors',
            record.kind !== 'pot' ? 'hover:bg-gray-100 cursor-pointer' : 'cursor-default',
            pos ? 'text-emerald-600' : 'text-red-500'
          )}
        >
          {record.kind === 'pot' ? fmt(record.value) : fmtSigned(record.value)}
        </button>
      )}

      <RecordMenu
        record={record}
        onAddTransaction={onAddTransaction}
        onEditValue={() => setEditing(true)}
        onDelete={onDelete}
      />
    </div>
  )
}

// ─── Account Card ─────────────────────────────────────────────────────────────

function AccountCard({ account, onAddRecord, onDelete, onRefresh, openModal, refreshTick }) {
  const [open,    setOpen]    = useState(() => {
    try {
      const v = localStorage.getItem(`acct-open:${account.id}`)
      return v === null ? true : v === 'true'
    } catch { return true }
  })
  const [records, setRecords] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/records?accountId=${account.id}`)
    setRecords(await res.json())
    setLoading(false)
  }, [account.id])

  useEffect(() => { if (open && records === null) fetchRecords() }, [open, records, fetchRecords])
  // Re-fetch when a parent-triggered refresh occurs (e.g. after a transfer)
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    if (open) fetchRecords()
  }, [refreshTick]) // eslint-disable-line react-hooks/exhaustive-deps

  async function deleteRecord(id) {
    await fetch(`/api/records/${id}`, { method: 'DELETE' })
    fetchRecords()
    onRefresh()
  }

  const total = records?.reduce((s, r) => s + r.value, 0) ?? 0

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-visible">

      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-gray-50 rounded-xl transition-colors"
        onClick={() => setOpen(v => {
          const next = !v
          try { localStorage.setItem(`acct-open:${account.id}`, String(next)) } catch {}
          return next
        })}
      >
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: account.color }} />
          <span className="text-[15px] font-medium text-gray-900">{account.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[17px] font-medium text-gray-900">{fmt(account.balance)}</span>
          <button
            onClick={e => { e.stopPropagation(); onAddRecord() }}
            className="text-[12px] px-2.5 py-1 border border-gray-200 rounded-md hover:bg-gray-100 text-gray-600 cursor-pointer"
          >+ Record</button>
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="text-[12px] px-2.5 py-1 border border-red-100 rounded-md hover:bg-red-50 text-red-500 cursor-pointer"
          >Delete</button>
          <span className="text-gray-400 text-sm select-none">{open ? '⌃' : '⌄'}</span>
        </div>
      </div>

      {/* Records section */}
      {open && (
        <div className="border-t border-gray-100">
          <div className="flex justify-between px-4 py-2 bg-gray-50">
            <span className="text-[11px] uppercase tracking-wider text-gray-400">Records</span>
            <span className="text-[11px] text-gray-400">
              {records?.length ?? '—'} item{records?.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading && <Spinner />}

          {!loading && records?.length === 0 && (
            <p className="text-center text-[13px] text-gray-400 py-6">No records yet.</p>
          )}

          {!loading && records?.map(rec => (
            <RecordRow
              key={rec.id}
              record={rec}
              onAddTransaction={() => openModal({ type: 'addTransaction', recordId: rec.id, recordLabel: rec.label })}
              onDelete={() => deleteRecord(rec.id)}
              onRefresh={() => { fetchRecords(); onRefresh() }}
            />
          ))}

          {!loading && records?.length > 0 && (
            <div className="flex justify-between px-4 py-2.5 bg-gray-50 border-t border-gray-100">
              <span className="text-[13px] text-gray-500">Account total</span>
              <span className="text-[14px] font-medium text-gray-800">{fmt(total)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Recent Transactions ──────────────────────────────────────────────────────

function RecentTransactionsModal({ onClose }) {
  const [txns, setTxns] = useState(null)

  useEffect(() => {
    fetch('/api/transactions?recent=10')
      .then(r => r.json())
      .then(data => setTxns(Array.isArray(data) ? data : []))
      .catch(() => setTxns([]))
  }, [])

  return (
    <Modal title="Recent transactions" onClose={onClose}>
      {txns === null ? <Spinner /> : txns.length === 0 ? (
        <p className="text-[13px] text-gray-400 text-center py-4">No transactions yet.</p>
      ) : (
        <div className="space-y-px">
          {txns.map(t => (
            <div key={t.id} className="flex items-start justify-between gap-3 py-2.5 border-b border-gray-50 last:border-0">
              <div className="min-w-0">
                <p className="text-[13px] text-gray-800 truncate">{t.description}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {t.accountName} · {t.recordLabel} · {t.txnDate}
                </p>
              </div>
              <span className={`text-[13px] font-medium shrink-0 ${t.amount >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {fmtSigned(t.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

// ─── Scheduled Transfers ──────────────────────────────────────────────────────

const FREQ_LABELS = { weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly' }

function ScheduledTransfersModal({ onClose, onSaved }) {
  const [schedules, setSchedules] = useState(null)
  const [pots,      setPots]      = useState(null)
  const [adding,    setAdding]    = useState(false)
  const [busy,      setBusy]      = useState(false)

  // form state
  const [label,     setLabel]     = useState('')
  const [kind,      setKind]      = useState('income')
  const [fromId,    setFromId]    = useState('')
  const [toId,      setToId]      = useState('')
  const [amount,    setAmount]    = useState('')
  const [frequency, setFrequency] = useState('monthly')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])

  const fetchSchedules = useCallback(async () => {
    const res  = await fetch('/api/scheduled-transfers')
    const data = await res.json()
    setSchedules(Array.isArray(data) ? data : [])
  }, [])

  useEffect(() => {
    fetchSchedules()
    fetch('/api/records?kind=pot')
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : []
        setPots(list)
        setFromId(list[0]?.id ?? '')
        setToId(list[1]?.id ?? '')
      })
  }, [fetchSchedules])

  async function deleteSchedule(id) {
    await fetch(`/api/scheduled-transfers/${id}`, { method: 'DELETE' })
    fetchSchedules()
    onSaved()
  }

  async function submit() {
    if (!label.trim() || !toId || !amount || busy) return
    setBusy(true)
    await fetch('/api/scheduled-transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, kind, fromId: kind === 'transfer' ? fromId : undefined, toId, amount: parseFloat(amount), frequency, startDate }),
    })
    setBusy(false)
    setAdding(false)
    setLabel('')
    setAmount('')
    fetchSchedules()
    onSaved()
  }

  return (
    <Modal title="Scheduled transfers" onClose={onClose}>
      {/* List */}
      {schedules === null ? (
        <Spinner />
      ) : schedules.length === 0 && !adding ? (
        <p className="text-[13px] text-gray-400 text-center py-4">No scheduled transfers yet.</p>
      ) : (
        <div className="space-y-2 mb-4">
          {schedules.map(s => (
            <div key={s.id} className="flex items-start justify-between gap-3 px-3 py-2.5 bg-gray-50 rounded-lg">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-gray-800 truncate">{s.label}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {s.kind === 'income' ? `→ ${s.toLabel}` : `${s.fromLabel} → ${s.toLabel}`}
                </p>
                <p className="text-[11px] text-gray-400">
                  {FREQ_LABELS[s.frequency]} · next {s.nextRun}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[13px] font-medium text-emerald-600">+{fmt(s.amount)}</span>
                <button onClick={() => deleteSchedule(s.id)}
                  className="text-[11px] text-red-400 hover:text-red-600 cursor-pointer">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {adding ? (
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <Field label="Description">
            <input className={inp} value={label} onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Monthly salary" autoFocus />
          </Field>
          <Field label="Type">
            <select className={sel} value={kind} onChange={e => setKind(e.target.value)}>
              <option value="income">Income (deposit into pot)</option>
              <option value="transfer">Transfer (pot → pot)</option>
            </select>
          </Field>
          {kind === 'transfer' && (
            <Field label="From pot">
              <select className={sel} value={fromId} onChange={e => setFromId(e.target.value)}>
                {(pots ?? []).map(p => (
                  <option key={p.id} value={p.id}>{p.accountName} — {p.label} ({fmt(p.value)})</option>
                ))}
              </select>
            </Field>
          )}
          <Field label={kind === 'transfer' ? 'To pot' : 'Target pot'}>
            <select className={sel} value={toId} onChange={e => setToId(e.target.value)}>
              {(pots ?? []).map(p => (
                <option key={p.id} value={p.id}>{p.accountName} — {p.label} ({fmt(p.value)})</option>
              ))}
            </select>
          </Field>
          <Field label="Amount">
            <input className={inp} type="number" min="0" value={amount}
              onChange={e => setAmount(e.target.value)} placeholder="0.00" />
          </Field>
          <Field label="Frequency">
            <select className={sel} value={frequency} onChange={e => setFrequency(e.target.value)}>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </Field>
          <Field label="First run date">
            <input className={inp} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </Field>
          <Actions onCancel={() => setAdding(false)} onSubmit={submit}
            label={busy ? 'Saving…' : 'Save schedule'} disabled={busy || !label.trim() || !toId || !amount} />
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full py-2 text-[13px] border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors cursor-pointer">
          + New scheduled transfer
        </button>
      )}
    </Modal>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [accounts,    setAccounts]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [modal,       setModal]       = useState({ type: null })
  const [refreshTick, setRefreshTick] = useState(0)

  const fetchAccounts = useCallback(async () => {
    const res = await fetch('/api/accounts')
    setAccounts(await res.json())
    setLoading(false)
    setRefreshTick(t => t + 1)
  }, [])

  useEffect(() => {
    fetchAccounts()
    fetch('/api/scheduled-transfers/run', { method: 'POST' })
      .then(r => r.json())
      .then(({ executed }) => { if (executed > 0) fetchAccounts() })
      .catch(() => {})
  }, [fetchAccounts])

  async function deleteAccount(id) {
    if (!confirm('Delete this account and all its records?')) return
    await fetch(`/api/accounts/${id}`, { method: 'DELETE' })
    fetchAccounts()
  }

  const netWorth  = accounts.reduce((s, a) => s + a.balance, 0)
  const closeModal = () => setModal({ type: null })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-[20px] font-medium text-gray-900">Financial Ledger</h1>
            {!loading && (
              <p className="text-[13px] text-gray-500 mt-0.5">
                Net worth: <span className="font-medium text-gray-800">{fmt(netWorth)}</span>
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <button
              onClick={() => setModal({ type: 'addRecord', accountId: accounts[0]?.id })}
              className="px-3.5 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 cursor-pointer"
            >+ Add record</button>
            <button
              onClick={() => setModal({ type: 'transfer' })}
              className="px-3.5 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-700 cursor-pointer"
            >⇆ Transfer</button>
            <button
              onClick={() => setModal({ type: 'addAccount' })}
              className="px-3.5 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-700 cursor-pointer"
            >+ Account</button>
            <button
              onClick={() => setModal({ type: 'scheduled' })}
              className="px-3.5 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-700 cursor-pointer"
            >⏱ Scheduled</button>
            <button
              onClick={() => setModal({ type: 'history' })}
              className="px-3.5 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-700 cursor-pointer"
              title="Recent transactions"
            >🕐 History</button>
          </div>
        </div>

        {/* Accounts */}
        {loading ? <Spinner /> : (
          <div className="space-y-4">
            {accounts.length === 0 && (
              <div className="text-center py-20">
                <p className="text-[15px] text-gray-400 mb-2">No accounts yet.</p>
                <button
                  onClick={() => setModal({ type: 'addAccount' })}
                  className="text-[13px] text-gray-600 underline underline-offset-2 cursor-pointer"
                >Add your first account</button>
              </div>
            )}
            {accounts.map(account => (
              <AccountCard
                key={account.id}
                account={account}
                onAddRecord={() => setModal({ type: 'addRecord', accountId: account.id })}
                onDelete={() => deleteAccount(account.id)}
                onRefresh={fetchAccounts}
                openModal={setModal}
                refreshTick={refreshTick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {modal.type === 'addAccount' && (
        <AddAccountModal onClose={closeModal} onSaved={fetchAccounts} />
      )}
      {modal.type === 'addRecord' && (
        <AddRecordModal
          accounts={accounts}
          defaultAccountId={modal.accountId}
          onClose={closeModal}
          onSaved={fetchAccounts}
        />
      )}
      {modal.type === 'addTransaction' && (
        <AddTransactionModal
          recordId={modal.recordId}
          recordLabel={modal.recordLabel}
          onClose={closeModal}
          onSaved={fetchAccounts}
        />
      )}
      {modal.type === 'transfer' && (
        <TransferModal accounts={accounts} onClose={closeModal} onSaved={fetchAccounts} />
      )}
      {modal.type === 'scheduled' && (
        <ScheduledTransfersModal onClose={closeModal} onSaved={fetchAccounts} />
      )}
      {modal.type === 'history' && (
        <RecentTransactionsModal onClose={closeModal} />
      )}
    </div>
  )
}