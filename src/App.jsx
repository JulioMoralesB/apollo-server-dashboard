import { useEffect, useState } from "react"
import ServiceCard from "./components/ServiceCard"

const REFRESH_INTERVAL_MS = 30_000

function App() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    let didCancel = false
    let currentController = null

    function fetchServices() {
      currentController?.abort()
      const controller = new AbortController()
      currentController = controller

      fetch("/services", { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`)
          return res.json()
        })
        .then((data) => {
          if (didCancel) return
          setError(null)
          setServices(data)
          setLoading(false)
          setLastUpdated(new Date())
        })
        .catch((err) => {
          if (didCancel || err.name === "AbortError") return
          setError(err.message)
          setLoading(false)
        })
    }

    fetchServices()

    const intervalId = setInterval(fetchServices, REFRESH_INTERVAL_MS)

    return () => {
      didCancel = true
      clearInterval(intervalId)
      currentController?.abort()
    }
  }, [])

  return (
    <div className="dashboard">
      <h1>Apollo Server Dashboard</h1>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      <div className="services-grid">
        {services.map((service, index) => (
          <ServiceCard key={`${service.name}-${index}`} name={service.name} status={service.status} />
        ))}
      </div>
      {lastUpdated && (
        <p className="last-updated">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      )}
    </div>
  )
}

export default App