import { useEffect, useState } from "react"
import ServiceCard from "./components/ServiceCard"

function App() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    let didCancel = false

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
      })
      .catch((err) => {
        if (didCancel || err.name === "AbortError") return
        setError(err.message)
        setLoading(false)
      })

    return () => {
      didCancel = true
      controller.abort()
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
    </div>
  )
}

export default App