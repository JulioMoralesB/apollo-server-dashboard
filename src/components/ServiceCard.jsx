
import "./ServiceCard.css"
import { getIcon } from "../utils/icons"

function ServiceCard({ name, status, icon, actions, onClick, index }) {
  const isOnline = status === "online"
  const hasActions = actions && actions.length > 0
  const actionCount = hasActions ? actions.length : 0

  return (
    <div
      className={`service-card ${isOnline ? "online" : "offline"} ${hasActions ? "clickable" : ""}`}
      onClick={hasActions ? onClick : undefined}
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

      <p className={`service-status ${isOnline ? "online" : "offline"}`}>
        <span className="dot"></span>
        {isOnline ? "Online" : "Offline"}
      </p>

      {hasActions && (
        <p className="action-count">
          {actionCount} {actionCount === 1 ? "action" : "actions"}
        </p>
      )}
    </div>
  )
}

export default ServiceCard