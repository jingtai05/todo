import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useWorkspaces } from '../hooks/useWorkspaces'
import { ConfirmModal } from '../components/ShellModals'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

type Status = 'icebox' | 'in_progress' | 'review' | 'done'
type Type = 'feature' | 'bug' | 'chore'
type Priority = 'low' | 'medium' | 'high'
type ViewMode = 'board' | 'list' | 'analytics'

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
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-800 ring-1 ring-slate-950/10">
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
      className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-900 ring-1 ring-slate-950/10 hover:bg-slate-50"
    >
      {children}
    </button>
  )
}

const cleanUsername = (name: string | null): string => {
  if (!name) return 'Anon'
  return name.replace(/^\[REQ_(W|WRITE):[^\]]*\]\s*/, '')
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
  onActivity: (item: { id: string; at: string; workspaceName: string; text: string; actorId?: string; actorLabel?: string }) => void
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

  useEffect(() => {
    if (!editOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !editSaving) {
        e.stopPropagation()
        setEditOpen(false)
        setEditTask(null)
      }
      if (e.key === 'Enter' && !editSaving && canWrite) {
        const activeTag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase()
        if (activeTag === 'textarea') return
        e.preventDefault()
        void handleSaveEdit()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editOpen, editSaving])

  const [title, setTitle] = useState('')
  const [type, setType] = useState<Type>('feature')
  const [priority, setPriority] = useState<Priority>('medium')
  const [due, setDue] = useState<string>('')
  const [assigneeId, setAssigneeId] = useState<string>('')
  const [renameDraft, setRenameDraft] = useState('')
  const [renameMsg, setRenameMsg] = useState<string | null>(null)
  const [requestStatus, setRequestStatus] = useState<string | null>(null)

  const [filterAuthorId, setFilterAuthorId] = useState<string>('all')
  const [filterAssigneeId, setFilterAssigneeId] = useState<string>('all')
  const [filterDue, setFilterDue] = useState<'all' | 'overdue' | 'today' | 'upcoming' | 'none'>('all')
  const [sortBy, setSortBy] = useState<'default' | 'newest' | 'oldest' | 'due_date'>('default')

  const [confirmState, setConfirmState] = useState<{
    open: boolean
    title: string
    description: string
    onConfirm: () => void
    requireTypeToConfirm?: string
    confirmText?: string
    isDestructive?: boolean
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
  })

  // State to track if we just requested access, giving immediate UI feedback
  const [localPending, setLocalPending] = useState<boolean>(false)

  const activeWorkspaceId = ws.activeWorkspaceId
  const [ownerUsernames, setOwnerUsernames] = useState<Map<string, string>>(new Map())
  const [memberLabelById, setMemberLabelById] = useState<Map<string, string>>(new Map())
  const canWrite = myRole === 'member' || myRole === 'owner'

  const memberOptions = useMemo((): MemberOption[] => {
    const base: MemberOption[] = [{ id: '', label: 'Unassigned' }]
    const entries = Array.from(memberLabelById.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
    return base.concat(entries)
  }, [memberLabelById])

  useEffect(() => {
    if (activeWorkspaceId) {
      // Local storage is now a secondary hint; primary source of truth is the database.
      setLocalPending(localStorage.getItem(`flowdesk_req_${activeWorkspaceId}`) === 'pending')
    }
  }, [activeWorkspaceId])

  const authorOptions = useMemo((): MemberOption[] => {
    const rawIds = Array.from(new Set(tasks.map((t) => t.created_by)))
    return rawIds
      .map((id) => ({ id, label: memberLabelById.get(id) || `${id.slice(0, 8)}…` }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [tasks, memberLabelById])

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
          map.set((p as any).id, cleanUsername((p as any).username))
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
          const rawName = (p.username as string | null) ?? `${id.slice(0, 8)}…`
          map.set(id, cleanUsername(rawName))
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
        .select('role, request_status')
        .eq('workspace_id', activeWorkspaceId)
        .eq('user_id', userId)
        .maybeSingle()
      if (cancelled) return
      if (error) {
        setMyRole('member')
        return
      }
      const role = ((data as any)?.role as string | null) ?? 'member'
      const status = ((data as any)?.request_status as string | null) ?? null
      
      setMyRole(role)
      setLocalPending(status === 'pending')

      if ((role === 'member' || role === 'owner') && status === null) {
        const key = `flowdesk_req_${activeWorkspaceId}`
        if (localStorage.getItem(key) === 'pending') {
          localStorage.removeItem(key)
        }
      }
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
        .then(
          ({ data }) => setMyRole(((data as any)?.role as string | null) ?? 'member'),
          () => {} // handle promise rejection safely
        )
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
      if (e.key === 'Escape' && !confirmState.open && !editOpen) {
        onRequestCloseSidebar()
      }
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
    let filtered = tasks.filter((t) => {
      if (filterType !== 'all' && t.type !== filterType) return false
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false
      if (filterAuthorId !== 'all' && t.created_by !== filterAuthorId) return false
      if (filterAssigneeId !== 'all') {
        if (filterAssigneeId === 'unassigned' && t.assignee_id !== null) return false
        if (filterAssigneeId !== 'unassigned' && t.assignee_id !== filterAssigneeId) return false
      }
      if (filterDue !== 'all') {
        const todayStr = new Date().toISOString().split('T')[0]
        if (filterDue === 'none' && t.due_date !== null) return false
        if (filterDue === 'overdue' && (t.due_date === null || t.due_date >= todayStr)) return false
        if (filterDue === 'today' && t.due_date !== todayStr) return false
        if (filterDue === 'upcoming' && (t.due_date === null || t.due_date <= todayStr)) return false
      }
      if (!q) return true
      return (
        t.title.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q)
      )
    })

    if (sortBy !== 'default') {
      filtered = [...filtered].sort((a, b) => {
        if (sortBy === 'newest') return (b.created_at || '').localeCompare(a.created_at || '')
        if (sortBy === 'oldest') return (a.created_at || '').localeCompare(b.created_at || '')
        if (sortBy === 'due_date') {
          if (!a.due_date) return 1
          if (!b.due_date) return -1
          return a.due_date.localeCompare(b.due_date)
        }
        return 0
      })
    }
    return filtered
  }, [filterPriority, filterType, query, tasks, filterAuthorId, filterAssigneeId, filterDue, sortBy])

  const byStatus = useMemo(() => {
    const m = new Map<Status, Task[]>()
    for (const s of STATUSES) m.set(s.key, [])
    for (const t of visibleTasks) (m.get(t.status) ?? m.get('icebox')!).push(t)
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
    if (!canWrite) {
      setError('You have read-only permission in this workspace.')
      return
    }
    setConfirmState({
      open: true,
      title: 'Delete Task',
      description: 'This action is permanent and cannot be undone.',
      confirmText: 'Delete',
      isDestructive: true,
      onConfirm: async () => {
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
    })
  }

  async function handleSaveEdit() {
    if (!canWrite || !editTask || editSaving) return
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
  }

  return (
    <div className="w-full px-4 pb-10 pt-10 sm:px-6">
      <ConfirmModal
        {...confirmState}
        onClose={() => setConfirmState((s) => ({ ...s, open: false }))}
      />
      
      {editOpen && editTask && (
        <div
          className="fixed inset-0 z-50"
        >
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
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void handleSaveEdit()
            }}
            className="relative mx-auto mt-24 w-[92vw] max-w-lg px-4 sm:px-0"
          >
            <div className="rounded-3xl bg-slate-50/90 p-6 shadow-crisp ring-1 ring-slate-950/10 backdrop-blur-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-950">Edit task</div>
                  <div className="mt-1 text-xs text-slate-700">
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
                  className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-900 ring-1 ring-slate-950/10 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 max-h-[calc(100dvh-14rem)] space-y-3 overflow-auto pr-1">
                <label className="block">
                  <div className="text-[11px] font-semibold text-slate-700">Title</div>
                  <input
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    disabled={!canWrite || editSaving}
                    className="mt-1 w-full rounded-2xl bg-white/80 px-4 py-3 text-sm font-semibold text-slate-950 ring-1 ring-slate-950/10 outline-none focus:ring-slate-950/20 disabled:opacity-70"
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <div className="text-[11px] font-semibold text-slate-700">Type</div>
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as Type)}
                      disabled={!canWrite || editSaving}
                      className="mt-1 w-full rounded-2xl bg-white/80 px-3 py-3 text-sm font-semibold text-slate-900 ring-1 ring-slate-950/10 outline-none disabled:opacity-70"
                    >
                      <option value="feature">Feature</option>
                      <option value="bug">Bug</option>
                      <option value="chore">Chore</option>
                    </select>
                  </label>

                  <label className="block">
                    <div className="text-[11px] font-semibold text-slate-700">
                      Priority
                    </div>
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value as Priority)}
                      disabled={!canWrite || editSaving}
                      className="mt-1 w-full rounded-2xl bg-white/80 px-3 py-3 text-sm font-semibold text-slate-900 ring-1 ring-slate-950/10 outline-none disabled:opacity-70"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <div className="text-[11px] font-semibold text-slate-700">
                      Assigned
                    </div>
                    <select
                      value={editAssigneeId}
                      onChange={(e) => setEditAssigneeId(e.target.value)}
                      disabled={!canWrite || editSaving}
                      className="mt-1 w-full rounded-2xl bg-white/80 px-3 py-3 text-sm font-semibold text-slate-900 ring-1 ring-slate-950/10 outline-none disabled:opacity-70"
                    >
                      {memberOptions.map((m) => (
                        <option key={m.id || '__none'} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <div className="text-[11px] font-semibold text-slate-700">Due</div>
                    <input
                      value={editDue}
                      onChange={(e) => setEditDue(e.target.value)}
                      disabled={!canWrite || editSaving}
                      type="date"
                      className="mt-1 w-full rounded-2xl bg-white/80 px-3 py-3 text-sm font-semibold text-slate-900 ring-1 ring-slate-950/10 outline-none disabled:opacity-70"
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
                    className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-900 ring-1 ring-slate-950/10 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!canWrite || editSaving}
                    className="rounded-2xl bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-50 shadow-crisp disabled:opacity-60"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}
      {/* Overlay sidebar */}
      <div
        className={`fixed inset-0 z-40 transition ${
          sidebarOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !confirmState.open) onRequestCloseSidebar()
        }}
        tabIndex={-1}
      >
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => { if (!confirmState.open) onRequestCloseSidebar() }}
            className={`absolute inset-0 bg-slate-950/30 backdrop-blur-[2px] transition-opacity duration-200 ${
              sidebarOpen ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <aside
            className={`absolute left-4 top-24 h-[calc(100vh-7rem)] w-[min(360px,92vw)] overflow-auto rounded-3xl bg-white/85 p-5 shadow-crisp ring-1 ring-slate-950/10 transition-transform duration-200 ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-6'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-950">
                  Workspaces
                </div>
                <div className="mt-1 text-xs text-slate-700">
                  Switch context or collaborate with a team.
                </div>
              </div>
              <button
                type="button"
                onClick={onRequestCloseSidebar}
                className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-900 ring-1 ring-slate-950/10 hover:bg-slate-50"
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
                  className="w-full rounded-2xl bg-white/70 px-3 py-2 text-xs font-semibold text-slate-900 ring-1 ring-slate-950/10 outline-none"
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
                <div className="rounded-2xl bg-slate-100 p-4 ring-1 ring-slate-950/10">
                  <div className="text-xs font-semibold text-slate-950">
                    Workspace name
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      disabled={ws.activeWorkspace.owner_id !== userId}
                      className="w-full rounded-xl bg-white/70 px-3 py-2 text-xs font-semibold text-slate-950 placeholder:text-slate-500 ring-1 ring-slate-950/10 outline-none disabled:opacity-60"
                    />
                    {ws.activeWorkspace.owner_id === userId && (
                      <button
                        type="button"
                        onClick={() => void renameWorkspace()}
                        className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-50 shadow-crisp"
                      >
                        Save
                      </button>
                    )}
                  </div>
                  {renameMsg && (
                    <div className="mt-2 text-[11px] font-semibold text-slate-800">
                      {renameMsg}
                    </div>
                  )}

                  <div className="text-xs font-semibold text-slate-950">
                    Share this join code
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <code className="rounded-xl bg-white/70 px-3 py-2 text-xs font-bold tracking-widest text-slate-950 ring-1 ring-slate-950/10">
                      {ws.activeWorkspace.join_code}
                    </code>
                    <button
                      type="button"
                      onClick={() =>
                        navigator.clipboard.writeText(ws.activeWorkspace!.join_code)
                      }
                      className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-50 shadow-crisp"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-700">
                    {ws.activeWorkspace.is_personal ? 'Personal' : 'Team'} workspace ·
                    members can create/edit tasks.
                  </div>

                  {ws.activeWorkspace.owner_id === userId && !ws.activeWorkspace.is_personal && (
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmState({
                            open: true,
                            title: 'Delete Workspace',
                            description: `Are you sure you want to delete workspace "${ws.activeWorkspace!.name}"? This action cannot be undone.`,
                            confirmText: 'Delete',
                            isDestructive: true,
                            requireTypeToConfirm: 'DELETE',
                            onConfirm: async () => {
                              const { error } = await supabase
                                .from('workspaces')
                                .delete()
                                .eq('id', ws.activeWorkspace!.id)
                              if (error) setError(error.message)
                              else await ws.reload()
                            }
                          })
                        }}
                        className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-rose-200/60 hover:bg-white"
                      >
                        Delete workspace
                      </button>
                      <span className="text-[11px] text-slate-700">
                        Owner only
                      </span>
                    </div>
                  )}

                  {ws.activeWorkspace.owner_id === userId && ws.activeWorkspace.is_personal && (
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!activeWorkspaceId) return
                          setConfirmState({
                            open: true,
                            title: 'Reset Workspace',
                            description: 'Are you sure you want to reset "My Workspace"? This will permanently clear all tasks inside it.',
                            confirmText: 'Reset Workspace',
                            isDestructive: true,
                            requireTypeToConfirm: 'RESET',
                            onConfirm: async () => {
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
                            }
                          })
                        }}
                        className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 ring-1 ring-slate-950/10 hover:bg-white"
                      >
                        Reset workspace
                      </button>
                      <span className="text-[11px] text-slate-700">
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
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                  Tasks
                </h1>
                <p className="mt-1 text-sm text-slate-700">
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
                className="rounded-2xl bg-white/70 px-3 py-2 text-xs font-semibold text-slate-900 ring-1 ring-slate-950/10 outline-none"
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
              <div className="inline-flex rounded-2xl bg-slate-100 p-1 ring-1 ring-slate-950/10">
                {(['board', 'list', 'analytics'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setView(m)}
                    className={`rounded-2xl px-3 py-1.5 text-xs font-semibold capitalize ${
                      view === m
                        ? 'bg-slate-950 text-slate-50'
                        : 'text-slate-700 hover:text-slate-950'
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
                className="min-w-0 flex-1 rounded-2xl bg-white/70 px-4 py-3 text-sm text-slate-950 placeholder:text-slate-500 ring-1 ring-slate-950/10 outline-none focus:ring-slate-950/20"
              />

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  disabled={!canWrite}
                  className="w-full rounded-2xl bg-white/70 px-3 py-3 text-sm font-semibold text-slate-900 ring-1 ring-slate-950/10 outline-none disabled:opacity-70 sm:w-[240px]"
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
                  className="w-[130px] rounded-2xl bg-white/70 px-3 py-3 text-sm font-semibold text-slate-900 ring-1 ring-slate-950/10 outline-none disabled:opacity-70"
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
                  className="w-[130px] rounded-2xl bg-white/70 px-3 py-3 text-sm font-semibold text-slate-900 ring-1 ring-slate-950/10 outline-none disabled:opacity-70"
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
                  className="w-[150px] rounded-2xl bg-white/70 px-3 py-3 text-sm font-semibold text-slate-900 ring-1 ring-slate-950/10 outline-none disabled:opacity-70"
                  aria-label="Due date"
                  title="Due date"
                />

                <button
                  type="submit"
                  disabled={!canWrite}
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-slate-50 shadow-crisp transition hover:-translate-y-0.5 disabled:opacity-60"
                >
                  Add
                </button>
              </div>
            </div>
          </form>

          {requestStatus && (
            <div className="mb-6 rounded-2xl bg-white p-4 flex items-center justify-between ring-1 ring-slate-950/5 shadow-soft border-l-4 border-indigo-600 animate-in fade-in slide-in-from-top-4 duration-300">
               <div className="flex items-center gap-3">
                  <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
                  <span className="text-sm font-black text-slate-900">{requestStatus}</span>
               </div>
               <button onClick={() => setRequestStatus(null)} className="text-slate-400 hover:text-slate-900 transition-colors">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>
          )}

          {!canWrite && activeWorkspaceId && (
            <div className={`mt-3 rounded-[1.5rem] p-4 ring-1 backdrop-blur-sm flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-500 ${
              localPending
                ? 'bg-rose-50/90 ring-rose-200/50 shadow-lg shadow-rose-100/20'
                : 'bg-rose-50/70 ring-rose-200/30'
            }`}>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-rose-100">
                  <svg className="h-4 w-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                {localPending ? (
                  <div className="text-sm font-black leading-tight text-rose-950">
                    Access request pending. <span className="opacity-60">The workspace owner has been notified and can approve your write access.</span>
                  </div>
                ) : (
                  <div className="text-sm font-black leading-tight text-rose-950">
                    Read-only workspace access. <span className="opacity-60">Ask the owner for write permission to add, move, or delete tasks.</span>
                  </div>
                )}
              </div>
              {!localPending && (
                <button
                  onClick={async () => {
                    try {
                      const { error: upErr } = await supabase
                        .from('workspace_members')
                        .update({ request_status: 'pending' })
                        .eq('workspace_id', activeWorkspaceId)
                        .eq('user_id', userId)
                      
                      if (upErr) throw upErr
                      
                      localStorage.setItem(`flowdesk_req_${activeWorkspaceId}`, 'pending')
                      setLocalPending(true)
                    } catch (e: any) {
                      setRequestStatus('Failed to send request: ' + e.message)
                    }
                  }}
                  className="shrink-0 rounded-xl bg-rose-600 px-4 py-2 text-[10px] font-black text-white shadow-lg shadow-rose-200 transition-all hover:scale-[1.02] active:scale-95"
                >
                  Request Write Access
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-2xl bg-rose-500/10 p-3 text-sm text-rose-900 ring-1 ring-rose-300/30">
              {error}
            </div>
          )}

          {loading ? (
            <div className="mt-6 rounded-2xl bg-white/70 p-4 text-sm text-slate-700 ring-1 ring-slate-950/10">
              Loading…
            </div>
          ) : !activeWorkspaceId ? (
            <div className="mt-6 rounded-3xl bg-white/70 p-6 text-sm text-slate-800 ring-1 ring-slate-950/10">
              No workspace selected yet.
              <div className="mt-2 text-xs text-slate-700">
                Create a workspace (team) or join by code. A “Personal” workspace
                will be created automatically after the SQL is applied.
              </div>
            </div>
          ) : view === 'analytics' ? (
            <div className="mt-6">
              <AnalyticsDashboard tasks={tasks} />
            </div>
          ) : view === 'list' ? (
            <div className="mt-6 overflow-hidden rounded-3xl bg-white/70 ring-1 ring-slate-950/10">
              <div className="max-h-[calc(100dvh-360px)] overflow-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-100 text-[11px] uppercase tracking-wide text-slate-700">
                    <tr>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Priority</th>
                      <th className="px-4 py-3">Due</th>
                      <th className="px-4 py-3 text-right pr-6 uppercase tracking-widest text-[9px] font-black text-slate-400">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleTasks.map((t) => (
                      <tr key={t.id} className="border-t border-slate-950/5">
                        <td className="px-4 py-3 text-sm font-semibold text-slate-950">
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
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge>{statusLabel(t.status)}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge>{t.type}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge>{t.priority}</Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-800 whitespace-nowrap">
                          {t.due_date ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => removeTask(t)}
                            disabled={!canWrite}
                            className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200/60 hover:bg-slate-50 disabled:opacity-60"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {visibleTasks.length === 0 && (
                      <tr>
                        <td className="px-4 py-6 text-sm text-slate-700" colSpan={6}>
                          No matching tasks.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="mt-8 -mx-2 overflow-x-auto px-2 pb-2 scrollbar-none relative z-10">
              <div className="grid min-w-[1040px] grid-cols-4 gap-6 pt-4">
                {STATUSES.map((s) => (
                  <div
                    key={s.key}
                    className={`rounded-3xl bg-slate-100 p-3 ring-1 ${
                      dragOver === s.key ? 'ring-indigo-500/40' : 'ring-slate-950/10'
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
                      <div className="text-xs font-semibold text-slate-950">
                        {s.label}
                      </div>
                      <div className="text-xs text-slate-700">
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
                            if ((e.target as HTMLElement).tagName.toLowerCase() === 'button') return
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
                          className="group w-full cursor-pointer rounded-2xl bg-white/80 p-3 text-left ring-1 ring-slate-950/10 shadow-[0_1px_0_rgba(16,17,19,0.06)] hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-950/15"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div
                                className="text-sm font-semibold text-slate-950 truncate"
                                title={t.title}
                              >
                                {t.title}
                              </div>
                              <div className="mt-2 flex flex-nowrap items-center gap-2 overflow-hidden">
                                <span className="max-w-[45%] truncate rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-800 ring-1 ring-slate-950/10">
                                  {t.type}
                                </span>
                                <span className="max-w-[55%] truncate rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-800 ring-1 ring-slate-950/10">
                                  {t.priority}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 rounded-2xl border border-slate-950/5 bg-white p-2.5 shadow-sm">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="min-w-0">
                                <div className="text-[11px] font-black uppercase text-slate-500 mb-1 truncate">
                                  Author
                                </div>
                                <div
                                  className="truncate text-[11px] font-bold text-slate-950"
                                  title={memberLabelById.get(t.created_by) ?? t.created_by}
                                >
                                  {memberLabelById.get(t.created_by) ??
                                    `${t.created_by.slice(0, 8)}…`}
                                </div>
                              </div>
                              <div className="min-w-0">
                                <div className="text-[11px] font-black uppercase text-slate-500 mb-1 truncate">
                                  Assigned
                                </div>
                                <div
                                  className={t.assignee_id ? 'truncate text-[11px] font-bold text-slate-950' : 'text-[11px] font-bold italic text-slate-400'}
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
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-2">
                            <div className="text-[12px] font-bold text-slate-500 truncate">
                              {t.due_date ? `Due ${t.due_date}` : 'No due'}
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                void removeTask(t)
                              }}
                              disabled={!canWrite}
                              className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200/60 hover:bg-slate-50 disabled:opacity-60"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                      {(byStatus.get(s.key) ?? []).length === 0 && (
                        <div className="rounded-2xl bg-white/50 p-3 text-xs text-slate-700 ring-1 ring-slate-950/10">
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
          <div className="text-sm font-semibold text-slate-950">Sorting</div>
          <div className="mt-3 space-y-3">
            <label className="block">
              <div className="text-[11px] font-semibold text-slate-700">Sort By</div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="mt-1 w-full rounded-2xl bg-white/70 px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-950/10 outline-none"
              >
                <option value="default">Default</option>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="due_date">Due Date</option>
              </select>
            </label>
          </div>

          <div className="mt-6 text-sm font-semibold text-slate-950">Filters</div>
          <div className="mt-3 space-y-3">
            <label className="block">
              <div className="text-[11px] font-semibold text-slate-700">Search</div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title/description…"
                className="mt-1 w-full rounded-2xl bg-white/70 px-4 py-2 text-sm text-slate-950 placeholder:text-slate-500 ring-1 ring-slate-950/10 outline-none focus:ring-slate-950/20"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <div className="text-[11px] font-semibold text-slate-700">Type</div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="mt-1 w-full rounded-2xl bg-white/70 px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-950/10 outline-none"
                >
                  <option value="all">All</option>
                  <option value="feature">Feature</option>
                  <option value="bug">Bug</option>
                  <option value="chore">Chore</option>
                </select>
              </label>

              <label className="block">
                <div className="text-[11px] font-semibold text-slate-700">Priority</div>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value as any)}
                  className="mt-1 w-full rounded-2xl bg-white/70 px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-950/10 outline-none"
                >
                  <option value="all">All</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
            </div>

            <label className="block">
              <div className="text-[11px] font-semibold text-slate-700">Due Date</div>
              <select
                value={filterDue}
                onChange={(e) => setFilterDue(e.target.value as any)}
                className="mt-1 w-full rounded-2xl bg-white/70 px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-950/10 outline-none"
              >
                <option value="all">All</option>
                <option value="overdue">Overdue</option>
                <option value="today">Today</option>
                <option value="upcoming">Upcoming</option>
                <option value="none">No Due Date</option>
              </select>
            </label>

            <div className="space-y-4">
              <label className="block">
                <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">Author</div>
                <div className="mt-2 grid grid-cols-1 gap-1 max-h-40 overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={() => setFilterAuthorId('all')}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-left transition-all ${
                      filterAuthorId === 'all'
                        ? 'bg-slate-950 text-slate-50'
                        : 'bg-slate-50/80 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                      filterAuthorId === 'all' ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>★</span>
                    All Authors
                  </button>
                  {authorOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFilterAuthorId(opt.id)}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-left transition-all ${
                        filterAuthorId === opt.id
                          ? 'bg-slate-950 text-slate-50'
                          : 'bg-slate-50/80 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                        filterAuthorId === opt.id ? 'bg-white/20 text-slate-50' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {opt.label.charAt(0).toUpperCase()}
                      </span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </label>

              <label className="block">
                <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">Assigned To</div>
                <div className="mt-2 grid grid-cols-1 gap-1 max-h-40 overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={() => setFilterAssigneeId('all')}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-left transition-all ${
                      filterAssigneeId === 'all'
                        ? 'bg-slate-950 text-slate-50'
                        : 'bg-slate-50/80 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                      filterAssigneeId === 'all' ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>★</span>
                    All Assignees
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterAssigneeId('unassigned')}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-left transition-all ${
                      filterAssigneeId === 'unassigned'
                        ? 'bg-slate-950 text-slate-50'
                        : 'bg-slate-50/80 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                      filterAssigneeId === 'unassigned' ? 'bg-white/20 text-slate-50' : 'bg-slate-200 text-slate-700'
                    }`}>—</span>
                    Unassigned
                  </button>
                  {memberOptions.filter(o => o.id).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFilterAssigneeId(opt.id)}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-left transition-all ${
                        filterAssigneeId === opt.id
                          ? 'bg-slate-950 text-slate-50'
                          : 'bg-slate-50/80 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                        filterAssigneeId === opt.id ? 'bg-white/20 text-slate-50' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {opt.label.charAt(0).toUpperCase()}
                      </span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </label>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  setFilterType('all')
                  setFilterPriority('all')
                  setFilterAuthorId('all')
                  setFilterAssigneeId('all')
                  setFilterDue('all')
                  setSortBy('default')
                }}
                className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-900 ring-1 ring-slate-950/10 hover:bg-slate-50"
              >
                Clear Filters
              </button>
            </div>

            <div className="rounded-2xl bg-slate-100 p-4 ring-1 ring-slate-950/10">
              <div className="text-xs font-semibold text-slate-950">
                Showing
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-950">
                {visibleTasks.length}
                <span className="text-slate-700 font-medium"> / {tasks.length}</span>
              </div>
              <div className="mt-1 text-xs text-slate-700">
                tasks match your filters
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass rounded-2xl p-3 shadow-crisp text-left text-xs font-medium text-slate-900 ring-1 ring-slate-950/10 backdrop-blur-md">
        <div className="mb-2 text-[10px] uppercase tracking-wider text-slate-500 font-bold">{label || payload[0].payload?.name}</div>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2" style={{ color: entry.color || entry.fill }}>
             <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
             <span className="font-bold">{entry.value}</span> tasks
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function AnalyticsDashboard({ tasks }: { tasks: Task[] }) {
  const total = tasks.length
  const doneCount = tasks.filter((t) => t.status === 'done').length
  const progress = total === 0 ? 0 : Math.round((doneCount / total) * 100)

  const byStatus = [
    { name: 'Icebox', value: tasks.filter((t) => t.status === 'icebox').length, color: '#e2e8f0' },
    { name: 'In Progress', value: tasks.filter((t) => t.status === 'in_progress').length, color: '#3b82f6' },
    { name: 'Review', value: tasks.filter((t) => t.status === 'review').length, color: '#f59e0b' },
    { name: 'Done', value: tasks.filter((t) => t.status === 'done').length, color: '#10b981' },
  ].filter((x) => x.value > 0)

  const typeData = [
    { name: 'Feature', value: tasks.filter((t) => t.type === 'feature').length },
    { name: 'Bug', value: tasks.filter((t) => t.type === 'bug').length },
    { name: 'Chore', value: tasks.filter((t) => t.type === 'chore').length },
  ]

  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    return d.toISOString().split('T')[0]
  })

  const heatmapData = last30Days.map((date) => {
    const count = tasks.filter((t) => t.created_at?.startsWith(date)).length
    return { date, count }
  })

  const [hoveredCell, setHoveredCell] = useState<{ date: string; count: number; index: number } | null>(null)

  return (
    <div className="fade-in space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="glass rounded-3xl p-6 shadow-crisp">
          <div className="text-sm font-semibold text-slate-950">Workspace Progress</div>
          <div className="mt-4 flex items-center gap-4">
            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-950/10">
              <svg className="absolute inset-0 h-full w-full -rotate-90">
                <circle cx="48" cy="48" r="40" className="stroke-slate-200" strokeWidth="8" fill="none" />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  className="stroke-slate-950 transition-all duration-1000"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (251.2 * progress) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="text-xl font-bold text-slate-950">{progress}%</div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-700">
                <span className="font-bold text-slate-950">{doneCount}</span> / {total} tasks completed
              </div>
            </div>
          </div>
        </div>

        <div className="glass rounded-3xl p-6 shadow-crisp">
          <div className="text-sm font-semibold text-slate-950">Tasks by Status</div>
          <div className="mt-4 h-32">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byStatus} cx="50%" cy="50%" innerRadius={35} outerRadius={50} dataKey="value" stroke="none">
                  {byStatus.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="glass rounded-3xl p-6 shadow-crisp">
          <div className="text-sm font-semibold text-slate-950">Tasks by Type</div>
          <div className="mt-4 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-3xl p-6 shadow-crisp">
          <div className="text-sm font-semibold text-slate-950">Activity Heatmap (Last 30 Days)</div>
          <div className="relative mt-6">
            <div className="flex flex-wrap gap-1.5">
              {heatmapData.map((d, i) => (
                <div
                  key={i}
                  onMouseEnter={() => setHoveredCell({ ...d, index: i })}
                  onMouseLeave={() => setHoveredCell(null)}
                  className="group relative"
                >
                  <div
                    className={`aspect-square w-[22px] shrink-0 cursor-default rounded-sm transition-all hover:scale-110 hover:ring-2 hover:ring-slate-950/20 ${
                      d.count === 0
                        ? 'bg-slate-100 ring-1 ring-slate-950/5'
                        : d.count < 2
                          ? 'bg-emerald-300'
                          : d.count < 4
                            ? 'bg-emerald-500'
                            : 'bg-emerald-700'
                    }`}
                  />
                  {hoveredCell?.index === i && (
                    <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 z-[100] -translate-x-1/2">
                      <div className="glass rounded-xl bg-white/95 px-3 py-2 shadow-2xl ring-1 ring-slate-950/10 backdrop-blur-md text-center">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {new Date(d.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="mt-0.5 text-[12px] font-black text-emerald-600 whitespace-nowrap">
                          {d.count} tasks created
                        </div>
                      </div>
                      <div className="mx-auto h-2 w-2 -translate-y-1 rotate-45 border-b border-r border-slate-950/10 bg-white/95" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
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
      <div className="rounded-2xl bg-white/70 p-3 ring-1 ring-slate-950/10">
        <div className="text-xs font-semibold text-slate-950">Create workspace</div>
        <div className="mt-2 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
            placeholder="Team name"
            className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-950 placeholder:text-slate-500 ring-1 ring-slate-950/10 outline-none"
          />
          <button
            type="button"
            onClick={create}
            className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-50 shadow-crisp"
          >
            Create
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white/70 p-3 ring-1 ring-slate-950/10">
        <div className="text-xs font-semibold text-slate-950">Join by code</div>
        <div className="mt-2 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && join()}
            placeholder="JOINCODE"
            className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold tracking-wider text-slate-950 placeholder:text-slate-500 ring-1 ring-slate-950/10 outline-none"
          />
          <button
            type="button"
            onClick={join}
            className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-50 shadow-crisp"
          >
            Join
          </button>
        </div>
      </div>

      {msg && <div className="text-xs font-semibold text-slate-800">{msg}</div>}
    </div>
  )
}

