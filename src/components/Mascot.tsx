import { useEffect, useMemo, useRef, useState } from 'react'

type Mood = 'focused' | 'happy' | 'tired'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export function Mascot() {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [mood, setMood] = useState<Mood>('focused')
  const [p, setP] = useState({ x: 0, y: 0 })
  const [scrollPeek, setScrollPeek] = useState(0)
  const [isBouncing, setIsBouncing] = useState(false)

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

    function onScroll() {
      const scrolled = window.scrollY
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      const ratio = scrolled / (maxScroll || 1)
      setScrollPeek(clamp(ratio * 2 - 1, -1, 1))
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  const face = useMemo(() => {
    if (mood === 'happy') return 'Today looks shippable.'
    if (mood === 'tired') return 'One task at a time.'
    return 'Focus mode: on.'
  }, [mood])

  const handlePoke = () => {
    if (isBouncing) return
    setIsBouncing(true)
    setTimeout(() => setIsBouncing(false), 600)
  }

  // Combine pointer movement with scroll peeking
  const eyeX = p.x * 4
  const eyeY = (p.y * 4) + (scrollPeek * 2)

  return (
    <div
      ref={wrapRef}
      onClick={handlePoke}
      className={`relative cursor-pointer overflow-hidden rounded-[2.5rem] bg-indigo-50/50 p-6 ring-1 ring-indigo-950/5 shadow-crisp backdrop-blur-md transition-all duration-500 ease-out ${
        isBouncing ? 'scale-90 rotate-2' : 'hover:scale-[1.02] active:scale-95'
      }`}
    >
      <div className="flex items-start justify-between gap-4 relative z-10">
        <div>
          <div className="text-sm font-bold text-slate-950">
            Flow Pilot
          </div>
          <div className="mt-1 text-xs font-medium text-slate-600">{face}</div>
        </div>
        <div className="inline-flex rounded-full bg-white/80 p-1 text-[10px] uppercase tracking-wider font-bold ring-1 ring-slate-950/5">
          {(['focused', 'happy', 'tired'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMood(m);
              }}
              className={`rounded-full px-3 py-1.5 transition-all ${
                mood === m
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid place-items-center relative">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-cyan-400/10 blur-[60px] rounded-full" />
        
        <div className={`relative h-48 w-48 transition-transform duration-700 ease-out ${isBouncing ? 'animate-bounce' : ''}`}>
          {/* Main Body */}
          <div className="absolute inset-0 rounded-[3rem] bg-white ring-1 ring-slate-950/5 shadow-soft" />
          <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-br from-indigo-500/10 via-transparent to-cyan-500/10" />

          {/* Cheeks */}
          <div className="absolute left-8 top-[108px] h-4 w-6 rounded-full bg-indigo-400/10 blur-[2px]" />
          <div className="absolute right-8 top-[108px] h-4 w-6 rounded-full bg-indigo-400/10 blur-[2px]" />

          {/* Eyes */}
          <div className="absolute left-10 top-14 h-14 w-14 rounded-3xl bg-slate-50 ring-1 ring-slate-950/5 shadow-inner">
            <div 
              className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-[1rem] bg-slate-950 transition-transform duration-300 ease-out"
              style={{ transform: `translate(calc(-50% + ${eyeX}px), calc(-50% + ${eyeY}px))` }}
            >
              <div className="absolute left-1.5 top-1.5 h-2 w-2 rounded-full bg-white opacity-80" />
            </div>
          </div>
          
          <div className="absolute right-10 top-14 h-14 w-14 rounded-3xl bg-slate-50 ring-1 ring-slate-950/5 shadow-inner">
            <div 
              className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-[1rem] bg-slate-950 transition-transform duration-300 ease-out"
              style={{ transform: `translate(calc(-50% + ${eyeX}px), calc(-50% + ${eyeY}px))` }}
            >
              <div className="absolute left-1.5 top-1.5 h-2 w-2 rounded-full bg-white opacity-80" />
            </div>
          </div>

          {/* Mouth */}
          <div
            className="absolute left-1/2 top-[124px] h-4 w-12 -translate-x-1/2 rounded-b-3xl border-b-4 border-slate-950/80 transition-all duration-500"
            style={{
              height: mood === 'happy' ? '12px' : '4px',
              borderBottomLeftRadius: mood === 'tired' ? '4px' : '24px',
              borderBottomRightRadius: mood === 'tired' ? '4px' : '24px',
              transform: `translateX(-50%) rotate(${mood === 'happy' ? -2 : mood === 'tired' ? 4 : 0}deg)`,
            }}
          />
        </div>
      </div>

      <div className="mt-8 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">
        Poke to interact • Eyes follow movement
      </div>
    </div>
  )
}
