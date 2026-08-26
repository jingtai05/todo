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
                     <circle className="text-indigo-600" strokeWidth="10" strokeDasharray={251.2} strokeDashoffset={251.2 - (9 / 100) * 251.2} strokeLinecap="round" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
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

function KanbanView() {
   return (
      <>
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
   )
}

function LabelView() {
   return (
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3 pb-4">
         {['Feature', 'Bug', 'Chore'].map(label => (
            <div key={label} className="rounded-[2rem] bg-slate-50 p-6 ring-1 ring-slate-950/5">
               <div className="flex items-center gap-3 mb-6">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-lg ${label === 'Feature' ? 'bg-indigo-100 text-indigo-600' : label === 'Bug' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>#</div>
                  <div className="text-sm font-black text-slate-900 uppercase tracking-widest">{label}</div>
               </div>
               <div className="space-y-3">
                  {MOCK_TASKS.filter(t => t.type === label.toLowerCase()).map(t => (
                     <div key={t.id} className="rounded-2xl bg-white p-4 ring-1 ring-slate-950/5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                        <div className="text-[13px] font-black text-slate-950 mb-2 truncate" title={t.title}>{t.title}</div>
                        <div className="flex items-center justify-between mt-4">
                           <span className="text-[10px] font-bold text-slate-400 uppercase">{t.status.replace('_', ' ')}</span>
                           <span className="text-[10px] font-bold text-slate-400">{t.due ?? 'No due'}</span>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         ))}
      </div>
   )
}

function TeamView() {
   const members = [
      { name: 'Alex', role: 'Frontend Engineer', tasks: 12, completed: 8 },
      { name: 'Sarah', role: 'Product Manager', tasks: 5, completed: 5 },
      { name: 'Jordan', role: 'Backend Engineer', tasks: 8, completed: 2 },
   ]
   return (
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3 pb-4">
         {members.map((m, i) => (
            <div key={m.name} className="rounded-[2rem] bg-slate-50 p-6 ring-1 ring-slate-950/5 flex flex-col items-center text-center">
               <div className={`h-16 w-16 rounded-full flex items-center justify-center text-xl font-black mb-4 ${i === 0 ? 'bg-indigo-100 text-indigo-600' : i === 1 ? 'bg-cyan-100 text-cyan-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {m.name.charAt(0)}
               </div>
               <div className="text-sm font-black text-slate-900">{m.name}</div>
               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">{m.role}</div>

               <div className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-2xl ring-1 ring-slate-950/5 shadow-sm">
                  <div className="flex flex-col items-center flex-1">
                     <div className="text-lg font-black text-slate-900">{m.tasks}</div>
                     <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Active</div>
                  </div>
                  <div className="h-8 w-px bg-slate-100" />
                  <div className="flex flex-col items-center flex-1">
                     <div className="text-lg font-black text-emerald-600">{m.completed}</div>
                     <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Done</div>
                  </div>
               </div>
            </div>
         ))}
      </div>
   )
}

function WorkspaceView() {
  const workspaces = [
    { name: 'My Personal Workspace', type: 'Personal', members: 1, role: 'Owner' },
    { name: 'Acme Corp Team', type: 'Team', members: 12, role: 'Owner' },
    { name: 'Design Sync', type: 'Team', members: 4, role: 'Member' },
  ]
  
  return (
    <div className="mt-8 flex flex-col md:flex-row gap-6 pb-4 text-left">
       <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between mb-4 px-2">
             <div className="text-[14px] font-black text-slate-950">Your Workspaces</div>
             <button className="rounded-xl bg-indigo-600 px-4 py-2.5 text-[10px] font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors">
                + New Workspace
             </button>
          </div>
          
          {workspaces.map((w, i) => (
             <div key={w.name} className={`rounded-[2rem] p-6 ring-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-all ${i === 1 ? 'bg-indigo-50/50 ring-indigo-500/20' : 'bg-slate-50 ring-slate-950/5 hover:bg-white'}`}>
                <div className="flex items-center gap-4">
                   <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-lg font-black ${i === 1 ? 'bg-indigo-500 text-white shadow-md' : 'bg-slate-200 text-slate-500'}`}>
                      {w.name.charAt(0)}
                   </div>
                   <div>
                      <div className="text-sm font-black text-slate-900">{w.name}</div>
                      <div className="text-[11px] font-bold text-slate-400 mt-1">{w.type} • {w.members} members</div>
                   </div>
                </div>
                <div className="flex items-center gap-4 pl-16 sm:pl-0">
                   <span className="rounded-full bg-white px-4 py-1.5 text-[11px] font-bold text-slate-700 ring-1 ring-slate-950/10 shadow-sm">{w.role}</span>
                   {i === 1 && <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                </div>
             </div>
          ))}
       </div>

       <div className="w-full md:w-80 shrink-0 rounded-[2.5rem] bg-slate-50 p-6 ring-1 ring-slate-950/5 h-fit text-left">
          <div className="flex items-center gap-4 mb-8">
             <div className="h-14 w-14 rounded-2xl bg-indigo-500 text-white flex items-center justify-center text-xl font-black shadow-md">A</div>
             <div>
                <div className="text-sm font-black text-slate-950">Acme Corp Team</div>
                <div className="text-[11px] font-bold text-slate-400 mt-1">Team Workspace</div>
             </div>
          </div>
          
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Members (12)</div>
          
          <div className="space-y-4 mb-6">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500">j</div>
                   <div className="text-xs font-bold text-slate-900">jingtai <span className="text-slate-400 font-semibold">(You)</span></div>
                </div>
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-600">Owner</span>
             </div>
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500">A</div>
                   <div className="text-xs font-bold text-slate-900">Alex</div>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500 ring-1 ring-slate-950/5">Member</span>
             </div>
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500">S</div>
                   <div className="text-xs font-bold text-slate-900">Sarah</div>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500 ring-1 ring-slate-950/5">Member</span>
             </div>
          </div>

          <button className="w-full rounded-2xl bg-white px-4 py-3 text-xs font-bold text-slate-700 ring-1 ring-slate-950/10 shadow-sm hover:bg-slate-50 transition-colors">
             + Invite Member
          </button>
       </div>
    </div>
  )
}

function GanttView() {
   return (
      <div className="mt-8 pb-4 overflow-x-auto scrollbar-hide">
         <div className="min-w-[700px] rounded-[2rem] bg-slate-50 p-6 ring-1 ring-slate-950/5">
            <div className="flex items-center justify-between border-b border-slate-950/5 pb-4 mb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">
               <div className="w-64 pl-2">Task Name</div>
               <div className="flex-1 flex justify-between px-4">
                  <span>Week 1</span><span>Week 2</span><span>Week 3</span><span>Week 4</span>
               </div>
            </div>
            <div className="space-y-4">
               {MOCK_TASKS.map((t, i) => (
                  <div key={t.id} className="flex items-center">
                     <div className="w-64 text-xs font-bold text-slate-900 truncate pr-6 pl-2" title={t.title}>{t.title}</div>
                     <div className="flex-1 relative h-8 bg-slate-200/30 rounded-xl overflow-hidden ring-1 ring-slate-950/5">
                        <div
                           className={`absolute h-full rounded-xl ${i % 2 === 0 ? 'bg-indigo-400' : 'bg-emerald-400'} opacity-90 shadow-sm flex items-center px-3`}
                           style={{ left: `${(i * 12) % 40}%`, width: `${20 + (i % 3) * 15}%` }}
                        >
                           <span className="text-[9px] font-black text-white uppercase tracking-widest truncate">{t.assignee ?? 'Unassigned'}</span>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </div>
   )
}

function SortView() {
   return (
      <div className="mt-8 flex flex-col md:flex-row justify-end gap-6 pb-4 relative min-h-[500px]">
         {/* Blurred Kanban Background on Left */}
         <div className="absolute top-0 left-0 bottom-0 right-[320px] overflow-hidden opacity-60 blur-[2px] select-none pointer-events-none -mx-4 -mt-4">
            <KanbanView />
         </div>

         {/* Sidebar Mock */}
         <div className="w-full md:w-72 shrink-0 rounded-[2rem] bg-white/90 backdrop-blur-xl p-6 ring-1 ring-slate-950/10 shadow-2xl h-fit text-left relative z-10">
            <div className="text-sm font-black text-slate-950 mb-4">Sorting</div>
            <div className="mb-6">
               <div className="text-[10px] font-bold text-slate-500 mb-1.5">Sort By</div>
               <div className="w-full rounded-2xl bg-white px-4 py-2.5 text-xs font-bold text-slate-900 ring-1 ring-slate-950/10 shadow-sm flex items-center justify-between">
                  Default
                  <svg className="h-3 w-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
               </div>
            </div>

            <div className="text-sm font-black text-slate-950 mb-4">Filters</div>
            <div className="space-y-4">
               <div>
                  <div className="text-[10px] font-bold text-slate-500 mb-1.5">Search</div>
                  <div className="w-full rounded-2xl bg-white px-4 py-2.5 text-xs text-slate-500 ring-1 ring-slate-950/10 shadow-sm">
                     Search title/description...
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-3">
                  <div>
                     <div className="text-[10px] font-bold text-slate-500 mb-1.5">Type</div>
                     <div className="w-full rounded-2xl bg-white px-4 py-2.5 text-xs font-bold text-slate-900 ring-1 ring-slate-950/10 shadow-sm flex justify-between items-center">
                        All <svg className="h-3 w-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                     </div>
                  </div>
                  <div>
                     <div className="text-[10px] font-bold text-slate-500 mb-1.5">Priority</div>
                     <div className="w-full rounded-2xl bg-white px-4 py-2.5 text-xs font-bold text-slate-900 ring-1 ring-slate-950/10 shadow-sm flex justify-between items-center">
                        All <svg className="h-3 w-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                     </div>
                  </div>
               </div>

               <div>
                  <div className="text-[10px] font-bold text-slate-500 mb-1.5">Due Date</div>
                  <div className="w-full rounded-2xl bg-white px-4 py-2.5 text-xs font-bold text-slate-900 ring-1 ring-slate-950/10 shadow-sm flex justify-between items-center">
                     All <svg className="h-3 w-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
               </div>

               <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Author</div>
                  <div className="space-y-1">
                     <div className="rounded-xl bg-[#0B1120] px-3 py-2 text-xs font-bold text-white shadow-sm flex items-center gap-2">
                        <div className="h-5 w-5 rounded-full bg-indigo-500 flex items-center justify-center text-[10px]">★</div>
                        All Authors
                     </div>
                     <div className="rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer transition-colors">
                        <div className="h-5 w-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px]">J</div>
                        jingtai
                     </div>
                  </div>
               </div>

               <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Assigned To</div>
                  <div className="space-y-1">
                     <div className="rounded-xl bg-[#0B1120] px-3 py-2 text-xs font-bold text-white shadow-sm flex items-center gap-2">
                        <div className="h-5 w-5 rounded-full bg-indigo-500 flex items-center justify-center text-[10px]">★</div>
                        All Assignees
                     </div>
                     <div className="rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer transition-colors">
                        <div className="h-5 w-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-500">—</div>
                        Unassigned
                     </div>
                     <div className="rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer transition-colors">
                        <div className="h-5 w-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px]">J</div>
                        jingtai
                     </div>
                  </div>
               </div>

               <div className="pt-2">
                  <button className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-950/10 shadow-sm hover:bg-slate-50 transition-colors">
                     Clear Filters
                  </button>
               </div>
            </div>
         </div>
      </div>
   )
}

function ListView() {
   return (
      <div className="mt-8 pb-4 overflow-x-auto scrollbar-hide">
         <div className="min-w-[800px] rounded-[2rem] bg-slate-50 p-6 ring-1 ring-slate-950/5">
            <table className="w-full text-left">
               <thead>
                  <tr className="border-b border-slate-950/5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                     <th className="pb-4 pl-4 font-black">Task Title</th>
                     <th className="pb-4 font-black">Status</th>
                     <th className="pb-4 font-black">Priority</th>
                     <th className="pb-4 font-black">Assignee</th>
                     <th className="pb-4 pr-4 font-black text-right">Due Date</th>
                  </tr>
               </thead>
               <tbody className="text-xs font-bold text-slate-900">
                  {MOCK_TASKS.map(t => (
                     <tr key={t.id} className="border-b border-slate-950/5 hover:bg-white/60 transition-colors">
                        <td className="py-4 pl-4 truncate max-w-[250px]" title={t.title}>{t.title}</td>
                        <td className="py-4"><Badge>{t.status.replace('_', ' ')}</Badge></td>
                        <td className="py-4"><Badge>{t.priority}</Badge></td>
                        <td className="py-4">{t.assignee ?? <span className="text-slate-400 italic">Unassigned</span>}</td>
                        <td className="py-4 pr-4 text-slate-500 text-right">{t.due ?? '-'}</td>
                     </tr>
                  ))}
               </tbody>
            </table>
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
            <NavIcon label="Label" active={activeView === 'label'} onClick={() => setActiveView('label')} icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>} />
            <NavIcon label="Team" active={activeView === 'team'} onClick={() => setActiveView('team')} icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} />
            <NavIcon label="Workspace" active={activeView === 'workspace'} onClick={() => setActiveView('workspace')} icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>} />
            <NavIcon
               label="Kanban"
               active={activeView === 'kanban'}
               onClick={() => setActiveView('kanban')}
               icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>}
            />
            <NavIcon label="Gantt" active={activeView === 'gantt'} onClick={() => setActiveView('gantt')} icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>} />
            <NavIcon label="Sort" active={activeView === 'sort'} onClick={() => setActiveView('sort')} icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>} />
            <NavIcon label="List" active={activeView === 'list'} onClick={() => setActiveView('list')} icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>} />
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

                  {activeView === 'kanban' && <KanbanView />}
                  {activeView === 'summary' && <StatisticsView />}
                  {activeView === 'label' && <LabelView />}
                  {activeView === 'team' && <TeamView />}
                  {activeView === 'workspace' && <WorkspaceView />}
                  {activeView === 'gantt' && <GanttView />}
                  {activeView === 'sort' && <SortView />}
                  {activeView === 'list' && <ListView />}
               </div>

               {/* Perspective Glow Effects */}
               <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-400/10 blur-[100px] rounded-full" />
               <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-400/10 blur-[100px] rounded-full" />
            </div>

            <style dangerouslySetInnerHTML={{
               __html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
         </div>
      </div>
   )
}
