import { ScrollReveal } from './ScrollReveal'

export function Pricing() {
  const tiers = [
    {
      name: 'Starter',
      price: '$0',
      desc: 'Free forever for solo builders and individual flow.',
      features: ['Unlimited tasks', 'Single workspace', 'Basic heatmaps', 'Community support'],
      cta: 'Start for free',
      highlight: false,
    },
    {
      name: 'Squad Pro',
      price: '$12',
      period: '/mo per user',
      desc: 'Designed for high-velocity teams scaling fast.',
      features: ['Unlimited collaborators', 'Role-based access', 'Deep analytics', 'Realtime sync', 'Priority support'],
      cta: 'Elevate your squad',
      highlight: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      desc: 'Security and governance for large-scale operations.',
      features: ['Custom SSO', 'Unlimited workspaces', 'Audit logs', 'Dedicated success manager', 'Custom RLS policies'],
      cta: 'Contact Sales',
      highlight: false,
    },
  ]

  return (
    <div className="mt-32">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-cyan-700 ring-1 ring-cyan-200">
          Flexible Plans
        </div>
        <h2 className="mt-6 text-5xl font-black tracking-tight text-slate-900">Choose your <span className="bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">Flow</span></h2>
        <p className="mt-4 text-xl text-slate-600 max-w-2xl mx-auto font-medium">From solo builders to global squads, we have a plan that adapts as your momentum builds.</p>
      </div>

      <div className="mt-20 grid gap-8 lg:grid-cols-3 items-stretch">
        {tiers.map((t, i) => (
          <ScrollReveal key={t.name} delay={i * 100}>
            <div className={`relative flex h-full flex-col rounded-[3rem] p-10 transition hover:-translate-y-2 ${t.highlight
                ? 'bg-[#090909] text-white shadow-2xl scale-105 z-10'
                : 'bg-white ring-1 ring-slate-950/5 shadow-soft'
              }`}>
              {t.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-600 to-cyan-500 px-6 py-2 text-xs font-black uppercase tracking-widest shadow-xl">
                  Most Popular
                </div>
              )}

              <div className="mb-8">
                <div className={`text-sm font-black uppercase tracking-widest ${t.highlight ? 'text-indigo-400' : 'text-slate-400'}`}>
                  {t.name}
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-5xl font-black tracking-tighter">{t.price}</span>
                  {t.period && <span className={`text-sm font-bold uppercase tracking-widest ${t.highlight ? 'text-slate-500' : 'text-slate-400'}`}>{t.period}</span>}
                </div>
                <p className={`mt-4 text-sm font-medium leading-relaxed ${t.highlight ? 'text-slate-400' : 'text-slate-500'}`}>{t.desc}</p>
              </div>

              <ul className="mb-10 flex-1 space-y-4">
                {t.features.map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm font-bold">
                    <div className={`flex h-5 w-5 items-center justify-center rounded-full ${t.highlight ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className={t.highlight ? 'text-slate-200' : 'text-slate-700'}>{f}</span>
                  </li>
                ))}
              </ul>

              <button className={`w-full rounded-[1.5rem] py-5 text-sm font-black transition active:scale-95 ${t.highlight
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700'
                  : 'bg-slate-100 text-slate-950 ring-1 ring-slate-950/5 hover:bg-slate-200'
                }`}>
                {t.cta}
              </button>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </div>
  )
}
