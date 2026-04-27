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
import { useAuth } from '../../../app/AuthContext'
import { ApiError, getTenantPreferences, updateMenuConfiguration } from '../../../lib/api'
import { getHiddenMenuLinks, saveHiddenMenuLinks } from '../../../lib/menuConfig'
import { configurableMenuItems } from '../menuItems'

export default function ConfigMenuPage() {
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
        setError('Unable to load menu configuration.')
      }
    }
  }, [isAuthenticated])

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
      setFeedback('Menu visibility updated.')
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setError(saveError.message)
      } else {
        setError('Unable to save menu configuration.')
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
      setFeedback('Menu visibility reset to default.')
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setError(saveError.message)
      } else {
        setError('Unable to reset menu configuration.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  if (!isAuthenticated) {
    return <Alert severity="info">Sign in first. Menu configuration requires authentication.</Alert>
  }

  return (
    <Stack spacing={3}>
      <Paper elevation={0} className="panel-card">
        <Typography variant="h4" sx={{ mb: 1 }}>Menu Configuration</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Control which navigation links are shown in the sidebar for this tenant.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button variant="contained" onClick={() => void save()} disabled={isSaving}>Save changes</Button>
          <Button variant="outlined" onClick={() => void reset()} disabled={isSaving}>Reset defaults</Button>
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
