import { useEffect, useRef, useState } from 'react'
import type { User } from 'firebase/auth'
import {
  deletePost,
  subscribeComments,
  updatePost,
  type Comment,
  type Post,
} from '../../../services/socialService'
import { formatDate, formatVideoTime } from '../utils'
import { CommentItem } from './CommentItem'
import { ConfirmationModal } from './ConfirmationModal'

interface PostItemProps {
  post: Post
  currentUser: User | null
  onToggleLike: (postId: string) => void
  onAddComment: (postId: string, text: string) => void
  onViewProfile: (userId: string) => void
  isDarkMode: boolean
  playingVideoId: string | null
  setPlayingVideoId: (id: string | null) => void
}

export function PostItem({
  post,
  currentUser,
  onToggleLike,
  onAddComment,
  onViewProfile,
  isDarkMode,
  playingVideoId,
  setPlayingVideoId,
}: PostItemProps) {
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [showPostMenu, setShowPostMenu] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editText, setEditText] = useState(post.text)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
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

  useEffect(() => {
    if (playingVideoId !== post.id && isPlaying) {
      videoRef.current?.pause()
      setIsPlaying(false)
    }
  }, [playingVideoId, post.id, isPlaying])

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
      { threshold: 0.2 }
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
            referrerPolicy="no-referrer"
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
                  <div className="postMediaBlurredBg">
                    {isVideo ? (
                      <video src={post.imageURL} muted />
                    ) : (
                      <img src={post.imageURL} alt="" />
                    )}
                  </div>
                  
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

                              <div className="videoTimeInfo">
                                <span>{formatVideoTime(videoRef.current?.currentTime || 0)}</span>
                                <span> / </span>
                                <span>{formatVideoTime(duration)}</span>
                              </div>

                              <div className="videoProgressBarContainer" onClick={handleSeek}>
                                <div 
                                  className="videoProgressBar" 
                                  style={{ width: `${progress}%` }}
                                />
                              </div>

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

                              <button className="bottomControlBtn" onClick={toggleFullscreen}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                                </svg>
                              </button>

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
                referrerPolicy="no-referrer"
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
