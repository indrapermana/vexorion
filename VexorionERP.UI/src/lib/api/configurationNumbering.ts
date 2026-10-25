import type { NumberingSequenceResponse, UpsertNumberingSequenceRequest } from '../../types/api'
import { requestJson } from './core'

export function getNumberingSequences() {
  return requestJson<NumberingSequenceResponse[]>('/numbering-sequences')
}

export function upsertNumberingSequence(request: UpsertNumberingSequenceRequest) {
  return requestJson<NumberingSequenceResponse>('/numbering-sequences', 'PUT', request)
}
