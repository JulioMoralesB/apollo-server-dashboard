import { useEffect, useRef, useState } from "react";
import "./ActionPanel.css"
import { getIcon } from "../utils/icons.jsx"


// ─── JSON syntax highlighter ─────────────────────────────────────────────────

const JSON_TOKEN_RE = /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g

function tryHighlightJSON(text) {
    try {
        const parsed = JSON.parse(text)
        const pretty = JSON.stringify(parsed, null, 2)
        // Escape HTML entities first to prevent XSS, then colorize tokens
        const escaped = pretty
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
        return escaped.replace(JSON_TOKEN_RE, (match) => {
            if (/^"/.test(match)) {
                const cls = /:$/.test(match) ? "jk" : "js"
                return `<span class="${cls}">${match}</span>`
            }
            if (match === "true" || match === "false") return `<span class="jb">${match}</span>`
            if (match === "null") return `<span class="jn">${match}</span>`
            return `<span class="ji">${match}</span>`
        })
    } catch {
        return null
    }
}


// ─── Response viewer ─────────────────────────────────────────────────────────

function statusClass(code) {
    if (!code) return "error"
    if (code < 300) return "success"
    if (code < 500) return "warn"
    return "error"
}

function ResponseViewer({ result, onDismiss }) {
    if (!result) return null
    const { label, data } = result
    const rawText = data.body ?? data.message ?? (data.success ? "OK" : "No response body")
    const highlighted = rawText ? tryHighlightJSON(rawText) : null
    const sc = data.status_code

    return (
        <div className={`response-box ${data.success ? "response-success" : "response-error"}`}>
            <div className="response-header">
                <span className="response-label">↳ {label}</span>
                <div className="response-meta">
                    {sc != null && (
                        <span className={`response-status ${statusClass(sc)}`}>{sc}</span>
                    )}
                    <button className="response-dismiss" onClick={onDismiss} title="Dismiss">✕</button>
                </div>
            </div>
            {highlighted
                ? <pre className="response-body" dangerouslySetInnerHTML={{ __html: highlighted }} />
                : <pre className="response-body">{rawText}</pre>
            }
        </div>
    )
}


// ─── Main panel ──────────────────────────────────────────────────────────────

function ActionPanel({ service, onClose, apiKey }) {
    const actions = service.actions || [];
    const [actionStates, setActionStates] = useState({});
    const [lastResult, setLastResult] = useState(null);
    const [pendingAction, setPendingAction] = useState(null);
    const stateTimeoutsRef = useRef({});

    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === "Escape") onClose()
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [onClose]);

    useEffect(() => {
        const stateTimeouts = stateTimeoutsRef
        return () => {
            Object.values(stateTimeouts.current).forEach(clearTimeout);
        };
    }, []);

    const handleAction = (action, index) => {
        if (action.confirm) {
            setPendingAction({ action, index });
            return;
        }
        executeAction(action, index);
    };

    const handleConfirm = () => {
        if (pendingAction) {
            executeAction(pendingAction.action, pendingAction.index);
            setPendingAction(null);
        }
    };

    const executeAction = (action, index) => {
        if (action.href) {
            window.open(action.href, "_blank", "noopener");
            return;
        }
        if (!action.endpoint) return;

        setActionStates((prev) => ({ ...prev, [index]: "loading" }));

        fetch(action.endpoint, {
            method: action.method || "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": apiKey,
                ...action.headers,
            },
            body: action.payload ? JSON.stringify(action.payload) : undefined,
        })
            .then((res) => {
                if (res.status === 401) { onClose(); return null; }
                return res.json().catch(() => null).then((data) => ({ ok: res.ok, data }));
            })
            .then((result) => {
                if (!result) return;
                const { data } = result;
                const success = data?.success ?? result.ok;
                setActionStates((prev) => ({ ...prev, [index]: success ? "success" : "error" }));
                setLastResult({ label: action.label, data: data ?? {} });
            })
            .catch((err) => {
                setActionStates((prev) => ({ ...prev, [index]: "error" }));
                setLastResult({ label: action.label, data: { success: false, message: err.message } });
            })
            .finally(() => {
                if (stateTimeoutsRef.current[index]) clearTimeout(stateTimeoutsRef.current[index]);
                stateTimeoutsRef.current[index] = setTimeout(() => {
                    setActionStates((prev) => ({ ...prev, [index]: "idle" }));
                    delete stateTimeoutsRef.current[index];
                }, 2000);
            });
    };

    return (
        <div className="panel-backdrop">
            <div className="panel-header">
                <h2>{service.name}</h2>
                <button className="panel-back" onClick={onClose}>← Back</button>
            </div>

            {actions.length === 0 ? (
                <p className="panel-empty">No actions configured.</p>
            ) : (
                <div className="actions-grid">
                    {actions.map((action, i) => {
                        const state = actionStates[i] || "idle";
                        return (
                            <button
                                key={i}
                                className={`action-card ${state}`}
                                onClick={() => handleAction(action, i)}
                                disabled={state === "loading"}
                            >
                                {action.icon && (
                                    <span className="action-icon">
                                        {getIcon(action.icon, { size: 24 })}
                                    </span>
                                )}
                                <span className="action-label">{action.label}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            <ResponseViewer result={lastResult} onDismiss={() => setLastResult(null)} />

            {pendingAction && (
                <div className="confirm-backdrop" onClick={() => setPendingAction(null)}>
                    <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
                        <p className="confirm-message">Run <strong>{pendingAction.action.label}</strong>?</p>
                        <div className="confirm-buttons">
                            <button className="confirm-cancel" onClick={() => setPendingAction(null)}>Cancel</button>
                            <button className="confirm-ok" onClick={handleConfirm}>Confirm</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ActionPanel;
