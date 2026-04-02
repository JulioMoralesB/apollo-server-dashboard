import { useEffect, useState } from "react"
import ServiceCard from "./components/ServiceCard"

function App() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch("/services")
      .then((res) => {
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`)
        return res.json()
      })
      .then((data) => {
        setServices(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return (
    <div className="dashboard">
      <h1>Apollo Server Dashboard</h1>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      <div className="services-grid">
        {services.map((service) => (
          <ServiceCard key={service.name} name={service.name} status={service.status} />
        ))}
      </div>
    </div>
  )
}

export default App