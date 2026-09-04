
import "./ServiceCard.css"
import { getIcon } from "../utils/icons"

function ServiceCard({ name, status, icon, actions, url, summaryEndpoint, onClick, index }) {
  const isOnline = status === "online"
  const isUnknown = status === "unknown"
  const hasActions = actions && actions.length > 0
  const actionCount = hasActions ? actions.length : 0
  // A service with only a summary (no actions) still needs to open the
  // panel — that's the only place its summary renders — so it takes the
  // same priority as having actions, ahead of just opening an external URL.
  const opensPanel = hasActions || !!summaryEndpoint
  const isClickable = opensPanel || !!url

  const handleClick = () => {
    if (opensPanel) onClick()
    else if (url) window.open(url, "_blank", "noopener,noreferrer")
  }


  const handleKeyDown = isClickable
    ? (e) => {
        if (e.key === "Enter") { e.preventDefault(); handleClick(); }
        if (e.key === " ") { e.preventDefault(); }
      }
    : undefined

  const handleKeyUp = isClickable
    ? (e) => { if (e.key === " ") handleClick(); }
    : undefined

  return (
    <div
      className={`service-card ${isOnline ? "online" : isUnknown ? "unknown" : "offline"} ${isClickable ? "clickable" : ""} ${url && !opensPanel ? "has-url" : ""}`}
      onClick={isClickable ? handleClick : undefined}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      style={{ animationDelay: `${index * 60}ms`}}
    >
      <div className="card-corner top-left" />
      <div className="card-corner top-right" />
      <div className="card-corner bottom-left" />
      <div className="card-corner bottom-right" />

      <div className="card-icon">
        {icon ? getIcon(icon, { size: 48 }) : null}
      </div>

      <p className="service-name">{name.toUpperCase()}</p>

      <p className={`service-status ${isOnline ? "online" : isUnknown ? "unknown" : "offline"}`}>
        <span className="dot"></span>
        {isOnline ? "Online" : isUnknown ? "Unknown" : "Offline"}
      </p>

      {hasActions && (
        <p className="action-count">
          {actionCount} {actionCount === 1 ? "action" : "actions"}
        </p>
      )}
      {!hasActions && summaryEndpoint && (
        <p className="action-count" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {getIcon("bar-chart", { size: 12 })} Summary
        </p>
      )}
      {url && !opensPanel && (
        <p className="action-count" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {getIcon("external-link", { size: 12 })} Open UI
        </p>
      )}
    </div>
  )
}

export default ServiceCard