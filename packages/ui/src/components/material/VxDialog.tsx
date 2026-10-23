import { createContext, forwardRef, useContext, useId } from 'react'
import { Dialog, DialogTitle, type DialogProps, type DialogTitleProps } from '@mui/material'

const DialogTitleIdContext = createContext<string | null>(null)

export const VxDialog = forwardRef<HTMLDivElement, DialogProps>(function VxDialog(
  { children, 'aria-labelledby': ariaLabelledBy, ...props },
  ref,
) {
  const titleId = useId()

  return (
    <Dialog
      {...props}
      ref={ref}
      aria-labelledby={ariaLabelledBy ?? titleId}
    >
      <DialogTitleIdContext.Provider value={titleId}>
        {children}
      </DialogTitleIdContext.Provider>
    </Dialog>
  )
})

export const VxDialogTitle = forwardRef<HTMLHeadingElement, DialogTitleProps>(function VxDialogTitle(
  { id, ...props },
  ref,
) {
  const dialogTitleId = useContext(DialogTitleIdContext)

  return <DialogTitle {...props} ref={ref} id={id ?? dialogTitleId ?? undefined} />
})
