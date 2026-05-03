function formatDocumentStamp(value: Date) {
  return `${value.getFullYear()}${String(value.getMonth() + 1).padStart(2, '0')}${String(value.getDate()).padStart(2, '0')}${String(value.getHours()).padStart(2, '0')}${String(value.getMinutes()).padStart(2, '0')}${String(value.getSeconds()).padStart(2, '0')}`
}

let lastIssuedSecond = 0

export function generateDocumentNumber(prefix: string) {
  const currentSecond = Math.floor(Date.now() / 1000) * 1000
  const issuedSecond = currentSecond <= lastIssuedSecond ? lastIssuedSecond + 1000 : currentSecond
  lastIssuedSecond = issuedSecond
  return `${prefix}-${formatDocumentStamp(new Date(issuedSecond))}`
}