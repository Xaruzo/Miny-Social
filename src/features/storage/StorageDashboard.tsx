import { useEffect, useMemo, useState } from 'react'
import {
  type FolderDoc,
  type StoredFile,
  ROOT_FOLDER_ID,
  deleteStoredFile,
  ensureSignedInAnonymously,
  getDownloadUrlForFile,
  subscribeAllFiles,
  subscribeFilesInFolder,
  subscribeFolders,
  uploadFileToStorage,
} from '../../services/storageManager'

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  return `${value.toFixed(i === 0 ? 0 : 2)} ${units[i]}`
}

function formatDate(ms: number): string {
  const d = new Date(ms)
  return d.toLocaleString()
}

export default function StorageDashboard() {
  const [uid, setUid] = useState<string | null>(null)
  const [folders, setFolders] = useState<FolderDoc[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string>(ROOT_FOLDER_ID)

  const [files, setFiles] = useState<StoredFile[]>([])
  const [allFiles, setAllFiles] = useState<StoredFile[]>([])

  const [fileToUpload, setFileToUpload] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress01, setUploadProgress01] = useState<number>(0)

  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const userUid = await ensureSignedInAnonymously()
        if (!cancelled) setUid(userUid)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to sign in')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!uid) return
    return subscribeFolders(uid, setFolders)
  }, [uid])

  useEffect(() => {
    if (!uid) return
    return subscribeFilesInFolder(uid, selectedFolderId, setFiles)
  }, [uid, selectedFolderId])

  useEffect(() => {
    if (!uid) return
    return subscribeAllFiles(uid, setAllFiles)
  }, [uid])

  const selectedFolderUsageBytes = useMemo(() => {
    return files.reduce((sum, f) => sum + (f.sizeBytes || 0), 0)
  }, [files])

  const totalUsageBytes = useMemo(() => {
    return allFiles.reduce((sum, f) => sum + (f.sizeBytes || 0), 0)
  }, [allFiles])

  const folderLabelById = useMemo(() => {
    const map = new Map<string, string>()
    map.set(ROOT_FOLDER_ID, 'Root')
    for (const f of folders) map.set(f.folderId, f.displayName)
    return map
  }, [folders])

  const visibleFiles = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    return [...files]
      .sort((a, b) => b.uploadedAtMs - a.uploadedAtMs)
      .filter((f) => {
        if (!normalized) return true
        return f.name.toLowerCase().includes(normalized)
      })
  }, [files, search])

  async function handleUpload() {
    if (!uid) return
    if (!fileToUpload) {
      setError('Choose a file to upload')
      return
    }
    setError(null)
    setUploading(true)
    setUploadProgress01(0)
    try {
      await uploadFileToStorage({
        uid,
        file: fileToUpload,
        folderId: selectedFolderId,
        onProgress: (p) => setUploadProgress01(Math.min(1, Math.max(0, p))),
      })
      setFileToUpload(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleDownload(file: StoredFile) {
    if (!uid) return
    setDownloadingId(file.id)
    setError(null)
    try {
      const url = await getDownloadUrlForFile(file.storagePath)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed')
    } finally {
      setDownloadingId(null)
    }
  }

  async function handleDelete(file: StoredFile) {
    if (!uid) return
    const ok = window.confirm(`Delete "${file.name}"? This removes the file from Storage.`)
    if (!ok) return
    setError(null)
    try {
      await deleteStoredFile({
        uid,
        fileId: file.id,
        storagePath: file.storagePath,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  return (
    <div>
      <h1 style={{ marginTop: 0, marginBottom: 16 }}>Dashboard</h1>

      {error ? (
        <div className="alert" role="alert">
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Error</div>
          <div>{error}</div>
        </div>
      ) : null}

      <div className="grid2">
        <section className="card">
          <div className="cardTitle">Storage usage</div>
          <div className="row">
            <div className="pill">
              Total: <span className="mono">{formatBytes(totalUsageBytes)}</span>
            </div>
            <div className="pill">
              In {folderLabelById.get(selectedFolderId) ?? selectedFolderId}:{' '}
              <span className="mono">{formatBytes(selectedFolderUsageBytes)}</span>
            </div>
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className="field" style={{ minWidth: 280 }}>
              <label htmlFor="folderSelect">Folder</label>
              <select
                id="folderSelect"
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
              >
                <option value={ROOT_FOLDER_ID}>Root</option>
                {folders.map((f) => (
                  <option key={f.folderId} value={f.folderId}>
                    {f.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ minWidth: 280 }}>
              <label htmlFor="searchInput">Search</label>
              <input
                id="searchInput"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by file name"
              />
            </div>
          </div>
        </section>

        <section className="card">
          <div className="cardTitle">Upload</div>
          <div className="row">
            <div className="field" style={{ minWidth: 320 }}>
              <label htmlFor="fileInput">File</label>
              <input
                id="fileInput"
                type="file"
                onChange={(e) => setFileToUpload(e.target.files?.[0] ?? null)}
              />
              <div className="hint">
                Files are stored in Firebase Storage; metadata is stored in Firestore.
              </div>
            </div>

            <div style={{ flex: '1 1 auto', alignSelf: 'flex-end', minWidth: 220 }}>
              <button
                className="primary"
                disabled={!fileToUpload || uploading || !uid}
                onClick={handleUpload}
              >
                {uploading ? `Uploading… ${Math.round(uploadProgress01 * 100)}%` : 'Upload'}
              </button>
              {uploading ? (
                <div className="progressOuter" style={{ marginTop: 10 }}>
                  <div className="progressInner" style={{ width: `${uploadProgress01 * 100}%` }} />
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="cardTitle">Files</div>
        {!uid ? (
          <div className="hint">Signing in anonymously to enable storage access…</div>
        ) : visibleFiles.length === 0 ? (
          <div className="hint">No files in this folder yet.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '45%' }}>Name</th>
                <th>Size</th>
                <th>Uploaded</th>
                <th style={{ width: 220 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleFiles.map((f) => (
                <tr key={f.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{f.name}</div>
                    <div className="hint mono" style={{ marginTop: 4 }}>
                      {f.contentType}
                    </div>
                  </td>
                  <td className="mono">{formatBytes(f.sizeBytes)}</td>
                  <td className="hint">{formatDate(f.uploadedAtMs)}</td>
                  <td>
                    <div className="row" style={{ gap: 8 }}>
                      <button
                        disabled={downloadingId === f.id}
                        onClick={() => handleDownload(f)}
                      >
                        {downloadingId === f.id ? 'Preparing…' : 'Download'}
                      </button>
                      <button className="danger" onClick={() => handleDelete(f)} disabled={downloadingId === f.id}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

