// Mirrors the backend Identity password options (see IdentityServiceCollectionExtensions).
export const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MIN_UNIQUE_CHARS = 3

export function isPasswordPolicyMet(password: string) {
  return password.length >= PASSWORD_MIN_LENGTH
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && new Set(password).size >= PASSWORD_MIN_UNIQUE_CHARS
}
