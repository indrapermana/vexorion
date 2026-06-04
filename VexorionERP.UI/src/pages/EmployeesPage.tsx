import { useTranslation } from 'react-i18next'
import EmployeesFeaturePage from '../features/organization/pages/EmployeesPage'

export default function EmployeesPage() {
  useTranslation()
  return <EmployeesFeaturePage />
}
