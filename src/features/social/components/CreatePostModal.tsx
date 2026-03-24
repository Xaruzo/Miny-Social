import { createPortal } from 'react-dom'

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
  authUser: any
  isDarkMode: boolean
  postText: string
  setPostText: (val: string) => void
  postImageURL: string
  setPostImageURL: (val: string) => void
  postAspectRatio: string
  setPostAspectRatio: (val: string) => void
  isUploading: boolean
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onPost: () => void
}

export function CreatePostModal({
  isOpen,
  onClose,
  authUser,
  isDarkMode,
  postText,
  setPostText,
  postImageURL,
  setPostImageURL,
  postAspectRatio,
  setPostAspectRatio,
  isUploading,
  fileInputRef,
  onPost,
}: CreatePostModalProps) {
  if (!isOpen) return null

  const displayName = authUser?.displayName || 'User'

  const handleUnsupported = (feature: string) => {
    alert(`${feature} is coming soon! For now, you can share thoughts and media.`)
  }

  const aspectRatios = [
    { label: 'Original', value: 'original' },
    { label: '1:1', value: '1:1' },
    { label: '4:5', value: '4:5' },
    { label: '16:9', value: '16:9' },
    { label: '9:16', value: '9:16' },
  ]

  return createPortal(
    <div className={`modalOverlay ${isDarkMode ? 'dark' : ''}`} onClick={onClose}>
      <div className="modalContent createPostModal" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <h3 className="modalTitle">Draft your post</h3>
          <button className="modalClose" onClick={onClose}>×</button>
        </div>
        <div className="modalBody">
          <div className="modalUserInfo">
            <img 
              src={authUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`} 
              className="avatarSmall" 
              alt={displayName} 
              referrerPolicy="no-referrer"
            />
            <div className="modalUserName">
              <strong>{displayName}</strong>
              <div className="privacyBadge">
                <span>🌎 Anyone</span>
              </div>
            </div>
          </div>
          
          <textarea
            className="modalTextarea"
            placeholder={`What's on your mind, ${displayName.split(' ')[0]}?`}
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            autoFocus
          />

          {postImageURL && (
            <div className="modalMediaPreviewContainer">
              <div className="aspectRatioSelector">
                {aspectRatios.map((ratio) => (
                  <button
                    key={ratio.value}
                    className={`ratioBtn ${postAspectRatio === ratio.value ? 'active' : ''}`}
                    onClick={() => setPostAspectRatio(ratio.value)}
                  >
                    {ratio.label}
                  </button>
                ))}
              </div>
              <div className={`modalMediaPreview aspect-${postAspectRatio.replace(':', '-')}`}>
                {postImageURL.match(/\.(mp4|webm|ogg|mov)$|video\/upload/) ? (
                  <video src={postImageURL} controls />
                ) : (
                  <img src={postImageURL} alt="Preview" />
                )}
                <button 
                  className="removeMedia"
                  onClick={() => setPostImageURL('')}
                >
                  ×
                </button>
              </div>
            </div>
          )}

          <div className="composerToolbox">
            <span className="toolboxLabel">Enhance your post</span>
            <div className="toolboxActions">
              <button 
                className="toolboxBtn" 
                onClick={() => fileInputRef.current?.click()}
                title="Add Photo/Video"
              >
                <span className="btnIcon">🖼️</span>
                <span className="btnLabel">Media</span>
              </button>
              <button className="toolboxBtn" onClick={() => handleUnsupported('Tagging')} title="Tag People">
                <span className="btnIcon">👥</span>
                <span className="btnLabel">Tag</span>
              </button>
              <button className="toolboxBtn" onClick={() => handleUnsupported('Activities')} title="Feeling/Activity">
                <span className="btnIcon">😊</span>
                <span className="btnLabel">Mood</span>
              </button>
              <button className="toolboxBtn" onClick={() => handleUnsupported('Location')} title="Check In">
                <span className="btnIcon">📍</span>
                <span className="btnLabel">Place</span>
              </button>
              <button className="toolboxBtn" onClick={() => handleUnsupported('More options')} title="More">
                <span className="btnIcon">•••</span>
              </button>
            </div>
          </div>
        </div>
        <div className="modalFooter">
          <button 
            className="primary fullWidth postSubmitBtn" 
            onClick={() => {
              onPost()
              onClose()
            }}
            disabled={(!postText.trim() && !postImageURL.trim()) || isUploading}
          >
            {isUploading ? 'Uploading...' : 'Share with the world'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
