import { useEffect, useState } from "react";
import "./ActionPanel.css"
import { getIcon } from "../utils/icons.jsx"


function ActionPanel ({service, onClose, apiKey}) {
    const actions = service.actions || [];
    const [actionStates, setActionStates] = useState({});
    const [errorMessage, setErrorMessage] = useState(null);
    const [pendingAction, setPendingAction] = useState(null);

    // Close panel on Escape key press
    useEffect(() => {
        const handleKey = (e) => { 
            if (e.key === "Escape") onClose()
            };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [onClose]);

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
                .then((res) => res.json())
                .then((data) => {
                    const state = data.success ? "success" : "error";
                    setActionStates((prev) => ({ ...prev, [index]: state }));
                    if (!data.success && data.message) {
                        setErrorMessage(`Error performing action ${action.label}: ${data.message}`);
                        setTimeout(() => setErrorMessage(null), 4000);
                    }
                })
                .catch((err) => {
                    console.error(`Error performing action ${action.label}:`, err);
                    setErrorMessage(`Error performing action ${action.label}: ${err.message}`);
                    setActionStates((prev) => ({ ...prev, [index]: "error" }));
                    setTimeout(() => setErrorMessage(null), 4000);
                })
                .finally(() => {
                    setTimeout(() => {
                        setActionStates((prev) => ({ ...prev, [index]: "idle" }));
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
            <p className="panel-empty">No hay acciones configuradas.</p>
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