import { createPortal } from 'react-dom'

interface ConfirmationModalProps {
  isOpen: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  isDarkMode: boolean
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isDarkMode,
}: ConfirmationModalProps) {
  if (!isOpen) return null

  return createPortal(
    <div className={`modalOverlay ${isDarkMode ? 'dark' : ''}`} onClick={onCancel}>
      <div className="modalContent" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <h3 className="modalTitle">{title}</h3>
          <button className="modalClose" onClick={onCancel}>×</button>
        </div>
        <div className="modalBody">
          <p>{message}</p>
        </div>
        <div className="modalFooter">
          <button className="secondary" onClick={onCancel}>Cancel</button>
          <button className="primary danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
