import type { PosSessionResponse } from '../../types/api'
import { requestJson } from './core'

export function getPosSession() {
  return requestJson<PosSessionResponse>('/pos/session')
}
