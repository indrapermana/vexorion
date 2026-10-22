import { useCallback, useEffect, useMemo, useState } from 'react'
import { VxAlert, VxButton, VxCheckbox, VxFormControlLabel, VxPaper, VxStack, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import { Permissions } from '../../../app/authorization'
import PermissionReadOnlyAlert from '../../../components/PermissionReadOnlyAlert'
import { ApiError, getTenantPreferences, updateMenuConfiguration } from '../../../lib/api'
import { getHiddenMenuLinks, saveHiddenMenuLinks } from '../../../lib/menuConfig'
import { configurableMenuItems } from '../menuItems'

export default function ConfigMenuPage() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const canManage = user?.permissions.includes(Permissions.organization.manage) ?? false
  const [hiddenLinks, setHiddenLinks] = useState<string[]>(() => getHiddenMenuLinks())
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const loadPreference = useCallback(async () => {
    if (!isAuthenticated) {
      setHiddenLinks([])
      return
    }

    setError(null)
    try {
      const preference = await getTenantPreferences()
      setHiddenLinks(preference.hiddenMenuLinks)
      saveHiddenMenuLinks(preference.hiddenMenuLinks)
    } catch (loadError) {
      if (loadError instanceof ApiError) {
        setError(loadError.message)
      } else {
        setError(t('config.menu.errors.load'))
      }
    }
  }, [isAuthenticated, t])

  useEffect(() => {
    void loadPreference()
  }, [loadPreference])

  const groupedItems = useMemo(
    () => configurableMenuItems.reduce<Record<string, typeof configurableMenuItems>>((acc, item) => {
      const list = acc[item.section] ?? []
      list.push(item)
      acc[item.section] = list
      return acc
    }, {}),
    [],
  )

  const toggleHidden = (path: string, hidden: boolean) => {
    if (!canManage) return
    setFeedback(null)
    setHiddenLinks((previous) => {
      if (hidden) {
        if (previous.includes(path)) {
          return previous
        }

        return [...previous, path]
      }

      return previous.filter((value) => value !== path)
    })
  }

  const save = async () => {
    if (!canManage) return
    setError(null)
    setFeedback(null)
    setIsSaving(true)

    try {
      const updated = await updateMenuConfiguration({ hiddenMenuLinks: hiddenLinks })
      setHiddenLinks(updated.hiddenMenuLinks)
      saveHiddenMenuLinks(updated.hiddenMenuLinks)
      setFeedback(t('config.menu.feedback.saved'))
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setError(saveError.message)
      } else {
        setError(t('config.menu.errors.save'))
      }
    } finally {
      setIsSaving(false)
    }
  }

  const reset = async () => {
    if (!canManage) return
    setError(null)
    setFeedback(null)
    setIsSaving(true)

    try {
      const updated = await updateMenuConfiguration({ hiddenMenuLinks: [] })
      setHiddenLinks(updated.hiddenMenuLinks)
      saveHiddenMenuLinks(updated.hiddenMenuLinks)
      setFeedback(t('config.menu.feedback.reset'))
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setError(saveError.message)
      } else {
        setError(t('config.menu.errors.reset'))
      }
    } finally {
      setIsSaving(false)
    }
  }

  if (!isAuthenticated) {
    return <VxAlert severity="info">{t('config.menu.signInRequired')}</VxAlert>
  }

  return (
    <VxStack spacing={3}>
      <VxPaper elevation={0} className="panel-card">
        <VxTypography variant="h4" sx={{ mb: 1 }}>{t('config.menu.title')}</VxTypography>
        <VxTypography color="text.secondary" sx={{ mb: 2 }}>
          {t('config.menu.description')}
        </VxTypography>
        {canManage ? <VxStack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <VxButton variant="contained" onClick={() => void save()} disabled={isSaving}>{t('config.menu.saveChanges')}</VxButton>
          <VxButton variant="outlined" onClick={() => void reset()} disabled={isSaving}>{t('config.menu.resetDefaults')}</VxButton>
        </VxStack> : null}
      </VxPaper>

      {error ? <VxAlert severity="error">{error}</VxAlert> : null}
      {feedback ? <VxAlert severity="success">{feedback}</VxAlert> : null}
      {!canManage ? <PermissionReadOnlyAlert requiredPermission={Permissions.organization.manage} /> : null}

      {Object.entries(groupedItems).map(([section, items]) => (
        <VxPaper key={section} elevation={0} className="panel-card">
          <VxTypography variant="h6" sx={{ mb: 1.5 }}>{section}</VxTypography>
          <VxStack spacing={1}>
            {items.map((item) => {
              const isHidden = hiddenLinks.includes(item.path)
              return (
                <VxFormControlLabel
                  key={item.path}
                  control={<VxCheckbox checked={!isHidden} disabled={!canManage} onChange={(event) => toggleHidden(item.path, !event.target.checked)} />}
                  label={`${item.label} (${item.path})`}
                />
              )
            })}
          </VxStack>
        </VxPaper>
      ))}
    </VxStack>
  )
}
