import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from './lib/supabaseClient'
import { useSupabaseSession } from './hooks/useSupabaseSession'
import { AuthPanel } from './components/AuthPanel'
import { DemoTodosCard, HabitPulse } from './components/LandingInteractive'
import { Mascot } from './components/Mascot'
import {
  ActivityPanel,
  type ActivityItem,
  OverlayModal,
  useLocalStorageState,
} from './components/ShellModals'
import { TasksPage } from './pages/TasksPage'

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
        <div className="glass rounded-3xl p-6 shadow-soft">
          <div className="flex items-start justify-between gap-4">
            <div className="text-sm font-semibold text-white">{title}</div>
            <button
              onClick={onClose}
              className="rounded-2xl bg-white/5 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/10 hover:bg-white/10"
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

export default function App() {
  const { session, loading } = useSupabaseSession()
  const [authOpen, setAuthOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [usersOpen, setUsersOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'feature' | 'bug' | 'chore'>(
    'all',
  )
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'medium' | 'high'>(
    'all',
  )
  const [compactMode, setCompactMode] = useLocalStorageState<boolean>(
    'tododesk_settings_compact_v1',
    false,
  )
  const [activity, setActivity] = useLocalStorageState<ActivityItem[]>(
    'tododesk_activity_v1',
    [],
  )

  const [activeWorkspace, setActiveWorkspace] = useState<{
    id: string
    name: string
    ownerId: string
    isOwner: boolean
  } | null>(null)

  const [membersLoading, setMembersLoading] = useState(false)
  const [membersError, setMembersError] = useState<string | null>(null)
  const [members, setMembers] = useState<
    { userId: string; role: string; createdAt: string; username: string | null }[]
  >([])
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

  useEffect(() => {
    if (!usersOpen) return
    if (!session) return
    if (!activeWorkspace) return
    let cancelled = false
    const workspaceId = activeWorkspace.id
    const myUserId = session.user.id

    async function loadMembers() {
      setMembersLoading(true)
      setMembersError(null)
      setUsernameMsg(null)

      const { data: memRows, error: memErr } = await supabase
        .from('workspace_members')
        .select('user_id,role,created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: true })

      if (cancelled) return
      if (memErr) {
        setMembersError(memErr.message)
        setMembersLoading(false)
        return
      }

      const mergedBase =
        (memRows ?? []).map((r: any) => ({
          userId: r.user_id as string,
          role: (r.role as string) ?? 'member',
          createdAt: r.created_at as string,
          username: null as string | null,
        })) ?? []

      // Best-effort profile lookup (still show members even if profiles table not created yet)
      const ids = Array.from(new Set(mergedBase.map((r) => r.userId)))
      const { data: profileRows, error: profErr } = await supabase
        .from('profiles')
        .select('id,username')
        .in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])

      if (cancelled) return
      if (profErr) {
        const msg = profErr.message ?? 'Failed to load profiles.'
        if (msg.includes("Could not find the table 'public.profiles'")) {
          setMembersError('Usernames are not set up yet. Run `SUPABASE_PROFILES.sql` in Supabase, then refresh.')
          setMembers(mergedBase)
          setMyUsername('')
          setMembersLoading(false)
          return
        }
        setMembersError(msg)
        setMembers(mergedBase)
        setMyUsername('')
        setMembersLoading(false)
        return
      }

      const byId = new Map<string, string>()
      for (const p of profileRows ?? []) {
        byId.set((p as any).id as string, (p as any).username as string)
      }

      setMembers(mergedBase.map((m) => ({ ...m, username: byId.get(m.userId) ?? null })))
      setMyUsername(byId.get(myUserId) ?? '')

      setMembersLoading(false)
    }

    void loadMembers()

    // Keep the list synced while the modal is open (joins/leaves/role changes).
    const channel = supabase
      .channel(`workspace-members-live-${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspace_members',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => loadMembers(),
      )
      .subscribe()
    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [activeWorkspace, session, usersOpen])

  return (
    <div className="min-h-dvh bg-mesh">
      <div className="pointer-events-none fixed inset-0 opacity-70 gridline" />

      <header className="sticky top-0 z-40 border-b border-charcoal-950/10 bg-paper-50/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="inline-flex items-center gap-3">
            {!loading && session && (
              <button
                type="button"
                onClick={() => setSidebarOpen((v) => !v)}
                className="inline-flex items-center justify-center rounded-2xl bg-paper-100 p-2 text-charcoal-900 ring-1 ring-charcoal-950/10 hover:bg-paper-50"
                aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
                title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M3 5h14M3 10h14M3 15h14"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 ring-1 ring-charcoal-950/10 shadow-soft">
              <span className="bg-gradient-to-r from-coral-600 to-moss-600 bg-clip-text text-sm font-semibold text-transparent">
                TD
              </span>
            </span>
            <span className="text-sm font-semibold tracking-wide text-charcoal-950">
              TodoDesk
            </span>
          </div>

          {!loading && session && (
            <div className="hidden items-center gap-2 md:flex">
              <button
                type="button"
                onClick={() => setUsersOpen(true)}
                className="rounded-2xl bg-paper-100 px-3 py-2 text-xs font-semibold text-charcoal-900 ring-1 ring-charcoal-950/10 hover:bg-paper-50"
              >
                Users
              </button>
              <button
                type="button"
                onClick={() => setActivityOpen(true)}
                className="rounded-2xl bg-paper-100 px-3 py-2 text-xs font-semibold text-charcoal-900 ring-1 ring-charcoal-950/10 hover:bg-paper-50"
              >
                Activity Log
              </button>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="rounded-2xl bg-paper-100 px-3 py-2 text-xs font-semibold text-charcoal-900 ring-1 ring-charcoal-950/10 hover:bg-paper-50"
              >
                Settings
              </button>
            </div>
          )}

          {!loading && !session && (
            <nav className="hidden items-center gap-6 text-sm text-charcoal-700 md:flex">
              <a className="hover:text-charcoal-950" href="#features">
                Features
              </a>
              <a className="hover:text-charcoal-950" href="#how">
                How it works
              </a>
              <a className="hover:text-charcoal-950" href="#faq">
                FAQ
              </a>
            </nav>
          )}

          <div className="flex items-center gap-2 sm:gap-3">
            {!loading && session ? (
              <>
                <span className="hidden rounded-xl bg-white/70 px-3 py-2 text-xs font-medium text-charcoal-900 ring-1 ring-charcoal-950/10 sm:inline-flex sm:text-sm">
                  {userLabel}
                </span>
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="rounded-2xl px-3 py-2 text-xs font-semibold text-charcoal-900 ring-1 ring-charcoal-950/10 hover:bg-white/80 sm:text-sm"
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="rounded-2xl bg-charcoal-950 px-4 py-2 text-xs font-semibold text-paper-50 shadow-crisp transition hover:-translate-y-0.5 sm:text-sm"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      <Modal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        title="Sign in to TodoDesk"
      >
        <AuthPanel />
      </Modal>

      <OverlayModal
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        title="Activity Log"
        widthClass="max-w-2xl"
      >
        <ActivityPanel items={activity} currentUserId={session?.user.id ?? null} />
      </OverlayModal>

      <OverlayModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Settings"
      >
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-3 rounded-2xl bg-paper-100 p-4 ring-1 ring-charcoal-950/10">
            <div>
              <div className="text-sm font-semibold text-charcoal-950">
                Compact mode
              </div>
              <div className="mt-1 text-xs text-charcoal-700">
                Tighter spacing for more tasks on screen.
              </div>
            </div>
            <input
              type="checkbox"
              checked={compactMode}
              onChange={(e) => setCompactMode(e.target.checked)}
            />
          </label>
        </div>
      </OverlayModal>

      <OverlayModal
        open={usersOpen}
        onClose={() => setUsersOpen(false)}
        title="User management"
        widthClass="max-w-3xl"
      >
        {!activeWorkspace ? (
          <div className="rounded-2xl bg-paper-100 p-4 text-sm text-charcoal-800 ring-1 ring-charcoal-950/10">
            Select a workspace first.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl bg-paper-100 p-4 ring-1 ring-charcoal-950/10">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-charcoal-950">
                    {activeWorkspace.name}
                  </div>
                  <div className="mt-1 text-xs text-charcoal-700">
                    {activeWorkspace.isOwner
                      ? 'You are the owner. You can remove members.'
                      : 'You are a member. View only.'}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-paper-100 p-4 ring-1 ring-charcoal-950/10">
              <div className="text-sm font-semibold text-charcoal-950">Your username</div>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={myUsername}
                  onChange={(e) => setMyUsername(e.target.value)}
                  placeholder="e.g. jingtai"
                  className="w-full rounded-2xl bg-white/70 px-4 py-2 text-sm font-semibold text-charcoal-950 placeholder:text-charcoal-500 ring-1 ring-charcoal-950/10 outline-none focus:ring-charcoal-950/20"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!session) return
                    const clean = myUsername.trim()
                    if (!clean) {
                      setUsernameMsg('Username is required.')
                      return
                    }
                    if (!/^[a-zA-Z0-9_]{3,24}$/.test(clean)) {
                      setUsernameMsg('Use 3–24 chars: letters, numbers, underscore.')
                      return
                    }
                    setUsernameMsg(null)
                    const { error } = await supabase
                      .from('profiles')
                      .upsert({ id: session.user.id, username: clean }, { onConflict: 'id' })
                    if (error) {
                      if (error.message.includes("Could not find the table 'public.profiles'")) {
                        setUsernameMsg('Run `todo-site/SUPABASE_PROFILES.sql` in Supabase first, then refresh.')
                      } else {
                        setUsernameMsg(error.message)
                      }
                    }
                    else setUsernameMsg('Saved.')
                  }}
                  className="rounded-2xl bg-charcoal-950 px-4 py-2 text-xs font-semibold text-paper-50 shadow-crisp hover:-translate-y-0.5 transition"
                >
                  Save
                </button>
              </div>
              {usernameMsg && (
                <div className="mt-2 text-xs font-semibold text-charcoal-800">
                  {usernameMsg}
                </div>
              )}
            </div>

            {membersError && (
              <div className="rounded-2xl bg-rose-500/10 p-3 text-sm text-rose-900 ring-1 ring-rose-300/30">
                {membersError}
              </div>
            )}

            <div className="overflow-hidden rounded-3xl bg-white/70 ring-1 ring-charcoal-950/10">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-paper-100 text-[11px] uppercase tracking-wide text-charcoal-700">
                  <tr>
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3">Permissions</th>
                    <th className="px-4 py-3">Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {membersLoading ? (
                    <tr>
                      <td className="px-4 py-6 text-sm text-charcoal-700" colSpan={5}>
                        Loading…
                      </td>
                    </tr>
                  ) : (
                    members.map((m) => (
                      <tr key={m.userId} className="border-t border-charcoal-950/5">
                        <td className="px-4 py-3 text-sm font-semibold text-charcoal-950">
                          {m.username ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-paper-100 px-2.5 py-1 text-[11px] font-semibold text-charcoal-800 ring-1 ring-charcoal-950/10">
                            {m.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-charcoal-800">
                          {new Date(m.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          {m.userId === session?.user.id ? (
                            <span className="rounded-full bg-paper-100 px-2.5 py-1 text-[11px] font-semibold text-charcoal-800 ring-1 ring-charcoal-950/10">
                              {m.role === 'viewer' ? 'Read' : 'Write'}
                            </span>
                          ) : activeWorkspace.isOwner ? (
                            <button
                              type="button"
                              onClick={async () => {
                                const nextRole = m.role === 'viewer' ? 'member' : 'viewer'
                                const prevRole = m.role
                                setMembers((prev) =>
                                  prev.map((x) =>
                                    x.userId === m.userId ? { ...x, role: nextRole } : x,
                                  ),
                                )
                                const { error } = await supabase
                                  .from('workspace_members')
                                  .update({ role: nextRole })
                                  .eq('workspace_id', activeWorkspace.id)
                                  .eq('user_id', m.userId)
                                if (error) {
                                  setMembersError(error.message)
                                  setMembers((prev) =>
                                    prev.map((x) =>
                                      x.userId === m.userId ? { ...x, role: prevRole } : x,
                                    ),
                                  )
                                } else {
                                  window.dispatchEvent(
                                    new CustomEvent('tododesk:workspace-members-changed', {
                                      detail: { workspaceId: activeWorkspace.id },
                                    }),
                                  )
                                }
                              }}
                              className="rounded-full bg-paper-100 px-2.5 py-1 text-[11px] font-semibold text-charcoal-800 ring-1 ring-charcoal-950/10 hover:bg-paper-50"
                            >
                              {m.role === 'viewer' ? 'Read' : 'Write'}
                            </button>
                          ) : (
                            <span className="rounded-full bg-paper-100 px-2.5 py-1 text-[11px] font-semibold text-charcoal-800 ring-1 ring-charcoal-950/10">
                              {m.role === 'viewer' ? 'Read' : 'Write'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {m.userId === session?.user.id && !activeWorkspace.isOwner ? (
                            <button
                              type="button"
                              onClick={async () => {
                                if (!confirm('Leave this workspace?')) return
                                const { error } = await supabase
                                  .from('workspace_members')
                                  .delete()
                                  .eq('workspace_id', activeWorkspace.id)
                                  .eq('user_id', m.userId)
                                if (error) {
                                  setMembersError(error.message)
                                } else {
                                  setMembers((prev) => prev.filter((x) => x.userId !== m.userId))
                                  setUsersOpen(false)
                                  window.dispatchEvent(
                                    new CustomEvent('tododesk:workspace-members-changed', {
                                      detail: { workspaceId: activeWorkspace.id },
                                    }),
                                  )
                                }
                              }}
                              className="rounded-xl bg-paper-100 px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200/60 hover:bg-paper-50"
                            >
                              Leave
                            </button>
                          ) : activeWorkspace.isOwner && m.userId !== session?.user.id ? (
                            <button
                              type="button"
                              onClick={async () => {
                                if (!confirm('Remove this user from the workspace?')) return
                                const { error } = await supabase
                                  .from('workspace_members')
                                  .delete()
                                  .eq('workspace_id', activeWorkspace.id)
                                  .eq('user_id', m.userId)
                                if (error) setMembersError(error.message)
                                else {
                                  setMembers((prev) => prev.filter((x) => x.userId !== m.userId))
                                  window.dispatchEvent(
                                    new CustomEvent('tododesk:workspace-members-changed', {
                                      detail: { workspaceId: activeWorkspace.id },
                                    }),
                                  )
                                }
                              }}
                              className="rounded-xl bg-paper-100 px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200/60 hover:bg-paper-50"
                            >
                              Remove
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))
                  )}
                  {!membersLoading && members.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-sm text-charcoal-700" colSpan={5}>
                        No members found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </OverlayModal>

      {!loading && session ? (
        <TasksPage
          userId={session.user.id}
          sidebarOpen={sidebarOpen}
          onRequestCloseSidebar={() => setSidebarOpen(false)}
          query={query}
          setQuery={setQuery}
          filterType={filterType}
          setFilterType={setFilterType}
          filterPriority={filterPriority}
          setFilterPriority={setFilterPriority}
          compactMode={compactMode}
          onActivity={(item) => setActivity((prev) => [item, ...prev].slice(0, 200))}
          onWorkspaceContext={(ctx) => setActiveWorkspace(ctx)}
        />
      ) : (
        <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-14 sm:px-6">
          {/* Row 1: hero + interactive character */}
          <div className="grid items-start gap-8 lg:grid-cols-2">
            <div className="glass rounded-3xl p-8 shadow-soft">
              <div className="inline-flex items-center gap-2 rounded-full bg-paper-100 px-3 py-1 text-xs font-semibold text-charcoal-800 ring-1 ring-charcoal-950/10">
                Supabase-backed · private by default
              </div>
              <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight text-charcoal-950">
                A crisp todo app for people who like momentum.
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-charcoal-800">
                Sign in and your tasks sync instantly. Each user only sees their
                own todos with Row Level Security.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => setAuthOpen(true)}
                  className="rounded-2xl bg-charcoal-950 px-6 py-3 text-sm font-semibold text-paper-50 shadow-crisp transition hover:-translate-y-0.5"
                >
                  Sign in
                </button>
                <div className="text-xs text-charcoal-700">
                  Magic link or password login supported.
                </div>
              </div>
            </div>

            <Mascot />
          </div>

          {/* Row 2: content sections (no longer pushing hero) */}
          <div className="mt-8 grid items-start gap-4 lg:grid-cols-2">
            <section
              id="features"
              className="glass scroll-mt-24 rounded-3xl p-6 shadow-soft"
            >
              <div className="text-sm font-semibold text-charcoal-950">
                What you get
              </div>
              <ul className="mt-3 grid gap-3 text-sm text-charcoal-800 sm:grid-cols-2">
                <li className="rounded-2xl bg-paper-100 p-4 ring-1 ring-charcoal-950/10">
                  <div className="font-semibold text-charcoal-950">
                    Private todos
                  </div>
                  <div className="mt-1 text-xs">
                    Enforced by Supabase RLS on `public.todos`.
                  </div>
                </li>
                <li className="rounded-2xl bg-paper-100 p-4 ring-1 ring-charcoal-950/10">
                  <div className="font-semibold text-charcoal-950">Fast CRUD</div>
                  <div className="mt-1 text-xs">
                    Add, complete, delete, clear completed.
                  </div>
                </li>
                <li className="rounded-2xl bg-paper-100 p-4 ring-1 ring-charcoal-950/10">
                  <div className="font-semibold text-charcoal-950">
                    Realtime sync
                  </div>
                  <div className="mt-1 text-xs">
                    Updates across tabs automatically.
                  </div>
                </li>
                <li className="rounded-2xl bg-paper-100 p-4 ring-1 ring-charcoal-950/10">
                  <div className="font-semibold text-charcoal-950">Filters</div>
                  <div className="mt-1 text-xs">All / Active / Completed.</div>
                </li>
              </ul>
            </section>

            <div className="glass rounded-3xl p-6 shadow-soft">
              <div className="text-sm font-semibold text-charcoal-950">
                Built for daily use
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {[
                  { k: 'Instant', v: 'Optimistic updates (no refresh)' },
                  { k: 'Private', v: 'Each todo row is scoped to auth.uid()' },
                  { k: 'Portable', v: 'Works locally + deploys cleanly' },
                ].map((x) => (
                  <div
                    key={x.k}
                    className="rounded-2xl bg-paper-100 p-4 ring-1 ring-charcoal-950/10"
                  >
                    <div className="text-xs font-semibold text-charcoal-950">
                      {x.k}
                    </div>
                    <div className="mt-1 text-xs text-charcoal-700">{x.v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass rounded-3xl p-6 shadow-soft lg:col-span-2">
              <div className="text-sm font-semibold text-charcoal-950">
                Try it (interactive)
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <DemoTodosCard />
                <HabitPulse />
              </div>
            </div>

            <section
              id="how"
              className="glass scroll-mt-24 rounded-3xl p-6 shadow-soft"
            >
              <div className="text-sm font-semibold text-charcoal-950">
                How it works
              </div>
              <ol className="mt-3 space-y-2 text-sm text-charcoal-800">
                <li>
                  <span className="font-semibold text-charcoal-950">1.</span>{' '}
                  Sign in with magic link or password.
                </li>
                <li>
                  <span className="font-semibold text-charcoal-950">2.</span>{' '}
                  Create todos; each row stores your `user_id`.
                </li>
                <li>
                  <span className="font-semibold text-charcoal-950">3.</span>{' '}
                  RLS ensures only you can read/write your tasks.
                </li>
              </ol>
            </section>

            <section
              id="faq"
              className="glass scroll-mt-24 rounded-3xl p-6 shadow-soft"
            >
              <div className="text-sm font-semibold text-charcoal-950">FAQ</div>
              <div className="mt-3 space-y-2">
                {[
                  {
                    q: 'Do I need to create the database table?',
                    a: 'Yes—run `SUPABASE_TODOS.sql` once. After that, everything is live.',
                  },
                  {
                    q: 'Are my todos visible to other users?',
                    a: 'No. Row Level Security restricts reads/writes to your own `user_id`.',
                  },
                  {
                    q: 'Can I use password login and magic links?',
                    a: 'Yes. The sign-in modal supports both.',
                  },
                ].map((item) => (
                  <details
                    key={item.q}
                    className="rounded-2xl bg-paper-100 p-4 ring-1 ring-charcoal-950/10"
                  >
                    <summary className="cursor-pointer list-none text-sm font-semibold text-charcoal-950">
                      <span className="flex items-center justify-between gap-3">
                        {item.q}
                        <span className="text-charcoal-700">+</span>
                      </span>
                    </summary>
                    <p className="mt-2 text-sm text-charcoal-800">{item.a}</p>
                  </details>
                ))}
              </div>
            </section>
          </div>
        </main>
      )}
    </div>
  )
}
