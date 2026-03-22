import { useEffect, useMemo, useState } from 'react'
import { createFolder, ensureSignedInAnonymously, subscribeFolders, ROOT_FOLDER_ID, type FolderDoc } from '../../services/storageManager'

export default function FolderManager() {
  const [uid, setUid] = useState<string | null>(null)
  const [folders, setFolders] = useState<FolderDoc[]>([])
  const [newFolderName, setNewFolderName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const sortedFolders = useMemo(() => {
    return [...folders].sort((a, b) => b.createdAtMs - a.createdAtMs)
  }, [folders])

  async function handleCreate() {
    if (!uid) return
    setError(null)
    const name = newFolderName.trim()
    if (!name) {
      setError('Folder name is required')
      return
    }
    setCreating(true)
    try {
      await createFolder(uid, name)
      setNewFolderName('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create folder failed')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <h1 style={{ marginTop: 0, marginBottom: 16 }}>Folders</h1>

      {error ? (
        <div className="alert" role="alert">
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Error</div>
          <div>{error}</div>
        </div>
      ) : null}

      <div className="grid2">
        <section className="card">
          <div className="cardTitle">Create folder</div>

          <div className="field" style={{ minWidth: 0 }}>
            <label htmlFor="newFolder">Name</label>
            <input
              id="newFolder"
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g. Projects"
              disabled={creating || !uid}
            />
            <div className="hint">Files uploaded here will be organized under a Storage folder.</div>
          </div>

          <div style={{ marginTop: 12 }}>
            <button className="primary" disabled={creating || !uid} onClick={handleCreate}>
              {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
        </section>

        <section className="card">
          <div className="cardTitle">Your folders</div>
          {!uid ? (
            <div className="hint">Signing in anonymously…</div>
          ) : sortedFolders.length === 0 ? (
            <div className="hint">
              No folders yet. `Root` is available automatically.
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div style={{ fontWeight: 600 }}>Root</div>
                    <div className="hint mono" style={{ marginTop: 4 }}>
                      {ROOT_FOLDER_ID}
                    </div>
                  </td>
                  <td className="hint">Default</td>
                </tr>
                {sortedFolders.map((f) => (
                  <tr key={f.folderId}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{f.displayName}</div>
                      <div className="hint mono" style={{ marginTop: 4 }}>
                        {f.folderId}
                      </div>
                    </td>
                    <td className="hint">{new Date(f.createdAtMs).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  )
}

