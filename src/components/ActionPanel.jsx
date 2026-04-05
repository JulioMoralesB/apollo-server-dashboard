import { act, useEffect } from "react";
import "./ActionPanel.css"
import { getIcon } from "../utils/icons.jsx"

function ActionPanel ({service, onClose, apiKey}) {
    const actions = service.actions || [];

    // Close panel on Escape key press
    useEffect(() => {
        const handleKey = (e) => { 
            if (e.key === "Escape") onClose()
            };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [onClose]);

    const handleAction = (action) => {
        if (action.href) {
            window.open(action.href, "_blank", "noopener");
            return;
        }
        if (action.endpoint) {
            fetch(action.endpoint, { 
                method: action.method || "POST", 
                headers: {
                    "Content-Type": "application/json",
                    "X-API-Key": apiKey,
                    ...action.headers,
                 },
                body: action.payload ? JSON.stringify(action.payload) : undefined,})
                .catch((err) => console.error(`Error performing action ${action.name}:`, err));
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
                {actions.map((action, i) => (
                <button key={i} className="action-card" onClick={() => handleAction(action)}>
                    {action.icon && <span className="action-icon">{getIcon(action.icon, { size: 24 })}</span>}
                    <span className="action-label">{action.label}</span>
                </button>
                ))}
            </div>
            )}
        </div>
)
}

export default ActionPanel;