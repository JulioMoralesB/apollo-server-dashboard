import { useEffect, useState } from "react"
import ServiceCard from "./components/ServiceCard"

function App() {
  const [services, setServices] = useState([])

  useEffect(() => {
    fetch("/services")
      .then((res) => res.json())
      .then((data) => setServices(data))
      .catch((err) => console.error("Failed to fetch services:", err))
  }, [])

  return (
    <div className="dashboard">
      <h1>Apollo Server Dashboard</h1>
      <div className="services-grid">
        {services.map((service, index) => (
          <ServiceCard key={index} name={service.name} status={service.status} />
        ))}
      </div>
    </div>
  )
}

export default App