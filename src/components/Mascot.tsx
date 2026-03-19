import { useEffect, useMemo, useRef, useState } from 'react'

type Mood = 'focused' | 'happy' | 'tired'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export function Mascot() {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [mood, setMood] = useState<Mood>('focused')
  const [p, setP] = useState({ x: 0, y: 0 })

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const el = wrapRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const dx = (e.clientX - cx) / (r.width / 2)
      const dy = (e.clientY - cy) / (r.height / 2)
      setP({ x: clamp(dx, -1, 1), y: clamp(dy, -1, 1) })
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  const face = useMemo(() => {
    if (mood === 'happy') return 'Today looks shippable.'
    if (mood === 'tired') return 'One task at a time.'
    return 'Focus mode: on.'
  }, [mood])

  return (
    <div
      ref={wrapRef}
      className="relative overflow-hidden rounded-3xl bg-paper-100 p-6 ring-1 ring-charcoal-950/10 shadow-soft"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-charcoal-950">
            Your tiny co-pilot
          </div>
          <div className="mt-1 text-xs text-charcoal-700">{face}</div>
        </div>
        <div className="inline-flex rounded-full bg-white/70 p-1 text-xs ring-1 ring-charcoal-950/10">
          {(['focused', 'happy', 'tired'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMood(m)}
              className={`rounded-full px-3 py-1 font-semibold ${
                mood === m
                  ? 'bg-charcoal-950 text-paper-50'
                  : 'text-charcoal-700 hover:text-charcoal-950'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid place-items-center">
        <div className="relative h-44 w-44">
          <div className="absolute inset-0 rounded-[2.25rem] bg-white/70 ring-1 ring-charcoal-950/10" />
          <div className="absolute inset-0 rounded-[2.25rem] bg-gradient-to-br from-coral-500/20 via-transparent to-moss-500/15" />

          {/* cheeks */}
          <div className="absolute left-6 top-[96px] h-5 w-8 rounded-full bg-coral-500/15" />
          <div className="absolute right-6 top-[96px] h-5 w-8 rounded-full bg-coral-500/15" />

          {/* eyes */}
          <div className="absolute left-10 top-12 h-12 w-12 rounded-2xl bg-paper-50 ring-1 ring-charcoal-950/10">
            <div className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-charcoal-950/90">
              <div
                className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper-50"
                style={{
                  transform: `translate(calc(-50% + ${p.x * 4}px), calc(-50% + ${p.y * 4}px))`,
                }}
              />
            </div>
          </div>
          <div className="absolute right-10 top-12 h-12 w-12 rounded-2xl bg-paper-50 ring-1 ring-charcoal-950/10">
            <div className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-charcoal-950/90">
              <div
                className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper-50"
                style={{
                  transform: `translate(calc(-50% + ${p.x * 4}px), calc(-50% + ${p.y * 4}px))`,
                }}
              />
            </div>
          </div>

          {/* mouth */}
          <div
            className="absolute left-1/2 top-[108px] h-6 w-10 -translate-x-1/2 rounded-b-2xl border-b-4 border-charcoal-950/70"
            style={{
              borderBottomLeftRadius: mood === 'tired' ? '10px' : '16px',
              borderBottomRightRadius: mood === 'tired' ? '10px' : '16px',
              transform: `translateX(-50%) rotate(${mood === 'happy' ? -6 : mood === 'tired' ? 8 : 0}deg)`,
            }}
          />

          {/* wobble on hover */}
          <div className="absolute inset-0 rounded-[2.25rem] ring-1 ring-transparent transition hover:rotate-1" />
        </div>
      </div>

      <div className="mt-5 text-xs text-charcoal-700">
        Move your cursor around—eyes follow. Click a mood.
      </div>
    </div>
  )
}

