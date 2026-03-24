import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { User } from 'firebase/auth'
import { deleteComment, updateComment, type Comment } from '../../../services/socialService'
import { formatDate } from '../utils'
import { ConfirmationModal } from './ConfirmationModal'

interface CommentItemProps {
  comment: Comment
  postId: string
  currentUser: User | null
  onViewProfile: (userId: string) => void
  isDarkMode: boolean
}

export function CommentItem({
  comment,
  postId,
  currentUser,
  onViewProfile,
  isDarkMode,
}: CommentItemProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editText, setEditText] = useState(comment.text)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const meatballsRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    const updatePosition = () => {
      const rect = meatballsRef.current?.getBoundingClientRect()
      if (!rect) return

      const isVisible = 
        rect.top < window.innerHeight && 
        rect.bottom > 0 && 
        rect.left < window.innerWidth && 
        rect.right > 0

      if (!isVisible) {
        setShowMenu(false)
      } else {
        setMenuPosition({
          top: rect.bottom + 5,
          left: rect.left + rect.width / 2,
        })
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('scroll', updatePosition, { passive: true, capture: true })
      window.addEventListener('resize', updatePosition, { passive: true })
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', updatePosition, { capture: true })
      window.removeEventListener('resize', updatePosition)
    }
  }, [showMenu])

  const isOwner = currentUser?.uid === comment.authorUid

  const handleDelete = async () => {
    try {
      await deleteComment(postId, comment.id)
    } catch (e) {
      console.error('Delete comment failed', e)
    }
    setShowDeleteModal(false)
  }

  const handleUpdate = async () => {
    try {
      await updateComment(postId, comment.id, editText)
      setIsEditing(false)
    } catch (e) {
      console.error('Update comment failed', e)
    }
  }

  const handleToggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation()
    const rect = meatballsRef.current?.getBoundingClientRect()
    if (rect) {
      setMenuPosition({
        top: rect.bottom + 5,
        left: rect.left + rect.width / 2,
      })
    }
    setShowMenu(!showMenu)
  }

  return (
    <div className="commentItem">
      <img
        src={
          comment.authorPhotoURL ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.authorName)}`
        }
        alt={comment.authorName}
        className="avatarSmall"
        style={{ cursor: 'pointer' }}
        onClick={() => onViewProfile(comment.authorUid)}
        referrerPolicy="no-referrer"
      />
      <div className="commentBubbleWrapper">
        <div className="commentBubble">
          <strong
            style={{ cursor: 'pointer' }}
            onClick={() => onViewProfile(comment.authorUid)}
          >
            {comment.authorName}
          </strong>
          {isEditing ? (
            <div className="editCommentContainer">
              <input
                type="text"
                className="inputLine"
                value={editText}
                maxLength={500}
                onChange={(e) => setEditText(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpdate()
                  if (e.key === 'Escape') setIsEditing(false)
                }}
              />
              <div className="row" style={{ marginTop: '4px', gap: '8px' }}>
                <small style={{ cursor: 'pointer', color: 'var(--primary)', fontWeight: 700 }} onClick={handleUpdate}>Save</small>
                <small style={{ cursor: 'pointer', fontWeight: 600 }} onClick={() => setIsEditing(false)}>Cancel</small>
              </div>
            </div>
          ) : (
            <p>{comment.text}</p>
          )}
        </div>
        <div className="commentActions">
          <small>{formatDate(comment.createdAtMs)}</small>
          {isOwner && !isEditing && (
            <button
              ref={meatballsRef}
              className="commentMeatballs"
              onClick={handleToggleMenu}
            >
              •••
            </button>
          )}
        </div>
      </div>

      {showMenu && createPortal( 
        <div 
          className={`commentDropdown portalDropdown ${isDarkMode ? 'dark' : ''}`} 
          ref={menuRef} 
          style={{ 
            position: 'fixed', 
            top: `${menuPosition.top}px`, 
            left: `${menuPosition.left}px`, 
            transform: 'translateX(-50%)', 
            margin: 0,
          }} 
        > 
          <button className="dropdownItem" onClick={(e) => { e.stopPropagation(); setIsEditing(true); setShowMenu(false); }}> 
            Edit 
          </button> 
          <button className="dropdownItem danger" onClick={(e) => { e.stopPropagation(); setShowDeleteModal(true); setShowMenu(false); }}> 
            Delete 
          </button> 
        </div>, 
        document.body 
      )}

      <ConfirmationModal
        isOpen={showDeleteModal}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
        isDarkMode={isDarkMode}
      />
    </div>
  )
}
