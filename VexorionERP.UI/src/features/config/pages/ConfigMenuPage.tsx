import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Checkbox,
  FormControlLabel,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import { ApiError, getTenantPreferences, updateMenuConfiguration } from '../../../lib/api'
import { getHiddenMenuLinks, saveHiddenMenuLinks } from '../../../lib/menuConfig'
import { configurableMenuItems } from '../menuItems'

export default function ConfigMenuPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
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
    return <Alert severity="info">{t('config.menu.signInRequired')}</Alert>
  }

  return (
    <Stack spacing={3}>
      <Paper elevation={0} className="panel-card">
        <Typography variant="h4" sx={{ mb: 1 }}>{t('config.menu.title')}</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {t('config.menu.description')}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button variant="contained" onClick={() => void save()} disabled={isSaving}>{t('config.menu.saveChanges')}</Button>
          <Button variant="outlined" onClick={() => void reset()} disabled={isSaving}>{t('config.menu.resetDefaults')}</Button>
        </Stack>
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {feedback ? <Alert severity="success">{feedback}</Alert> : null}

      {Object.entries(groupedItems).map(([section, items]) => (
        <Paper key={section} elevation={0} className="panel-card">
          <Typography variant="h6" sx={{ mb: 1.5 }}>{section}</Typography>
          <Stack spacing={1}>
            {items.map((item) => {
              const isHidden = hiddenLinks.includes(item.path)
              return (
                <FormControlLabel
                  key={item.path}
                  control={<Checkbox checked={!isHidden} onChange={(event) => toggleHidden(item.path, !event.target.checked)} />}
                  label={`${item.label} (${item.path})`}
                />
              )
            })}
          </Stack>
        </Paper>
      ))}
    </Stack>
  )
}
