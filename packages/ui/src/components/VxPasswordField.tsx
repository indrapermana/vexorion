import { IconButton, InputAdornment, TextField, type TextFieldProps } from '@mui/material'
import { useState, type FocusEvent, type KeyboardEvent } from 'react'
import { VisibilityOffRoundedIcon, VisibilityRoundedIcon } from '../icons'

export type VxPasswordFieldProps = Omit<TextFieldProps, 'type' | 'variant'> & {
  showPasswordLabel: string
  hidePasswordLabel: string
  capsLockMessage: string
}

export function VxPasswordField({
  showPasswordLabel,
  hidePasswordLabel,
  capsLockMessage,
  helperText,
  error,
  onKeyDown,
  onKeyUp,
  onBlur,
  slotProps,
  ...props
}: VxPasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  const [capsLock, setCapsLock] = useState(false)

  const trackCapsLock = (event: KeyboardEvent<HTMLDivElement>) => {
    setCapsLock(event.getModifierState?.('CapsLock') ?? false)
  }

  const showCapsLock = capsLock && !error

  return (
    <TextField
      {...props}
      error={error}
      type={visible ? 'text' : 'password'}
      onKeyDown={(event) => {
        trackCapsLock(event)
        onKeyDown?.(event)
      }}
      onKeyUp={(event) => {
        trackCapsLock(event)
        onKeyUp?.(event)
      }}
      onBlur={(event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setCapsLock(false)
        onBlur?.(event)
      }}
      helperText={showCapsLock ? capsLockMessage : helperText}
      slotProps={{
        ...slotProps,
        formHelperText: {
          ...(typeof slotProps?.formHelperText === 'object' ? slotProps.formHelperText : {}),
          role: showCapsLock ? 'status' : undefined,
        },
        input: {
          ...(typeof slotProps?.input === 'object' ? slotProps.input : {}),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                edge="end"
                aria-label={visible ? hidePasswordLabel : showPasswordLabel}
                aria-pressed={visible}
                onClick={() => setVisible((current) => !current)}
                onMouseDown={(event) => event.preventDefault()}
              >
                {visible ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  )
}
