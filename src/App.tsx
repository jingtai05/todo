import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from './lib/supabaseClient'
import { useSupabaseSession } from './hooks/useSupabaseSession'
import { AuthPanel } from './components/AuthPanel'
import { VelocityPulse, TeamMomentum } from './components/LandingInteractive'
import { Mascot } from './components/Mascot'
import {
  ActivityPanel,
  type ActivityItem,
  OverlayModal,
  ConfirmModal,
  useLocalStorageState,
} from './components/ShellModals'
import { TasksPage } from './pages/TasksPage'
import { ScrollReveal } from './components/ScrollReveal'
import { Pricing } from './components/Pricing'
import { RealInterfaceShowcase } from './components/RealInterfaceShowcase'

function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M25 35H75L65 85H15L25 35Z" fill="url(#brand-grad-bg)" opacity="0.1" />
      <rect x="25" y="20" width="12" height="60" rx="6" fill="url(#brand-grad-1)" transform="rotate(-15 25 20)" />
      <rect x="45" y="15" width="12" height="70" rx="6" fill="url(#brand-grad-2)" transform="rotate(-15 45 15)" />
      <rect x="65" y="25" width="12" height="50" rx="6" fill="url(#brand-grad-1)" transform="rotate(-15 65 25)" />
      <defs>
        <linearGradient id="brand-grad-1" x1="25" y1="20" x2="25" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#4F46E5" />
        </linearGradient>
        <linearGradient id="brand-grad-2" x1="45" y1="15" x2="45" y2="85" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22D3EE" />
          <stop offset="1" stopColor="#06B6D4" />
        </linearGradient>
        <linearGradient id="brand-grad-bg" x1="25" y1="35" x2="75" y2="85" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function TaskCube({ scrollY, offset, speed, size = "w-24 h-24", color = "bg-indigo-400/10", className = "" }: { scrollY: number, offset: number, speed: number, size?: string, color?: string, className?: string }) {
  const y = offset + scrollY * speed
  return (
    <div
      className={`fixed rounded-3xl ring-1 ring-white/20 blur-sm pointer-events-none transition-transform duration-75 ease-linear ${size} ${color} ${className}`}
      style={{ transform: `translateY(${y}px) rotate(${scrollY * 0.05}deg)` }}
    />
  )
}

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="relative mx-auto mt-20 w-[92vw] max-w-lg px-4 sm:px-0">
        <div className="glass rounded-[2rem] p-6 shadow-soft">
          <div className="flex items-start justify-between gap-4">
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            <button
              onClick={onClose}
              className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-950/5 hover:bg-slate-200"
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

const parseReqTag = (name: string): string => {
  return name.replace(/^\[REQ_(W|WRITE):[^\]]*\]\s*/, '')
}

export default function App() {
  const { session, loading } = useSupabaseSession()
  const [authOpen, setAuthOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [usersOpen, setUsersOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [globalRequests, setGlobalRequests] = useState<any[]>([])
  const [query, setQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'feature' | 'bug' | 'chore'>('all')
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'medium' | 'high'>('all')
  const [compactMode, setCompactMode] = useLocalStorageState<boolean>('flowdesk_settings_compact_v2', false)
  const [activity, setActivity] = useLocalStorageState<ActivityItem[]>('flowdesk_activity_v2', [])
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const [activeWorkspace, setActiveWorkspace] = useState<{
    id: string
    name: string
    ownerId: string
    isOwner: boolean
  } | null>(null)

  const [confirmState, setConfirmState] = useState<{
    open: boolean
    title: string
    description: string
    onConfirm: () => void
    requireTypeToConfirm?: string
    confirmText?: string
    isDestructive?: boolean
  }>({ open: false, title: '', description: '', onConfirm: () => { } })

  const [membersLoading, setMembersLoading] = useState(false)
  const [membersError, setMembersError] = useState<string | null>(null)
  const [members, setMembers] = useState<{ userId: string; role: string; requestStatus: string | null; createdAt: string; username: string | null }[]>([])
  const [myUsername, setMyUsername] = useState('')
  const [usernameMsg, setUsernameMsg] = useState<string | null>(null)

  const userLabel = useMemo(() => {
    const email = session?.user?.email
    if (!email) return null
    return email.length > 22 ? `${email.slice(0, 10)}…${email.slice(-9)}` : email
  }, [session?.user?.email])

  useEffect(() => {
    if (session) setAuthOpen(false)
  }, [session])

  const loadMembers = useMemo(() => {
    return async (workspaceId: string, myUserId: string) => {
      setMembersLoading(true)
      setMembersError(null)

      const { data: memRows, error: memErr } = await supabase
        .from('workspace_members')
        .select('user_id,role,request_status,created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: true })

      if (memErr) {
        setMembersError(memErr.message)
        setMembersLoading(false)
        return
      }

      const mergedBase = (memRows ?? []).map((r: any) => ({
        userId: r.user_id as string,
        role: (r.role as string) ?? 'member',
        requestStatus: (r.request_status as string | null) ?? null,
        createdAt: r.created_at as string,
        username: null as string | null,
      }))

      const ids = Array.from(new Set(mergedBase.map((r) => r.userId)))
      const { data: profileRows, error: profErr } = await supabase
        .from('profiles')
        .select('id,username')
        .in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])

      const byId = new Map<string, string>()
      if (!profErr && profileRows) {
        for (const p of profileRows) {
          byId.set((p as any).id, (p as any).username)
        }
      }

      const membersFull = mergedBase.map((m) => ({ ...m, username: byId.get(m.userId) ?? null }))
      setMembers(membersFull)
      
      const myParsedName = byId.get(myUserId) ?? ''
      setMyUsername(myParsedName)

      // AUTOMATED PROFILE RECOVERY: If any user still has an old tag in their profile, clean it instantly.
      if (myParsedName.includes('[REQ_W:')) {
        const cleanName = parseReqTag(myParsedName)
        await supabase.from('profiles').update({ username: cleanName }).eq('id', myUserId)
        setMyUsername(cleanName)
      }

      setMembersLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!usersOpen || !session || !activeWorkspace) return
    const workspaceId = activeWorkspace.id
    const myUserId = session.user.id

    void loadMembers(workspaceId, myUserId)
    const channel = supabase.channel(`members-${workspaceId}`).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'workspace_members',
      filter: `workspace_id=eq.${workspaceId}`
    }, () => loadMembers(workspaceId, myUserId)).subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [activeWorkspace, session, usersOpen, loadMembers])

  useEffect(() => {
    if (!session) {
      setGlobalRequests([])
      return
    }

    async function fetchGlobalRequests() {
      if (!session) return
      const myId = session.user.id

      // --- 1. My Owned Workspaces (Incoming Requests) ---
      const { data: myWs } = await supabase.from('workspaces').select('id,name').eq('owner_id', myId)
      const ownedWsIds = myWs?.map(w => w.id) || []
      const ownedWsNames = new Map(myWs?.map(w => [w.id, w.name]) || [])

      let incoming: any[] = []
      if (ownedWsIds.length > 0) {
        const { data: pends } = await supabase
          .from('workspace_members')
          .select('user_id,workspace_id')
          .in('workspace_id', ownedWsIds)
          .eq('request_status', 'pending')
        if (pends) incoming = pends
      }

      // --- 2. My Own Status (Accepted/Rejected results) ---
      const { data: myResults } = await supabase
        .from('workspace_members')
        .select('workspace_id,request_status')
        .eq('user_id', myId)
        .in('request_status', ['accepted', 'rejected'])

      // Combine and fetch names for all involving workspaces
      const allWsIds = Array.from(new Set([...ownedWsIds, ...(myResults?.map(m => m.workspace_id) || [])]))
      const { data: allWs } = await supabase.from('workspaces').select('id,name').in('id', allWsIds.length ? allWsIds : ['00000000-0000-0000-0000-000000000000'])
      const allWsNames = new Map(allWs?.map(w => [w.id, w.name]) || [])

      // Fetch usernames for incoming requests
      const senderIds = incoming.map(i => i.user_id)
      const { data: profiles } = await supabase.from('profiles').select('id,username').in('id', senderIds.length ? senderIds : ['00000000-0000-0000-0000-000000000000'])
      const usernameMap = new Map(profiles?.map(p => [p.id, p.username]) || [])

      const totalRequests: any[] = []

      // Add Incoming
      for (const i of incoming) {
        totalRequests.push({
          type: 'incoming',
          userId: i.user_id,
          username: parseReqTag(usernameMap.get(i.user_id) || 'Anon'),
          workspaceName: ownedWsNames.get(i.workspace_id) || 'Unknown',
          workspaceId: i.workspace_id
        })
      }

      // Add My Results
      for (const r of (myResults || [])) {
        totalRequests.push({
          type: 'result',
          status: r.request_status, // 'accepted' | 'rejected'
          workspaceName: allWsNames.get(r.workspace_id) || 'Unknown Workspace',
          workspaceId: r.workspace_id
        })
      }

      setGlobalRequests(totalRequests)
    }

    void fetchGlobalRequests()
    const timer = setInterval(fetchGlobalRequests, 10000)
    return () => clearInterval(timer)
  }, [session, activeWorkspace])

  return (
    <div className="min-h-dvh bg-mesh relative overflow-x-hidden">
      {!session && !loading && (
        <>
          <TaskCube scrollY={scrollY} offset={200} speed={-0.2} size="w-32 h-32" className="left-10" />
          <TaskCube scrollY={scrollY} offset={600} speed={-0.4} size="w-48 h-48" className="right-[-4rem] bg-indigo-500/5 rotate-12" />
          <TaskCube scrollY={scrollY} offset={1200} speed={-0.1} size="w-20 h-20" className="left-[40%]" />
        </>
      )}

      <div className="pointer-events-none fixed inset-0 opacity-70 gridline" />

      <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-950/5 bg-slate-50/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="inline-flex items-center gap-3">
            {!loading && session && (
              <button
                type="button"
                onClick={() => setSidebarOpen((v) => !v)}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-100 p-2 text-slate-900 ring-1 ring-slate-950/5 hover:bg-white"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
              </button>
            )}
            <Logo className="h-9 w-9" />
            <span className="text-lg font-bold tracking-tight text-slate-900">FlowDesk</span>
          </div>

          {!loading && session && (
            <div className="hidden items-center gap-2 md:flex">
              <button
                onClick={() => setUsersOpen(true)}
                className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-900 ring-1 ring-slate-950/5 hover:bg-white transition-all flex items-center gap-1.5"
              >
                <svg className="h-3.5 w-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                Users
                {members.some(m => m.requestStatus === 'pending') && (
                  <div className="h-4 px-1.5 bg-indigo-600 rounded-lg flex items-center justify-center animate-pulse shadow-sm">
                    <span className="text-[9px] font-black text-white">!</span>
                  </div>
                )}
              </button>

              <button onClick={() => setActivityOpen(true)} className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-900 ring-1 ring-slate-950/5 hover:bg-white transition-all">Activity</button>
              <button onClick={() => setSettingsOpen(true)} className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-900 ring-1 ring-slate-950/5 hover:bg-white transition-all">Settings</button>
            </div>
          )}

          {!loading && !session && (
            <nav className="hidden md:flex items-center gap-8 text-[13px] font-bold text-slate-500">
              <button onClick={() => document.getElementById('solutions')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-indigo-600 transition-colors">Features</button>
              <button onClick={() => document.getElementById('product')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-indigo-600 transition-colors">Platform</button>
              <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-indigo-600 transition-colors">Pricing</button>
              <button onClick={() => document.getElementById('resources')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-indigo-600 transition-colors">Resources</button>
            </nav>
          )}

          <div className="flex items-center gap-2 sm:gap-3">
            {!loading && !session && (
              <div className="hidden sm:flex items-center mr-2 border-r border-slate-950/10 pr-5">
                <a 
                  href="https://github.com/jingtai05/todo" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="group flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300"
                >
                  <svg className="h-[16px] w-[16px] text-slate-700 transition-colors group-hover:text-slate-900" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"/></svg>
                  <span className="text-[11px] font-bold text-slate-600 transition-colors group-hover:text-slate-900 pr-1">Star Us</span>
                </a>
              </div>
            )}
            
            {!loading && session ? (
              <>
                <button
                  onClick={() => setNotificationsOpen(true)}
                  className="relative rounded-2xl bg-slate-100 p-2 text-slate-900 ring-1 ring-slate-950/5 hover:bg-white transition-all group"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                  {globalRequests.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-indigo-600 ring-2 ring-white" />
                  )}
                </button>

                <span className="hidden rounded-xl bg-white/70 px-3 py-2 text-xs font-medium text-slate-900 ring-1 ring-slate-950/5 sm:inline-flex sm:text-sm shadow-sm">{userLabel}</span>
                <button onClick={() => supabase.auth.signOut()} className="rounded-2xl px-3 py-2 text-xs font-semibold text-slate-900 ring-1 ring-slate-950/5 hover:bg-white/80 transition-all sm:text-sm">Sign out</button>
              </>
            ) : (
              <button onClick={() => setAuthOpen(true)} className="rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-crisp transition hover:scale-105 active:scale-95 sm:text-sm">Sign in</button>
            )}
          </div>
        </div>
      </header>
      <div className="h-[61px] shrink-0" />

      <Modal open={authOpen} onClose={() => setAuthOpen(false)} title="Sign in to FlowDesk">
        <AuthPanel />
      </Modal>

      <ConfirmModal {...confirmState} onClose={() => setConfirmState((s) => ({ ...s, open: false }))} />

      <OverlayModal open={activityOpen} onClose={() => setActivityOpen(false)} title="Activity Log" widthClass="max-w-2xl">
        <ActivityPanel items={activity} currentUserId={session?.user.id ?? null} />
      </OverlayModal>

      <OverlayModal open={notificationsOpen} onClose={() => setNotificationsOpen(false)} title="Notifications" widthClass="max-w-md">
        <div className="space-y-4">
          {globalRequests.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <svg className="mx-auto h-12 w-12 opacity-20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              <div className="text-sm font-black text-slate-900">All clear!</div>
              <div className="mt-1 text-[11px] font-bold">No global permission requests.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {globalRequests.map(r => (
                <div key={`${r.workspaceId}-${r.userId || 'self'}-${r.status || 'req'}`} className="flex items-center justify-between rounded-[2rem] bg-indigo-50/50 p-5 ring-1 ring-indigo-200/50 shadow-sm">
                  <div className="min-w-0 pr-4">
                    {r.type === 'incoming' ? (
                      <>
                        <div className="text-[13px] font-black text-slate-950 truncate">{r.username}</div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 truncate max-w-[140px] inline-block">{r.workspaceName}</span>
                        </div>
                      </>
                    ) : (
                      <>
                         <div className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1 leading-none">{r.workspaceName}</div>
                         <div className="text-[13px] font-black text-slate-950 truncate">
                            Request <span className={r.status === 'accepted' ? 'text-indigo-600' : 'text-rose-600'}>{r.status === 'accepted' ? 'Accepted' : 'Rejected'}</span>
                         </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {r.type === 'incoming' ? (
                      <>
                        <button
                          onClick={async () => {
                            setGlobalRequests(prev => prev.filter(req => req.userId !== r.userId || req.workspaceId !== r.workspaceId))
                            await supabase.from('workspace_members').update({ role: 'member', request_status: 'accepted' }).eq('workspace_id', r.workspaceId).eq('user_id', r.userId)
                            if (activeWorkspace?.id === r.workspaceId) void loadMembers(r.workspaceId, session!.user.id)
                          }}
                          className="rounded-xl bg-indigo-600 px-3 py-2 text-[10px] font-black text-white shadow-lg shadow-indigo-200 hover:scale-105 active:scale-95 transition-all"
                        >
                          Accept
                        </button>
                        <button
                          onClick={async () => {
                            setGlobalRequests(prev => prev.filter(req => req.userId !== r.userId || req.workspaceId !== r.workspaceId))
                            await supabase.from('workspace_members').update({ request_status: 'rejected' }).eq('workspace_id', r.workspaceId).eq('user_id', r.userId)
                            if (activeWorkspace?.id === r.workspaceId) void loadMembers(r.workspaceId, session!.user.id)
                          }}
                          className="rounded-xl bg-slate-200 px-3 py-2 text-[10px] font-black text-slate-700 hover:bg-slate-300 transition-all font-black"
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={async () => {
                          setGlobalRequests(prev => prev.filter(req => req.workspaceId !== r.workspaceId || req.status !== r.status))
                          await supabase.from('workspace_members').update({ request_status: null }).eq('workspace_id', r.workspaceId).eq('user_id', session!.user.id)
                        }}
                        className="rounded-xl bg-slate-200 px-4 py-2 text-[10px] font-black text-slate-700 hover:bg-slate-300 transition-all"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </OverlayModal>

      <OverlayModal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Settings">
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-3 rounded-2xl bg-slate-100 p-4 ring-1 ring-slate-950/10 hover:bg-white transition-all cursor-pointer">
            <div>
              <div className="text-sm font-semibold text-slate-950">Compact mode</div>
              <div className="mt-1 text-xs text-slate-700">Tighter spacing for your work flow.</div>
            </div>
            <input type="checkbox" checked={compactMode} onChange={(e) => setCompactMode(e.target.checked)} className="h-4 w-4 rounded-full text-indigo-600 focus:ring-indigo-500" />
          </label>
        </div>
      </OverlayModal>

      <OverlayModal open={usersOpen} onClose={() => setUsersOpen(false)} title="User management" widthClass="max-w-4xl">
        {!activeWorkspace ? (
          <div className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-800 ring-1 ring-slate-950/10">Select a workspace from the dashboard first.</div>
        ) : (
          <div className="space-y-4">
            {/* 1. Workspace Info Card */}
            {membersError && (
              <div className="rounded-2xl bg-rose-50 p-4 text-xs font-bold text-rose-600 ring-1 ring-rose-200/50">
                Error loading members: {membersError}
              </div>
            )}

            {membersLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600/20 border-t-indigo-600" />
                  <div className="text-xs font-black uppercase tracking-widest text-slate-400">Syncing Members...</div>
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-3xl bg-slate-50 p-6 ring-1 ring-slate-950/5">
                  <div className="text-lg font-black text-slate-950 leading-tight">{activeWorkspace.name}</div>
                  <div className="mt-1 text-sm font-medium text-slate-500">
                    {activeWorkspace.isOwner
                      ? 'You are the owner. You can remove members.'
                      : 'You are a collaborator in this workspace.'}
                  </div>
                </div>

                {/* 2. Your Username Card */}
                <div className="rounded-3xl bg-slate-50 p-6 ring-1 ring-slate-950/5">
                  <div className="text-sm font-black text-slate-950 mb-3 tracking-tight">Your username</div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      value={myUsername}
                      onChange={(e) => setMyUsername(e.target.value)}
                      placeholder="blablabla"
                      className="flex-1 rounded-2xl bg-white px-4 py-3 text-[13px] font-bold text-slate-950 ring-1 ring-slate-950/10 focus:ring-indigo-500 outline-none placeholder:text-slate-400"
                    />
                    <button
                      onClick={async () => {
                        if (!session) return
                        const clean = myUsername.trim()
                        if (!clean) { setUsernameMsg('Username required'); return }
                        const { error } = await supabase.from('profiles').upsert({ id: session.user.id, username: clean })
                        if (error) setUsernameMsg(error.message)
                        else setUsernameMsg('Profile updated')
                      }}
                      className="rounded-2xl bg-slate-950 px-8 py-3 text-sm font-black text-white shadow-lg active:scale-95 transition-transform"
                    >
                      Save
                    </button>
                  </div>
                  {usernameMsg && <div className="mt-3 text-xs font-bold text-indigo-600">{usernameMsg}</div>}
                </div>

                {/* 3. Member Table Card */}
                <div className="overflow-hidden rounded-3xl border border-slate-950/5 bg-white shadow-sm ring-1 ring-slate-950/5">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left table-fixed">
                      <thead className="bg-slate-50/50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                        <tr>
                          <th className="px-6 py-4 w-1/4">Username</th>
                          <th className="px-6 py-4 w-32">Role</th>
                          <th className="px-6 py-4 w-40">Joined</th>
                          <th className="px-6 py-4 w-32">Permissions</th>
                          <th className="px-6 py-4 w-28">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-950/5">
                        {members.map(m => (
                          <tr key={m.userId} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                <div className="text-[13px] font-black text-slate-950 truncate" title={parseReqTag(m.username || 'Anon')}>
                                  {parseReqTag(m.username || 'Anon Collaborator')}
                                </div>
                                {m.requestStatus === 'pending' && (
                                  <div className="flex items-center gap-1.5 overflow-hidden">
                                    <span className="flex h-1 w-1 shrink-0 animate-pulse rounded-full bg-indigo-600" />
                                    <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600">Pending Upgrade</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="rounded-full bg-slate-100 px-3.5 py-1 text-[10px] font-black text-slate-900 border border-slate-950/5 ring-1 ring-slate-950/5">
                                {m.role}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-[12px] font-bold text-slate-500">{new Date(m.createdAt).toLocaleDateString('en-GB')}</div>
                            </td>
                            <td className="px-6 py-4">
                              {activeWorkspace.isOwner && m.role !== 'owner' ? (
                                <button
                                  onClick={async () => {
                                    const nextRole = (m.role === 'member' || m.role === 'owner') ? 'viewer' : 'member'
                                    await supabase.from('workspace_members').update({ role: nextRole }).eq('workspace_id', activeWorkspace.id).eq('user_id', m.userId)
                                    void loadMembers(activeWorkspace.id, session!.user.id)
                                  }}
                                  className="rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-black text-indigo-600 border border-indigo-200 ring-1 ring-indigo-100 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
                                >
                                  {(m.role === 'member' || m.role === 'owner') ? 'Write' : 'Read'}
                                </button>
                              ) : (
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-600 border border-slate-950/5 ring-1 ring-slate-950/5">
                                  {m.role === 'owner' || m.role === 'member' ? 'Write' : 'Read'}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {m.userId === session?.user.id && m.role !== 'owner' ? (
                                  <button
                                    onClick={() => setConfirmState({
                                      open: true,
                                      title: 'Leave Workspace',
                                      description: 'Are you sure you want to leave this workspace? You will lose access to all tasks.',
                                      confirmText: 'Leave Workspace',
                                      isDestructive: true,
                                      onConfirm: async () => {
                                        await supabase.from('workspace_members').delete().eq('workspace_id', activeWorkspace.id).eq('user_id', m.userId)
                                        setUsersOpen(false)
                                        window.location.reload()
                                      }
                                    })}
                                    className="rounded-xl bg-rose-50 px-3 py-1.5 text-[10px] font-black text-rose-600 ring-1 ring-rose-200/50 hover:bg-rose-100 transition-colors"
                                  >
                                    Leave
                                  </button>
                                ) : activeWorkspace.isOwner && m.userId !== session?.user.id ? (
                                  <>
                                    {m.requestStatus === 'pending' && (
                                      <>
                                        <button
                                          onClick={async () => {
                                            setMembers(prev => prev.map(mm => mm.userId === m.userId ? { ...mm, role: 'member', requestStatus: 'accepted' } : mm))
                                            await supabase.from('workspace_members').update({ role: 'member', request_status: 'accepted' }).eq('workspace_id', activeWorkspace.id).eq('user_id', m.userId)
                                            void loadMembers(activeWorkspace.id, session!.user.id)
                                          }}
                                          className="rounded-xl bg-indigo-600 px-3 py-1.5 text-[10px] font-black text-white shadow-lg shadow-indigo-100 hover:scale-105 active:scale-95 transition-all outline-none"
                                        >
                                          Accept
                                        </button>
                                        <button
                                          onClick={async () => {
                                            setMembers(prev => prev.map(mm => mm.userId === m.userId ? { ...mm, requestStatus: 'rejected' } : mm))
                                            await supabase.from('workspace_members').update({ request_status: 'rejected' }).eq('workspace_id', activeWorkspace.id).eq('user_id', m.userId)
                                            void loadMembers(activeWorkspace.id, session!.user.id)
                                          }}
                                          className="rounded-xl bg-slate-200 px-3 py-1.5 text-[10px] font-black text-slate-700 hover:bg-slate-300 transition-all font-black outline-none"
                                        >
                                          Reject
                                        </button>
                                      </>
                                    )}
                                    <button
                                      onClick={() => setConfirmState({
                                        open: true,
                                        title: 'Remove member',
                                        description: `Are you sure you want to remove this member?`,
                                        confirmText: 'Remove',
                                        isDestructive: true,
                                        onConfirm: async () => {
                                          await supabase.from('workspace_members').delete().eq('workspace_id', activeWorkspace.id).eq('user_id', m.userId)
                                          void loadMembers(activeWorkspace.id, session!.user.id)
                                        }
                                      })}
                                      className="rounded-xl bg-rose-50 px-3 py-1.5 text-[10px] font-black text-rose-600 ring-1 ring-rose-200/50 hover:bg-rose-100 transition-colors"
                                    >
                                      Remove
                                    </button>
                                  </>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </OverlayModal>

      {!loading && session ? (
        <TasksPage
          userId={session.user.id}
          sidebarOpen={sidebarOpen}
          onRequestCloseSidebar={() => setSidebarOpen(false)}
          query={query} setQuery={setQuery}
          filterType={filterType} setFilterType={setFilterType}
          filterPriority={filterPriority} setFilterPriority={setFilterPriority}
          compactMode={compactMode}
          onActivity={(item) => setActivity((prev) => [item, ...prev].slice(0, 200))}
          onWorkspaceContext={(ctx) => setActiveWorkspace(ctx)}
        />
      ) : (
        <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-16 sm:px-6">
          <ScrollReveal>
            <div className="relative text-center lg:text-left">
              <div className="grid items-center gap-12 lg:grid-cols-5">
                <div className="lg:col-span-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200 shadow-sm animate-pulse">
                    <span className="flex h-2 w-2 rounded-full bg-indigo-600" />FlowDesk 2.0 Released
                  </div>
                  <h1 className="mt-8 text-6xl font-extrabold tracking-tight text-slate-900 sm:text-7xl leading-[1.1]">
                     Where work <br /> <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 bg-clip-text text-transparent italic">flows naturally.</span>
                  </h1>
                  <p className="mt-6 text-xl text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">Mission-critical project tracking for high-velocity teams. Private, secure, and blazing fast.</p>
                  <div className="mt-10 flex flex-col items-center gap-6 sm:flex-row lg:justify-start">
                    <button onClick={() => setAuthOpen(true)} className="rounded-[1.5rem] bg-indigo-600 px-10 py-5 text-lg font-bold text-white shadow-2xl shadow-indigo-200 transition hover:scale-105 active:scale-95 group">
                      Get Started Free <span className="ml-2 group-hover:translate-x-1 transition-transform inline-block">→</span>
                    </button>
                    <div className="flex -space-x-3 overflow-hidden p-1">
                      {[1, 2, 3, 4].map(i => <div key={i} className="inline-block h-10 w-10 rounded-full ring-2 ring-white bg-slate-200" />)}
                      <div className="flex h-10 items-center pl-4 text-sm font-bold text-slate-500">10k+ active squads</div>
                    </div>
                  </div>
                </div>
                <div className="hidden lg:col-span-2 lg:block">
                  <div className="relative">
                    <div className="absolute inset-0 bg-indigo-400 blur-[100px] opacity-10 rounded-full" />
                    <Mascot />
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Trust Cloud */}
          <ScrollReveal delay={200}>
            <div className="mt-20 border-y border-slate-950/5 py-12">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 text-center mb-10">Trusted by elite squads worldwide</div>
              <div className="flex flex-wrap items-center justify-center gap-12 opacity-40 grayscale contrast-125">
                {['Linear', 'GitHub', 'Vercel', 'Slack', 'Zoom'].map(name => (
                  <div key={name} className="text-2xl font-black tracking-tighter text-slate-900">{name}</div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          <div id="solutions" className="mt-32 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Bento Cards */}
            <ScrollReveal delay={100} className="lg:col-span-1">
              <div className="group relative overflow-hidden rounded-[3rem] bg-indigo-600 p-10 text-white shadow-2xl transition hover:-translate-y-2">
                <div className="absolute right-0 top-0 -translate-y-1/4 translate-x-1/4 rounded-full bg-white/10 p-16 blur-3xl" />
                <div className="relative z-10">
                  <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <h3 className="text-2xl font-bold">Private by Design</h3>
                  <p className="mt-4 text-indigo-100/80 font-medium leading-relaxed">Secured by Supabase RLS. Your work stays yours.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={200} className="lg:col-span-2">
              <div className="group relative overflow-hidden rounded-[3rem] bg-white p-10 shadow-crisp transition hover:-translate-y-2 ring-1 ring-slate-950/5 h-full">
                <div className="flex flex-col h-full lg:flex-row lg:items-center lg:gap-10">
                  <div className="flex-1">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">Realtime Momentum</h3>
                    <p className="mt-4 text-slate-600 font-medium leading-relaxed">Collaborate without friction. Updates push in milliseconds.</p>
                  </div>
                  <div className="mt-8 flex h-40 w-full lg:mt-0 lg:w-56 items-center justify-center rounded-[2rem] bg-slate-50 ring-1 ring-slate-950/5">
                    <div className="flex gap-2 items-end pb-6">
                      {[1, 2.5, 3, 2, 1.5, 2].map((h, i) => (
                        <div key={i} className="w-3 rounded-full bg-indigo-500 animate-pulse" style={{ height: `${h * 24}px`, animationDelay: `${i * 0.1}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={300} className="lg:col-span-1">
              <div className="group relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-white to-cyan-50/30 p-10 shadow-crisp transition hover:-translate-y-2 ring-1 ring-slate-950/5 h-full">
                <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-cyan-200/40 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="h-12 w-12 rounded-2xl bg-cyan-100 text-cyan-600 flex items-center justify-center mb-6">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10" /></svg>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Deep Insights</h3>
                  <p className="mt-4 text-slate-600 font-medium leading-relaxed">Visualize bottlenecks with precision heatmaps.</p>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Workflow Showcase */}
          <div id="product" className="mt-40 text-center">
            <h2 className="text-4xl font-black text-slate-900">Experience the <span className="bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent italic">Real Flow.</span></h2>
            <p className="mt-4 text-sm font-bold text-slate-500 uppercase tracking-widest max-w-2xl mx-auto">This is the actual FlowDesk interface. No gimmicks, just premium project tracking.</p>

            <ScrollReveal delay={200}>
              <RealInterfaceShowcase />
            </ScrollReveal>
          </div>

          <ScrollReveal delay={400}>
            <div className="mt-40">
              <div className="glass rounded-[4rem] p-12 shadow-soft relative overflow-hidden">
                <div className="flex items-center gap-2 mb-10">
                  <span className="status-pulse" />
                  <div className="text-sm font-black text-slate-900 uppercase tracking-widest">Live Evolution Preview</div>
                </div>
                <div className="grid gap-12 lg:grid-cols-2">
                  <VelocityPulse />
                  <TeamMomentum />
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Pricing Section */}
          <div id="pricing">
            <Pricing />
          </div>

          {/* Footer */}
          <footer id="resources" className="mt-40 border-t border-slate-950/5 pt-20 pb-10">
            <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
              <div className="lg:col-span-2">
                <div className="flex items-center gap-2">
                  <Logo className="h-8 w-8" />
                  <span className="text-xl font-black tracking-tight text-slate-900">FlowDesk</span>
                </div>
                <p className="mt-6 text-sm font-medium text-slate-500 max-w-sm leading-relaxed">Building the future of high-velocity team operations. Secure, private, and built for speed.</p>
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-widest text-slate-900 mb-6">Product</div>
                <ul className="space-y-4 text-sm font-bold text-slate-500">
                  <li><button className="hover:text-indigo-600 transition-colors">Features</button></li>
                  <li><button className="hover:text-indigo-600 transition-colors">Pricing</button></li>
                  <li><button className="hover:text-indigo-600 transition-colors">Security</button></li>
                </ul>
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-widest text-slate-900 mb-6">Connect</div>
                <ul className="space-y-4 text-sm font-bold text-slate-500">
                  <li><button className="hover:text-indigo-600 transition-colors">Twitter</button></li>
                  <li><button className="hover:text-indigo-600 transition-colors">Discord</button></li>
                  <li><button className="hover:text-indigo-600 transition-colors">GitHub</button></li>
                </ul>
              </div>
            </div>
            <div className="mt-20 flex flex-col gap-6 border-t border-slate-950/5 pt-10 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs font-bold text-slate-400">© 2026 FlowDesk Inc. All rights reserved.</div>
              <div className="flex gap-6 text-xs font-bold text-slate-400">
                <button className="hover:text-slate-900 transition-colors">Privacy Policy</button>
                <button className="hover:text-slate-900 transition-colors">Terms of Service</button>
              </div>
            </div>
          </footer>
        </main>
      )}
    </div>
  )
}
