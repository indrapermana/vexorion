import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getTenantModuleConfig } from '../lib/api'
import { useAuth } from './AuthContext'

type TenantModulesState = {
  isLoading: boolean
  projectManagementEnabled: boolean
  documentManagementEnabled: boolean
  employeeManagementEnabled: boolean
}

const TenantModulesContext = createContext<TenantModulesState>({
  isLoading: true,
  projectManagementEnabled: true,
  documentManagementEnabled: true,
  employeeManagementEnabled: true,
})

export function TenantModuleProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const [state, setState] = useState<TenantModulesState>({
    isLoading: true,
    projectManagementEnabled: true,
    documentManagementEnabled: true,
    employeeManagementEnabled: true,
  })

  useEffect(() => {
    if (!isAuthenticated || !user?.tenantId) {
      setState({
        isLoading: false,
        projectManagementEnabled: true,
        documentManagementEnabled: true,
        employeeManagementEnabled: true,
      })
      return
    }

    let cancelled = false

    const load = async () => {
      setState((current) => ({ ...current, isLoading: true }))

      try {
        const config = await getTenantModuleConfig(user.tenantId)
        if (cancelled) {
          return
        }

        setState({
          isLoading: false,
          projectManagementEnabled: config.projectManagementEnabled,
          documentManagementEnabled: config.documentManagementEnabled,
          employeeManagementEnabled: config.employeeManagementEnabled,
        })
      } catch {
        if (cancelled) {
          return
        }

        setState({
          isLoading: false,
          projectManagementEnabled: true,
          documentManagementEnabled: true,
          employeeManagementEnabled: true,
        })
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user?.tenantId])

  const value = useMemo(() => state, [state])
  return <TenantModulesContext.Provider value={value}>{children}</TenantModulesContext.Provider>
}

export function useTenantModules() {
  return useContext(TenantModulesContext)
}
