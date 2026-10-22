import { useCallback, useEffect, useState } from 'react'
import { VxAlert, VxChip, VxStack, VxTable, VxTableBody, VxTableCell, VxTableHead, VxTableRow } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import { PageBody, PageFeedback, PageHeader } from '../../../components/PagePrimitives'
import { ApiError, getRolePermissions } from '../../../lib/api'
import type { RolePermissionsResponse } from '../../../types/api'

export default function ConfigRolesPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const [items, setItems] = useState<RolePermissionsResponse[]>([])
  const [error, setError] = useState<string | null>(null)

  const loadRoles = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([])
      return
    }

    setError(null)
    try {
      const response = await getRolePermissions()
      setItems(response)
    } catch (loadError) {
      if (loadError instanceof ApiError) {
        setError(loadError.message)
      } else {
        setError(t('config.roles.errors.load'))
      }
    }
  }, [isAuthenticated, t])

  useEffect(() => {
    void loadRoles()
  }, [loadRoles])

  if (!isAuthenticated) {
    return <VxAlert severity="info">{t('config.roles.signInRequired')}</VxAlert>
  }

  return (
    <VxStack spacing={3}>
      <PageHeader title={t('config.roles.title')} description={t('config.roles.description')} />

      <PageFeedback error={error} onRetry={error ? () => void loadRoles() : undefined} />

      <PageBody>
        <VxTable size="small">
          <VxTableHead>
            <VxTableRow>
              <VxTableCell sx={{ width: 180 }}>{t('config.roles.columns.role')}</VxTableCell>
              <VxTableCell>{t('config.roles.columns.permissions')}</VxTableCell>
            </VxTableRow>
          </VxTableHead>
          <VxTableBody>
            {items.map((item) => (
              <VxTableRow key={item.role}>
                <VxTableCell sx={{ fontWeight: 700 }}>{item.role}</VxTableCell>
                <VxTableCell>
                  <VxStack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                    {item.permissions.map((permission) => (
                      <VxChip key={permission} size="small" label={permission} variant="outlined" />
                    ))}
                  </VxStack>
                </VxTableCell>
              </VxTableRow>
            ))}
          </VxTableBody>
        </VxTable>
      </PageBody>
    </VxStack>
  )
}
