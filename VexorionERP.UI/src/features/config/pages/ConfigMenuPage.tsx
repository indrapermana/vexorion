import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { VxAlert, VxBox, VxButton, VxCheckbox, VxChip, VxFormControlLabel, VxStack, VxTable, VxTableBody, VxTableCell, VxTableContainer, VxTableHead, VxTableRow, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import { getMainMenuAccess, Permissions } from '../../../app/authorization'
import { useTenantModules } from '../../../app/TenantModuleContext'
import PermissionReadOnlyAlert from '../../../components/PermissionReadOnlyAlert'
import { PageFeedback, PageHeader } from '../../../components/PagePrimitives'
import { getTenantPreferences, updateMenuConfiguration } from '../../../lib/api'
import { getHiddenMenuLinks, saveHiddenMenuLinks } from '../../../lib/menuConfig'
import { configurableMenuItems } from '../menuItems'

export default function ConfigMenuPage() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const modules = useTenantModules()
  const canManage = user?.permissions.includes(Permissions.organization.manage) ?? false
  const [hiddenLinks, setHiddenLinks] = useState<string[]>(() => getHiddenMenuLinks())
  const [savedHiddenLinks, setSavedHiddenLinks] = useState<string[]>([])
  const [error, setError] = useState<'load' | 'save' | 'reset' | null>(null)
  const [feedback, setFeedback] = useState<'saved' | 'reset' | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoaded, setIsLoaded] = useState(false)
  const loadVersion = useRef(0)
  const isDirty = hiddenLinks.length !== savedHiddenLinks.length || hiddenLinks.some((path) => !savedHiddenLinks.includes(path))

  const loadPreference = useCallback(async () => {
    const version = ++loadVersion.current
    setIsLoaded(false)
    if (!isAuthenticated || !user?.tenantId) {
      setHiddenLinks([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const preference = await getTenantPreferences()
      if (version !== loadVersion.current) return
      setHiddenLinks(preference.hiddenMenuLinks)
      setSavedHiddenLinks(preference.hiddenMenuLinks)
      saveHiddenMenuLinks(preference.hiddenMenuLinks)
      setIsLoaded(true)
    } catch {
      if (version === loadVersion.current) setError('load')
    } finally {
      if (version === loadVersion.current) setIsLoading(false)
    }
  }, [isAuthenticated, user?.tenantId])

  useEffect(() => {
    void loadPreference()
    return () => { loadVersion.current += 1 }
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
    if (!canManage || isSaving || !isLoaded) return
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
    if (!canManage || isSaving || !isLoaded) return
    setError(null)
    setFeedback(null)
    setIsSaving(true)

    try {
      const updated = await updateMenuConfiguration({ hiddenMenuLinks: hiddenLinks })
      setHiddenLinks(updated.hiddenMenuLinks)
      setSavedHiddenLinks(updated.hiddenMenuLinks)
      saveHiddenMenuLinks(updated.hiddenMenuLinks)
      setFeedback('saved')
    } catch {
      setError('save')
    } finally {
      setIsSaving(false)
    }
  }

  const reset = async () => {
    if (!canManage || isSaving || !isLoaded) return
    setError(null)
    setFeedback(null)
    setIsSaving(true)

    try {
      const updated = await updateMenuConfiguration({ hiddenMenuLinks: [] })
      setHiddenLinks(updated.hiddenMenuLinks)
      setSavedHiddenLinks(updated.hiddenMenuLinks)
      saveHiddenMenuLinks(updated.hiddenMenuLinks)
      setFeedback('reset')
    } catch {
      setError('reset')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isAuthenticated) {
    return <VxAlert severity="info">{t('config.menu.signInRequired')}</VxAlert>
  }

  return (
    <VxStack spacing={3}>
      <PageHeader
        title={t('config.menu.title')}
        description={t('config.menu.description')}
        primaryAction={canManage ? <VxStack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <VxButton variant="contained" onClick={() => void save()} disabled={isSaving || !isLoaded || !isDirty}>{t('config.menu.saveChanges')}</VxButton>
          <VxButton variant="outlined" onClick={() => void reset()} disabled={isSaving || !isLoaded}>{t('config.menu.resetDefaults')}</VxButton>
        </VxStack> : null}
      />

      <PageFeedback error={error ? t(`config.menu.errors.${error}`) : null} success={feedback ? t(`config.menu.feedback.${feedback}`) : null} onRetry={error ? () => { void (error === 'load' ? loadPreference() : error === 'save' ? save() : reset()) } : undefined} />
      {!canManage ? <PermissionReadOnlyAlert requiredPermission={Permissions.organization.manage} /> : null}

      {isLoading ? <VxTypography role="status">{t('config.menu.loading')}</VxTypography> : null}
      {isLoaded ? <VxStack spacing={2} component="section" aria-label={t('config.menu.previewTitle')} sx={{ minWidth: 0 }}>
        <VxStack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
          <VxTypography component="h2" variant="h6">{t('config.menu.previewTitle')}</VxTypography>
          <VxChip size="small" color={isDirty ? 'warning' : 'default'} label={t(isDirty ? 'config.menu.unsaved' : 'config.menu.saved')} />
        </VxStack>
        <VxTypography variant="body2" color="text.secondary">{t('config.menu.previewScope', { name: user?.userName ?? '' })}</VxTypography>
        <VxAlert severity="info">{t('config.menu.accessPolicy')}</VxAlert>
        {Object.entries(groupedItems).map(([section, items]) => (
        <VxBox key={section} component="section" aria-label={t(section)} sx={{ minWidth: 0 }}>
          <VxTypography component="h3" variant="subtitle1" sx={{ mb: 1.5 }}>{t(section)}</VxTypography>
          <VxTableContainer>
          <VxTable size="small" aria-label={t(section)} sx={{ minWidth: 850 }}>
            <VxTableHead><VxTableRow>
              {['workspace', 'preference', 'module', 'permission', 'effective'].map((column) => <VxTableCell key={column}>{t(`config.menu.columns.${column}`)}</VxTableCell>)}
            </VxTableRow></VxTableHead>
            <VxTableBody>
            {items.map((item) => {
              const access = getMainMenuAccess(user?.permissions, item.path, hiddenLinks, modules)
              return (
                <VxTableRow key={item.path} data-menu-path={item.path}>
                  <VxTableCell component="th" scope="row">{t(item.label)}</VxTableCell>
                  <VxTableCell><VxFormControlLabel
                    control={<VxCheckbox checked={access.preferenceVisible} disabled={!canManage || isSaving} slotProps={{ input: { 'aria-label': t('config.menu.showItem', { name: t(item.label) }) } }} onChange={(event) => toggleHidden(item.path, !event.target.checked)} />}
                    label={t('config.menu.showInMenu')}
                  /></VxTableCell>
                  <VxTableCell><VxChip size="small" variant="outlined" label={t(`config.menu.modules.${access.moduleStatus}`)} /></VxTableCell>
                  <VxTableCell><VxChip size="small" variant="outlined" color={access.permissionAllowed ? 'default' : 'warning'} label={t(access.permissionAllowed ? 'config.menu.viewAllowed' : 'config.menu.viewDenied')} /></VxTableCell>
                  <VxTableCell><VxChip size="small" color={access.visible ? 'success' : 'default'} label={t(`config.menu.results.${access.status}`)} /></VxTableCell>
                </VxTableRow>
              )
            })}
            </VxTableBody>
          </VxTable>
          </VxTableContainer>
        </VxBox>
        ))}
      </VxStack> : null}
    </VxStack>
  )
}
