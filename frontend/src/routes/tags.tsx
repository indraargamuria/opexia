import { useState, type FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from '@/hooks'
import { isValidHexColor } from '@/lib/color'
import { routeGuard } from '@/lib/routeGuard'

export const Route = createFileRoute('/tags')({
  beforeLoad: routeGuard('/tags'),
  component: Tags,
})

const inputClass =
  'h-9 px-3 rounded-md border border-border bg-white text-sm text-dark-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand'

const CATEGORIES = ['Billing', 'Type']

function ColorDot({ color }: { color: string }) {
  return <span className="h-3 w-3 rounded-full border border-border shrink-0" style={{ backgroundColor: color }} />
}

function CategoryBadge({ category }: { category?: string }) {
  if (!category) return <span className="text-xs text-muted">—</span>
  const isBilling = category === 'Billing'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${isBilling ? 'bg-brand-light text-brand' : 'bg-purple-50 text-purple-700'}`}>
      {category}
    </span>
  )
}

function Tags() {
  const { data: tags = [], isLoading, error, refetch } = useTags()
  const deleteTag = useDeleteTag()
  const [showNew, setShowNew] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)

  const erpMapped = tags.filter((t: any) => t.erpCode).length
  const mostUsed: any = [...tags].sort((a: any, b: any) => (b.usageCount ?? 0) - (a.usageCount ?? 0))[0]
  const categories = new Set(tags.map((t: any) => t.category).filter(Boolean)).size

  const handleDelete = (tag: any) => {
    if (window.confirm(`Delete tag "${tag.name}"?`)) {
      deleteTag.mutate(tag.id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-dark-text">Tags</h1>
        <button
          onClick={() => setShowNew(true)}
          className="bg-brand text-white hover:bg-brand-hover active:bg-brand-active px-4 py-2 rounded-md text-sm font-medium transition-colors duration-75"
        >
          New Tag
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3">
          <div className="rounded-lg border border-border bg-white p-4">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Total Tags</p>
            <p className="text-2xl font-semibold text-dark-text mt-1">{isLoading ? '—' : tags.length}</p>
          </div>
        </div>
        <div className="col-span-3">
          <div className="rounded-lg border border-border bg-white p-4">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Most Used</p>
            <p className="text-2xl font-semibold text-brand mt-1">{mostUsed?.name ?? '—'}</p>
          </div>
        </div>
        <div className="col-span-3">
          <div className="rounded-lg border border-border bg-white p-4">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">ERP Mapped</p>
            <p className="text-2xl font-semibold text-dark-text mt-1">{erpMapped}</p>
            <p className="text-xs text-muted mt-1">of {tags.length} tags</p>
          </div>
        </div>
        <div className="col-span-3">
          <div className="rounded-lg border border-border bg-white p-4">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">Categories</p>
            <p className="text-2xl font-semibold text-dark-text mt-1">{categories}</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : error ? (
        <ErrorState message="Failed to load tags" onRetry={() => refetch()} />
      ) : tags.length === 0 ? (
        <EmptyState message="No tags yet. Create your first tag to organize time entries." />
      ) : (
        <div className="rounded-lg border border-border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-light-bg border-b border-border">
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Tag</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Category</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">ERP Code</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">Usage</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag: any) => (
                <tr key={tag.id} className="border-b border-border last:border-0 hover:bg-highlight transition-colors duration-75 h-9">
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <ColorDot color={tag.color ?? '#6B7280'} />
                      <span className="font-medium text-dark-text">{tag.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-1.5"><CategoryBadge category={tag.category} /></td>
                  <td className="px-3 py-1.5">
                    {tag.erpCode ? (
                      <span className="font-mono text-xs text-muted">{tag.erpCode}</span>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-xs text-muted">{tag.usageCount ?? 0}</td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditing(tag)}
                        className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-border text-xs font-medium text-dark-text hover:bg-highlight transition-colors duration-75"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(tag)}
                        className="inline-flex items-center justify-center h-8 px-3 rounded-md bg-error text-white hover:bg-red-700 text-xs font-medium transition-colors duration-75"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNew && <TagFormModal onClose={() => setShowNew(false)} />}
      {editing && <TagFormModal tag={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function TagFormModal({ tag, onClose }: { tag?: any; onClose: () => void }) {
  const createTag = useCreateTag()
  const updateTag = useUpdateTag()
  const isEditing = Boolean(tag)
  const [name, setName] = useState(tag?.name ?? '')
  const [color, setColor] = useState(tag?.color ?? '#6366f1')
  const [category, setCategory] = useState(tag?.category ?? '')
  const [erpCode, setErpCode] = useState(tag?.erpCode ?? '')
  const [error, setError] = useState<string | null>(null)
  const mutation = isEditing ? updateTag : createTag

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!name) return
    if (!isValidHexColor(color)) {
      setError('Color must be a 6-digit hex code like #6366f1')
      return
    }
    setError(null)
    const payload = { name, color, category: category || undefined, erpCode: erpCode || undefined }
    const onSuccess = () => onClose()
    if (isEditing) {
      updateTag.mutate({ id: tag.id, data: payload }, { onSuccess, onError: (err: any) => setError(err.message ?? 'Failed to update tag') })
    } else {
      createTag.mutate(payload, { onSuccess, onError: (err: any) => setError(err.message ?? 'Failed to create tag') })
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center p-6" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="rounded-lg border border-border bg-white p-6 w-full max-w-lg space-y-4"
      >
        <h2 className="text-lg font-semibold text-dark-text">{isEditing ? 'Edit Tag' : 'New Tag'}</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-dark-text">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Overtime" className={`${inputClass} w-full mt-1`} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-dark-text">Color</label>
              <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="#6366f1" className={`${inputClass} w-full mt-1 font-mono text-xs`} />
            </div>
            <div>
              <label className="text-sm font-medium text-dark-text">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputClass} w-full mt-1`}>
                <option value="">None</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-dark-text">ERP code</label>
              <input value={erpCode} onChange={(e) => setErpCode(e.target.value)} placeholder="ERP-001" className={`${inputClass} w-full mt-1 font-mono text-xs`} />
            </div>
          </div>
        </div>
        {error && <p className="text-xs text-error">{error}</p>}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="border border-border bg-white text-dark-text hover:bg-highlight px-4 py-2 rounded-md text-sm font-medium transition-colors duration-75">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name || mutation.isPending}
            className="bg-brand text-white hover:bg-brand-hover active:bg-brand-active disabled:opacity-50 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-75"
          >
            {mutation.isPending ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create Tag')}
          </button>
        </div>
      </form>
    </div>
  )
}

function TableSkeleton({ rows, cols }: { rows: number; cols: number }) {
  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden">
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4">
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className="h-4 rounded bg-muted-bg animate-pulse" style={{ width: `${100 / cols}%` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-border bg-white p-12 text-center">
      <p className="text-sm text-muted">{message}</p>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-white p-12 text-center">
      <p className="text-sm text-red-600 mb-3">{message}</p>
      <button onClick={onRetry} className="text-sm font-medium text-brand hover:text-brand-hover transition-colors duration-75">
        Try again
      </button>
    </div>
  )
}
