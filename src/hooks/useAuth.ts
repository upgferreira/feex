import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

// ── Sessão compartilhada entre todas as telas ─────────────────────────────────
// Antes cada componente tinha seu próprio estado e começava com user = null,
// o que fazia todas as telas refazerem suas consultas ao montar.
let _user: User | null = null
let _loading = true
let _started = false
const _subs = new Set<() => void>()

function setShared(user: User | null) {
  // Mantém a mesma referência se o usuário não mudou (evita re-renderizações e refetch)
  if (_user && user && _user.id === user.id) _user = user
  else _user = user
  _loading = false
  _subs.forEach(fn => fn())
}

function startAuth() {
  if (_started) return
  _started = true
  supabase.auth.getSession().then(({ data: { session }, error }) => {
    if (error) {
      // Token inválido: limpa a sessão para não repetir o erro
      supabase.auth.signOut()
      setShared(null)
    } else {
      setShared(session?.user ?? null)
    }
  })
  supabase.auth.onAuthStateChange((_event, session) => {
    setShared(session?.user ?? null)
  })
}

export const useAuth = () => {
  startAuth()
  const [user, setUser] = useState<User | null>(_user)
  const [loading, setLoading] = useState(_loading)

  useEffect(() => {
    const sync = () => { setUser(_user); setLoading(_loading) }
    _subs.add(sync)
    sync()
    return () => { _subs.delete(sync) }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    })
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  }
}