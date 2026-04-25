import ReportGmailerrorredRoundedIcon from '@mui/icons-material/ReportGmailerrorredRounded'
import { Button, Chip, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import type { NotFoundPageProps } from '../types/ui'

export default function NotFoundPage({
  variant = 'admin',
  backTo = variant === 'public' ? '/login' : '/',
  backLabel = variant === 'public' ? 'Back to sign in' : 'Back to dashboard',
}: NotFoundPageProps) {
  const isPublic = variant === 'public'

  return (
    <Paper elevation={0} className={isPublic ? 'public-form-card public-not-found-card' : 'panel-card admin-not-found-card'}>
      <Stack spacing={2.25}>
        <Chip
          icon={<ReportGmailerrorredRoundedIcon />}
          label={isPublic ? 'Public route not found' : 'Admin route not found'}
          color="secondary"
          sx={{ alignSelf: 'flex-start' }}
        />
        <Typography variant="h2">Page not found</Typography>
        <Typography color="text.secondary">
          {isPublic
            ? 'This path does not match the public sign-in or onboarding flow. Try returning to a known entry point.'
            : 'This path does not exist in the current ERP dashboard navigation map.'}
        </Typography>
        <Button component={RouterLink} to={backTo} variant="contained">{backLabel}</Button>
      </Stack>
    </Paper>
  )
}