import PageHeader from '../components/layout/PageHeader'
import { useEffect } from 'react'

import { useI18n } from '../context/I18nContext'

export default function AIToolsPage() {
  const { t } = useI18n()

  useEffect(() => {
    void import('../aiTools.js')
  }, [])

  return (
    <div className="app-layout">
      <PageHeader title={t('aiTools')} />
      <div className="page-content sf-ai-tools-page" style={{ paddingTop: 0 }}>

        <section id="sf-ai-tools-area" className="sf-ai-tools-root" aria-label={t('aiTools')} />
      </div>
    </div>
  )
}
