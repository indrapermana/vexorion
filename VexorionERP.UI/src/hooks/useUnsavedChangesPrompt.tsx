import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { VxButton, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useBlocker } from 'react-router-dom'

const noop = () => {}

type DirtyFormRegistry = {
  update: (id: string, isDirty: boolean, isBusy: boolean) => void
}

const DirtyFormRegistryContext = createContext<DirtyFormRegistry>({
  update: noop,
})

export function UnsavedChangesNavigationGuard({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const [forms, setForms] = useState<Record<string, { dirty: boolean, busy: boolean }>>({})
  const isBusy = Object.values(forms).some((form) => form.busy)
  const shouldBlock = isBusy || Object.values(forms).some((form) => form.dirty)
  const blocker = useBlocker(shouldBlock)
  const update = useCallback((id: string, isDirty: boolean, isFormBusy: boolean) => {
    setForms((current) => {
      if (isDirty || isFormBusy) {
        const next = { dirty: isDirty, busy: isFormBusy }
        return current[id]?.dirty === next.dirty && current[id]?.busy === next.busy
          ? current
          : { ...current, [id]: next }
      }

      if (!(id in current)) return current
      const next = { ...current }
      delete next[id]
      return next
    })
  }, [])
  const registry = useMemo(() => ({ update }), [update])

  useEffect(() => {
    if (blocker.state === 'blocked' && !shouldBlock) {
      blocker.proceed()
    }
  }, [blocker, shouldBlock])

  return (
    <DirtyFormRegistryContext.Provider value={registry}>
      {children}
      <VxDialog
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        maxWidth="xs"
        fullWidth
      >
        <VxDialogTitle>{t('common.unsavedChanges.title')}</VxDialogTitle>
        <VxDialogContent>{t('common.unsavedChanges.message')}</VxDialogContent>
        <VxDialogActions>
          <VxButton onClick={() => blocker.reset?.()}>{t('common.unsavedChanges.keepEditing')}</VxButton>
          <VxButton color="error" variant="contained" disabled={isBusy} onClick={() => blocker.proceed?.()}>
            {t('common.unsavedChanges.discard')}
          </VxButton>
        </VxDialogActions>
      </VxDialog>
    </DirtyFormRegistryContext.Provider>
  )
}

export function useUnsavedChangesPrompt(
  isDirty: boolean,
  isBusy: boolean,
  onClose: () => void,
  onDiscard: () => void = noop,
) {
  const { t } = useTranslation()
  const id = useId()
  const { update } = useContext(DirtyFormRegistryContext)
  const [isPromptOpen, setIsPromptOpen] = useState(false)

  useEffect(() => {
    update(id, isDirty, isBusy)
  }, [id, isBusy, isDirty, update])
  useEffect(() => () => update(id, false, false), [id, update])

  useEffect(() => {
    if (!isDirty && !isBusy) return

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [isBusy, isDirty])

  const requestClose = useCallback(() => {
    if (isBusy) return
    if (isDirty) {
      setIsPromptOpen(true)
      return
    }
    onClose()
  }, [isBusy, isDirty, onClose])

  const keepEditing = useCallback(() => setIsPromptOpen(false), [])
  const discardChanges = useCallback(() => {
    setIsPromptOpen(false)
    onDiscard()
    onClose()
  }, [onClose, onDiscard])

  const confirmationDialog = (
    <VxDialog open={isPromptOpen} onClose={keepEditing} maxWidth="xs" fullWidth>
      <VxDialogTitle>{t('common.unsavedChanges.title')}</VxDialogTitle>
      <VxDialogContent>{t('common.unsavedChanges.message')}</VxDialogContent>
      <VxDialogActions>
        <VxButton onClick={keepEditing}>{t('common.unsavedChanges.keepEditing')}</VxButton>
        <VxButton color="error" variant="contained" onClick={discardChanges}>
          {t('common.unsavedChanges.discard')}
        </VxButton>
      </VxDialogActions>
    </VxDialog>
  )

  return { requestClose, confirmationDialog }
}
