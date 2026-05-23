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
import { logout } from '@/app/actions/auth'

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

function TransferModal({ onClose, onSaved, initialFromRecordId, initialFromAccountName }) {
  const [fromId,      setFromId]      = useState(initialFromRecordId ?? '')
  const [toId,        setToId]        = useState('')
  const [fromAccount, setFromAccount] = useState(initialFromAccountName ?? '')
  const [toAccount,   setToAccount]   = useState('')
  const [records,     setRecords]     = useState(null)
  const [amount,      setAmount]      = useState('')
  const [desc,        setDesc]        = useState('')
  const [busy,        setBusy]        = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/records?kind=pot').then(r => r.json()),
      fetch('/api/records?kind=expense').then(r => r.json()),
    ]).then(([potData, expenseData]) => {
      const all = [...potData, ...expenseData]
      setRecords(all)
      if (!initialFromRecordId) {
        setFromAccount(all[0]?.accountName ?? '')
        setFromId(all[0]?.id ?? '')
      }
      const firstOther = all.find(p => p.id !== (initialFromRecordId ?? all[0]?.id))
      setToAccount(firstOther?.accountName ?? all[0]?.accountName ?? '')
      setToId(firstOther?.id ?? '')
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  const recordAccounts = [...new Set((records ?? []).map(r => r.accountName))]

  return (
    <Modal title="Transfer" onClose={onClose}>
      <Field label="From">
        <select className={sel} value={fromAccount} onChange={e => {
          setFromAccount(e.target.value)
          setFromId((records ?? []).find(r => r.accountName === e.target.value)?.id ?? '')
        }}>
          {recordAccounts.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <div className="mt-1.5 ml-3 pl-3 border-l-2 border-gray-200">
          <select className={sel} value={fromId} onChange={e => setFromId(e.target.value)}>
            {(records ?? []).filter(r => r.accountName === fromAccount).map(r => (
              <option key={r.id} value={r.id}>{r.label} ({fmt(r.value)})</option>
            ))}
          </select>
        </div>
      </Field>
      <Field label="To">
        <select className={sel} value={toAccount} onChange={e => {
          setToAccount(e.target.value)
          setToId((records ?? []).find(r => r.accountName === e.target.value)?.id ?? '')
        }}>
          {recordAccounts.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <div className="mt-1.5 ml-3 pl-3 border-l-2 border-gray-200">
          <select className={sel} value={toId} onChange={e => setToId(e.target.value)}>
            {(records ?? []).filter(r => r.accountName === toAccount).map(r => (
              <option key={r.id} value={r.id}>{r.label} ({fmt(r.value)})</option>
            ))}
          </select>
        </div>
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

function RecordMenu({ record, onAddTransaction, onEditValue, onRename, onTransfer, onDelete }) {
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
            {(record.kind === 'pot' || record.kind === 'expense') && (
              <button onClick={() => { setOpen(false); onTransfer() }}
                className="w-full text-left px-3.5 py-2 text-[13px] text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer">
                <span className="text-gray-400 w-4 text-center">⇆</span> Transfer
              </button>
            )}
            <button onClick={() => { setOpen(false); onRename() }}
              className="w-full text-left px-3.5 py-2 text-[13px] text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer">
              <span className="text-gray-400 w-4 text-center">Aa</span> Rename
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

function RecordRow({ record, onAddTransaction, onTransfer, onDelete, onRefresh, draggable, isDragging, onDragStart, onDragOver, onDrop, onDragEnd, showDropAbove, showDropBelow }) {
  const [editing,   setEditing]   = useState(false)
  const [draft,     setDraft]     = useState(String(record.value))
  const [renaming,  setRenaming]  = useState(false)
  const [draftName, setDraftName] = useState(record.label)
  const inputRef  = useRef(null)
  const renameRef = useRef(null)

  useEffect(() => { if (editing)  inputRef.current?.focus()  }, [editing])
  useEffect(() => { if (renaming) renameRef.current?.focus() }, [renaming])

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

  async function commitRename() {
    const name = draftName.trim()
    if (name && name !== record.label) {
      await fetch(`/api/records/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: name }),
      })
      onRefresh()
    } else {
      setDraftName(record.label)
    }
    setRenaming(false)
  }

  const pos = record.value >= 0
  const dropShadow = showDropAbove
    ? { boxShadow: '0 -3px 0 0 #3b82f6' }
    : showDropBelow
    ? { boxShadow: '0 3px 0 0 #3b82f6' }
    : undefined

  return (
    <div
      className={cn(
        'grid items-center gap-2 pl-1 pr-4 py-2.5 border-t border-gray-100 hover:bg-gray-50/60 transition-colors',
        isDragging && 'opacity-40'
      )}
      style={{ gridTemplateColumns: 'auto 1fr auto auto auto', ...dropShadow }}
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, record)}
      onDragOver={(e) => { const r = e.currentTarget.getBoundingClientRect(); onDragOver?.(e, record, r) }}
      onDrop={(e) => onDrop?.(e, record)}
      onDragEnd={() => onDragEnd?.()}
    >

      <span className="text-gray-300 cursor-grab px-1.5 select-none text-[15px] leading-none">⠿</span>

      <div className="min-w-0">
        {renaming ? (
          <input
            ref={renameRef}
            value={draftName}
            onChange={e => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setDraftName(record.label); setRenaming(false) } }}
            className="w-full text-[14px] text-gray-800 px-1.5 py-0.5 border border-gray-300 rounded-md focus:outline-none focus:border-gray-500"
          />
        ) : (
          <p className="text-[14px] text-gray-800 truncate">{record.label}</p>
        )}
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
        onTransfer={onTransfer}
        onRename={() => setRenaming(true)}
        onEditValue={() => setEditing(true)}
        onDelete={onDelete}
      />
    </div>
  )
}

// ─── Account Card ─────────────────────────────────────────────────────────────

function AccountCard({ account, onAddRecord, onDelete, onRefresh, openModal, refreshTick, draggable, isDragging, onDragStart, onDragOver, onDrop, onDragEnd, showDropAbove, showDropBelow }) {
  const [open,    setOpen]    = useState(() => {
    try {
      const v = localStorage.getItem(`acct-open:${account.id}`)
      return v === null ? true : v === 'true'
    } catch { return true }
  })
  const [records,       setRecords]       = useState(null)
  const [loading,       setLoading]       = useState(false)
  const [menuOpen,      setMenuOpen]      = useState(false)
  const [draggedRecord,     setDraggedRecord]     = useState(null)
  const [dragOverRecordIdx, setDragOverRecordIdx] = useState(null)
  const [renamingAccount,   setRenamingAccount]   = useState(false)
  const [draftAccountName,  setDraftAccountName]  = useState(account.name)
  const menuRef      = useRef(null)
  const accountNameRef = useRef(null)

  useEffect(() => { if (renamingAccount) accountNameRef.current?.focus() }, [renamingAccount])

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

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

  async function commitAccountRename() {
    const name = draftAccountName.trim()
    if (name && name !== account.name) {
      await fetch(`/api/accounts/${account.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      onRefresh()
    } else {
      setDraftAccountName(account.name)
    }
    setRenamingAccount(false)
  }

  function handleRecordDragStart(e, record) {
    setDraggedRecord(record)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleRecordDragOver(e, record, rect) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const hoverIdx = records.findIndex(r => r.id === record.id)
    setDragOverRecordIdx(e.clientY > rect.top + rect.height / 2 ? hoverIdx + 1 : hoverIdx)
  }

  async function handleRecordDrop(e, targetRecord) {
    e.preventDefault()
    if (!draggedRecord) return

    const fromIdx = records.findIndex(r => r.id === draggedRecord.id)
    let   toIdx   = dragOverRecordIdx ?? records.findIndex(r => r.id === targetRecord.id)

    setDragOverRecordIdx(null)
    setDraggedRecord(null)

    if (toIdx > fromIdx) toIdx--
    if (fromIdx === toIdx) return

    const next = [...records]
    next.splice(fromIdx, 1)
    next.splice(toIdx, 0, records[fromIdx])
    setRecords(next)

    await Promise.all(next.map((rec, idx) =>
      fetch(`/api/records/${rec.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayOrder: idx }),
      })
    ))
  }

  function handleRecordDragEnd() {
    setDraggedRecord(null)
    setDragOverRecordIdx(null)
  }

  const total = records?.reduce((s, r) => s + r.value, 0) ?? 0

  const dropShadow = showDropAbove
    ? { boxShadow: '0 -3px 0 0 #3b82f6' }
    : showDropBelow
    ? { boxShadow: '0 3px 0 0 #3b82f6' }
    : undefined

  return (
    <div
      className={cn('bg-white border border-gray-200 rounded-xl overflow-visible', isDragging && 'opacity-40')}
      style={dropShadow}
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, account)}
      onDragOver={(e) => { const r = e.currentTarget.getBoundingClientRect(); onDragOver?.(e, account, r) }}
      onDrop={(e) => { if (draggedRecord) return; onDrop?.(e, account) }}
      onDragEnd={() => onDragEnd?.()}
    >

      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-3.5 cursor-grab hover:bg-gray-50 rounded-xl transition-colors select-none"
        onClick={() => setOpen(v => {
          const next = !v
          try { localStorage.setItem(`acct-open:${account.id}`, String(next)) } catch {}
          return next
        })}
      >
        <div className="flex items-center gap-2">
          <span className="text-gray-300 px-1 text-[15px] leading-none shrink-0">⠿</span>
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: account.color }} />
          {renamingAccount ? (
            <input
              ref={accountNameRef}
              value={draftAccountName}
              onChange={e => setDraftAccountName(e.target.value)}
              onBlur={commitAccountRename}
              onKeyDown={e => { if (e.key === 'Enter') commitAccountRename(); if (e.key === 'Escape') { setDraftAccountName(account.name); setRenamingAccount(false) } }}
              onClick={e => e.stopPropagation()}
              className="text-[15px] font-medium text-gray-900 px-1.5 py-0.5 border border-gray-300 rounded-md focus:outline-none focus:border-gray-500 cursor-text select-text"
            />
          ) : (
            <span className="text-[15px] font-medium text-gray-900">{account.name}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[17px] font-medium text-gray-900">{fmt(account.balance)}</span>
          <div className="relative" ref={menuRef}>
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
              className="text-[16px] px-2 py-0.5 rounded-md hover:bg-gray-100 text-gray-500 cursor-pointer leading-none"
              title="Account options"
            >⋯</button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                <button
                  onClick={e => { e.stopPropagation(); setMenuOpen(false); onAddRecord() }}
                  className="w-full text-left px-3.5 py-2 text-[13px] text-gray-700 hover:bg-gray-50 cursor-pointer"
                >+ Add record</button>
                <button
                  onClick={e => { e.stopPropagation(); setMenuOpen(false); setDraftAccountName(account.name); setRenamingAccount(true) }}
                  className="w-full text-left px-3.5 py-2 text-[13px] text-gray-700 hover:bg-gray-50 cursor-pointer"
                >Rename</button>
                <button
                  onClick={e => { e.stopPropagation(); setMenuOpen(false); onDelete() }}
                  className="w-full text-left px-3.5 py-2 text-[13px] text-red-500 hover:bg-red-50 cursor-pointer"
                >Delete account</button>
              </div>
            )}
          </div>
          <span className={cn('text-gray-400 text-sm select-none leading-none', !open && '-translate-y-[4px]')}>{open ? '⌃' : '⌄'}</span>
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

          {!loading && records?.map((rec, index) => {
            const fromIdx   = records.findIndex(r => r.id === draggedRecord?.id)
            const isNoOp    = dragOverRecordIdx === fromIdx || dragOverRecordIdx === fromIdx + 1
            const showAbove = !!draggedRecord && dragOverRecordIdx === index && !isNoOp
            const showBelow = !!draggedRecord && index === records.length - 1 && dragOverRecordIdx === records.length && !isNoOp
            return (
              <RecordRow
                key={rec.id}
                record={rec}
                onAddTransaction={() => openModal({ type: 'addTransaction', recordId: rec.id, recordLabel: rec.label })}
                onTransfer={() => openModal({ type: 'transfer', fromRecordId: rec.id, fromAccountName: account.name })}
                onDelete={() => deleteRecord(rec.id)}
                onRefresh={() => { fetchRecords(); onRefresh() }}
                draggable={true}
                isDragging={draggedRecord?.id === rec.id}
                showDropAbove={showAbove}
                showDropBelow={showBelow}
                onDragStart={handleRecordDragStart}
                onDragOver={handleRecordDragOver}
                onDrop={handleRecordDrop}
                onDragEnd={handleRecordDragEnd}
              />
            )
          })}

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
    fetch('/api/transactions?recent=50')
      .then(r => r.json())
      .then(data => setTxns(Array.isArray(data) ? data : []))
      .catch(() => setTxns([]))
  }, [])

  return (
    <Modal title="Recent transactions" onClose={onClose}>
      {txns === null ? <Spinner /> : txns.length === 0 ? (
        <p className="text-[13px] text-gray-400 text-center py-4">No transactions yet.</p>
      ) : (
        <div className="space-y-px max-h-96 overflow-y-auto">
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
  const [schedules,  setSchedules]  = useState(null)
  const [pots,       setPots]       = useState(null)
  const [adding,     setAdding]     = useState(false)
  const [editingId,  setEditingId]  = useState(null)
  const [busy,       setBusy]       = useState(false)

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

  function startEditing(s) {
    setEditingId(s.id)
    setLabel(s.label)
    setKind(s.kind)
    setFromId(s.fromId ?? '')
    setToId(s.toId)
    setAmount(String(s.amount))
    setFrequency(s.frequency)
    setStartDate(s.nextRun)
  }

  function cancelForm() {
    setAdding(false)
    setEditingId(null)
    setLabel('')
    setAmount('')
  }

  async function deleteSchedule(id) {
    await fetch(`/api/scheduled-transfers/${id}`, { method: 'DELETE' })
    fetchSchedules()
    onSaved()
  }

  async function submit() {
    if (!label.trim() || !toId || !amount || busy) return
    setBusy(true)
    if (editingId) {
      await fetch(`/api/scheduled-transfers/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, kind, fromId: kind === 'transfer' ? fromId : undefined, toId, amount: parseFloat(amount), frequency, nextRun: startDate }),
      })
    } else {
      await fetch('/api/scheduled-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, kind, fromId: kind === 'transfer' ? fromId : undefined, toId, amount: parseFloat(amount), frequency, startDate }),
      })
    }
    setBusy(false)
    cancelForm()
    fetchSchedules()
    onSaved()
  }

  const showForm = adding || editingId !== null

  return (
    <Modal title="Scheduled transfers" onClose={onClose}>
      {/* List */}
      {schedules === null ? (
        <Spinner />
      ) : schedules.length === 0 && !showForm ? (
        <p className="text-[13px] text-gray-400 text-center py-4">No scheduled transfers yet.</p>
      ) : !showForm ? (
        <div className="space-y-2 mb-4 max-h-64 overflow-y-auto pr-1">
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
                <button onClick={() => startEditing(s)}
                  className="text-[11px] text-gray-400 hover:text-gray-600 cursor-pointer">✎</button>
                <button onClick={() => deleteSchedule(s.id)}
                  className="text-[11px] text-red-400 hover:text-red-600 cursor-pointer">✕</button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Add / Edit form */}
      {showForm ? (
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
                {Object.entries(
                  (pots ?? []).reduce((acc, p) => { (acc[p.accountName] ??= []).push(p); return acc }, {})
                ).map(([acctName, acctPots]) => (
                  <optgroup key={acctName} label={acctName}>
                    {acctPots.map(p => <option key={p.id} value={p.id}>{p.label} ({fmt(p.value)})</option>)}
                  </optgroup>
                ))}
              </select>
            </Field>
          )}
          <Field label={kind === 'transfer' ? 'To pot' : 'Target pot'}>
            <select className={sel} value={toId} onChange={e => setToId(e.target.value)}>
              {Object.entries(
                (pots ?? []).reduce((acc, p) => { (acc[p.accountName] ??= []).push(p); return acc }, {})
              ).map(([acctName, acctPots]) => (
                <optgroup key={acctName} label={acctName}>
                  {acctPots.map(p => <option key={p.id} value={p.id}>{p.label} ({fmt(p.value)})</option>)}
                </optgroup>
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
          <Field label={editingId ? 'Next run date' : 'First run date'}>
            <input className={inp} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </Field>
          <Actions onCancel={cancelForm} onSubmit={submit}
            label={busy ? 'Saving…' : editingId ? 'Save changes' : 'Save schedule'}
            disabled={busy || !label.trim() || !toId || !amount} />
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

// ─── Bills ────────────────────────────────────────────────────────────────────

function BillsModal({ onClose, onSaved }) {
  const [bills,      setBills]      = useState(null)
  const [pots,       setPots]       = useState(null)
  const [adding,     setAdding]     = useState(false)
  const [editingId,  setEditingId]  = useState(null)
  const [busy,       setBusy]       = useState(false)

  const [label,     setLabel]     = useState('')
  const [potId,     setPotId]     = useState('')
  const [amount,    setAmount]    = useState('')
  const [frequency, setFrequency] = useState('monthly')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])

  const fetchBills = useCallback(async () => {
    const res  = await fetch('/api/bills')
    const data = await res.json()
    setBills(Array.isArray(data) ? data : [])
  }, [])

  useEffect(() => {
    fetchBills()
    fetch('/api/records?kind=pot')
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : []
        setPots(list)
        setPotId(list[0]?.id ?? '')
      })
  }, [fetchBills])

  function startEditing(b) {
    setEditingId(b.id)
    setLabel(b.label)
    setPotId(b.potId)
    setAmount(String(b.amount))
    setFrequency(b.frequency)
    setStartDate(b.nextRun)
  }

  function cancelForm() {
    setAdding(false)
    setEditingId(null)
    setLabel('')
    setAmount('')
  }

  async function deleteBill(id) {
    await fetch(`/api/bills/${id}`, { method: 'DELETE' })
    fetchBills()
    onSaved()
  }

  async function submit() {
    if (!label.trim() || !potId || !amount || busy) return
    setBusy(true)
    if (editingId) {
      await fetch(`/api/bills/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, potId, amount: parseFloat(amount), frequency, nextRun: startDate }),
      })
    } else {
      await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, potId, amount: parseFloat(amount), frequency, startDate }),
      })
    }
    setBusy(false)
    cancelForm()
    fetchBills()
    onSaved()
  }

  const showForm = adding || editingId !== null

  const potsByAccount = Object.entries(
    (pots ?? []).reduce((acc, p) => { (acc[p.accountName] ??= []).push(p); return acc }, {})
  )

  return (
    <Modal title="Bills" onClose={onClose}>
      {bills === null ? (
        <Spinner />
      ) : bills.length === 0 && !showForm ? (
        <p className="text-[13px] text-gray-400 text-center py-4">No bills yet.</p>
      ) : !showForm ? (
        <div className="space-y-2 mb-4 max-h-64 overflow-y-auto pr-1">
          {bills.map(b => (
            <div key={b.id} className="flex items-start justify-between gap-3 px-3 py-2.5 bg-gray-50 rounded-lg">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-gray-800 truncate">{b.label}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 truncate">{b.potLabel}</p>
                <p className="text-[11px] text-gray-400">{FREQ_LABELS[b.frequency]} · next {b.nextRun}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[13px] font-medium text-red-500">-{fmt(b.amount)}</span>
                <button onClick={() => startEditing(b)}
                  className="text-[11px] text-gray-400 hover:text-gray-600 cursor-pointer">✎</button>
                <button onClick={() => deleteBill(b.id)}
                  className="text-[11px] text-red-400 hover:text-red-600 cursor-pointer">✕</button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {showForm ? (
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <Field label="Bill name">
            <input className={inp} value={label} onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Netflix, Rent" autoFocus />
          </Field>
          <Field label="Deduct from pot">
            <select className={sel} value={potId} onChange={e => setPotId(e.target.value)}>
              {potsByAccount.map(([acctName, acctPots]) => (
                <optgroup key={acctName} label={acctName}>
                  {acctPots.map(p => <option key={p.id} value={p.id}>{p.label} ({fmt(p.value)})</option>)}
                </optgroup>
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
          <Field label={editingId ? 'Next due date' : 'First due date'}>
            <input className={inp} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </Field>
          <Actions onCancel={cancelForm} onSubmit={submit}
            label={busy ? 'Saving…' : editingId ? 'Save changes' : 'Add bill'}
            disabled={busy || !label.trim() || !potId || !amount} />
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full py-2 text-[13px] border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors cursor-pointer">
          + New bill
        </button>
      )}
    </Modal>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [accounts,       setAccounts]       = useState([])
  const [loading,        setLoading]        = useState(true)
  const [modal,          setModal]          = useState({ type: null })
  const [refreshTick,    setRefreshTick]    = useState(0)
  const [draggedAccount, setDraggedAccount] = useState(null)
  const [dragOverIndex,  setDragOverIndex]  = useState(null)

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
    fetch('/api/bills/run', { method: 'POST' })
      .then(r => r.json())
      .then(({ executed }) => { if (executed > 0) fetchAccounts() })
      .catch(() => {})
  }, [fetchAccounts])

  async function deleteAccount(id) {
    if (!confirm('Delete this account and all its records?')) return
    await fetch(`/api/accounts/${id}`, { method: 'DELETE' })
    fetchAccounts()
  }

  function handleAccountDragStart(e, account) {
    setDraggedAccount(account)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleAccountDragOver(e, account, rect) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const hoverIdx = accounts.findIndex(a => a.id === account.id)
    setDragOverIndex(e.clientY > rect.top + rect.height / 2 ? hoverIdx + 1 : hoverIdx)
  }

  async function handleAccountDrop(e, targetAccount) {
    e.preventDefault()
    if (!draggedAccount) return

    const fromIdx = accounts.findIndex(a => a.id === draggedAccount.id)
    let   toIdx   = dragOverIndex ?? accounts.findIndex(a => a.id === targetAccount.id)

    setDragOverIndex(null)
    setDraggedAccount(null)

    if (toIdx > fromIdx) toIdx--
    if (fromIdx === toIdx) return

    const next = [...accounts]
    next.splice(fromIdx, 1)
    next.splice(toIdx, 0, accounts[fromIdx])
    setAccounts(next)

    await Promise.all(next.map((acc, idx) =>
      fetch(`/api/accounts/${acc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayOrder: idx }),
      })
    ))
  }

  function handleAccountDragEnd() {
    setDraggedAccount(null)
    setDragOverIndex(null)
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
              onClick={() => setModal({ type: 'addAccount' })}
              className="px-3.5 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-700 cursor-pointer"
            >+ Account</button>
            <button
              onClick={() => setModal({ type: 'transfer' })}
              className="px-3.5 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-700 cursor-pointer"
            >⇆ Transfer</button>
            <button
              onClick={() => setModal({ type: 'scheduled' })}
              className="px-3.5 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-700 cursor-pointer"
            >⏱ Scheduled</button>
            <button
              onClick={() => setModal({ type: 'bills' })}
              className="px-3.5 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-700 cursor-pointer"
            >🧾 Bills</button>
            <button
              onClick={() => setModal({ type: 'history' })}
              className="px-3.5 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-700 cursor-pointer"
              title="Recent transactions"
            >🕐 History</button>
            <form action={logout}>
              <button
                type="submit"
                className="px-3.5 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-500 cursor-pointer"
                title="Sign out"
              >Sign out</button>
            </form>
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
            {accounts.map((account, index) => {
              const fromIdx   = accounts.findIndex(a => a.id === draggedAccount?.id)
              const isNoOp    = dragOverIndex === fromIdx || dragOverIndex === fromIdx + 1
              const showAbove = !!draggedAccount && dragOverIndex === index && !isNoOp
              const showBelow = !!draggedAccount && index === accounts.length - 1 && dragOverIndex === accounts.length && !isNoOp
              return (
                <AccountCard
                  key={account.id}
                  account={account}
                  onAddRecord={() => setModal({ type: 'addRecord', accountId: account.id })}
                  onDelete={() => deleteAccount(account.id)}
                  onRefresh={fetchAccounts}
                  openModal={setModal}
                  refreshTick={refreshTick}
                  draggable={true}
                  isDragging={draggedAccount?.id === account.id}
                  showDropAbove={showAbove}
                  showDropBelow={showBelow}
                  onDragStart={handleAccountDragStart}
                  onDragOver={handleAccountDragOver}
                  onDrop={handleAccountDrop}
                  onDragEnd={handleAccountDragEnd}
                />
              )
            })}
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
        <TransferModal
          initialFromRecordId={modal.fromRecordId}
          initialFromAccountName={modal.fromAccountName}
          onClose={closeModal}
          onSaved={fetchAccounts}
        />
      )}
      {modal.type === 'scheduled' && (
        <ScheduledTransfersModal onClose={closeModal} onSaved={fetchAccounts} />
      )}
      {modal.type === 'bills' && (
        <BillsModal onClose={closeModal} onSaved={fetchAccounts} />
      )}
      {modal.type === 'history' && (
        <RecentTransactionsModal onClose={closeModal} />
      )}
    </div>
  )
}