import { useEffect, useState } from "react"
import { getIcon } from "../utils/icons"
import ServiceForm from "./ServiceForm"
import "./AdminPanel.css"

function AdminPanel({ onClose, apiKey, onConfigChanged }) {
    const [config, setConfig] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)
    const [formError, setFormError] = useState(null)
    const [editingIndex, setEditingIndex] = useState(null) // null=list, "new"=add, number=edit
    const [deleteIndex, setDeleteIndex] = useState(null)

    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === "Escape") {
                if (editingIndex !== null) handleCancelEdit()
                else onClose()
            }
        }
        window.addEventListener("keydown", handleKey)
        return () => window.removeEventListener("keydown", handleKey)
    }, [onClose, editingIndex])

    // Sync editingIndex from browser history (back/forward navigation)
    useEffect(() => {
        function handlePopState(e) {
            if (e.state?.adminOpen) {
                setEditingIndex(e.state.editingIndex ?? null)
                setFormError(null)
            }
        }
        window.addEventListener("popstate", handlePopState)
        return () => window.removeEventListener("popstate", handlePopState)
    }, [])

    useEffect(() => {
        fetch("/config", { headers: { "X-API-Key": apiKey } })
            .then(res => res.json())
            .then(data => { setConfig(data); setLoading(false) })
            .catch(err => { setError(err.message); setLoading(false) })
    }, [apiKey])

    function putConfig(updated) {
        setSaving(true)
        setError(null)
        setFormError(null)
        return fetch("/config", {
            method: "PUT",
            headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
            body: JSON.stringify(updated),
        })
            .then(res => {
                if (!res.ok) return res.json().then(d => { throw new Error(d.detail || res.statusText) })
                return res.json()
            })
            .then(data => { setConfig(data); setSaving(false); onConfigChanged?.() })
            .catch(err => { setSaving(false); throw err })
    }

    function handleOpenEdit(index) {
        setEditingIndex(index)
        setFormError(null)
        history.pushState({ adminOpen: true, editingIndex: index }, "")
    }

    function handleCancelEdit() {
        if (window.history.state?.editingIndex !== undefined) {
            history.back()
        } else {
            setEditingIndex(null)
        }
    }

    function handleSave(service) {
        const updated = editingIndex === "new"
            ? [...config, service]
            : config.map((s, i) => i === editingIndex ? service : s)
        putConfig(updated)
            .then(() => {
                if (window.history.state?.editingIndex !== undefined) history.back()
                else setEditingIndex(null)
            })
            .catch(err => setFormError(err.message))
    }

    function handleDelete(index) {
        putConfig(config.filter((_, i) => i !== index))
            .then(() => setDeleteIndex(null))
            .catch(err => setError(err.message))
    }

    if (editingIndex !== null) {
        return (
            <ServiceForm
                service={editingIndex === "new" ? null : config[editingIndex]}
                onSave={handleSave}
                onCancel={handleCancelEdit}
                saving={saving}
                error={formError}
            />
        )
    }

    return (
        <div className="admin-backdrop">
            <div className="admin-header">
                <div className="admin-header-left">
                    <button className="panel-back" onClick={onClose}>← Back</button>
                    <h2>Config</h2>
                </div>
                <button className="admin-add-btn" onClick={() => handleOpenEdit("new")}>
                    {getIcon("plus", { size: 14 })} New service
                </button>
            </div>

            {error && <p className="admin-error">{error}</p>}

            {loading && (
                <div className="admin-state">{getIcon("loader", { size: 16, className: "spin" })} Loading…</div>
            )}

            {!loading && config && (
                <div className="admin-list">
                    {config.map((svc, i) => (
                        <div key={i} className="admin-row">
                            <span className="admin-row-icon">
                                {getIcon(svc.icon, { size: 16 })}
                            </span>
                            <span className="admin-row-name">{svc.name}</span>
                            <span className="admin-row-url">{svc.url || svc.action_url || "—"}</span>
                            <span className="admin-row-actions">
                                {svc.actions?.length ? `${svc.actions.length} action${svc.actions.length > 1 ? "s" : ""}` : ""}
                            </span>
                            <div className="admin-row-btns">
                                <button className="admin-btn edit" onClick={() => handleOpenEdit(i)} disabled={saving}>
                                    Edit
                                </button>
                                <button className="admin-btn delete" onClick={() => setDeleteIndex(i)} disabled={saving}>
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {deleteIndex !== null && (
                <div className="confirm-backdrop" onClick={() => setDeleteIndex(null)}>
                    <div className="confirm-box" onClick={e => e.stopPropagation()}>
                        <p className="confirm-message">
                            Delete <strong>{config[deleteIndex]?.name}</strong>?
                        </p>
                        <div className="confirm-buttons">
                            <button className="confirm-cancel" onClick={() => setDeleteIndex(null)}>Cancel</button>
                            <button className="confirm-ok danger" onClick={() => handleDelete(deleteIndex)} disabled={saving}>
                                {saving ? "Deleting…" : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminPanel
