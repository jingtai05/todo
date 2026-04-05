import { useEffect, useMemo, useState } from 'react'

export function useLocalStorageState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // ignore
    }
  }, [key, value])

  return [value, setValue] as const
}

export function OverlayModal({
  open,
  title,
  onClose,
  children,
  widthClass = 'max-w-lg',
}: {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  widthClass?: string
}) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/30 backdrop-blur-[2px]"
      />
      <div className={`relative mx-auto mt-20 w-[92vw] ${widthClass} px-4 sm:px-0`}>
        <div className="glass rounded-3xl p-5 shadow-crisp">
          <div className="flex items-start justify-between gap-4">
            <div className="text-sm font-semibold text-slate-950">{title}</div>
            <button
              onClick={onClose}
              className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-900 ring-1 ring-slate-950/10 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </div>
  )
}

export type ActivityItem = {
  id: string
  at: string
  workspaceName: string
  text: string
  actorId?: string
  actorLabel?: string
}

export function ActivityPanel({
  items,
  currentUserId,
}: {
  items: ActivityItem[]
  currentUserId: string | null
}) {
  const [mode, setMode] = useState<'all' | 'mine'>('all')

  const visible = useMemo(() => {
    const filtered =
      mode === 'mine' && currentUserId
        ? items.filter((x) => x.actorId === currentUserId)
        : items
    return [...filtered].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 50)
  }, [currentUserId, items, mode])

  const grouped = useMemo(() => {
    const map = new Map<string, ActivityItem[]>()
    for (const item of visible) {
      const date = new Date(item.at)
      let dateKey = ''
      
      const today = new Date()
      const yesterday = new Date()
      yesterday.setDate(today.getDate() - 1)
      
      if (date.toDateString() === today.toDateString()) {
        dateKey = 'Today'
      } else if (date.toDateString() === yesterday.toDateString()) {
        dateKey = 'Yesterday'
      } else {
        dateKey = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      }
      
      if (!map.has(dateKey)) map.set(dateKey, [])
      map.get(dateKey)!.push(item)
    }
    return Array.from(map.entries())
  }, [visible])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex rounded-2xl bg-slate-100 p-1 ring-1 ring-slate-950/10">
          <button
            type="button"
            onClick={() => setMode('all')}
            className={`rounded-2xl px-3 py-1.5 text-xs font-semibold ${
              mode === 'all'
                ? 'bg-slate-950 text-slate-50'
                : 'text-slate-700 hover:text-slate-950'
            }`}
          >
            All activity
          </button>
          <button
            type="button"
            onClick={() => setMode('mine')}
            disabled={!currentUserId}
            className={`rounded-2xl px-3 py-1.5 text-xs font-semibold ${
              mode === 'mine'
                ? 'bg-slate-950 text-slate-50'
                : 'text-slate-700 hover:text-slate-950'
            } disabled:opacity-60`}
          >
            My activity
          </button>
        </div>
        <div className="text-[11px] font-semibold text-slate-700">
          Showing {mode === 'mine' ? 'your events' : 'all events'} (last 50)
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-800 ring-1 ring-slate-950/10">
          {mode === 'mine'
            ? 'No personal activity yet in this session.'
            : 'No activity yet. Create/move/delete a task to see events here.'}
        </div>
      ) : (
        <div className="max-h-[70dvh] space-y-4 overflow-auto pr-1">
          {grouped.map(([dateKey, groupItems]) => (
            <div key={dateKey}>
              <div className="sticky top-0 z-10 pb-2 pt-1 text-xs font-bold tracking-wide text-slate-500 uppercase">
                {dateKey}
              </div>
              <div className="space-y-2 mt-1">
                {groupItems.map((x) => {
                  const isMine = !!currentUserId && x.actorId === currentUserId
                  const actor =
                    x.actorLabel ??
                    (isMine ? 'You' : x.actorId ? `${x.actorId.slice(0, 8)}…` : 'Unknown')
                  return (
                    <div
                      key={x.id}
                      className={`rounded-2xl p-4 ring-1 ${
                        isMine
                          ? 'bg-indigo-500/10 ring-indigo-500/20'
                          : 'bg-slate-100 ring-slate-950/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-slate-950">
                              {x.workspaceName}
                            </span>
                            <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-slate-800 ring-1 ring-slate-950/10">
                              {actor}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 text-xs text-slate-700">
                          {new Date(x.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div className="mt-1 text-sm text-slate-800">{x.text}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ConfirmModal({
  open,
  title,
  description,
  onConfirm,
  onClose,
  requireTypeToConfirm,
  confirmText = 'Confirm',
  isDestructive = true,
}: {
  open: boolean
  title: string
  description: string
  onConfirm: () => void
  onClose: () => void
  requireTypeToConfirm?: string
  confirmText?: string
  isDestructive?: boolean
}) {
  const [typed, setTyped] = useState('')

  useEffect(() => {
    if (open) setTyped('')
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      } else if (e.key === 'Enter') {
        e.stopPropagation()
        const disabled = requireTypeToConfirm ? typed.trim() !== requireTypeToConfirm.trim() : false
        if (!disabled) {
          onConfirm()
          onClose()
        }
      }
    }
    // Use capture phase so we intercept before sidebar/backdrop handlers
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onClose, onConfirm, open, requireTypeToConfirm, typed])

  if (!open) return null

  const disableConfirm = requireTypeToConfirm ? typed.trim() !== requireTypeToConfirm.trim() : false

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
      />
      <div className="relative mx-auto mt-24 w-[92vw] max-w-sm px-4 sm:px-0">
        <div className="glass rounded-3xl p-6 shadow-crisp">
          <div className="text-lg font-semibold text-slate-950">{title}</div>
          <div className="mt-2 text-sm text-slate-800">{description}</div>
          
          {requireTypeToConfirm && (
            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-900">
                To confirm, type "{requireTypeToConfirm}"
              </label>
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                className="mt-2 w-full rounded-2xl bg-white/70 px-4 py-3 text-sm font-semibold text-slate-950 ring-1 ring-slate-950/10 outline-none focus:ring-slate-950/20"
                autoFocus
              />
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-950/10 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={disableConfirm}
              onClick={() => {
                if (!disableConfirm) {
                  onConfirm()
                  onClose()
                }
              }}
              className={`rounded-2xl px-5 py-2 text-sm font-semibold text-slate-50 shadow-crisp disabled:opacity-50 ${
                isDestructive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-950 hover:bg-slate-900'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


