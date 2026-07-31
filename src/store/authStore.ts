import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null
  initialize: () => void
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, username: string) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  error: null,

  initialize: () => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ user: session?.user ?? null, isLoading: false })
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null })
    })
  },

  login: async (email, password) => {
    set({ error: null, isLoading: true })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      set({ error: error.message, isLoading: false })
      return
    }
    set({ user: data.user, isLoading: false })
  },

  register: async (email, password, username) => {
    set({ error: null, isLoading: true })
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    })
    if (error) {
      set({ error: error.message, isLoading: false })
      return
    }
    if (!data.session) {
      // Email confirmation is required — inform the user
      set({
        isLoading: false,
        error: 'Account created! Check your email to confirm before signing in.',
      })
      return
    }
    set({ user: data.session.user, isLoading: false })
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null })
  },

  clearError: () => set({ error: null }),
}))
