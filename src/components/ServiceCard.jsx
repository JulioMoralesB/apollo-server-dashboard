
import "./ServiceCard.css"
import { getIcon } from "../utils/icons"

function ServiceCard({ name, status, icon, actions, url, onClick, index }) {
  const isOnline = status === "online"
  const isUnknown = status === "unknown"
  const hasActions = actions && actions.length > 0
  const actionCount = hasActions ? actions.length : 0
  const isClickable = hasActions || !!url

  const handleClick = () => {
    if (hasActions) onClick()
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
      className={`service-card ${isOnline ? "online" : isUnknown ? "unknown" : "offline"} ${isClickable ? "clickable" : ""} ${url && !hasActions ? "has-url" : ""}`}
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
      {url && !hasActions && (
        <p className="action-count" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {getIcon("external-link", { size: 12 })} Open UI
        </p>
      )}
    </div>
  )
}

export default ServiceCard