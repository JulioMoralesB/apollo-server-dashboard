
import "./ServiceCard.css"

function ServiceCard({ name, status, onClick }) {
  const isOnline = status === "online"

  return (
    <div 
      className={`service-card ${isOnline ? "online" : "offline"}`}
      onClick={onClick}
      style={{ cursor: "pointer"}}
    >
      <p className="service-name">{name.toUpperCase()}</p>
      <p className={`service-status ${isOnline ? "online" : "offline"}`}>
        <span className="dot"></span>
        {isOnline ? "Online" : "Offline"}
      </p>
    </div>
  )
}

export default ServiceCard