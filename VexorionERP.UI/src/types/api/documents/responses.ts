export type GeneratedDocumentFormat = 'Docx' | 'Pdf'

export type GeneratedDocumentStatus = 'Ready' | 'Failed' | 'Superseded'

export type GeneratedDocumentSourceType =
  | 'SalesOrder'
  | 'PurchaseOrder'
  | 'SalesInvoice'
  | 'PurchaseInvoice'
  | 'CustomerPaymentReceipt'
  | 'VendorPaymentReceipt'

export type GeneratedDocumentResponse = {
  generatedDocumentId: string
  sourceType: GeneratedDocumentSourceType
  sourceEntityId: string
  format: GeneratedDocumentFormat
  status: GeneratedDocumentStatus
  version: number
  fileName: string
  contentType: string
  blobPath: string
  downloadUrl: string | null
  generatedAtUtc: string
}

export type GetDocumentDownloadLinkResponse = {
  generatedDocumentId: string
  downloadUrl: string
}
