
import "./ServiceCard.css"

function ServiceCard({ name, status }) {
  const isOnline = status === "online"

  return (
    <div className={`service-card ${isOnline ? "online" : "offline"}`}>
      <p className="service-name">{name.toUpperCase()}</p>
      <p className={`service-status ${isOnline ? "online" : "offline"}`}>
        <span className="dot"></span>
        {isOnline ? "Online" : "Offline"}
      </p>
    </div>
  )
}

export default ServiceCard