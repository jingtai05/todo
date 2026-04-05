import { useState } from 'react'
import { ScrollReveal } from './ScrollReveal'

const STATUSES = [
  { key: 'icebox', label: 'Icebox' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
]

const MOCK_TASKS = [
  { id: '1', title: 'Implement Stripe Elements API', type: 'feature', priority: 'high', author: 'Alex', assignee: null, due: '2026-04-10', status: 'icebox' },
  { id: '2', title: 'Fix CSS Grid layout on mobile', type: 'bug', priority: 'medium', author: 'Sarah', assignee: 'Alex', due: null, status: 'in_progress' },
  { id: '3', title: 'Add dark mode toggle logic', type: 'feature', priority: 'low', author: 'Jordan', assignee: null, due: '2026-04-12', status: 'in_progress' },
  { id: '4', title: 'Optimize Postgres queries', type: 'chore', priority: 'high', author: 'Alex', assignee: 'Sarah', due: '2026-04-08', status: 'review' },
  { id: '5', title: 'Initialize production environment', type: 'feature', priority: 'medium', author: 'Sarah', assignee: 'Jordan', due: '2026-04-05', status: 'done' },
]

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-800 ring-1 ring-slate-950/10">
      {children}
    </span>
  )
}

function ChevronDown() {
  return (
    <svg className="ml-1.5 h-3 w-3 text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function DropdownButton({ children }: { children: React.ReactNode }) {
  return (
    <div className="group flex items-center rounded-full bg-slate-100/80 px-4 py-2 text-[11px] font-bold text-slate-600 ring-1 ring-slate-950/5 hover:bg-white hover:ring-slate-950/10 cursor-pointer transition-all shadow-sm active:scale-95">
      {children}
      <ChevronDown />
    </div>
  )
}

function NavIcon({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
   return (
    <div 
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 cursor-pointer group"
    >
       <div className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>
          {icon}
       </div>
       <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${active ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'}`}>
          {label}
       </span>
    </div>
   )
}

function StatisticsView() {
   return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pb-4">
         {/* Workspace Progress */}
         <div className="rounded-[2rem] bg-slate-50 p-6 ring-1 ring-slate-950/5 relative overflow-hidden">
            <div className="text-xs font-black uppercase tracking-widest text-slate-900 mb-6">Workspace Progress</div>
            <div className="flex items-center gap-6">
               <div className="relative h-20 w-20 flex items-center justify-center">
                  <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                     <circle className="text-slate-200" strokeWidth="10" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                     <circle className="text-indigo-600" strokeWidth="10" strokeDasharray={251.2} strokeDashoffset={251.2 - (9/100) * 251.2} strokeLinecap="round" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                  </svg>
                  <span className="absolute text-sm font-black text-slate-900">9%</span>
               </div>
               <div>
                  <div className="text-lg font-black text-slate-900 leading-tight">2 / 23</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">tasks completed</div>
               </div>
            </div>
         </div>

         {/* Tasks by Status */}
         <div className="rounded-[2rem] bg-slate-50 p-6 ring-1 ring-slate-950/5">
            <div className="text-xs font-black uppercase tracking-widest text-slate-900 mb-6">Tasks by Status</div>
            <div className="h-20 w-full flex items-center justify-center relative">
               <svg className="h-20 w-20 transform -rotate-90" viewBox="0 0 100 100">
                  <circle className="text-slate-200" strokeWidth="12" stroke="currentColor" fill="transparent" r="35" cx="50" cy="50" />
                  <circle className="text-orange-400" strokeWidth="12" strokeDasharray={220} strokeDashoffset={180} strokeLinecap="round" stroke="currentColor" fill="transparent" r="35" cx="50" cy="50" />
                  <circle className="text-emerald-400" strokeWidth="12" strokeDasharray={220} strokeDashoffset={205} strokeLinecap="round" stroke="currentColor" fill="transparent" r="35" cx="50" cy="50" />
               </svg>
            </div>
         </div>

         {/* Tasks by Type */}
         <div className="rounded-[2rem] bg-slate-50 p-6 ring-1 ring-slate-950/5">
            <div className="text-xs font-black uppercase tracking-widest text-slate-900 mb-6">Tasks by Type</div>
            <div className="flex items-end gap-6 h-28 pb-4">
               <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-indigo-500/10 rounded-lg relative overflow-hidden h-20">
                     <div className="absolute bottom-0 w-full bg-indigo-500 rounded-lg h-[90%]" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-tighter text-slate-400">Feature</span>
               </div>
               <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-slate-200 rounded-lg relative overflow-hidden h-20">
                     <div className="absolute bottom-0 w-full bg-slate-400 rounded-lg h-[15%]" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-tighter text-slate-400">Bug</span>
               </div>
               <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-slate-200 rounded-lg relative overflow-hidden h-20">
                     <div className="absolute bottom-0 w-full bg-slate-400 rounded-lg h-[10%]" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-tighter text-slate-400">Chore</span>
               </div>
            </div>
         </div>

         {/* Activity Heatmap */}
         <div className="rounded-[2rem] bg-slate-50 p-6 ring-1 ring-slate-950/5">
            <div className="text-xs font-black uppercase tracking-widest text-slate-900 mb-6">Activity Heatmap</div>
            <div className="flex flex-wrap gap-[3px] pt-1">
               {Array.from({ length: 50 }).map((_, i) => {
                  const states = ['bg-slate-200/50', 'bg-slate-200/50', 'bg-emerald-200', 'bg-emerald-500', 'bg-emerald-700']
                  const state = i % 11 === 0 ? states[3] : i % 8 === 0 ? states[4] : i % 5 === 0 ? states[2] : states[0]
                  return <div key={i} className={`h-2.5 w-2.5 rounded-sm ${state}`} />
               })}
            </div>
         </div>
      </div>
   )
}

export function RealInterfaceShowcase() {
  const [activeView, setActiveView] = useState('kanban')

  return (
    <div className="mx-auto mt-12 w-full max-w-5xl relative group">
      {/* Concept Navigation Bar (Moved Outside) */}
      <div className="mb-8 flex flex-wrap items-center justify-center gap-6 lg:gap-10">
         <NavIcon 
            label="Summary" 
            active={activeView === 'summary'} 
            onClick={() => setActiveView('summary')}
            icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>} 
         />
         <NavIcon label="Label" onClick={() => {}} icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>} />
         <NavIcon label="Team" onClick={() => {}} icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} />
         <NavIcon label="Project" onClick={() => {}} icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>} />
         <NavIcon 
            label="Kanban" 
            active={activeView === 'kanban'} 
            onClick={() => setActiveView('kanban')}
            icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>} 
         />
         <NavIcon label="Gantt" onClick={() => {}} icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>} />
         <NavIcon label="Table" onClick={() => {}} icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>} />
         <NavIcon label="List" onClick={() => {}} icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>} />
      </div>

      <div className="rounded-[2.5rem] bg-white p-2 shadow-2xl ring-1 ring-slate-950/10 relative overflow-hidden group">
        {/* Browser Bar */}
        <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-950/5 bg-slate-50/50">
          <div className="flex gap-1.5">
             <div className="h-3 w-3 rounded-full bg-slate-200" />
             <div className="h-3 w-3 rounded-full bg-slate-200" />
             <div className="h-3 w-3 rounded-full bg-slate-200" />
          </div>
          <div className="ml-4 flex-1 h-6 rounded-full bg-white/80 ring-1 ring-slate-950/5 flex items-center px-4 text-[10px] font-bold text-slate-400">
             https://jingtai05.github.io/todo/
          </div>
        </div>

        <div className="bg-white">
          <div className="p-4 lg:p-6">
          {/* Workspace Top Bar */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-950/5 pb-4">
             <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                   Public Workspace <span className="opacity-30">/</span> Engineering Squad
                </div>
                <h3 className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
                   {activeView === 'summary' ? 'Insights Overview' : 'Active Sprint Flow'}
                </h3>
             </div>
             {activeView === 'kanban' && (
                <div className="flex items-center gap-2">
                   <DropdownButton>Type: All</DropdownButton>
                   <DropdownButton>Priority: All</DropdownButton>
                   <DropdownButton>Author: All</DropdownButton>
                </div>
             )}
          </div>

          {activeView === 'kanban' ? (
             <>
               {/* Task Creation Form (Mock) */}
               <div className="mt-6 rounded-3xl bg-slate-50 p-4 flex flex-col lg:flex-row gap-3 ring-1 ring-slate-950/5">
                  <div className="flex-1">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Capture new task</div>
                    <div className="h-10 w-full rounded-2xl bg-white px-4 border border-slate-950/10 flex items-center text-[13px] font-semibold text-slate-400">
                       Type what you need to achieve...
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                     <div className="h-10 w-32 rounded-2xl bg-white border border-slate-950/10 flex items-center px-4 text-[11px] font-bold text-slate-400">Due Date</div>
                     <div className="h-10 px-8 rounded-2xl bg-indigo-600 text-white font-black text-xs flex items-center shadow-lg shadow-indigo-100/50">Add</div>
                  </div>
               </div>

               {/* The Board */}
               <div className="mt-8 overflow-x-auto pb-4 scrollbar-hide no-scrollbar px-2">
                  <div className="inline-flex flex-nowrap gap-4 min-w-full">
                     {STATUSES.map(s => (
                       <div key={s.key} className="rounded-[2rem] bg-slate-50 p-4 ring-1 ring-slate-950/5 w-[272px] shrink-0">
                          <div className="flex items-center justify-between mb-5 px-2">
                             <div className="text-xs font-black uppercase tracking-widest text-slate-900">{s.label}</div>
                             <div className="text-[10px] font-black text-slate-400">{MOCK_TASKS.filter(t => t.status === s.key).length}</div>
                          </div>

                          <div className="space-y-3">
                             {MOCK_TASKS.filter(t => t.status === s.key).map(t => (
                               <ScrollReveal key={t.id} delay={100} className="w-full">
                                 <div className="rounded-[1.5rem] bg-white p-3 text-left shadow-[0_2px_4px_rgba(15,23,42,0.04)] ring-1 ring-slate-950/5 hover:-translate-y-0.5 transition-transform">
                                    <div className="text-[13px] font-black text-slate-950 leading-tight mb-3 truncate" title={t.title}>{t.title}</div>
                                    
                                    <div className="flex flex-wrap items-center gap-1.5 mb-4">
                                       <Badge>{t.type}</Badge>
                                       <Badge>{t.priority}</Badge>
                                    </div>

                                    {/* Metadata synchronized box */}
                                    <div className="rounded-2xl border border-slate-950/5 bg-white p-2.5 shadow-sm">
                                       <div className="grid grid-cols-2 gap-3 overflow-hidden">
                                          <div className="min-w-0">
                                             <div className="text-[11px] font-black uppercase text-slate-500 mb-1 truncate">Author</div>
                                             <div className="text-[11px] font-bold text-slate-950 truncate">{t.author}</div>
                                          </div>
                                          <div className="min-w-0">
                                             <div className="text-[11px] font-black uppercase text-slate-500 mb-1 truncate">Assigned</div>
                                             <div className={`text-[11px] ${t.assignee ? 'font-bold text-slate-950' : 'font-bold italic text-slate-400'} truncate`}>
                                                {t.assignee ?? 'Unassigned'}
                                             </div>
                                          </div>
                                       </div>
                                    </div>

                                    <div className="mt-4 pt-1 flex items-center justify-between">
                                       <div className="text-[11px] font-bold text-slate-500 truncate">{t.due ? `Due ${t.due}` : 'No due'}</div>
                                       <button className="rounded-xl bg-rose-50 px-3 py-1.5 text-[11px] font-bold text-rose-700 ring-1 ring-rose-200/50 hover:bg-rose-100 transition-colors">
                                          Delete
                                       </button>
                                    </div>
                                 </div>
                               </ScrollReveal>
                             ))}
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
             </>
          ) : (
             <StatisticsView />
          )}
        </div>

        {/* Perspective Glow Effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-400/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-400/10 blur-[100px] rounded-full" />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  </div>
  )
}
