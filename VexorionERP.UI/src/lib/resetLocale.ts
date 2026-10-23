export function resolveResetLocale(language?: string | null) {
  const code = (language ?? '').slice(0, 2).toLowerCase()
  return code === 'es' || code === 'id' ? code : 'en'
}
