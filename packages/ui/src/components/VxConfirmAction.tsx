import { useState, type ReactNode } from 'react'
import type { ButtonProps } from '@mui/material'
import { VxAlert, VxButton, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxStack, VxTypography } from './material'

export type VxConfirmActionDialogProps = {
  open: boolean
  title: ReactNode
  targetName: ReactNode
  consequence: ReactNode
  confirmLabel: ReactNode
  confirmColor?: ButtonProps['color']
  pendingLabel?: ReactNode
  pending?: boolean
  error?: ReactNode
  onClose: () => void
  onConfirm: () => void
}

export function VxConfirmActionDialog({
  open,
  title,
  targetName,
  consequence,
  confirmLabel,
  confirmColor = 'error',
  pendingLabel = 'Working...',
  pending = false,
  error,
  onClose,
  onConfirm,
}: VxConfirmActionDialogProps) {
  return (
    <VxDialog open={open} onClose={pending ? undefined : onClose} maxWidth="xs" fullWidth aria-busy={pending}>
      <VxDialogTitle>{title}</VxDialogTitle>
      <VxDialogContent>
        <VxStack spacing={1.5}>
          <VxTypography sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{targetName}</VxTypography>
          <VxTypography color="text.secondary">{consequence}</VxTypography>
          {error ? <VxAlert severity="error">{error}</VxAlert> : null}
        </VxStack>
      </VxDialogContent>
      <VxDialogActions>
        <VxButton autoFocus onClick={onClose} disabled={pending}>Cancel</VxButton>
        <VxButton color={confirmColor} variant="contained" onClick={onConfirm} disabled={pending}>
          {pending ? pendingLabel : confirmLabel}
        </VxButton>
      </VxDialogActions>
    </VxDialog>
  )
}

type VxConfirmActionButtonProps = {
  children: ReactNode
  title: ReactNode
  targetName: ReactNode
  consequence: ReactNode
  confirmLabel: ReactNode
  confirmColor?: ButtonProps['color']
  pendingLabel?: ReactNode
  onConfirm: () => Promise<void> | void
  buttonProps?: Omit<ButtonProps, 'children' | 'onClick'>
}

export function VxConfirmActionButton({
  children,
  title,
  targetName,
  consequence,
  confirmLabel,
  confirmColor,
  pendingLabel,
  onConfirm,
  buttonProps,
}: VxConfirmActionButtonProps) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<ReactNode>()

  const handleConfirm = async () => {
    setPending(true)
    setError(undefined)
    try {
      await onConfirm()
      setOpen(false)
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : 'The action could not be completed.')
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <VxButton {...buttonProps} onClick={() => { setError(undefined); setOpen(true) }}>{children}</VxButton>
      <VxConfirmActionDialog
        open={open}
        title={title}
        targetName={targetName}
        consequence={consequence}
        confirmLabel={confirmLabel}
        confirmColor={confirmColor}
        pendingLabel={pendingLabel}
        pending={pending}
        error={error}
        onClose={() => setOpen(false)}
        onConfirm={() => void handleConfirm()}
      />
    </>
  )
}
