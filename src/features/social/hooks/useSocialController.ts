import { useEffect, useMemo, useRef, useState } from 'react'
import type { User } from 'firebase/auth'
import {
  acceptFriendRequest,
  addCommentV2,
  createPost,
  rejectFriendRequest,
  sendFriendRequest,
  sendMessage,
  conversationId,
  signInGuest,
  signInWithGoogle,
  signOutNow,
  subscribeAuth,
  subscribeFeed,
  subscribeFriends,
  subscribeIncomingFriendRequests,
  subscribeMessages,
  subscribeOutgoingFriendRequests,
  subscribePeople,
  toggleLikeV2,
  unsendForEveryone,
  unsendForMe,
  updateBio,
  uploadToCloudinary,
  upsertCurrentUserProfile,
  type AppUser,
  type Friend,
  type FriendRequest,
  type Message,
  type Post,
} from '../../../services/socialService'

export function useSocialController() {
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
  const [currentPage, setCurrentPage] = useState<'feed' | 'messenger'>('feed')
  
  const chatEndRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  async function onUnsendEveryone(messageId: string) {
    if (!authUser || !activeChatUser) return
    try {
      const convoId = conversationId(authUser.uid, activeChatUser.uid)
      await unsendForEveryone(convoId, messageId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to unsend message')
    }
  }

  async function onUnsendForMe(messageId: string) {
    if (!authUser || !activeChatUser) return
    try {
      const convoId = conversationId(authUser.uid, activeChatUser.uid)
      await unsendForMe(convoId, messageId, authUser.uid)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete message')
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

  return {
    authUser,
    people,
    friends,
    incomingRequests,
    posts,
    activeChatUser,
    setActiveChatUser,
    messages,
    onUnsendEveryone,
    onUnsendForMe,
    peopleSearch,
    setPeopleSearch,
    postText,
    setPostText,
    postImageURL,
    setPostImageURL,
    postAspectRatio,
    setPostAspectRatio,
    messageText,
    setMessageText,
    selectedUser,
    setSelectedUser,
    isEditingBio,
    setIsEditingBio,
    bioText,
    setBioText,
    isUploading,
    busy,
    error,
    showSearchResults,
    setShowSearchResults,
    showProfileMenu,
    setShowProfileMenu,
    showCreatePostModal,
    setShowCreatePostModal,
    isDarkMode,
    setIsDarkMode,
    playingVideoId,
    setPlayingVideoId,
    currentPage,
    setCurrentPage,
    chatEndRef,
    menuRef,
    fileInputRef,
    displayName,
    currentProfile,
    friendUidSet,
    visiblePeople,
    postsToShow,
    suggestedPeople,
    onGoogleLogin,
    onGuestLogin,
    onPost,
    onToggleLike,
    onAddComment,
    onUpdateBio,
    handleFileChange,
    handleDragOver,
    handleDrop,
    onViewProfile,
    onAddFriend,
    onAcceptRequest,
    onRejectRequest,
    onSendMessage,
    onLogout,
  }
}
