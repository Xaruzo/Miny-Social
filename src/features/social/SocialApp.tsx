import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { User } from 'firebase/auth'
import {
  acceptFriendRequest,
  addCommentV2,
  createPost,
  deletePost,
  deleteComment,
  rejectFriendRequest,
  sendFriendRequest,
  sendMessage,
  signInGuest,
  signInWithGoogle,
  signOutNow,
  subscribeAuth,
  subscribeComments,
  subscribeFeed,
  subscribeFriends,
  subscribeIncomingFriendRequests,
  subscribeMessages,
  subscribeOutgoingFriendRequests,
  subscribePeople,
  toggleLikeV2,
  updateBio,
  updatePost,
  updateComment,
  uploadToCloudinary,
  type AppUser,
  type Comment,
  type Friend,
  type FriendRequest,
  type Message,
  type Post,
  upsertCurrentUserProfile,
} from '../../services/socialService'
import { auth, db } from '../../firebase'

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString()
}

function formatVideoTime(seconds: number): string {
  if (isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function ConfirmationModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isDarkMode,
}: {
  isOpen: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  isDarkMode: boolean
}) {
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

function CreatePostModal({
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
}: {
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
}) {
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

function CommentItem({
  comment,
  postId,
  currentUser,
  onViewProfile,
  isDarkMode,
}: {
  comment: Comment
  postId: string
  currentUser: User | null
  onViewProfile: (userId: string) => void
  isDarkMode: boolean
}) {
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

      // Check if the meatballs button is still visible in the viewport
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
      // Listen to scroll and resize events in the capture phase to catch scrolls in any container
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
                <small style={{ cursor: 'pointer', color: 'var(--fb-blue)' }} onClick={handleUpdate}>Save</small>
                <small style={{ cursor: 'pointer' }} onClick={() => setIsEditing(false)}>Cancel</small>
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

function PostItem({
  post,
  currentUser,
  onToggleLike,
  onAddComment,
  onViewProfile,
  isDarkMode,
  playingVideoId,
  setPlayingVideoId,
}: {
  post: Post
  currentUser: User | null
  onToggleLike: (postId: string) => void
  onAddComment: (postId: string, text: string) => void
  onViewProfile: (userId: string) => void
  isDarkMode: boolean
  playingVideoId: string | null
  setPlayingVideoId: (id: string | null) => void
}) {
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [showPostMenu, setShowPostMenu] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editText, setEditText] = useState(post.text)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1) // Default to full volume
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedQuality, setSelectedQuality] = useState('Auto')
  const postMenuRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (showComments) {
      return subscribeComments(post.id, setComments)
    }
  }, [showComments, post.id])

  // 1. Sync with global playingVideoId
  useEffect(() => {
    if (playingVideoId !== post.id && isPlaying) {
      videoRef.current?.pause()
      setIsPlaying(false)
    }
  }, [playingVideoId, post.id, isPlaying])

  // 2. Scroll-to-pause logic using IntersectionObserver
  useEffect(() => {
    if (!videoContainerRef.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && isPlaying) {
          videoRef.current?.pause()
          setIsPlaying(false)
          if (playingVideoId === post.id) {
            setPlayingVideoId(null)
          }
        }
      },
      { threshold: 0.2 } // Pause when less than 20% visible
    )

    observer.observe(videoContainerRef.current)
    return () => observer.disconnect()
  }, [isPlaying, playingVideoId, post.id, setPlayingVideoId])

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
      setPlayingVideoId(null)
    } else {
      videoRef.current.play()
      setPlayingVideoId(post.id)
    }
  }

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!videoRef.current) return
    const newMuted = !isMuted
    videoRef.current.muted = newMuted
    setIsMuted(newMuted)
  }

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!videoContainerRef.current) return
    
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`)
      })
    } else {
      document.exitFullscreen()
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    if (!videoRef.current) return
    const newVolume = parseFloat(e.target.value)
    videoRef.current.volume = newVolume
    setVolume(newVolume)
    if (newVolume === 0) {
      videoRef.current.muted = true
      setIsMuted(true)
    } else {
      videoRef.current.muted = false
      setIsMuted(false)
    }
  }

  const handleProgress = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime
      const total = videoRef.current.duration
      setProgress((current / total) * 100)
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    if (!videoRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    videoRef.current.currentTime = percentage * videoRef.current.duration
  }

  const handleVideoState = () => {
    if (videoRef.current) {
      setIsPlaying(!videoRef.current.paused)
      setDuration(videoRef.current.duration)
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (postMenuRef.current && !postMenuRef.current.contains(event.target as Node)) {
        setShowPostMenu(false)
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isLiked = currentUser ? post.likes?.includes(currentUser.uid) : false
  const isOwner = currentUser?.uid === post.authorUid

  const handleDelete = async () => {
    try {
      await deletePost(post.id)
    } catch (e) {
      console.error('Delete failed', e)
    }
    setShowDeleteModal(false)
  }

  const handleUpdate = async () => {
    try {
      await updatePost(post.id, editText)
      setIsEditing(false)
    } catch (e) {
      console.error('Update failed', e)
    }
  }

  return (
    <article className="post">
      <div className="postHeader">
        <div className="postMeta">
          <img
            src={
              post.authorPhotoURL ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName)}`
            }
            alt={post.authorName}
            className="avatarMedium"
            style={{ cursor: 'pointer' }}
            onClick={() => onViewProfile(post.authorUid)}
          />
          <div>
            <strong
              style={{ cursor: 'pointer' }}
              onClick={() => onViewProfile(post.authorUid)}
            >
              {post.authorName}
            </strong>{' '}
            · {formatDate(post.createdAtMs)}
          </div>
        </div>
        
        {isOwner && (
          <div className="postMenuWrapper" ref={postMenuRef}>
            <button className="meatballsBtn" onClick={() => setShowPostMenu(!showPostMenu)}>
              •••
            </button>
            {showPostMenu && (
              <div className="postDropdown">
                <button className="dropdownItem" onClick={() => { setIsEditing(true); setShowPostMenu(false); }}>
                  ✏️ Edit Post
                </button>
                <button className="dropdownItem danger" onClick={() => { setShowDeleteModal(true); setShowPostMenu(false); }}>
                  🗑️ Delete Post
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={showDeleteModal}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
        isDarkMode={isDarkMode}
      />

      <div className="postContent">
        {isEditing ? (
          <div className="editPostContainer">
            <textarea
              className="inputText"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
            />
            <div className="row" style={{ marginTop: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setIsEditing(false)}>Cancel</button>
              <button className="primary" onClick={handleUpdate}>Save</button>
            </div>
          </div>
        ) : (
          <>
            {post.text && <p>{post.text}</p>}
            {post.imageURL && (() => {
              const isVideo = post.imageURL.match(/\.(mp4|webm|ogg|mov)$|video\/upload/)
              return (
                <div className={`postMediaWrapper aspect-${(post.aspectRatio || 'original').replace(':', '-')}`}>
                  {/* Blurred Background Layer - Always show for modern look */}
                  <div className="postMediaBlurredBg">
                    {isVideo ? (
                      <video src={post.imageURL} muted />
                    ) : (
                      <img src={post.imageURL} alt="" />
                    )}
                  </div>
                  
                  {/* Main Media Layer */}
                  <div className="postMediaMain" onClick={isVideo ? togglePlay : undefined}>
                    {isVideo ? (
                      <div className="videoContainer" ref={videoContainerRef}>
                        <video 
                          ref={videoRef}
                          src={post.imageURL} 
                          controls={false}
                          loop
                          onPlay={handleVideoState}
                          onPause={handleVideoState}
                          onTimeUpdate={handleProgress}
                          onLoadedMetadata={handleVideoState}
                          onEnded={() => {
                            if (videoRef.current) {
                              videoRef.current.play()
                            }
                            setIsPlaying(true)
                          }}
                          muted={isMuted}
                        />
                        <div className={`videoControlsOverlay ${isPlaying ? 'playing' : 'paused'}`}>
                          <div className="videoPlayOverlay">
                            <span className="playIcon centerPlayIcon">
                              {!isPlaying && (
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              )}
                            </span>
                          </div>

                          <div className="videoControlsBottom" onClick={(e) => e.stopPropagation()}>
                            <div className="bottomControlsRow">
                              {/* 1. Play/Pause */}
                              <button className="bottomControlBtn" onClick={togglePlay}>
                                {isPlaying ? (
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                                    <rect x="6" y="4" width="4" height="16" />
                                    <rect x="14" y="4" width="4" height="16" />
                                  </svg>
                                ) : (
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                )}
                              </button>

                              {/* 2. Time Info */}
                              <div className="videoTimeInfo">
                                <span>{formatVideoTime(videoRef.current?.currentTime || 0)}</span>
                                <span> / </span>
                                <span>{formatVideoTime(duration)}</span>
                              </div>

                              {/* 3. Progress Bar */}
                              <div className="videoProgressBarContainer" onClick={handleSeek}>
                                <div 
                                  className="videoProgressBar" 
                                  style={{ width: `${progress}%` }}
                                />
                              </div>

                              {/* 4. Settings */}
                              <div className="videoSettingsWrapper" ref={settingsRef}>
                                <button 
                                  className={`bottomControlBtn ${showSettings ? 'active' : ''}`} 
                                  onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }}
                                >
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                                    <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.81,11.69,4.81,12.01c0,0.31,0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
                                  </svg>
                                </button>
                                {showSettings && (
                                  <div className="qualityMenu" onClick={(e) => e.stopPropagation()}>
                                    <div className="qualityMenuHeader">Quality</div>
                                    {['Auto', '1080p', '720p', '480p'].map(q => (
                                      <button 
                                        key={q} 
                                        className={`qualityItem ${selectedQuality === q ? 'selected' : ''}`}
                                        onClick={() => { setSelectedQuality(q); setShowSettings(false); }}
                                      >
                                        {q}
                                        {selectedQuality === q && <span className="checkIcon">✓</span>}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* 5. Fullscreen */}
                              <button className="bottomControlBtn" onClick={toggleFullscreen}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                                </svg>
                              </button>

                              {/* 6. Volume/Audio Slider */}
                              <div className="volumeControlGroup">
                                <div className="volumeSliderContainer">
                                  <input 
                                    type="range" 
                                    className="volumeSlider"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={isMuted ? 0 : volume}
                                    onChange={handleVolumeChange}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ '--volume-percent': `${(isMuted ? 0 : volume) * 100}%` } as any}
                                  />
                                </div>
                                <button className="bottomControlBtn" onClick={toggleMute}>
                                  {isMuted || volume === 0 ? (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.38.28-.81.52-1.25.68v2.09c1.05-.22 2.02-.66 2.88-1.27l2.85 2.85L21 20.72 4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                                    </svg>
                                  ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={post.imageURL}
                        alt="Post content"
                      />
                    )}
                  </div>
                </div>
              )
            })()}
          </>
        )}
      </div>
      <div className="postActions">
        <button
          className={isLiked ? 'primary' : ''}
          onClick={() => onToggleLike(post.id)}
          disabled={!currentUser}
        >
          {isLiked ? '❤️' : '🤍'} {post.likes?.length || 0}
        </button>
        <button onClick={() => setShowComments(!showComments)}>
          💬 {post.commentCount || 0} Comments
        </button>
      </div>

      {showComments && (
        <div className="commentSection">
          {comments.length > 0 && (
            <div className="commentList">
              {comments.map((c) => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  postId={post.id}
                  currentUser={currentUser}
                  onViewProfile={onViewProfile}
                  isDarkMode={isDarkMode}
                />
              ))}
            </div>
          )}
          {currentUser && (
            <div className="commentInput">
              <img
                src={
                  currentUser.photoURL ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'User')}`
                }
                alt={currentUser.displayName || 'User'}
                className="avatarComment"
              />
              <input
                type="text"
                placeholder="Write a comment..."
                value={commentText}
                maxLength={500}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && commentText.trim()) {
                    onAddComment(post.id, commentText)
                    setCommentText('')
                  }
                }}
              />
            </div>
          )}
        </div>
      )}
    </article>
  )
}

export default function SocialApp() {
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [people, setPeople] = useState<AppUser[]>([])
  const [friends, setFriends] = useState<Friend[]>([])
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [activeChatUser, setActiveChatUser] = useState<AppUser | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [peopleSearch, setPeopleSearch] = useState('')
  const [postText, setPostText] = useState('')
  const [postImageURL, setPostImageURL] = useState('')
  const [postAspectRatio, setPostAspectRatio] = useState('original')
  const [messageText, setMessageText] = useState('')
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null)
  const [isEditingBio, setIsEditingBio] = useState(false)
  const [bioText, setBioText] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showCreatePostModal, setShowCreatePostModal] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark')
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!auth || !db) {
    return (
      <div className="socialShell" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center', padding: '20px' }}>
        <h1>⚠️ Configuration Missing</h1>
        <p>Firebase environment variables are not set. Please create an <strong>.env</strong> file in the root directory using <strong>.env.example</strong> as a template.</p>
        <div style={{ marginTop: '20px', background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #dee2e6', textAlign: 'left', maxWidth: '500px' }}>
          <code>
            VITE_FIREBASE_API_KEY=your_key<br/>
            VITE_FIREBASE_AUTH_DOMAIN=...<br/>
            VITE_FIREBASE_PROJECT_ID=...
          </code>
        </div>
      </div>
    )
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  useEffect(() => subscribeAuth(setAuthUser), [])

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  useEffect(() => {
    if (!authUser) return
    upsertCurrentUserProfile(authUser).catch((e) => {
      setError(e instanceof Error ? e.message : 'Failed to save profile')
    })
  }, [authUser])

  useEffect(() => subscribeFeed(setPosts), [])

  useEffect(() => {
    if (!authUser) return
    return subscribePeople(authUser.uid, setPeople)
  }, [authUser])

  useEffect(() => {
    if (!authUser) return
    return subscribeFriends(authUser.uid, setFriends)
  }, [authUser])

  useEffect(() => {
    if (!authUser) return
    return subscribeIncomingFriendRequests(authUser.uid, setIncomingRequests)
  }, [authUser])

  useEffect(() => {
    if (!authUser) return
    return subscribeOutgoingFriendRequests(authUser.uid, setOutgoingRequests)
  }, [authUser])

  useEffect(() => {
    if (!authUser || !activeChatUser) {
      setMessages([])
      return
    }
    return subscribeMessages(authUser.uid, activeChatUser.uid, setMessages)
  }, [authUser, activeChatUser])

  const displayName = useMemo(() => {
    if (!authUser) return ''
    return authUser.displayName || authUser.email || 'Guest User'
  }, [authUser])

  const currentProfile = useMemo<AppUser | null>(() => {
    if (!authUser) return null
    return {
      uid: authUser.uid,
      displayName,
      photoURL: authUser.photoURL || '',
      email: authUser.email || '',
      createdAtMs: Date.now(),
    }
  }, [authUser, displayName])

  const friendUidSet = useMemo(() => new Set(friends.map((f) => f.uid)), [friends])
  const incomingByFromUid = useMemo(
    () => new Map(incomingRequests.map((r) => [r.fromUid, r])),
    [incomingRequests],
  )
  const outgoingToUidSet = useMemo(
    () => new Set(outgoingRequests.map((r) => r.toUid)),
    [outgoingRequests],
  )

  const visiblePeople = useMemo(() => {
    const q = peopleSearch.trim().toLowerCase()
    if (!q) return []
    return people.filter((p) => `${p.displayName} ${p.email}`.toLowerCase().includes(q))
  }, [people, peopleSearch])

  const postsToShow = useMemo(() => {
    if (selectedUser) {
      return posts.filter(p => p.authorUid === selectedUser.uid)
    }
    return posts
  }, [posts, selectedUser])

  const suggestedPeople = useMemo(() => {
    return people
      .filter(
        (p) =>
          !friendUidSet.has(p.uid) &&
          !incomingByFromUid.has(p.uid) &&
          !outgoingToUidSet.has(p.uid),
      )
      .slice(0, 5)
  }, [people, friendUidSet, incomingByFromUid, outgoingToUidSet])

  async function onGoogleLogin() {
    setError(null)
    setBusy(true)
    try {
      await signInWithGoogle()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  async function onGuestLogin() {
    setError(null)
    setBusy(true)
    try {
      await signInGuest()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Guest sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  async function onPost() {
    if (!authUser) return
    setError(null)
    try {
      await createPost({
        authorUid: authUser.uid,
        authorName: displayName,
        authorPhotoURL: authUser.photoURL || '',
        text: postText,
        imageURL: postImageURL,
        aspectRatio: postAspectRatio,
      })
      setPostText('')
      setPostImageURL('')
      setPostAspectRatio('original')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create post')
    }
  }

  async function onToggleLike(postId: string) {
    if (!authUser) return
    try {
      await toggleLikeV2(postId, authUser.uid)
    } catch (e) {
      console.error('Like failed', e)
    }
  }

  async function onAddComment(postId: string, text: string) {
    if (!authUser) return
    try {
      await addCommentV2({
        postId,
        authorUid: authUser.uid,
        authorName: displayName,
        authorPhotoURL: authUser.photoURL || '',
        text,
      })
    } catch (e) {
      console.error('Comment failed', e)
    }
  }

  async function onUpdateBio() {
    if (!authUser) return
    try {
      await updateBio(authUser.uid, bioText)
      setIsEditingBio(false)
      // Refresh local selectedUser if it's the current user
      if (selectedUser?.uid === authUser.uid) {
        setSelectedUser(prev => prev ? { ...prev, bio: bioText } : null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update bio')
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    uploadFile(file)
  }

  async function uploadFile(file: File) {
    setIsUploading(true)
    setError(null)
    // Automatically open the modal when a file is chosen or dropped
    setShowCreatePostModal(true)
    try {
      const url = await uploadToCloudinary(file)
      setPostImageURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to upload file')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files?.[0]
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      uploadFile(file)
    }
  }

  function onViewProfile(userId: string) {
    const user = people.find(p => p.uid === userId) || (authUser?.uid === userId ? currentProfile : null)
    if (user) {
      setSelectedUser(user)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }



  async function onAddFriend(user: AppUser) {
    if (!authUser) return
    setError(null)
    try {
      await sendFriendRequest({
        fromUid: authUser.uid,
        fromName: displayName,
        fromPhotoURL: authUser.photoURL || '',
        toUid: user.uid,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send friend request')
    }
  }

  async function onAcceptRequest(request: FriendRequest) {
    if (!currentProfile) return
    const fromUser = people.find((p) => p.uid === request.fromUid)
    if (!fromUser) {
      setError('Unable to find requester profile')
      return
    }
    setError(null)
    try {
      await acceptFriendRequest({
        request,
        currentUser: currentProfile,
        fromUser,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to accept request')
    }
  }

  async function onRejectRequest(requestId: string) {
    setError(null)
    try {
      await rejectFriendRequest(requestId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reject request')
    }
  }

  async function onSendMessage() {
    if (!authUser || !activeChatUser) return
    setError(null)
    try {
      await sendMessage({
        fromUid: authUser.uid,
        fromName: displayName,
        fromPhotoURL: authUser.photoURL || '',
        toUid: activeChatUser.uid,
        text: messageText,
      })
      setMessageText('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send message')
    }
  }

  async function onLogout() {
    setError(null)
    try {
      await signOutNow()
      setActiveChatUser(null)
      setMessages([])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Logout failed')
    }
  }

  return (
    <div className={`socialShell ${isDarkMode ? 'dark' : ''}`}>
      <header className="fbTopbar">
        <div className="topbarLeft">
          <div className="socialTitle" onClick={() => setSelectedUser(null)} style={{ cursor: 'pointer' }}>Miny Social</div>
          <div className="searchContainer">
            <input
              className="searchBar"
              value={peopleSearch}
              onChange={(e) => {
                setPeopleSearch(e.target.value)
                setShowSearchResults(true)
              }}
              onFocus={() => setShowSearchResults(true)}
              placeholder="Search people"
              disabled={!authUser}
            />
            {showSearchResults && visiblePeople.length > 0 && (
              <div className="searchResults">
                {visiblePeople.map((p) => (
                  <button
                    key={p.uid}
                    className="searchResultItem"
                    onClick={() => {
                      setSelectedUser(p)
                      setPeopleSearch('')
                      setShowSearchResults(false)
                    }}
                  >
                    <img src={p.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.displayName)}`} alt={p.displayName} className="avatarXSmall" />
                    <div className="networkItemInfo">
                      <div className="personName">{p.displayName}</div>
                      <div className="hint">{p.email}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {!authUser ? (
          <div className="topbarActions">
            <button className="primary" disabled={busy} onClick={onGoogleLogin}>
              Sign in with Google
            </button>
            <button disabled={busy} onClick={onGuestLogin}>
              Continue as Guest
            </button>
          </div>
        ) : (
          <div className="topbarActions" ref={menuRef}>
            <div className="userBadge" onClick={() => setShowProfileMenu(!showProfileMenu)}>
              <img src={authUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`} alt={displayName} className="avatarXSmall" />
              <span>{displayName}</span>
            </div>
            
            {showProfileMenu && (
              <div className="profileDropdown">
                <div className="dropdownHeader">
                  <div className="networkItemName">{displayName}</div>
                  <div className="networkItemSub">{authUser.email}</div>
                </div>
                
                <button 
                  className="dropdownItem" 
                  onClick={() => {
                    onViewProfile(authUser.uid)
                    setShowProfileMenu(false)
                  }}
                >
                  👤 View Profile
                </button>
                
                <div className="dropdownDivider"></div>
                
                <div className="dropdownItem" onClick={() => setIsDarkMode(!isDarkMode)}>
                  <div className="toggleWrapper">
                    <span>🌙 Dark Mode</span>
                    <label className="toggleSwitch" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={isDarkMode} 
                        onChange={(e) => setIsDarkMode(e.target.checked)} 
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
                
                <div className="dropdownDivider"></div>
                
                <button className="dropdownItem" onClick={onLogout}>
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {error ? (
        <div className="alert" role="alert">
          {error}
        </div>
      ) : null}

      <main className="fbLayout">
        <section className="leftRail">
          <h2 className="cardTitle">Your Network</h2>
          
          <h3 className="sectionTitle">Friends</h3>
          {friends.length === 0 ? (
            <div className="hint">No friends yet.</div>
          ) : (
            <div className="networkList">
              {friends.map((f) => (
                <div key={f.uid} className="networkItem" onClick={() => onViewProfile(f.uid)}>
                  <img src={f.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.displayName)}`} className="avatarSmall" alt={f.displayName} />
                  <div className="networkItemInfo">
                    <div className="networkItemName">{f.displayName}</div>
                    <div className="networkItemSub">Friend</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h3 className="sectionTitle">Suggested People</h3>
          {suggestedPeople.length === 0 ? (
            <div className="hint">No suggestions.</div>
          ) : (
            <div className="networkList">
              {suggestedPeople.map((p) => (
                <div key={p.uid} className="networkItem">
                  <img 
                    src={p.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.displayName)}`} 
                    className="avatarSmall" 
                    alt={p.displayName}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onViewProfile(p.uid)}
                  />
                  <div className="networkItemInfo">
                    <div 
                      className="networkItemName" 
                      style={{ cursor: 'pointer' }}
                      onClick={() => onViewProfile(p.uid)}
                    >
                      {p.displayName}
                    </div>
                    <div className="row" style={{ marginTop: '4px', gap: '0.5rem' }}>
                      <button 
                        className="primary" 
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                        onClick={() => onAddFriend(p)}
                      >
                        Add Friend
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="centerFeed">
          {selectedUser ? (
            <div className="profileView">
              <div className="profileCover"></div>
              <div className="profileHeaderInfo">
                <div className="profileAvatarWrapper">
                  <img 
                    src={selectedUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.displayName)}`} 
                    alt={selectedUser.displayName} 
                    className="avatarLarge" 
                  />
                </div>
                <h2 className="profileName">{selectedUser.displayName}</h2>
                <div className="profileBio">
                  {selectedUser.bio || "No bio yet."}
                </div>
                
                <div className="profileActions">
                  {authUser?.uid === selectedUser.uid ? (
                    isEditingBio ? (
                      <div className="row">
                        <input
                          type="text"
                          className="inputLine"
                          placeholder="Tell us about yourself..."
                          value={bioText}
                          onChange={(e) => setBioText(e.target.value)}
                        />
                        <button className="primary" onClick={onUpdateBio}>Save</button>
                        <button onClick={() => setIsEditingBio(false)}>Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => {
                        setIsEditingBio(true)
                        setBioText(selectedUser.bio || '')
                      }}>Edit Bio</button>
                    )
                  ) : (
                    <>
                      {friendUidSet.has(selectedUser.uid) ? (
                        <button disabled>Friends</button>
                      ) : (
                        <button className="primary" onClick={() => onAddFriend(selectedUser)}>Add Friend</button>
                      )}
                      <button onClick={() => setActiveChatUser(selectedUser)}>Message</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {!authUser ? (
                <div className="hint">Sign in to post.</div>
              ) : (
                <>
                  <div 
                    className="composerTriggerCard" 
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <div className="composerTriggerRow">
                      <img 
                        src={authUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`} 
                        className="avatarSmall" 
                        alt={displayName} 
                        style={{ cursor: 'pointer' }}
                        onClick={() => onViewProfile(authUser.uid)}
                      />
                      <div className="composerTriggerInput" onClick={() => setShowCreatePostModal(true)}>
                        What's on your mind, {displayName.split(' ')[0]}?
                      </div>
                    </div>
                  <div className="composerTriggerDivider" />
                  <div className="composerTriggerActions">
                    <button className="composerTriggerBtn" onClick={(e) => {
                      e.stopPropagation()
                      fileInputRef.current?.click()
                    }}>
                      <span className="icon">🖼️</span> Photo/Video
                    </button>
                      <button className="composerTriggerBtn">
                        <span className="icon">👥</span> Tag Friends
                      </button>
                      <button className="composerTriggerBtn">
                        <span className="icon">😊</span> Feeling/Activity
                      </button>
                    </div>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*,video/*"
                    style={{ display: 'none' }}
                  />
                </>
              )}

              <CreatePostModal
        isOpen={showCreatePostModal}
        onClose={() => setShowCreatePostModal(false)}
        authUser={authUser}
        isDarkMode={isDarkMode}
        postText={postText}
        setPostText={setPostText}
        postImageURL={postImageURL}
        setPostImageURL={setPostImageURL}
        postAspectRatio={postAspectRatio}
        setPostAspectRatio={setPostAspectRatio}
        isUploading={isUploading}
        fileInputRef={fileInputRef}
        onPost={onPost}
      />
            </>
          )}

          <h2 className="cardTitle centerFeedTitle">
            {selectedUser ? `${selectedUser.displayName}'s posts` : "Feed"}
          </h2>
          {postsToShow.length === 0 ? (
            <div className="hint">No posts yet.</div>
          ) : (
            <div className="list">
              {postsToShow.map((p) => (
                <PostItem
                  key={p.id}
                  post={p}
                  currentUser={authUser}
                  onToggleLike={onToggleLike}
                  onAddComment={onAddComment}
                  onViewProfile={onViewProfile}
                  isDarkMode={isDarkMode}
                  playingVideoId={playingVideoId}
                  setPlayingVideoId={setPlayingVideoId}
                />
              ))}
            </div>
          )}
        </section>

        <section className="rightRail">
          <div className="messengerWrapper">
            <div className="messengerHeader">
              {activeChatUser ? (
                <>
                  <img 
                    src={activeChatUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeChatUser.displayName)}`} 
                    className="avatarSmall" 
                    alt={activeChatUser.displayName}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onViewProfile(activeChatUser.uid)}
                  />
                  <div 
                    style={{ fontWeight: 700, cursor: 'pointer' }}
                    onClick={() => onViewProfile(activeChatUser.uid)}
                  >
                    {activeChatUser.displayName}
                  </div>
                </>
              ) : (
                <div style={{ fontWeight: 700 }}>Messenger</div>
              )}
            </div>

            {!authUser ? (
              <div className="chatBox">
                <div className="hint">Sign in to chat.</div>
              </div>
            ) : !activeChatUser ? (
              <div className="chatBox">
                <div className="hint">Select a friend or user to start chatting.</div>
                <h4 className="sectionTitle" style={{ margin: '1rem 0' }}>Contacts</h4>
                <div className="networkList">
                  {people.map(p => (
                    <button key={p.uid} className="networkItem" onClick={() => setActiveChatUser(p)}>
                      <img src={p.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.displayName)}`} className="avatarSmall" alt={p.displayName} />
                      <div className="networkItemInfo">
                        <div className="networkItemName">{p.displayName}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="chatBox">
                  {messages.length === 0 ? (
                    <div className="hint">Start of your conversation with {activeChatUser.displayName}</div>
                  ) : (
                    messages.map((m) => (
                      <div
                        key={m.id}
                        className={`msgWrapper ${m.fromUid === authUser.uid ? 'mine' : 'theirs'}`}
                      >
                        {m.fromUid !== authUser.uid && (
                          <img 
                            src={m.fromPhotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.fromName)}`} 
                            className="avatarXSmall" 
                            alt={m.fromName} 
                            style={{ cursor: 'pointer' }}
                            onClick={() => onViewProfile(m.fromUid)}
                          />
                        )}
                        <div className="msgContainer">
                          {m.fromUid !== authUser.uid && <div className="msgAuthor">{m.fromName}</div>}
                          <div className="msg">
                            <div>{m.text}</div>
                            <div className="msgMeta">
                              {formatDate(m.createdAtMs)}
                            </div>
                          </div>
                        </div>
                        {m.fromUid === authUser.uid && (
                          <img 
                            src={m.fromPhotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.fromName)}`} 
                            className="avatarXSmall" 
                            alt={m.fromName} 
                            style={{ cursor: 'pointer' }}
                            onClick={() => onViewProfile(m.fromUid)}
                          />
                        )}
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="messengerInputRow">
                  <input
                    className="inputLine"
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Aa"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && messageText.trim()) onSendMessage()
                    }}
                  />
                  <button
                    className="primary"
                    style={{ padding: '6px 12px' }}
                    onClick={onSendMessage}
                    disabled={!messageText.trim()}
                  >
                    Send
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="card" style={{ marginTop: '1.5rem', flexShrink: 0 }}>
            <h2 className="cardTitle">Friend Requests</h2>
            {incomingRequests.length === 0 ? (
              <div className="hint">No requests.</div>
            ) : (
              <div className="networkList">
                {incomingRequests.map((r) => (
                  <div key={r.id} className="networkItem">
                    <img 
                      src={r.fromPhotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.fromName)}`} 
                      className="avatarSmall" 
                      alt={r.fromName}
                      style={{ cursor: 'pointer' }}
                      onClick={() => onViewProfile(r.fromUid)}
                    />
                    <div className="networkItemInfo">
                      <div className="networkItemName">{r.fromName}</div>
                      <div className="row" style={{ marginTop: '4px' }}>
                        <button className="primary" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => onAcceptRequest(r)}>Confirm</button>
                        <button style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => onRejectRequest(r.id)}>Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

