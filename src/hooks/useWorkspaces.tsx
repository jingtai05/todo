import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

export type Workspace = {
  id: string
  name: string
  owner_id: string
  owner_email: string | null
  join_code: string
  is_personal: boolean
  created_at: string
}

export function useWorkspaces(userId: string) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(
    null,
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const active = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId) ?? null,
    [activeWorkspaceId, workspaces],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const primary = await supabase
      .from('workspaces')
      .select('id,name,owner_id,owner_email,join_code,is_personal,created_at')
      .order('created_at', { ascending: true })

    let rows: Workspace[] = []
    if (primary.error) {
      // Backward-compat for users who haven't re-run the SQL migration yet.
      if (primary.error.message.includes('owner_email') && primary.error.message.includes('does not exist')) {
        const fallback = await supabase
          .from('workspaces')
          .select('id,name,owner_id,join_code,is_personal,created_at')
          .order('created_at', { ascending: true })
        if (fallback.error) {
          setError(fallback.error.message)
          setLoading(false)
          return
        }
        rows = ((fallback.data ?? []) as any[]).map((w) => ({
          ...w,
          owner_email: null,
        })) as Workspace[]
      } else {
        setError(primary.error.message)
        setLoading(false)
        return
      }
    } else {
      rows = (primary.data ?? []) as Workspace[]
    }

    setWorkspaces(rows)
    setActiveWorkspaceId((prev) => {
      if (prev && rows.some((w) => w.id === prev)) return prev
      return rows[0]?.id ?? null
    })
    setLoading(false)
  }, [])

  const ensurePersonalWorkspace = useCallback(async () => {
    await supabase.rpc('ensure_personal_workspace')
  }, [userId])

  const ensuredForUser = useRef<string | null>(null)
  useEffect(() => {
    if (!userId || ensuredForUser.current === userId) return
    ensuredForUser.current = userId
    void ensurePersonalWorkspace().finally(() => load())
  }, [userId, ensurePersonalWorkspace, load])

  // Keep workspace list in sync (joins/leaves) for this user.
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`workspace-membership-live-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspace_members',
          filter: `user_id=eq.${userId}`,
        },
        () => load(),
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [load, userId])

  const createWorkspace = useCallback(
    async (name: string) => {
      const clean = name.trim()
      if (!clean) return { ok: false as const, error: 'Name is required.' }
      const { data, error } = await supabase.rpc('create_workspace', {
        p_name: clean,
      })
      if (error) return { ok: false as const, error: error.message }
      const wid = (data as any)?.id as string | undefined
      await load()
      if (wid) setActiveWorkspaceId(wid)
      return { ok: true as const }
    },
    [load, userId],
  )

  const joinWorkspace = useCallback(
    async (code: string) => {
      const clean = code.trim().toUpperCase()
      if (!clean) return { ok: false as const, error: 'Join code is required.' }
      const { data, error } = await supabase.rpc('join_workspace', {
        p_code: clean,
      })
      if (error) return { ok: false as const, error: error.message }
      const wid = (data as any)?.id as string | undefined

      await load()
      if (wid) setActiveWorkspaceId(wid)
      return { ok: true as const }
    },
    [load, userId],
  )

  return {
    workspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    activeWorkspace: active,
    loading,
    error,
    createWorkspace,
    joinWorkspace,
    reload: load,
  }
}

