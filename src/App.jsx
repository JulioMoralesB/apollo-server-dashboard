import { useEffect, useState } from "react"
import ServiceCard from "./components/ServiceCard"
import ActionPanel from "./components/ActionPanel"
import Login from "./components/Login"

const REFRESH_INTERVAL_MS = 30_000

function App() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [selectedService, setSelectedService] = useState(null)
  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem("apiKey") || "")
  const [authError, setAuthError] = useState(false)

  const handleLogin = (key) => {
    setLoading(true)
    setApiKey(key)
    sessionStorage.setItem("apiKey", key)
  }

  const handleLogout = () => {
    setApiKey("")
    sessionStorage.removeItem("apiKey")
    setSelectedService(null)
    setServices([])
    setError(null)
    setLastUpdated(null)
    setAuthError(true)
  }

  useEffect(() => {
    if (!apiKey) return
    let didCancel = false
    let currentController = null
    

    function fetchServices() {
      currentController?.abort()
      const controller = new AbortController()
      currentController = controller

      fetch("/services", { signal: controller.signal, headers: { "X-API-Key": apiKey } })
        .then((res) => {
          if (res.status === 401) {
            handleLogout()
            return
          }
          if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`)
          return res.json()
        })
        .then((data) => {
          if (didCancel || !data) return
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
  }, [apiKey])

  if (!apiKey) {
    return <Login onLogin={handleLogin} error={authError} />
  }

  return (
    <div className="dashboard">
      <h1>Apollo Server Dashboard</h1>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      <div className="services-grid">
        {services.map((service, index) => (
          <ServiceCard 
            key={`${service.name}-${index}`} 
            name={service.name} 
            status={service.status} 
            onClick={() => setSelectedService(service)} 
          />
        ))}
      </div>
      {selectedService && (
        <ActionPanel 
          service={selectedService} 
          onClose={() => setSelectedService(null)} 
          apiKey={apiKey}
        />
      )}
      {lastUpdated && (
        <p className="last-updated">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      )}
    </div>
  )
}

export default App