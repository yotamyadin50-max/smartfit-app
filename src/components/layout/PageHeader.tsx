import { useNavigate } from 'react-router-dom'

interface PageHeaderProps {
  title: string
  backTo?: string
}

export default function PageHeader({ title, backTo }: PageHeaderProps) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (backTo) {
      navigate(backTo)
    } else if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <header className="page-header">
      <button className="page-header-back" onClick={handleBack} aria-label="back">
        ‹
      </button>
      <h1 className="page-header-title">{title}</h1>
      <div className="page-header-spacer" />
    </header>
  )
}
