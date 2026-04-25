import { MenuItem, TextField } from '@mui/material'

type LookupOption = {
  value: string
  label: string
}

type LookupSelectFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  options: LookupOption[]
  error?: boolean
  helperText?: string
  disabled?: boolean
  emptyText?: string
}

export default function LookupSelectField({
  label,
  value,
  onChange,
  options,
  error,
  helperText,
  disabled,
  emptyText = 'No options available',
}: LookupSelectFieldProps) {
  return (
    <TextField
      fullWidth
      select
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      error={error}
      helperText={helperText ?? (options.length ? 'Required' : emptyText)}
      disabled={disabled}
    >
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  )
}