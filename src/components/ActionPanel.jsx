import { useEffect, useRef, useState } from "react";
import "./ActionPanel.css"
import { getIcon } from "../utils/icons.jsx"


function ActionPanel ({service, onClose, apiKey}) {
    const actions = service.actions || [];
    const [actionStates, setActionStates] = useState({});
    const [errorMessage, setErrorMessage] = useState(null);
    const [pendingAction, setPendingAction] = useState(null);
    const errorTimeoutRef = useRef(null);
    const stateTimeoutsRef = useRef({});

    // Close panel on Escape key press
    useEffect(() => {
        const handleKey = (e) => { 
            if (e.key === "Escape") onClose()
            };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [onClose]);

    // Clear all pending timeouts on unmount
    useEffect(() => {
        return () => {
            if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
            Object.values(stateTimeoutsRef.current).forEach(clearTimeout);
        };
    }, []);

    const setErrorWithTimeout = (msg) => {
        if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
        setErrorMessage(msg);
        errorTimeoutRef.current = setTimeout(() => setErrorMessage(null), 4000);
    };

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

    const handleCancel = () => {
        setPendingAction(null);
    };

    const executeAction = (action, index) => {
        if (action.href) {
            window.open(action.href, "_blank", "noopener");
            return;
        }
        if (action.endpoint) {

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
                    if (res.status === 401) {
                        onClose();
                        return null;
                    }
                    if (!res.ok) {
                        return res.json().catch(() => null).then((data) => {
                            const msg = data?.detail || data?.message || res.statusText;
                            throw new Error(msg);
                        });
                    }
                    return res.json();
                })
                .then((data) => {
                    if (!data) return;
                    const state = data.success ? "success" : "error";
                    setActionStates((prev) => ({ ...prev, [index]: state }));
                    if (!data.success && data.message) {
                        setErrorWithTimeout(`Error performing action ${action.label}: ${data.message}`);
                    }
                })
                .catch((err) => {
                    console.error(`Error performing action ${action.label}:`, err);
                    setErrorWithTimeout(`Error performing action ${action.label}: ${err.message}`);
                    setActionStates((prev) => ({ ...prev, [index]: "error" }));
                })
                .finally(() => {
                    if (stateTimeoutsRef.current[index]) clearTimeout(stateTimeoutsRef.current[index]);
                    stateTimeoutsRef.current[index] = setTimeout(() => {
                        setActionStates((prev) => ({ ...prev, [index]: "idle" }));
                        delete stateTimeoutsRef.current[index];
                    }, 2000);
                });
                
        }
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
            {errorMessage && (
                <p className="action-error">{errorMessage}</p>
            )}
            {pendingAction && (
                <div className="confirm-backdrop" onClick={handleCancel}>
                    <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
                    <p className="confirm-message">Run <strong>{pendingAction.action.label}</strong>?</p>
                    <div className="confirm-buttons">
                        <button className="confirm-cancel" onClick={handleCancel}>Cancel</button>
                        <button className="confirm-ok" onClick={handleConfirm}>Confirm</button>
                    </div>
                    </div>
                </div>
            )}
        </div>
)
}

export default ActionPanel;