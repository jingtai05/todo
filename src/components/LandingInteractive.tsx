import { useEffect, useMemo, useState } from 'react'

type DemoTodo = {
  id: string
  title: string
  completed: boolean
}

const LS_KEY = 'tododesk_demo_todos_v1'

function uid() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function DemoTodosCard() {
  const [title, setTitle] = useState('')
  const [todos, setTodos] = useState<DemoTodo[]>([])

  useEffect(() => {
    const fromLs = safeJsonParse<DemoTodo[]>(localStorage.getItem(LS_KEY))
    if (Array.isArray(fromLs) && fromLs.length > 0) {
      setTodos(fromLs)
      return
    }
    setTodos([
      { id: uid(), title: 'Draft weekly plan', completed: true },
      { id: uid(), title: 'Ship one small improvement', completed: false },
      { id: uid(), title: 'Close the loop on inbox', completed: false },
    ])
  }, [])

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(todos))
  }, [todos])

  const remaining = useMemo(
    () => todos.filter((t) => !t.completed).length,
    [todos],
  )

  function add(e: React.FormEvent) {
    e.preventDefault()
    const clean = title.trim()
    if (!clean) return
    setTodos((prev) => [{ id: uid(), title: clean, completed: false }, ...prev])
    setTitle('')
  }

  return (
    <div className="rounded-3xl bg-paper-100 p-6 ring-1 ring-charcoal-950/10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-charcoal-950">
            Demo todos
          </div>
          <div className="mt-1 text-xs text-charcoal-700">
            Try the interactions. Saved locally (no account needed).
          </div>
        </div>
        <div className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-charcoal-800 ring-1 ring-charcoal-950/10">
          {remaining} left
        </div>
      </div>

      <form onSubmit={add} className="mt-4 flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a demo task…"
          className="w-full rounded-2xl bg-white/70 px-4 py-3 text-sm text-charcoal-950 placeholder:text-charcoal-500 ring-1 ring-charcoal-950/10 outline-none focus:ring-charcoal-950/20"
        />
        <button
          type="submit"
          className="shrink-0 rounded-2xl bg-charcoal-950 px-4 py-3 text-sm font-semibold text-paper-50 shadow-crisp transition hover:-translate-y-0.5"
        >
          Add
        </button>
      </form>

      <div className="mt-4 space-y-2">
        {todos.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-3 rounded-2xl bg-white/70 px-3 py-3 ring-1 ring-charcoal-950/10"
          >
            <button
              type="button"
              onClick={() =>
                setTodos((prev) =>
                  prev.map((x) =>
                    x.id === t.id ? { ...x, completed: !x.completed } : x,
                  ),
                )
              }
              className={`h-5 w-5 rounded-md ring-1 ring-charcoal-950/15 ${
                t.completed ? 'bg-moss-500' : 'bg-paper-50'
              }`}
              aria-label={t.completed ? 'Mark incomplete' : 'Mark complete'}
            />
            <div
              className={`min-w-0 flex-1 truncate text-sm ${
                t.completed
                  ? 'text-charcoal-500 line-through'
                  : 'text-charcoal-950'
              }`}
            >
              {t.title}
            </div>
            <button
              type="button"
              onClick={() =>
                setTodos((prev) => prev.filter((x) => x.id !== t.id))
              }
              className="rounded-xl bg-paper-50 px-3 py-1.5 text-xs font-semibold text-charcoal-800 ring-1 ring-charcoal-950/10 hover:bg-white"
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setTodos([])}
          className="text-xs font-semibold text-charcoal-700 hover:text-charcoal-950"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem(LS_KEY)
            setTodos([
              { id: uid(), title: 'Draft weekly plan', completed: true },
              { id: uid(), title: 'Ship one small improvement', completed: false },
              { id: uid(), title: 'Close the loop on inbox', completed: false },
            ])
          }}
          className="text-xs font-semibold text-charcoal-700 hover:text-charcoal-950"
        >
          Reset demo
        </button>
      </div>
    </div>
  )
}

export function HabitPulse() {
  const [n, setN] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => setN((x) => (x + 1) % 1000), 1800)
    return () => window.clearInterval(id)
  }, [])

  const suggestions = useMemo(() => {
    const base = [
      { label: 'Focus score', value: 78 + (n % 7) },
      { label: 'Streak', value: 4 + (n % 3) },
      { label: 'Today', value: 3 + (n % 5) },
    ]
    return base
  }, [n])

  return (
    <div className="rounded-3xl bg-paper-100 p-6 ring-1 ring-charcoal-950/10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-charcoal-950">
            Habit pulse
          </div>
          <div className="mt-1 text-xs text-charcoal-700">
            A playful preview of dashboard-style widgets.
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-charcoal-800 ring-1 ring-charcoal-950/10">
          <span className="h-2 w-2 rounded-full bg-coral-500" />
          Live
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {suggestions.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl bg-white/70 p-4 ring-1 ring-charcoal-950/10"
          >
            <div className="text-xs text-charcoal-700">{s.label}</div>
            <div className="mt-1 text-lg font-semibold text-charcoal-950">
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/70 ring-1 ring-charcoal-950/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-coral-500 to-moss-500 transition-[width] duration-700"
          style={{ width: `${58 + (n % 28)}%` }}
        />
      </div>
    </div>
  )
}

