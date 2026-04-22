import { useState } from "react"
import { getIcon } from "../utils/icons"
import IconPicker from "./IconPicker"
import "./ServiceForm.css"

const METHODS = ["href", "GET", "POST", "PUT", "DELETE", "PATCH"]

const EMPTY_ACTION = { label: "", icon: "", endpoint: "", method: "POST", body: "", confirm: false, show_response: false }

const EMPTY_SERVICE = {
    name: "", icon: "", url: "", action_url: "", action_timeout: 30,
    action_headers: {}, docker_container: "",
    monitor: false, monitor_url: "", monitor_headers: {}, monitor_interval: 60, monitor_timeout: 5,
    monitor_retries: 3, monitor_expect_status: 200, monitor_expect_body: "",
    use_docker_health: false, actions: [],
}

function headersToText(headers) {
    if (!headers) return ""
    return Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join("\n")
}

function textToHeaders(text) {
    const result = {}
    for (const line of text.split("\n")) {
        const idx = line.indexOf(":")
        if (idx < 1) continue
        const key = line.slice(0, idx).trim()
        const val = line.slice(idx + 1).trim()
        if (key) result[key] = val
    }
    return result
}

function actionToForm(action) {
    return { ...action, body: action.body ? JSON.stringify(action.body, null, 2) : "" }
}

function formToAction(action) {
    let body = null
    if (action.body?.trim()) {
        try { body = JSON.parse(action.body) } catch { body = null }
    }
    return { ...action, body }
}

function ServiceForm({ service, onSave, onCancel, saving, error }) {
    const init = service
        ? {
            ...EMPTY_SERVICE,
            ...service,
            icon: service.icon ?? "",
            url: service.url ?? "",
            action_url: service.action_url ?? "",
            docker_container: service.docker_container ?? "",
            monitor_url: service.monitor_url ?? "",
            monitor_expect_body: service.monitor_expect_body ?? "",
            action_headers: service.action_headers ?? {},
            monitor_headers: service.monitor_headers ?? {},
            actions: (service.actions ?? []).map(actionToForm),
          }
        : { ...EMPTY_SERVICE }

    const [form, setForm] = useState(init)
    const [headersText, setHeadersText] = useState(headersToText(init.action_headers))
    const [monitorHeadersText, setMonitorHeadersText] = useState(headersToText(init.monitor_headers))
    const [errors, setErrors] = useState({})
    // pickerFor: null=closed | "service-icon" | { actionIndex: number }
    const [pickerFor, setPickerFor] = useState(null)

    function set(field, value) {
        setForm(f => ({ ...f, [field]: value }))
    }

    function setAction(i, field, value) {
        setForm(f => {
            const actions = [...f.actions]
            actions[i] = { ...actions[i], [field]: value }
            return { ...f, actions }
        })
    }

    function addAction() {
        setForm(f => ({ ...f, actions: [...f.actions, { ...EMPTY_ACTION }] }))
    }

    function removeAction(i) {
        setForm(f => ({ ...f, actions: f.actions.filter((_, idx) => idx !== i) }))
    }

    function validate() {
        const e = {}
        if (!form.name.trim()) e.name = "Required"
        for (const [i, a] of form.actions.entries()) {
            if (!a.label.trim()) e[`action_${i}_label`] = "Required"
            if (!a.endpoint.trim()) e[`action_${i}_endpoint`] = "Required"
            if (a.body?.trim()) {
                try { JSON.parse(a.body) } catch { e[`action_${i}_body`] = "Invalid JSON" }
            }
        }
        return e
    }

    function handleSubmit(e) {
        e.preventDefault()
        const errs = validate()
        if (Object.keys(errs).length) { setErrors(errs); return }

        const service = {
            ...form,
            name: form.name.trim(),
            icon: form.icon.trim() || null,
            url: form.url.trim() || null,
            action_url: form.action_url.trim() || null,
            docker_container: form.docker_container.trim() || null,
            monitor_url: form.monitor_url.trim() || null,
            monitor_expect_body: form.monitor_expect_body.trim() || null,
            monitor_headers: textToHeaders(monitorHeadersText) || null,
            action_headers: textToHeaders(headersText) || null,
            actions: form.actions.length ? form.actions.map(formToAction) : null,
        }
        onSave(service)
    }

    return (
        <div className="form-backdrop">
            <form className="service-form" onSubmit={handleSubmit} noValidate>
                <div className="form-header">
                    <h2>{service ? `Edit — ${service.name}` : "New service"}</h2>
                    <button type="button" className="panel-back" onClick={onCancel}>← Cancel</button>
                </div>

                <div className="form-body">
                    {/* Basic */}
                    <section className="form-section">
                        <h3>Basic</h3>
                        <div className="form-row">
                            <Field label="Name *" error={errors.name}>
                                <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="My Service" />
                            </Field>
                            <Field label="Icon">
                                <div className="icon-input">
                                    <span className="icon-preview">{getIcon(form.icon, { size: 14 })}</span>
                                    <input value={form.icon} onChange={e => set("icon", e.target.value)} placeholder="server" />
                                    <button type="button" className="icon-browse-btn" onClick={() => setPickerFor("service-icon")} title="Browse icons">
                                        {getIcon("layout-grid", { size: 12 })}
                                    </button>
                                </div>
                            </Field>
                        </div>
                        <Field label="URL">
                            <input value={form.url} onChange={e => set("url", e.target.value)} placeholder="https://service.example.com" />
                        </Field>
                    </section>

                    {/* Upstream actions */}
                    <section className="form-section">
                        <h3>Upstream</h3>
                        <div className="form-row">
                            <Field label="Action URL">
                                <input value={form.action_url} onChange={e => set("action_url", e.target.value)} placeholder="http://service:8000" />
                            </Field>
                            <Field label="Action timeout (s)">
                                <input type="number" min="1" value={form.action_timeout} onChange={e => set("action_timeout", parseInt(e.target.value) || 30)} />
                            </Field>
                        </div>
                        <Field label="Action headers (one per line: Key: Value)">
                            <textarea
                                rows={3}
                                value={headersText}
                                onChange={e => setHeadersText(e.target.value)}
                                placeholder={"X-API-Key: secret\nContent-Type: application/json"}
                            />
                        </Field>
                        <Field label="Docker container name">
                            <input value={form.docker_container} onChange={e => set("docker_container", e.target.value)} placeholder="my-container" />
                        </Field>
                    </section>

                    {/* Monitoring */}
                    <section className="form-section">
                        <h3>
                            <label className="toggle-label">
                                <input type="checkbox" checked={form.monitor} onChange={e => set("monitor", e.target.checked)} />
                                Monitoring
                            </label>
                        </h3>
                        {form.monitor && (
                            <>
                                <label className="toggle-label small">
                                    <input type="checkbox" checked={form.use_docker_health} onChange={e => set("use_docker_health", e.target.checked)} />
                                    Use Docker health
                                </label>
                                {!form.use_docker_health && (
                                    <>
                                        <Field label="Monitor URL *">
                                            <input value={form.monitor_url} onChange={e => set("monitor_url", e.target.value)} placeholder="https://service.example.com/health" />
                                        </Field>
                                        <Field label="Monitor headers (one per line: Key: Value)">
                                            <textarea
                                                rows={2}
                                                value={monitorHeadersText}
                                                onChange={e => setMonitorHeadersText(e.target.value)}
                                                placeholder="Authorization: Bearer eyJ..."
                                            />
                                        </Field>
                                        <div className="form-row">
                                            <Field label="Interval (s)">
                                                <input type="number" min="5" value={form.monitor_interval} onChange={e => set("monitor_interval", parseInt(e.target.value) || 60)} />
                                            </Field>
                                            <Field label="Timeout (s)">
                                                <input type="number" min="1" value={form.monitor_timeout} onChange={e => set("monitor_timeout", parseInt(e.target.value) || 5)} />
                                            </Field>
                                            <Field label="Retries">
                                                <input type="number" min="0" value={form.monitor_retries} onChange={e => set("monitor_retries", parseInt(e.target.value) || 3)} />
                                            </Field>
                                        </div>
                                        <div className="form-row">
                                            <Field label="Expect status">
                                                <input type="number" value={form.monitor_expect_status} onChange={e => set("monitor_expect_status", parseInt(e.target.value) || 200)} />
                                            </Field>
                                            <Field label="Expect body contains">
                                                <input value={form.monitor_expect_body} onChange={e => set("monitor_expect_body", e.target.value)} placeholder="OK" />
                                            </Field>
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </section>

                    {/* Actions */}
                    <section className="form-section">
                        <h3>Actions</h3>
                        {form.actions.map((action, i) => (
                            <div key={i} className="action-form-block">
                                <div className="action-form-header">
                                    <span className="action-form-num">#{i + 1}</span>
                                    <button type="button" className="action-remove-btn" onClick={() => removeAction(i)}>Remove</button>
                                </div>
                                <div className="form-row">
                                    <Field label="Label *" error={errors[`action_${i}_label`]}>
                                        <input value={action.label} onChange={e => setAction(i, "label", e.target.value)} placeholder="Trigger" />
                                    </Field>
                                    <Field label="Icon">
                                        <div className="icon-input">
                                            <span className="icon-preview">{getIcon(action.icon, { size: 14 })}</span>
                                            <input value={action.icon} onChange={e => setAction(i, "icon", e.target.value)} placeholder="play" />
                                            <button type="button" className="icon-browse-btn" onClick={() => setPickerFor({ actionIndex: i })} title="Browse icons">
                                                {getIcon("layout-grid", { size: 12 })}
                                            </button>
                                        </div>
                                    </Field>
                                </div>
                                <div className="form-row">
                                    <Field label="Endpoint *" error={errors[`action_${i}_endpoint`]}>
                                        <input value={action.endpoint} onChange={e => setAction(i, "endpoint", e.target.value)} placeholder="/trigger or https://example.com" />
                                    </Field>
                                    <Field label="Method">
                                        <select value={action.method} onChange={e => setAction(i, "method", e.target.value)}>
                                            {METHODS.map(m => <option key={m}>{m}</option>)}
                                        </select>
                                    </Field>
                                </div>
                                <div className="form-row">
                                    <Field label="Body (JSON)" error={errors[`action_${i}_body`]}>
                                        <textarea rows={2} value={action.body} onChange={e => setAction(i, "body", e.target.value)} placeholder='{"key": "value"}' />
                                    </Field>
                                    <Field label="">
                                        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
                                            <label className="toggle-label small">
                                                <input type="checkbox" checked={action.confirm} onChange={e => setAction(i, "confirm", e.target.checked)} />
                                                Require confirm
                                            </label>
                                            <label className="toggle-label small">
                                                <input type="checkbox" checked={action.show_response ?? false} onChange={e => setAction(i, "show_response", e.target.checked)} />
                                                Show response
                                            </label>
                                        </div>
                                    </Field>
                                </div>
                            </div>
                        ))}
                        <button type="button" className="add-action-btn" onClick={addAction}>
                            {getIcon("plus", { size: 13 })} Add action
                        </button>
                    </section>
                </div>

                <div className="form-footer">
                    {error && <span className="form-footer-error">{error}</span>}
                    <button type="button" className="confirm-cancel" onClick={onCancel}>Cancel</button>
                    <button type="submit" className="confirm-ok" disabled={saving}>
                        {saving ? "Saving…" : "Save"}
                    </button>
                </div>
            </form>

            {pickerFor !== null && (
                <IconPicker
                    value={pickerFor === "service-icon" ? form.icon : form.actions[pickerFor.actionIndex]?.icon ?? ""}
                    onChange={kebab => {
                        if (pickerFor === "service-icon") set("icon", kebab)
                        else setAction(pickerFor.actionIndex, "icon", kebab)
                    }}
                    onClose={() => setPickerFor(null)}
                />
            )}
        </div>
    )
}

function Field({ label, error, children }) {
    return (
        <div className="field">
            {label && <label className="field-label">{label}</label>}
            {children}
            {error && <span className="field-error">{error}</span>}
        </div>
    )
}

export default ServiceForm
