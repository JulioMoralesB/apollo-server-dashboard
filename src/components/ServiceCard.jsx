
import "./ServiceCard.css"

function ServiceCard({ name, status, onClick }) {
  const isOnline = status === "online"

  return (
    <button
      className={`service-card ${isOnline ? "online" : "offline"}`}
      onClick={onClick}
    >
      <p className="service-name">{name.toUpperCase()}</p>
      <p className={`service-status ${isOnline ? "online" : "offline"}`}>
        <span className="dot"></span>
        {isOnline ? "Online" : "Offline"}
      </p>
    </button>
  )
}

export default ServiceCard