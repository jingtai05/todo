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
        className="absolute inset-0 bg-charcoal-950/30 backdrop-blur-[2px]"
      />
      <div className={`relative mx-auto mt-20 w-[92vw] ${widthClass} px-4 sm:px-0`}>
        <div className="glass rounded-3xl p-5 shadow-crisp">
          <div className="flex items-start justify-between gap-4">
            <div className="text-sm font-semibold text-charcoal-950">{title}</div>
            <button
              onClick={onClose}
              className="rounded-2xl bg-paper-100 px-3 py-2 text-xs font-semibold text-charcoal-900 ring-1 ring-charcoal-950/10 hover:bg-paper-50"
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

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex rounded-2xl bg-paper-100 p-1 ring-1 ring-charcoal-950/10">
          <button
            type="button"
            onClick={() => setMode('all')}
            className={`rounded-2xl px-3 py-1.5 text-xs font-semibold ${
              mode === 'all'
                ? 'bg-charcoal-950 text-paper-50'
                : 'text-charcoal-700 hover:text-charcoal-950'
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
                ? 'bg-charcoal-950 text-paper-50'
                : 'text-charcoal-700 hover:text-charcoal-950'
            } disabled:opacity-60`}
          >
            My activity
          </button>
        </div>
        <div className="text-[11px] font-semibold text-charcoal-700">
          Showing {mode === 'mine' ? 'your events' : 'all events'} (last 50)
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl bg-paper-100 p-4 text-sm text-charcoal-800 ring-1 ring-charcoal-950/10">
          {mode === 'mine'
            ? 'No personal activity yet in this session.'
            : 'No activity yet. Create/move/delete a task to see events here.'}
        </div>
      ) : (
        <div className="max-h-[70dvh] space-y-2 overflow-auto pr-1">
          {visible.map((x) => {
            const isMine = !!currentUserId && x.actorId === currentUserId
            const actor =
              x.actorLabel ??
              (isMine ? 'You' : x.actorId ? `${x.actorId.slice(0, 8)}…` : 'Unknown')
            return (
              <div
                key={x.id}
                className={`rounded-2xl p-4 ring-1 ${
                  isMine
                    ? 'bg-coral-500/10 ring-coral-500/20'
                    : 'bg-paper-100 ring-charcoal-950/10'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-charcoal-950">
                        {x.workspaceName}
                      </span>
                      <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-charcoal-800 ring-1 ring-charcoal-950/10">
                        {actor}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-xs text-charcoal-700">
                    {new Date(x.at).toLocaleString()}
                  </div>
                </div>
                <div className="mt-1 text-sm text-charcoal-800">{x.text}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

