import { useEffect, useState } from "react"
import ServiceCard from "./components/ServiceCard"
import ActionPanel from "./components/ActionPanel"
import Login from "./components/Login"
import { getIcon } from "./utils/icons"

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

  function handleSelectService(service) {
    setSelectedService(service)
    history.pushState({ panelOpen: true }, "")
  }

  function handleClosePanel() {
    setSelectedService(null)
    history.back()
  }

  useEffect(() => {
    function handlePopState() {
      setSelectedService(null)
    }
    window.addEventListener("popstate", handlePopState)
    return () => {
      window.removeEventListener("popstate", handlePopState)
    }
  }, [])

  useEffect(() => {
    const onlineCount = services.filter(s => s.status === "online").length
    document.title = services.length > 0
      ? `Apollo - ${onlineCount}/${services.length} online`
      : "Apollo Dashboard"
  }, [services])

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
      <header className="dashboard-header">

        <div className="header-left">
          <img src="/favicon.svg" alt="Apollo" width={40} height={40} />
          <span className="header-title">Apollo Dashboard</span>
        </div>

        <div className="header-right">
          {lastUpdated && (
            <span className="last-updated">
              Synced {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>
      {loading && (
        <div className="state-box">
          {getIcon("loader", { size: 16, className: "spin" })}
          <p>Fetching services</p>
        </div>
      )}
      {error && (
        <div className="state-box error">
          {getIcon("error", { size: 16 })}
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && services.length === 0 && (
        <div className="state-box">
          {getIcon("empty", { size: 16 })}
          <p>No services found</p>
        </div>
      )}

      <div className="services-grid">
        {services.map((service, index) => (
          <ServiceCard 
            key={`${service.name}-${index}`} 
            name={service.name} 
            status={service.status} 
            icon={service.icon}
            url={service.url}
            actions={service.actions}
            onClick={() => handleSelectService(service)} 
            index={index}
          />
        ))}
      </div>
      {selectedService && (
        <ActionPanel 
          service={selectedService} 
          onClose={handleClosePanel} 
          apiKey={apiKey}
        />
      )}
      
    </div>
  )
}

export default App