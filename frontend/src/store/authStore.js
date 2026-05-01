import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setAuth: (token, user) => set({ token, user, isAuthenticated: true }),

      logout: () => {
        localStorage.removeItem('auth-storage')
        set({ token: null, user: null, isAuthenticated: false })
      },

      hasRole: (...roles) => {
        const user = get().user
        return user ? roles.includes(user.role) : false
      },

      isAdmin: () => get().hasRole('admin'),
      isChief: () => get().hasRole('admin', 'chief'),
      isAdminStaff: () => get().hasRole('admin', 'admin_staff'),
      canManageUsers: () => get().hasRole('admin'),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)

export default useAuthStore
