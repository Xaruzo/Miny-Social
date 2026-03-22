import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { auth, db } from '../firebase'

export type AppUser = {
  uid: string
  displayName: string
  photoURL: string
  email: string
  bio?: string
  createdAtMs: number
}

export type Post = {
  id: string
  authorUid: string
  authorName: string
  authorPhotoURL?: string
  text: string
  imageURL?: string
  likes: string[] // array of user uids
  commentCount: number
  createdAtMs: number
}

export type Comment = {
  id: string
  authorUid: string
  authorName: string
  authorPhotoURL?: string
  text: string
  createdAtMs: number
}

export type Message = {
  id: string
  fromUid: string
  fromName: string
  fromPhotoURL?: string
  toUid: string
  text: string
  createdAtMs: number
}

export type FriendRequest = {
  id: string
  fromUid: string
  toUid: string
  fromName: string
  fromPhotoURL?: string
  createdAtMs: number
}

export type Friend = {
  uid: string
  displayName: string
  photoURL: string
  email: string
  addedAtMs: number
}

export function subscribeAuth(cb: (u: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, cb)
}

export async function signInWithGoogle(): Promise<void> {
  await signInWithPopup(auth, new GoogleAuthProvider())
}

export async function signInGuest(): Promise<void> {
  await signInAnonymously(auth)
}

export async function signOutNow(): Promise<void> {
  await signOut(auth)
}

function toPublicProfile(user: User): AppUser {
  return {
    uid: user.uid,
    displayName: user.displayName || 'Guest User',
    photoURL: user.photoURL || '',
    email: user.email || '',
    createdAtMs: Date.now(),
  }
}

export async function upsertCurrentUserProfile(user: User): Promise<void> {
  const profile = toPublicProfile(user)
  await setDoc(doc(db, 'users', user.uid), profile, { merge: true })
}

export function subscribePeople(currentUid: string, cb: (users: AppUser[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'users'), (snap) => {
    const users: AppUser[] = []
    snap.forEach((d) => {
      const u = d.data() as AppUser
      if (u.uid !== currentUid) users.push(u)
    })
    users.sort((a, b) => a.displayName.localeCompare(b.displayName))
    cb(users)
  })
}

export function subscribeFriends(currentUid: string, cb: (friends: Friend[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'users', currentUid, 'friends'), (snap) => {
    const friends: Friend[] = []
    snap.forEach((d) => {
      const f = d.data() as Friend
      friends.push(f)
    })
    friends.sort((a, b) => a.displayName.localeCompare(b.displayName))
    cb(friends)
  })
}

export function subscribeIncomingFriendRequests(
  currentUid: string,
  cb: (requests: FriendRequest[]) => void,
): Unsubscribe {
  const q = query(collection(db, 'friendRequests'), where('toUid', '==', currentUid))
  return onSnapshot(q, (snap) => {
    const requests: FriendRequest[] = []
    snap.forEach((d) => {
      const r = d.data() as Omit<FriendRequest, 'id'>
      requests.push({ id: d.id, ...r })
    })
    requests.sort((a, b) => b.createdAtMs - a.createdAtMs)
    cb(requests)
  })
}

export function subscribeOutgoingFriendRequests(
  currentUid: string,
  cb: (requests: FriendRequest[]) => void,
): Unsubscribe {
  const q = query(collection(db, 'friendRequests'), where('fromUid', '==', currentUid))
  return onSnapshot(q, (snap) => {
    const requests: FriendRequest[] = []
    snap.forEach((d) => {
      const r = d.data() as Omit<FriendRequest, 'id'>
      requests.push({ id: d.id, ...r })
    })
    requests.sort((a, b) => b.createdAtMs - a.createdAtMs)
    cb(requests)
  })
}

export async function sendFriendRequest(input: {
  fromUid: string
  fromName: string
  fromPhotoURL?: string
  toUid: string
}): Promise<void> {
  if (input.fromUid === input.toUid) throw new Error('You cannot add yourself')
  await addDoc(collection(db, 'friendRequests'), {
    fromUid: input.fromUid,
    toUid: input.toUid,
    fromName: input.fromName,
    fromPhotoURL: input.fromPhotoURL || '',
    createdAtMs: Date.now(),
    createdAt: serverTimestamp(),
  })
}

export async function acceptFriendRequest(input: {
  request: FriendRequest
  currentUser: AppUser
  fromUser: AppUser
}): Promise<void> {
  const batch = writeBatch(db)

  const currentUserFriendRef = doc(
    db,
    'users',
    input.currentUser.uid,
    'friends',
    input.fromUser.uid,
  )
  batch.set(currentUserFriendRef, {
    uid: input.fromUser.uid,
    displayName: input.fromUser.displayName,
    photoURL: input.fromUser.photoURL,
    email: input.fromUser.email,
    addedAtMs: Date.now(),
  } satisfies Friend)

  const requesterFriendRef = doc(db, 'users', input.fromUser.uid, 'friends', input.currentUser.uid)
  batch.set(requesterFriendRef, {
    uid: input.currentUser.uid,
    displayName: input.currentUser.displayName,
    photoURL: input.currentUser.photoURL,
    email: input.currentUser.email,
    addedAtMs: Date.now(),
  } satisfies Friend)

  const requestRef = doc(db, 'friendRequests', input.request.id)
  batch.delete(requestRef)

  await batch.commit()
}

export async function rejectFriendRequest(requestId: string): Promise<void> {
  await deleteDoc(doc(db, 'friendRequests', requestId))
}

export async function createPost(input: {
  authorUid: string
  authorName: string
  authorPhotoURL?: string
  text: string
  imageURL?: string
}): Promise<void> {
  const text = input.text.trim()
  if (!text && !input.imageURL) throw new Error('Post content is required')
  await addDoc(collection(db, 'posts'), {
    authorUid: input.authorUid,
    authorName: input.authorName,
    authorPhotoURL: input.authorPhotoURL || '',
    text,
    imageURL: input.imageURL || '',
    likes: [],
    commentCount: 0,
    createdAtMs: Date.now(),
    createdAt: serverTimestamp(),
  })
}

export async function deletePost(postId: string): Promise<void> {
  await deleteDoc(doc(db, 'posts', postId))
}

export async function updatePost(postId: string, text: string): Promise<void> {
  await setDoc(doc(db, 'posts', postId), { text, updatedAtMs: Date.now() }, { merge: true })
}

// Better way for toggling like to avoid race conditions or multiple listeners
import { runTransaction } from 'firebase/firestore'

export async function toggleLikeV2(postId: string, userId: string): Promise<void> {
  const postRef = doc(db, 'posts', postId)
  await runTransaction(db, async (transaction) => {
    const postDoc = await transaction.get(postRef)
    if (!postDoc.exists()) return
    const postData = postDoc.data() as Post
    const likes = postData.likes || []
    const newLikes = likes.includes(userId)
      ? likes.filter((id) => id !== userId)
      : [...likes, userId]
    transaction.update(postRef, { likes: newLikes })
  })
}

// Re-implementing addComment to use transactions for count safety
export async function addCommentV2(input: {
  postId: string
  authorUid: string
  authorName: string
  authorPhotoURL?: string
  text: string
}): Promise<void> {
  const text = input.text.trim()
  if (!text) throw new Error('Comment text is required')

  const postRef = doc(db, 'posts', input.postId)
  const commentRef = doc(collection(db, 'posts', input.postId, 'comments'))

  await runTransaction(db, async (transaction) => {
    const postDoc = await transaction.get(postRef)
    if (!postDoc.exists()) return

    const currentCount = postDoc.data().commentCount || 0
    transaction.set(commentRef, {
      authorUid: input.authorUid,
      authorName: input.authorName,
      authorPhotoURL: input.authorPhotoURL || '',
      text,
      createdAtMs: Date.now(),
      createdAt: serverTimestamp(),
    })
    transaction.update(postRef, { commentCount: currentCount + 1 })
  })
}


export function subscribeComments(postId: string, cb: (comments: Comment[]) => void): Unsubscribe {
  const q = query(collection(db, 'posts', postId, 'comments'), orderBy('createdAtMs', 'asc'))
  return onSnapshot(q, (snap) => {
    const comments: Comment[] = []
    snap.forEach((d) => {
      const c = d.data() as Omit<Comment, 'id'>
      comments.push({ id: d.id, ...c })
    })
    cb(comments)
  })
}

export async function updateBio(userId: string, bio: string): Promise<void> {
  await setDoc(doc(db, 'users', userId), { bio }, { merge: true })
}

export async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', 'miny_social_uploads') // Make sure this matches your Unsigned Upload Preset name

  // REPLACE 'dxkntm8p0' with your actual Cloudinary "Cloud Name" from your dashboard
  const cloudName = 'dlwtajq61' 
  
  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      {
        method: 'POST',
        body: formData,
      },
    )

    const data = await response.json()

    if (!response.ok) {
      // This will now show the SPECIFIC error from Cloudinary (e.g. "Invalid cloud name")
      throw new Error(data.error?.message || 'Upload failed')
    }

    return data.secure_url
  } catch (err) {
    console.error('Cloudinary Error:', err)
    throw err
  }
}


export async function deleteComment(postId: string, commentId: string): Promise<void> {
  const postRef = doc(db, 'posts', postId)
  const commentRef = doc(db, 'posts', postId, 'comments', commentId)

  await runTransaction(db, async (transaction) => {
    const postDoc = await transaction.get(postRef)
    if (!postDoc.exists()) return

    const currentCount = postDoc.data().commentCount || 0
    transaction.delete(commentRef)
    transaction.update(postRef, { commentCount: Math.max(0, currentCount - 1) })
  })
}

export async function updateComment(
  postId: string,
  commentId: string,
  text: string,
): Promise<void> {
  const commentRef = doc(db, 'posts', postId, 'comments', commentId)
  await setDoc(commentRef, { text, updatedAtMs: Date.now() }, { merge: true })
}

export function subscribeFeed(cb: (posts: Post[]) => void): Unsubscribe {
  const q = query(collection(db, 'posts'), orderBy('createdAtMs', 'desc'))
  return onSnapshot(q, (snap) => {
    const posts: Post[] = []
    snap.forEach((d) => {
      const p = d.data() as Omit<Post, 'id'>
      posts.push({ id: d.id, ...p })
    })
    cb(posts)
  })
}

export function conversationId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('__')
}

export async function sendMessage(input: {
  fromUid: string
  fromName: string
  fromPhotoURL?: string
  toUid: string
  text: string
}): Promise<void> {
  const text = input.text.trim()
  if (!text) throw new Error('Message text is required')
  const convoId = conversationId(input.fromUid, input.toUid)
  await setDoc(
    doc(db, 'conversations', convoId),
    {
      participantUids: [input.fromUid, input.toUid].sort(),
      updatedAtMs: Date.now(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
  await addDoc(collection(db, 'conversations', convoId, 'messages'), {
    fromUid: input.fromUid,
    fromName: input.fromName,
    fromPhotoURL: input.fromPhotoURL || '',
    toUid: input.toUid,
    text,
    createdAtMs: Date.now(),
    createdAt: serverTimestamp(),
  })
}

export function subscribeMessages(
  uidA: string,
  uidB: string,
  cb: (messages: Message[]) => void,
): Unsubscribe {
  const convoId = conversationId(uidA, uidB)
  const q = query(collection(db, 'conversations', convoId, 'messages'), orderBy('createdAtMs', 'asc'))
  return onSnapshot(q, (snap) => {
    const messages: Message[] = []
    snap.forEach((d) => {
      const m = d.data() as Omit<Message, 'id'>
      messages.push({ id: d.id, ...m })
    })
    cb(messages)
  })
}

