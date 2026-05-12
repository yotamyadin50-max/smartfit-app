import { useNavigate } from 'react-router-dom'

interface PageHeaderProps {
  title: string
  backTo?: string   // custom back destination, defaults to /dashboard
}

export default function PageHeader({ title, backTo = '/dashboard' }: PageHeaderProps) {
  const navigate = useNavigate()

  return (
    <header className="page-header">
      <button className="page-header-back" onClick={() => navigate(backTo)} aria-label="back">
        ←
      </button>
      <h1 className="page-header-title">{title}</h1>
      <div className="page-header-spacer" />
    </header>
  )
}
