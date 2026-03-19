import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useWorkspaces } from '../hooks/useWorkspaces'

type Status = 'icebox' | 'in_progress' | 'review' | 'done'
type Type = 'feature' | 'bug' | 'chore'
type Priority = 'low' | 'medium' | 'high'
type ViewMode = 'board' | 'list'

type Task = {
  id: string
  workspace_id: string
  created_by: string
  assignee_id: string | null
  title: string
  description: string | null
  status: Status
  type: Type
  priority: Priority
  due_date: string | null
  sort_order: number
  created_at: string
}

type MemberOption = { id: string; label: string }

type DragPayload = {
  taskId: string
}

const STATUSES: { key: Status; label: string }[] = [
  { key: 'icebox', label: 'Icebox' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'review', label: 'In Review' },
  { key: 'done', label: 'Done' },
]

function normalizeStatus(raw: string | null | undefined): Status {
  switch (raw) {
    case 'icebox':
      return 'icebox'
    case 'in_progress':
      return 'in_progress'
    case 'review':
      return 'review'
    case 'done':
      return 'done'
    // backward-compat with older flows
    case 'ready':
      return 'icebox'
    case 'qa':
      return 'review'
    default:
      return 'icebox'
  }
}

function statusLabel(s: Status): string {
  return STATUSES.find((x) => x.key === s)?.label ?? s
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-paper-100 px-2.5 py-1 text-[11px] font-semibold text-charcoal-800 ring-1 ring-charcoal-950/10">
      {children}
    </span>
  )
}

function SoftButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode
  onClick?: () => void
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="rounded-2xl bg-paper-100 px-3 py-2 text-xs font-semibold text-charcoal-900 ring-1 ring-charcoal-950/10 hover:bg-paper-50"
    >
      {children}
    </button>
  )
}

export function TasksPage({
  userId,
  sidebarOpen,
  onRequestCloseSidebar,
  query,
  setQuery,
  filterType,
  setFilterType,
  filterPriority,
  setFilterPriority,
  compactMode,
  onActivity,
  onWorkspaceContext,
}: {
  userId: string
  sidebarOpen: boolean
  onRequestCloseSidebar: () => void
  query: string
  setQuery: (v: string) => void
  filterType: 'all' | 'feature' | 'bug' | 'chore'
  setFilterType: (v: 'all' | 'feature' | 'bug' | 'chore') => void
  filterPriority: 'all' | 'low' | 'medium' | 'high'
  setFilterPriority: (v: 'all' | 'low' | 'medium' | 'high') => void
  compactMode: boolean
  onActivity: (item: { id: string; at: string; workspaceName: string; text: string }) => void
  onWorkspaceContext: (ctx: { id: string; name: string; ownerId: string; isOwner: boolean } | null) => void
}) {
  const ws = useWorkspaces(userId)
  const [tasks, setTasks] = useState<Task[]>([])
  const [view, setView] = useState<ViewMode>('board')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<Status | null>(null)
  const [myRole, setMyRole] = useState<string>('member')
  const [editOpen, setEditOpen] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [editType, setEditType] = useState<Type>('feature')
  const [editPriority, setEditPriority] = useState<Priority>('medium')
  const [editAssigneeId, setEditAssigneeId] = useState<string>('')
  const [editDue, setEditDue] = useState<string>('')
  const [editSaving, setEditSaving] = useState(false)

  const [title, setTitle] = useState('')
  const [type, setType] = useState<Type>('feature')
  const [priority, setPriority] = useState<Priority>('medium')
  const [due, setDue] = useState<string>('')
  const [assigneeId, setAssigneeId] = useState<string>('')
  const [renameDraft, setRenameDraft] = useState('')
  const [renameMsg, setRenameMsg] = useState<string | null>(null)

  const activeWorkspaceId = ws.activeWorkspaceId
  const [ownerUsernames, setOwnerUsernames] = useState<Map<string, string>>(new Map())
  const [memberLabelById, setMemberLabelById] = useState<Map<string, string>>(new Map())
  const canWrite = myRole !== 'viewer'

  const memberOptions = useMemo((): MemberOption[] => {
    const base: MemberOption[] = [{ id: '', label: 'Unassigned' }]
    const entries = Array.from(memberLabelById.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
    return base.concat(entries)
  }, [memberLabelById])

  useEffect(() => {
    async function loadOwnerUsernames() {
      const ownerIds = Array.from(new Set(ws.workspaces.map((w) => w.owner_id)))
      if (ownerIds.length === 0) return
      const { data } = await supabase
        .from('profiles')
        .select('id,username')
        .in('id', ownerIds)
      if (data) {
        const map = new Map<string, string>()
        for (const p of data) {
          map.set((p as any).id, (p as any).username)
        }
        setOwnerUsernames(map)
      }
    }
    void loadOwnerUsernames()
  }, [ws.workspaces])

  function workspaceLabel(w: {
    id: string
    name: string
    is_personal: boolean
    owner_id: string
    owner_email?: string | null
  }) {
    if (!w.is_personal) return w.name
    if (w.owner_id === userId) return 'My Workspace'
    
    // Try to use username from profiles
    const ownerUsername = ownerUsernames.get(w.owner_id)
    if (ownerUsername) return `${ownerUsername}'s Workspace`
    
    // Fallback to email username
    const email = w.owner_email ?? ''
    const username = email.includes('@') ? email.split('@')[0] : ''
    if (username) return `${username}'s Workspace`
    
    // Final fallback to user_id
    return `${w.owner_id.slice(0, 8)}'s Workspace`
  }

  useEffect(() => {
    if (!ws.activeWorkspace) {
      setRenameDraft('')
      setRenameMsg(null)
      onWorkspaceContext(null)
      return
    }
    setRenameDraft(ws.activeWorkspace.name ?? '')
    setRenameMsg(null)
    onWorkspaceContext({
      id: ws.activeWorkspace.id,
      name: ws.activeWorkspace.name,
      ownerId: ws.activeWorkspace.owner_id,
      isOwner: ws.activeWorkspace.owner_id === userId,
    })
  }, [ws.activeWorkspace?.id])

  // Load member labels for assignee/author display (best-effort if profiles isn't set up).
  useEffect(() => {
    if (!activeWorkspaceId) {
      setMemberLabelById(new Map())
      return
    }
    let cancelled = false

    async function loadMembersForLabels() {
      const { data: memRows, error: memErr } = await supabase
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', activeWorkspaceId)
      if (cancelled) return
      if (memErr) return
      const ids = Array.from(new Set((memRows ?? []).map((r: any) => r.user_id as string)))
      if (ids.length === 0) {
        setMemberLabelById(new Map())
        return
      }
      const { data: profileRows, error: profErr } = await supabase
        .from('profiles')
        .select('id,username')
        .in('id', ids)
      if (cancelled) return
      const map = new Map<string, string>()
      if (!profErr && profileRows) {
        for (const p of profileRows as any[]) {
          const id = p.id as string
          const username = (p.username as string | null) ?? null
          map.set(id, username ?? `${id.slice(0, 8)}…`)
        }
      } else {
        for (const id of ids) map.set(id, `${id.slice(0, 8)}…`)
      }
      setMemberLabelById(map)
    }

    void loadMembersForLabels()

    const channel = supabase
      .channel(`workspace-members-labels-live-${activeWorkspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspace_members',
          filter: `workspace_id=eq.${activeWorkspaceId}`,
        },
        () => loadMembersForLabels(),
      )
      .subscribe()

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [activeWorkspaceId])

  // Resolve my permission for the active workspace (viewer vs writer).
  useEffect(() => {
    if (!activeWorkspaceId) {
      setMyRole('member')
      return
    }
    let cancelled = false

    async function loadRole() {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', activeWorkspaceId)
        .eq('user_id', userId)
        .maybeSingle()
      if (cancelled) return
      if (error) {
        // Default to writer; RLS will still protect updates if needed.
        setMyRole('member')
        return
      }
      const role = ((data as any)?.role as string | null) ?? 'member'
      setMyRole(role)
    }

    void loadRole()

    const channel = supabase
      .channel(`my-role-live-${activeWorkspaceId}-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspace_members',
          filter: `workspace_id=eq.${activeWorkspaceId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as any
          if (row?.user_id === userId) void loadRole()
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [activeWorkspaceId, userId])

  // Fallback sync path (also helps when realtime isn't enabled for a table):
  // the Users modal dispatches an event after leave/role changes.
  useEffect(() => {
    function onMembersChanged(e: Event) {
      const detail = (e as CustomEvent).detail as { workspaceId?: string } | undefined
      if (!detail?.workspaceId) return
      if (detail.workspaceId !== activeWorkspaceId) return
      void ws.reload()
      // also refresh role explicitly (in case the change was for me)
      void supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', activeWorkspaceId)
        .eq('user_id', userId)
        .maybeSingle()
        .then(({ data }) => setMyRole(((data as any)?.role as string | null) ?? 'member'))
        .catch(() => {})
    }
    window.addEventListener('tododesk:workspace-members-changed', onMembersChanged)
    return () => window.removeEventListener('tododesk:workspace-members-changed', onMembersChanged)
  }, [activeWorkspaceId, userId, ws])

  async function renameWorkspace() {
    if (!ws.activeWorkspace) return
    if (ws.activeWorkspace.owner_id !== userId) return
    const clean = renameDraft.trim()
    if (!clean) {
      setRenameMsg('Name is required.')
      return
    }
    setRenameMsg(null)
    const { error } = await supabase
      .from('workspaces')
      .update({ name: clean })
      .eq('id', ws.activeWorkspace.id)
    if (error) {
      setRenameMsg(error.message)
      return
    }
    setRenameMsg('Saved.')
    await ws.reload()
  }

  useEffect(() => {
    if (!sidebarOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onRequestCloseSidebar()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onRequestCloseSidebar, sidebarOpen])

  async function load() {
    if (!activeWorkspaceId) {
      setTasks([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('tasks')
      .select(
        'id,workspace_id,created_by,assignee_id,title,description,status,type,priority,due_date,sort_order,created_at',
      )
      .eq('workspace_id', activeWorkspaceId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setTasks(
      ((data ?? []) as any[]).map((t) => ({
        ...(t as Task),
        status: normalizeStatus((t as any).status),
      })) as Task[],
    )
    setLoading(false)
  }

  useEffect(() => {
    void load()
    // realtime refresh on changes in current workspace
    if (!activeWorkspaceId) return
    const channel = supabase
      .channel(`tasks-live-${activeWorkspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `workspace_id=eq.${activeWorkspaceId}`,
        },
        () => load(),
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspaceId])

  const visibleTasks = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tasks.filter((t) => {
      if (filterType !== 'all' && t.type !== filterType) return false
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false
      if (!q) return true
      return (
        t.title.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q)
      )
    })
  }, [filterPriority, filterType, query, tasks])

  const byStatus = useMemo(() => {
    const m = new Map<Status, Task[]>()
    for (const s of STATUSES) m.set(s.key, [])
    for (const t of visibleTasks) (m.get(t.status) ?? m.get('ready')!).push(t)
    return m
  }, [visibleTasks])

  const maxSortByStatus = useMemo(() => {
    const m = new Map<Status, number>()
    for (const s of STATUSES) m.set(s.key, 0)
    for (const t of tasks) {
      m.set(t.status, Math.max(m.get(t.status) ?? 0, t.sort_order ?? 0))
    }
    return m
  }, [tasks])

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!activeWorkspaceId) return
    if (!canWrite) {
      setError('You have read-only permission in this workspace.')
      return
    }
    const clean = title.trim()
    if (!clean) return
    setTitle('')

    const optimistic: Task = {
      id: `tmp_${Date.now()}`,
      workspace_id: activeWorkspaceId,
      created_by: userId,
      assignee_id: assigneeId || null,
      title: clean,
      description: null,
      status: 'icebox',
      type,
      priority,
      due_date: due || null,
      sort_order: 0,
      created_at: new Date().toISOString(),
    }
    setTasks((prev) => [optimistic, ...prev])

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        workspace_id: activeWorkspaceId,
        created_by: userId,
        assignee_id: assigneeId || null,
        title: clean,
        status: 'icebox',
        type,
        priority,
        due_date: due || null,
      })
      .select(
        'id,workspace_id,created_by,assignee_id,title,description,status,type,priority,due_date,sort_order,created_at',
      )
      .single()
    if (error) {
      setTasks((prev) => prev.filter((t) => t.id !== optimistic.id))
      setError(error.message)
      return
    }
    if (data) {
      setTasks((prev) => [data as Task, ...prev.filter((t) => t.id !== optimistic.id)])
      onActivity({
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        at: new Date().toISOString(),
        workspaceName: ws.activeWorkspace?.name ?? 'Workspace',
        text: `Created task: “${clean}”`,
        actorId: userId,
        actorLabel: memberLabelById.get(userId) ?? 'You',
      })
    } else {
      void load()
    }
  }

  async function moveTask(t: Task, status: Status, nextSort?: number) {
    if (t.status === status && nextSort == null) return
    if (!canWrite) {
      setError('You have read-only permission in this workspace.')
      return
    }
    const optimistic = {
      ...t,
      status,
      sort_order: nextSort ?? t.sort_order,
    }
    setTasks((prev) => prev.map((x) => (x.id === t.id ? optimistic : x)))
    const { error } = await supabase
      .from('tasks')
      .update({
        status,
        sort_order: nextSort ?? t.sort_order,
      })
      .eq('id', t.id)
    if (error) {
      setTasks((prev) =>
        prev.map((x) => (x.id === t.id ? { ...x, status: t.status } : x)),
      )
      setError(error.message)
    } else {
      onActivity({
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        at: new Date().toISOString(),
        workspaceName: ws.activeWorkspace?.name ?? 'Workspace',
        text: `Moved “${t.title}” → ${status}`,
        actorId: userId,
        actorLabel: memberLabelById.get(userId) ?? 'You',
      })
    }
  }

  function onDragStart(e: React.DragEvent, taskId: string) {
    if (!canWrite) return
    const payload: DragPayload = { taskId }
    e.dataTransfer.setData('application/json', JSON.stringify(payload))
    e.dataTransfer.effectAllowed = 'move'
  }

  async function onDropColumn(e: React.DragEvent, status: Status) {
    e.preventDefault()
    setDragOver(null)
    if (!canWrite) {
      setError('You have read-only permission in this workspace.')
      return
    }
    const raw = e.dataTransfer.getData('application/json')
    let payload: DragPayload | null = null
    try {
      payload = JSON.parse(raw) as DragPayload
    } catch {
      payload = null
    }
    if (!payload?.taskId) return

    const t = tasks.find((x) => x.id === payload!.taskId)
    if (!t) return

    const nextSort = (maxSortByStatus.get(status) ?? 0) + 10
    await moveTask(t, status, nextSort)
  }

  async function removeTask(t: Task) {
    if (!confirm('Delete this task?')) return
    if (!canWrite) {
      setError('You have read-only permission in this workspace.')
      return
    }
    const before = tasks
    setTasks((prev) => prev.filter((x) => x.id !== t.id))
    const { error } = await supabase.from('tasks').delete().eq('id', t.id)
    if (error) {
      setTasks(before)
      setError(error.message)
    } else {
      onActivity({
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        at: new Date().toISOString(),
        workspaceName: ws.activeWorkspace?.name ?? 'Workspace',
        text: `Deleted task: “${t.title}”`,
        actorId: userId,
        actorLabel: memberLabelById.get(userId) ?? 'You',
      })
    }
  }

  return (
    <div className="w-full px-4 pb-10 pt-10 sm:px-6">
      {editOpen && editTask && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close"
            onClick={() => {
              if (editSaving) return
              setEditOpen(false)
              setEditTask(null)
            }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="relative mx-auto mt-24 w-[92vw] max-w-lg px-4 sm:px-0">
            <div className="rounded-3xl bg-paper-50/90 p-6 shadow-crisp ring-1 ring-charcoal-950/10 backdrop-blur-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-charcoal-950">Edit task</div>
                  <div className="mt-1 text-xs text-charcoal-700">
                    {canWrite ? 'Update the title and save.' : 'Read-only access.'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (editSaving) return
                    setEditOpen(false)
                    setEditTask(null)
                  }}
                  className="rounded-2xl bg-paper-100 px-3 py-2 text-xs font-semibold text-charcoal-900 ring-1 ring-charcoal-950/10 hover:bg-paper-50"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 max-h-[calc(100dvh-14rem)] space-y-3 overflow-auto pr-1">
                <label className="block">
                  <div className="text-[11px] font-semibold text-charcoal-700">Title</div>
                  <input
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    disabled={!canWrite || editSaving}
                    className="mt-1 w-full rounded-2xl bg-white/80 px-4 py-3 text-sm font-semibold text-charcoal-950 ring-1 ring-charcoal-950/10 outline-none focus:ring-charcoal-950/20 disabled:opacity-70"
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <div className="text-[11px] font-semibold text-charcoal-700">Type</div>
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as Type)}
                      disabled={!canWrite || editSaving}
                      className="mt-1 w-full rounded-2xl bg-white/80 px-3 py-3 text-sm font-semibold text-charcoal-900 ring-1 ring-charcoal-950/10 outline-none disabled:opacity-70"
                    >
                      <option value="feature">Feature</option>
                      <option value="bug">Bug</option>
                      <option value="chore">Chore</option>
                    </select>
                  </label>

                  <label className="block">
                    <div className="text-[11px] font-semibold text-charcoal-700">
                      Priority
                    </div>
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value as Priority)}
                      disabled={!canWrite || editSaving}
                      className="mt-1 w-full rounded-2xl bg-white/80 px-3 py-3 text-sm font-semibold text-charcoal-900 ring-1 ring-charcoal-950/10 outline-none disabled:opacity-70"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <div className="text-[11px] font-semibold text-charcoal-700">
                      Assigned
                    </div>
                    <select
                      value={editAssigneeId}
                      onChange={(e) => setEditAssigneeId(e.target.value)}
                      disabled={!canWrite || editSaving}
                      className="mt-1 w-full rounded-2xl bg-white/80 px-3 py-3 text-sm font-semibold text-charcoal-900 ring-1 ring-charcoal-950/10 outline-none disabled:opacity-70"
                    >
                      {memberOptions.map((m) => (
                        <option key={m.id || '__none'} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <div className="text-[11px] font-semibold text-charcoal-700">Due</div>
                    <input
                      value={editDue}
                      onChange={(e) => setEditDue(e.target.value)}
                      disabled={!canWrite || editSaving}
                      type="date"
                      className="mt-1 w-full rounded-2xl bg-white/80 px-3 py-3 text-sm font-semibold text-charcoal-900 ring-1 ring-charcoal-950/10 outline-none disabled:opacity-70"
                    />
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (editSaving) return
                      setEditOpen(false)
                      setEditTask(null)
                    }}
                    className="rounded-2xl bg-paper-100 px-4 py-2 text-xs font-semibold text-charcoal-900 ring-1 ring-charcoal-950/10 hover:bg-paper-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!canWrite || editSaving}
                    onClick={async () => {
                      if (!canWrite) return
                      const clean = editDraft.trim()
                      if (!clean) return
                      setEditSaving(true)
                      const prev = editTask
                      const nextAssignee = editAssigneeId || null
                      const nextDue = editDue || null
                      setTasks((p) =>
                        p.map((t) =>
                          t.id === prev.id
                            ? {
                                ...t,
                                title: clean,
                                type: editType,
                                priority: editPriority,
                                assignee_id: nextAssignee,
                                due_date: nextDue,
                              }
                            : t,
                        ),
                      )
                      const { error } = await supabase
                        .from('tasks')
                        .update({
                          title: clean,
                          type: editType,
                          priority: editPriority,
                          assignee_id: nextAssignee,
                          due_date: nextDue,
                        })
                        .eq('id', prev.id)
                      setEditSaving(false)
                      if (error) {
                        setError(error.message)
                        void load()
                        return
                      }
                      setEditOpen(false)
                      setEditTask(null)
                    }}
                    className="rounded-2xl bg-charcoal-950 px-4 py-2 text-xs font-semibold text-paper-50 shadow-crisp disabled:opacity-60"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Overlay sidebar */}
      <div
        className={`fixed inset-0 z-40 transition ${
          sidebarOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={onRequestCloseSidebar}
            className={`absolute inset-0 bg-charcoal-950/30 backdrop-blur-[2px] transition-opacity duration-200 ${
              sidebarOpen ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <aside
            className={`absolute left-4 top-24 h-[calc(100vh-7rem)] w-[min(360px,92vw)] overflow-auto rounded-3xl bg-white/85 p-5 shadow-crisp ring-1 ring-charcoal-950/10 transition-transform duration-200 ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-6'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-charcoal-950">
                  Workspaces
                </div>
                <div className="mt-1 text-xs text-charcoal-700">
                  Switch context or collaborate with a team.
                </div>
              </div>
              <button
                type="button"
                onClick={onRequestCloseSidebar}
                className="rounded-2xl bg-paper-100 px-3 py-2 text-xs font-semibold text-charcoal-900 ring-1 ring-charcoal-950/10 hover:bg-paper-50"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="sr-only">Workspace</span>
                <select
                  value={ws.activeWorkspaceId ?? ''}
                  onChange={(e) => ws.setActiveWorkspaceId(e.target.value)}
                  className="w-full rounded-2xl bg-white/70 px-3 py-2 text-xs font-semibold text-charcoal-900 ring-1 ring-charcoal-950/10 outline-none"
                >
                  {ws.workspaces.length === 0 && (
                    <option value="">No workspace yet</option>
                  )}
                  {ws.workspaces.map((w) => (
                    <option key={w.id} value={w.id}>
                      {workspaceLabel(w)}
                    </option>
                  ))}
                </select>
              </label>

              {ws.activeWorkspace && (
                <div className="rounded-2xl bg-paper-100 p-4 ring-1 ring-charcoal-950/10">
                  <div className="text-xs font-semibold text-charcoal-950">
                    Workspace name
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      disabled={ws.activeWorkspace.owner_id !== userId}
                      className="w-full rounded-xl bg-white/70 px-3 py-2 text-xs font-semibold text-charcoal-950 placeholder:text-charcoal-500 ring-1 ring-charcoal-950/10 outline-none disabled:opacity-60"
                    />
                    {ws.activeWorkspace.owner_id === userId && (
                      <button
                        type="button"
                        onClick={() => void renameWorkspace()}
                        className="rounded-xl bg-charcoal-950 px-3 py-2 text-xs font-semibold text-paper-50 shadow-crisp"
                      >
                        Save
                      </button>
                    )}
                  </div>
                  {renameMsg && (
                    <div className="mt-2 text-[11px] font-semibold text-charcoal-800">
                      {renameMsg}
                    </div>
                  )}

                  <div className="text-xs font-semibold text-charcoal-950">
                    Share this join code
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <code className="rounded-xl bg-white/70 px-3 py-2 text-xs font-bold tracking-widest text-charcoal-950 ring-1 ring-charcoal-950/10">
                      {ws.activeWorkspace.join_code}
                    </code>
                    <button
                      type="button"
                      onClick={() =>
                        navigator.clipboard.writeText(ws.activeWorkspace!.join_code)
                      }
                      className="rounded-xl bg-charcoal-950 px-3 py-2 text-xs font-semibold text-paper-50 shadow-crisp"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="mt-2 text-[11px] text-charcoal-700">
                    {ws.activeWorkspace.is_personal ? 'Personal' : 'Team'} workspace ·
                    members can create/edit tasks.
                  </div>

                  {ws.activeWorkspace.owner_id === userId && !ws.activeWorkspace.is_personal && (
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          if (
                            !confirm(
                              `Delete workspace “${ws.activeWorkspace!.name}”? This will delete all tasks in it.`,
                            )
                          )
                            return
                          const { error } = await supabase
                            .from('workspaces')
                            .delete()
                            .eq('id', ws.activeWorkspace!.id)
                          if (error) setError(error.message)
                          else await ws.reload()
                        }}
                        className="rounded-xl bg-paper-50 px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-rose-200/60 hover:bg-white"
                      >
                        Delete workspace
                      </button>
                      <span className="text-[11px] text-charcoal-700">
                        Owner only
                      </span>
                    </div>
                  )}

                  {ws.activeWorkspace.owner_id === userId && ws.activeWorkspace.is_personal && (
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!activeWorkspaceId) return
                          if (
                            !confirm(
                              'Reset “My Workspace”? This will permanently clear all tasks in this workspace.',
                            )
                          )
                            return
                          const before = tasks
                          setTasks([])
                          const { error } = await supabase
                            .from('tasks')
                            .delete()
                            .eq('workspace_id', activeWorkspaceId)
                          if (error) {
                            setTasks(before)
                            setError(error.message)
                          } else {
                            await load()
                          }
                        }}
                        className="rounded-xl bg-paper-50 px-3 py-2 text-xs font-semibold text-charcoal-900 ring-1 ring-charcoal-950/10 hover:bg-white"
                      >
                        Reset workspace
                      </button>
                      <span className="text-[11px] text-charcoal-700">
                        Clears tasks only
                      </span>
                    </div>
                  )}
                </div>
              )}

              <WorkspaceQuickActions
                createWorkspace={ws.createWorkspace}
                joinWorkspace={ws.joinWorkspace}
              />
            </div>

            {ws.error && (
              <div className="mt-4 rounded-2xl bg-rose-500/10 p-3 text-sm text-rose-900 ring-1 ring-rose-300/30">
                Workspace error: {ws.error}
              </div>
            )}
          </aside>
      </div>

      {/* Main layout: left tasks + right filter container */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section
          className={`glass rounded-3xl shadow-soft overflow-hidden ${
            compactMode ? 'p-4' : 'p-6'
          }`}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-charcoal-950">
                  Tasks
                </h1>
                <p className="mt-1 text-sm text-charcoal-700">
                  Drag cards between columns to move work.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <SoftButton title="Use the menu button to open the drawer">
                Workspaces
              </SoftButton>
              <select
                value={ws.activeWorkspaceId ?? ''}
                onChange={(e) => ws.setActiveWorkspaceId(e.target.value)}
                className="rounded-2xl bg-white/70 px-3 py-2 text-xs font-semibold text-charcoal-900 ring-1 ring-charcoal-950/10 outline-none"
                aria-label="Current workspace"
                title="Current workspace"
              >
                {ws.workspaces.length === 0 && <option value="">No workspace</option>}
                {ws.workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {workspaceLabel(w)}
                  </option>
                ))}
              </select>
              <div className="inline-flex rounded-2xl bg-paper-100 p-1 ring-1 ring-charcoal-950/10">
                {(['board', 'list'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setView(m)}
                    className={`rounded-2xl px-3 py-1.5 text-xs font-semibold ${
                      view === m
                        ? 'bg-charcoal-950 text-paper-50'
                        : 'text-charcoal-700 hover:text-charcoal-950'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Create task */}
          <form
            onSubmit={addTask}
            className="mt-5 flex flex-col gap-3"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <input
                id="task-title-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!canWrite}
                placeholder="Add a task (e.g., Fix login bug, Implement API auth, Write tests)…"
                className="min-w-0 flex-1 rounded-2xl bg-white/70 px-4 py-3 text-sm text-charcoal-950 placeholder:text-charcoal-500 ring-1 ring-charcoal-950/10 outline-none focus:ring-charcoal-950/20"
              />

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  disabled={!canWrite}
                  className="w-full rounded-2xl bg-white/70 px-3 py-3 text-sm font-semibold text-charcoal-900 ring-1 ring-charcoal-950/10 outline-none disabled:opacity-70 sm:w-[240px]"
                  title="Assign to"
                  aria-label="Assign to"
                >
                  {memberOptions.map((m) => (
                    <option key={m.id || '__none'} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>

                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as Type)}
                  disabled={!canWrite}
                  className="w-[130px] rounded-2xl bg-white/70 px-3 py-3 text-sm font-semibold text-charcoal-900 ring-1 ring-charcoal-950/10 outline-none disabled:opacity-70"
                  aria-label="Type"
                  title="Type"
                >
                  <option value="feature">Feature</option>
                  <option value="bug">Bug</option>
                  <option value="chore">Chore</option>
                </select>

                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  disabled={!canWrite}
                  className="w-[130px] rounded-2xl bg-white/70 px-3 py-3 text-sm font-semibold text-charcoal-900 ring-1 ring-charcoal-950/10 outline-none disabled:opacity-70"
                  aria-label="Priority"
                  title="Priority"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>

                <input
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                  disabled={!canWrite}
                  type="date"
                  className="w-[150px] rounded-2xl bg-white/70 px-3 py-3 text-sm font-semibold text-charcoal-900 ring-1 ring-charcoal-950/10 outline-none disabled:opacity-70"
                  aria-label="Due date"
                  title="Due date"
                />

                <button
                  type="submit"
                  disabled={!canWrite}
                  className="rounded-2xl bg-charcoal-950 px-5 py-3 text-sm font-semibold text-paper-50 shadow-crisp transition hover:-translate-y-0.5 disabled:opacity-60"
                >
                  Add
                </button>
              </div>
            </div>
          </form>

          {!canWrite && activeWorkspaceId && (
            <div className="mt-3 rounded-2xl bg-paper-100 p-3 text-xs font-semibold text-charcoal-800 ring-1 ring-charcoal-950/10">
              Read-only workspace access. Ask the owner for write permission to add, move, or delete tasks.
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-2xl bg-rose-500/10 p-3 text-sm text-rose-900 ring-1 ring-rose-300/30">
              {error}
            </div>
          )}

          {loading ? (
            <div className="mt-6 rounded-2xl bg-white/70 p-4 text-sm text-charcoal-700 ring-1 ring-charcoal-950/10">
              Loading…
            </div>
          ) : !activeWorkspaceId ? (
            <div className="mt-6 rounded-3xl bg-white/70 p-6 text-sm text-charcoal-800 ring-1 ring-charcoal-950/10">
              No workspace selected yet.
              <div className="mt-2 text-xs text-charcoal-700">
                Create a workspace (team) or join by code. A “Personal” workspace
                will be created automatically after the SQL is applied.
              </div>
            </div>
          ) : view === 'list' ? (
            <div className="mt-6 overflow-hidden rounded-3xl bg-white/70 ring-1 ring-charcoal-950/10">
              <div className="max-h-[calc(100dvh-360px)] overflow-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="sticky top-0 bg-paper-100 text-[11px] uppercase tracking-wide text-charcoal-700">
                    <tr>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Priority</th>
                      <th className="px-4 py-3">Due</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleTasks.map((t) => (
                      <tr key={t.id} className="border-t border-charcoal-950/5">
                        <td className="px-4 py-3 text-sm font-semibold text-charcoal-950">
                          <button
                            type="button"
                            onClick={() => {
                              setEditTask(t)
                              setEditDraft(t.title)
                              setEditType(t.type)
                              setEditPriority(t.priority)
                              setEditAssigneeId(t.assignee_id ?? '')
                              setEditDue(t.due_date ?? '')
                              setEditOpen(true)
                            }}
                            className="w-full text-left hover:underline"
                            title={t.title}
                          >
                            <span className="block max-w-[520px] truncate">{t.title}</span>
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <Badge>{statusLabel(t.status)}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge>{t.type}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge>{t.priority}</Badge>
                        </td>
                        <td className="px-4 py-3 text-charcoal-800">
                          {t.due_date ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => removeTask(t)}
                            disabled={!canWrite}
                            className="rounded-xl bg-paper-100 px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200/60 hover:bg-paper-50 disabled:opacity-60"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {visibleTasks.length === 0 && (
                      <tr>
                        <td className="px-4 py-6 text-sm text-charcoal-700" colSpan={6}>
                          No matching tasks.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="mt-6 -mx-2 overflow-x-auto px-2 pb-2">
              <div className="grid min-w-[1040px] grid-cols-4 gap-4">
                {STATUSES.map((s) => (
                  <div
                    key={s.key}
                    className={`rounded-3xl bg-paper-100 p-3 ring-1 ${
                      dragOver === s.key ? 'ring-coral-500/40' : 'ring-charcoal-950/10'
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragOver(s.key)
                    }}
                    onDragLeave={() =>
                      setDragOver((prev) => (prev === s.key ? null : prev))
                    }
                    onDrop={(e) => void onDropColumn(e, s.key)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-charcoal-950">
                        {s.label}
                      </div>
                      <div className="text-xs text-charcoal-700">
                        {(byStatus.get(s.key) ?? []).length}
                      </div>
                    </div>
                    <div className="mt-3 h-[calc(100dvh-420px)] min-h-[340px] max-h-[520px] space-y-2 overflow-auto pr-1">
                      {(byStatus.get(s.key) ?? []).map((t) => (
                        <div
                          key={t.id}
                          draggable={canWrite}
                          onDragStart={(e) => onDragStart(e, t.id)}
                          onClick={() => {
                            setEditTask(t)
                            setEditDraft(t.title)
                            setEditType(t.type)
                            setEditPriority(t.priority)
                            setEditAssigneeId(t.assignee_id ?? '')
                            setEditDue(t.due_date ?? '')
                            setEditOpen(true)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setEditTask(t)
                              setEditDraft(t.title)
                              setEditType(t.type)
                              setEditPriority(t.priority)
                              setEditAssigneeId(t.assignee_id ?? '')
                              setEditDue(t.due_date ?? '')
                              setEditOpen(true)
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          className="group w-full cursor-pointer rounded-2xl bg-white/80 p-3 text-left ring-1 ring-charcoal-950/10 shadow-[0_1px_0_rgba(16,17,19,0.06)] hover:bg-white focus:outline-none focus:ring-2 focus:ring-charcoal-950/15"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div
                                className="text-sm font-semibold text-charcoal-950 truncate"
                                title={t.title}
                              >
                                {t.title}
                              </div>
                              <div className="mt-2 flex flex-nowrap items-center gap-2 overflow-hidden">
                                <span className="max-w-[45%] truncate rounded-full bg-paper-100 px-2.5 py-1 text-[11px] font-semibold text-charcoal-800 ring-1 ring-charcoal-950/10">
                                  {t.type}
                                </span>
                                <span className="max-w-[55%] truncate rounded-full bg-paper-100 px-2.5 py-1 text-[11px] font-semibold text-charcoal-800 ring-1 ring-charcoal-950/10">
                                  {t.priority}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-paper-50/70 p-2 ring-1 ring-charcoal-950/10">
                            <div className="min-w-0">
                              <div className="text-[10px] font-semibold uppercase tracking-wide text-charcoal-600">
                                Author
                              </div>
                              <div
                                className="mt-0.5 truncate text-[11px] font-semibold text-charcoal-900"
                                title={memberLabelById.get(t.created_by) ?? t.created_by}
                              >
                                {memberLabelById.get(t.created_by) ??
                                  `${t.created_by.slice(0, 8)}…`}
                              </div>
                            </div>
                            <div className="min-w-0">
                              <div className="text-[10px] font-semibold uppercase tracking-wide text-charcoal-600">
                                Assigned
                              </div>
                              <div
                                className="mt-0.5 truncate text-[11px] font-semibold text-charcoal-900"
                                title={
                                  t.assignee_id
                                    ? memberLabelById.get(t.assignee_id) ?? t.assignee_id
                                    : 'Unassigned'
                                }
                              >
                                {t.assignee_id
                                  ? memberLabelById.get(t.assignee_id) ??
                                    `${t.assignee_id.slice(0, 8)}…`
                                  : 'Unassigned'}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-2">
                            <div className="text-[11px] font-semibold text-charcoal-700">
                              {t.due_date ? `Due ${t.due_date}` : 'No due'}
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                void removeTask(t)
                              }}
                              disabled={!canWrite}
                              className="rounded-xl bg-paper-100 px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200/60 hover:bg-paper-50 disabled:opacity-60"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                      {(byStatus.get(s.key) ?? []).length === 0 && (
                        <div className="rounded-2xl bg-white/50 p-3 text-xs text-charcoal-700 ring-1 ring-charcoal-950/10">
                          Drop tasks here by changing status.
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className="glass rounded-3xl p-5 shadow-soft">
          <div className="text-sm font-semibold text-charcoal-950">Filters</div>
          <div className="mt-3 space-y-3">
            <label className="block">
              <div className="text-[11px] font-semibold text-charcoal-700">
                Search
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title/description…"
                className="mt-1 w-full rounded-2xl bg-white/70 px-4 py-2 text-sm text-charcoal-950 placeholder:text-charcoal-500 ring-1 ring-charcoal-950/10 outline-none focus:ring-charcoal-950/20"
              />
            </label>

            <label className="block">
              <div className="text-[11px] font-semibold text-charcoal-700">Type</div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="mt-1 w-full rounded-2xl bg-white/70 px-3 py-2 text-sm font-semibold text-charcoal-900 ring-1 ring-charcoal-950/10 outline-none"
              >
                <option value="all">All</option>
                <option value="feature">Feature</option>
                <option value="bug">Bug</option>
                <option value="chore">Chore</option>
              </select>
            </label>

            <label className="block">
              <div className="text-[11px] font-semibold text-charcoal-700">
                Priority
              </div>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as any)}
                className="mt-1 w-full rounded-2xl bg-white/70 px-3 py-2 text-sm font-semibold text-charcoal-900 ring-1 ring-charcoal-950/10 outline-none"
              >
                <option value="all">All</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  setFilterType('all')
                  setFilterPriority('all')
                }}
                className="rounded-2xl bg-paper-100 px-3 py-2 text-xs font-semibold text-charcoal-900 ring-1 ring-charcoal-950/10 hover:bg-paper-50"
              >
                Clear
              </button>
            </div>

            <div className="rounded-2xl bg-paper-100 p-4 ring-1 ring-charcoal-950/10">
              <div className="text-xs font-semibold text-charcoal-950">
                Showing
              </div>
              <div className="mt-1 text-sm font-semibold text-charcoal-950">
                {visibleTasks.length}
                <span className="text-charcoal-700 font-medium"> / {tasks.length}</span>
              </div>
              <div className="mt-1 text-xs text-charcoal-700">
                tasks match your filters
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function WorkspaceQuickActions({
  createWorkspace,
  joinWorkspace,
}: {
  createWorkspace: (name: string) => Promise<{ ok: true } | { ok: false; error: string }>
  joinWorkspace: (code: string) => Promise<{ ok: true } | { ok: false; error: string }>
}) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  async function create() {
    setMsg(null)
    const res = await createWorkspace(name)
    if (!res.ok) setMsg(res.error)
    else {
      setName('')
      setMsg('Workspace created.')
    }
  }

  async function join() {
    setMsg(null)
    const res = await joinWorkspace(code)
    if (!res.ok) setMsg(res.error)
    else {
      setCode('')
      setMsg('Joined workspace.')
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-white/70 p-3 ring-1 ring-charcoal-950/10">
        <div className="text-xs font-semibold text-charcoal-950">Create workspace</div>
        <div className="mt-2 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Team name"
            className="w-full rounded-xl bg-paper-50 px-3 py-2 text-xs text-charcoal-950 placeholder:text-charcoal-500 ring-1 ring-charcoal-950/10 outline-none"
          />
          <button
            type="button"
            onClick={create}
            className="rounded-xl bg-charcoal-950 px-3 py-2 text-xs font-semibold text-paper-50 shadow-crisp"
          >
            Create
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white/70 p-3 ring-1 ring-charcoal-950/10">
        <div className="text-xs font-semibold text-charcoal-950">Join by code</div>
        <div className="mt-2 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="JOINCODE"
            className="w-full rounded-xl bg-paper-50 px-3 py-2 text-xs font-semibold tracking-wider text-charcoal-950 placeholder:text-charcoal-500 ring-1 ring-charcoal-950/10 outline-none"
          />
          <button
            type="button"
            onClick={join}
            className="rounded-xl bg-charcoal-950 px-3 py-2 text-xs font-semibold text-paper-50 shadow-crisp"
          >
            Join
          </button>
        </div>
      </div>

      {msg && <div className="text-xs font-semibold text-charcoal-800">{msg}</div>}
    </div>
  )
}

