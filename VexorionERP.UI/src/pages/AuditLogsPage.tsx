import { useTranslation } from 'react-i18next'
import AuditLogsFeaturePage from '../features/auditLogs/pages/AuditLogsPage'

export default function AuditLogsPage() {
	useTranslation()
	return <AuditLogsFeaturePage />
}
