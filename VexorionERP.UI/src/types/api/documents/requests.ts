import type { GeneratedDocumentFormat, GeneratedDocumentSourceType } from './responses'

export type GenerateDocumentRequest = {
  sourceType: GeneratedDocumentSourceType
  sourceEntityId: string
  format: GeneratedDocumentFormat
  forceRegenerate: boolean
}
