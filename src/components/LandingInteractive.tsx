import { useEffect, useState } from 'react'

export function VelocityPulse() {
  const [percent, setPercent] = useState(64)

  useEffect(() => {
    const id = setInterval(() => {
      setPercent((p) => {
        const next = p + (Math.random() > 0.5 ? 1 : -1)
        return Math.min(Math.max(next, 60), 85)
      })
    }, 3000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="rounded-[2.5rem] bg-indigo-600 p-8 text-white shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
        <svg width="120" height="120" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="10" fill="none" strokeDasharray="283" strokeDashoffset={283 - (283 * percent) / 100} className="transition-all duration-1000" />
        </svg>
      </div>
      
      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Realtime Velocity
        </div>
        <div className="mt-6 flex items-baseline gap-2">
          <span className="text-6xl font-black tracking-tighter">{percent}%</span>
          <span className="text-indigo-200 font-bold uppercase text-[10px] tracking-widest">Efficiency</span>
        </div>
        <p className="mt-4 text-sm font-medium text-indigo-100/80 leading-relaxed">Your workspace is moving 12% faster than last week. Flow is optimized.</p>
        
        <div className="mt-8 flex gap-1">
           {[...Array(12)].map((_, i) => (
             <div key={i} className="h-8 flex-1 rounded-full bg-white/10 overflow-hidden relative">
                <div 
                  className="absolute bottom-0 left-0 right-0 bg-emerald-400/40 transition-all duration-1000" 
                  style={{ height: `${40 + Math.random() * 60}%`, transitionDelay: `${i * 50}ms` }} 
                />
             </div>
           ))}
        </div>
      </div>
    </div>
  )
}

const MOCK_EVENTS = [
  { user: 'Alex', action: 'completed', task: 'Mobile Auth API', time: 'Just now', color: 'bg-indigo-500' },
  { user: 'Sarah', action: 'moved', task: 'Design System V2', time: '2m ago', color: 'bg-cyan-500' },
  { user: 'Jordan', action: 'started', task: 'Beta Feedback', time: '5m ago', color: 'bg-slate-500' },
  { user: 'Taylor', action: 'prioritized', task: 'Critical Bug #42', time: '8m ago', color: 'bg-rose-500' },
]

export function TeamMomentum() {
  const [events, setEvents] = useState(MOCK_EVENTS)

  useEffect(() => {
    const id = setInterval(() => {
      setEvents(prev => {
        const next = [...prev]
        const last = next.pop()!
        return [last, ...next]
      })
    }, 4000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="rounded-[2.5rem] bg-white p-8 shadow-crisp ring-1 ring-slate-950/5 flex flex-col h-full relative overflow-hidden">
      <div className="absolute -bottom-24 -left-24 h-64 w-64 bg-indigo-50 rounded-full blur-3xl opacity-50" />
      
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between mb-8">
          <div className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Team Momentum</div>
          <div className="flex -space-x-2">
            {[1,2,3].map(i => <div key={i} className={`h-6 w-6 rounded-full border-2 border-white ${i === 1 ? 'bg-indigo-400' : i === 2 ? 'bg-cyan-400' : 'bg-slate-400'}`} />)}
          </div>
        </div>

        <div className="space-y-4 flex-1">
          {events.map((ev, i) => (
            <div key={ev.task} className={`flex items-start gap-4 transition-all duration-700 ${i === 0 ? 'opacity-100 scale-100' : i === 3 ? 'opacity-20 scale-95' : 'opacity-60 scale-98'}`}>
              <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${ev.color} shadow-lg`} />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900">
                  {ev.user} <span className="font-medium text-slate-400">{ev.action}</span> {ev.task}
                </div>
                <div className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter mt-0.5">{ev.time}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
          <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Live Evolution</div>
          <div className="h-1 w-24 bg-slate-100 rounded-full overflow-hidden">
             <div className="h-full bg-indigo-500 w-2/3 animate-[shimmer_2s_infinite]" />
          </div>
        </div>
      </div>
    </div>
  )
}
