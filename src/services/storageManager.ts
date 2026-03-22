import { v4 as uuidv4 } from 'uuid'
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytesResumable } from 'firebase/storage'
import { doc, onSnapshot, query, where, collection, deleteDoc, getDoc, setDoc } from 'firebase/firestore'
import { signInAnonymously } from 'firebase/auth'
import { auth, db, storage } from '../firebase'

export type FolderDoc = {
  folderId: string
  displayName: string
  createdAtMs: number
}

export type StoredFile = {
  id: string
  name: string
  sizeBytes: number
  contentType: string
  folderId: string
  storagePath: string
  uploadedAtMs: number
}

export const ROOT_FOLDER_ID = 'root'

function requireUserUid(uid: string | null | undefined): string {
  if (!uid) throw new Error('No user uid available')
  return uid
}

export function folderIdFromName(displayName: string): { folderId: string; displayName: string } {
  const cleaned = displayName.trim().replace(/\s+/g, ' ')
  if (!cleaned) throw new Error('Folder name is required')

  // Simple, storage-safe folder key (used in Firestore paths + storage paths).
  const folderId = cleaned
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .slice(0, 64)

  if (!folderId) throw new Error('Folder name produced an empty id')

  return { folderId, displayName: cleaned }
}

function sanitizePathSegment(segment: string): string {
  // Firebase Storage paths use `/` as separator, so we must avoid it.
  return segment.replaceAll('/', '_').replaceAll('\\', '_').replace(/\0/g, '')
}

function getFoldersCollection(uid: string) {
  return collection(db, 'users', uid, 'folders')
}

function getFilesCollection(uid: string) {
  return collection(db, 'users', uid, 'files')
}

export async function ensureSignedInAnonymously(): Promise<string> {
  if (auth.currentUser) return auth.currentUser.uid
  const cred = await signInAnonymously(auth)
  return cred.user.uid
}

export function subscribeFolders(uid: string, onData: (folders: FolderDoc[]) => void): () => void {
  const unsub = onSnapshot(getFoldersCollection(requireUserUid(uid)), (snap) => {
    const items: FolderDoc[] = []
    snap.forEach((d) => {
      const data = d.data() as Omit<FolderDoc, 'folderId'>
      items.push({
        folderId: d.id,
        displayName: data.displayName,
        createdAtMs: data.createdAtMs,
      })
    })
    onData(items)
  })
  return () => unsub()
}

export async function createFolder(uid: string, displayName: string): Promise<FolderDoc> {
  const { folderId, displayName: normalized } = folderIdFromName(displayName)
  const folderDocRef = doc(db, 'users', uid, 'folders', folderId)

  const folder: FolderDoc = {
    folderId,
    displayName: normalized,
    createdAtMs: Date.now(),
  }

  await setDoc(folderDocRef, folder)
  return folder
}

export function subscribeFilesInFolder(
  uid: string,
  folderId: string,
  onData: (files: StoredFile[]) => void,
): () => void {
  const uidSafe = requireUserUid(uid)
  const q = query(getFilesCollection(uidSafe), where('folderId', '==', folderId))

  const unsub = onSnapshot(q, (snap) => {
    const items: StoredFile[] = []
    snap.forEach((d) => {
      const data = d.data() as Omit<StoredFile, 'id'>
      items.push({
        id: d.id,
        name: data.name,
        sizeBytes: data.sizeBytes,
        contentType: data.contentType,
        folderId: data.folderId,
        storagePath: data.storagePath,
        uploadedAtMs: data.uploadedAtMs,
      })
    })
    onData(items)
  })

  return () => unsub()
}

export function subscribeAllFiles(uid: string, onData: (files: StoredFile[]) => void): () => void {
  const uidSafe = requireUserUid(uid)
  const unsub = onSnapshot(getFilesCollection(uidSafe), (snap) => {
    const items: StoredFile[] = []
    snap.forEach((d) => {
      const data = d.data() as Omit<StoredFile, 'id'>
      items.push({
        id: d.id,
        name: data.name,
        sizeBytes: data.sizeBytes,
        contentType: data.contentType,
        folderId: data.folderId,
        storagePath: data.storagePath,
        uploadedAtMs: data.uploadedAtMs,
      })
    })
    onData(items)
  })

  return () => unsub()
}

export async function uploadFileToStorage(args: {
  uid: string
  file: File
  folderId: string
  onProgress?: (progress01: number) => void
}): Promise<StoredFile> {
  const uidSafe = requireUserUid(args.uid)
  const folderIdSafe = sanitizePathSegment(args.folderId)
  const fileId = uuidv4()
  const safeOriginalName = sanitizePathSegment(args.file.name || 'file')

  const storagePath = `users/${uidSafe}/uploads/${folderIdSafe}/${fileId}/${safeOriginalName}`

  const task = uploadBytesResumable(storageRef(storage, storagePath), args.file)

  const uploadedAtMs = Date.now()

  await new Promise<void>((resolve, reject) => {
    task.on(
      'state_changed',
      (snap) => {
        if (snap.totalBytes > 0) {
          args.onProgress?.(snap.bytesTransferred / snap.totalBytes)
        }
      },
      (err) => reject(err),
      () => resolve(),
    )
  })

  const fileDocRef = doc(db, 'users', uidSafe, 'files', fileId)

  const file: StoredFile = {
    id: fileId,
    name: args.file.name,
    sizeBytes: args.file.size,
    contentType: args.file.type || 'application/octet-stream',
    folderId: folderIdSafe,
    storagePath,
    uploadedAtMs,
  }

  await setDoc(fileDocRef, file)
  args.onProgress?.(1)
  return file
}

export async function deleteStoredFile(args: {
  uid: string
  fileId: string
  storagePath?: string
}): Promise<void> {
  const uidSafe = requireUserUid(args.uid)
  const fileDocRef = doc(db, 'users', uidSafe, 'files', args.fileId)

  let storagePath = args.storagePath
  if (!storagePath) {
    const snap = await getDoc(fileDocRef)
    if (!snap.exists()) return
    const data = snap.data() as Omit<StoredFile, 'id'>
    storagePath = data.storagePath
  }

  await deleteObject(storageRef(storage, storagePath))
  await deleteDoc(fileDocRef)
}

export async function getDownloadUrlForFile(storagePath: string): Promise<string> {
  return getDownloadURL(storageRef(storage, storagePath))
}

