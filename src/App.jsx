import { useCallback, useEffect, useRef, useState } from "react"
import ServiceCard from "./components/ServiceCard"
import ActionPanel from "./components/ActionPanel"
import AdminPanel from "./components/AdminPanel"
import Login from "./components/Login"
import { getIcon } from "./utils/icons"
import {
  clearAuth,
  loadStoredAuth,
  login as loginRequest,
  persistAccessToken,
  persistAuth,
  refreshAccessToken,
} from "./utils/auth"
import { checkVersion } from "./utils/version"

const REFRESH_INTERVAL_MS = 30_000

function App() {
  const [services, setServices] = useState([])
  const [summaries, setSummaries] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [selectedService, setSelectedService] = useState(null)
  const [{ accessToken, refreshToken }, setAuth] = useState(loadStoredAuth)
  const [authError, setAuthError] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const fetchServicesRef = useRef(null)
  const accessTokenRef = useRef(accessToken)
  const refreshTokenRef = useRef(refreshToken)

  useEffect(() => { accessTokenRef.current = accessToken }, [accessToken])
  useEffect(() => { refreshTokenRef.current = refreshToken }, [refreshToken])

  const handleLogout = useCallback(() => {
    clearAuth()
    setAuth({ accessToken: "", refreshToken: "" })
    setSelectedService(null)
    setServices([])
    setSummaries({})
    setError(null)
    setLastUpdated(null)
    setAuthError(true)
  }, [])

  // Attaches the access token to every request and, on a 401/403, transparently
  // refreshes it and retries once — the same silent renewal a background
  // widget would need, so it's exercised here rather than only in the app.
  const authFetch = useCallback((url, options = {}) => {
    const doFetch = (token) =>
      fetch(url, {
        ...options,
        headers: { ...options.headers, Authorization: `Bearer ${token}` },
      })

    return doFetch(accessTokenRef.current).then((res) => {
      if (res.status !== 401 && res.status !== 403) return res
      if (!refreshTokenRef.current) {
        handleLogout()
        return res
      }
      return refreshAccessToken(refreshTokenRef.current).then((newAccessToken) => {
        if (!newAccessToken) {
          handleLogout()
          return res
        }
        accessTokenRef.current = newAccessToken
        setAuth((prev) => ({ ...prev, accessToken: newAccessToken }))
        persistAccessToken(newAccessToken)
        return doFetch(newAccessToken)
      })
    })
  }, [handleLogout])

  const handleLogin = (username, password, rememberMe) => {
    setLoading(true)
    setAuthError(false)
    loginRequest(username, password)
      .then((data) => {
        persistAuth({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          rememberMe,
        })
        setAuth({ accessToken: data.access_token, refreshToken: data.refresh_token })
      })
      .catch(() => {
        setLoading(false)
        setAuthError(true)
      })
  }

  function handleSelectService(service) {
    setSelectedService(service)
    history.pushState({ panelOpen: true, selectedService: service }, "")
  }

  function handleClosePanel() {
    setSelectedService(null)
    if (window.history.state?.panelOpen) {
      history.back()
    }
  }

  function handleOpenAdmin() {
    setAdminOpen(true)
    history.pushState({ adminOpen: true }, "")
  }

  function handleCloseAdmin() {
    setAdminOpen(false)
    if (window.history.state?.adminOpen) {
      history.back()
    }
  }

  useEffect(() => {
    function syncStateFromHistory(state) {
      setSelectedService(state?.panelOpen ? (state.selectedService ?? null) : null)
      setAdminOpen(state?.adminOpen ?? false)
    }

    function handlePopState(event) {
      syncStateFromHistory(event.state)
    }

    syncStateFromHistory(window.history.state)
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
    if (!accessToken) return
    let didCancel = false
    let currentController = null

    function fetchServices() {
      currentController?.abort()
      const controller = new AbortController()
      currentController = controller

      checkVersion()

      authFetch("/services", { signal: controller.signal })
        .then((res) => {
          if (res.status === 401 || res.status === 403) return null
          if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`)
          return res.json()
        })
        .then((data) => {
          if (didCancel || !data) return
          setError(null)
          setServices(data)
          setLoading(false)
          setLastUpdated(new Date())
          data
            .filter((s) => s.summary_endpoint)
            .forEach((s) => fetchSummary(s.name, s.summary_endpoint, controller.signal))
        })
        .catch((err) => {
          if (didCancel || err.name === "AbortError") return
          setError(err.message)
          setLoading(false)
        })
    }

    function fetchSummary(name, endpoint, signal) {
      authFetch(endpoint, { signal })
        .then((res) =>
          res.json().catch(() => ({})).then((body) => {
            if (didCancel) return
            const entry = res.ok ? body : { __error: body.detail || `HTTP ${res.status}` }
            setSummaries((prev) => ({ ...prev, [name]: entry }))
          })
        )
        .catch((err) => {
          if (didCancel || err.name === "AbortError") return
          setSummaries((prev) => ({ ...prev, [name]: { __error: err.message } }))
        })
    }

    fetchServicesRef.current = fetchServices
    fetchServices()

    const intervalId = setInterval(fetchServices, REFRESH_INTERVAL_MS)

    return () => {
      didCancel = true
      clearInterval(intervalId)
      currentController?.abort()
    }
  }, [accessToken, authFetch])

  if (!accessToken) {
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
          <button className="icon-btn" onClick={handleOpenAdmin} title="Config">
            {getIcon("settings", { size: 16 })}
          </button>
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
          summary={summaries[selectedService.name]}
          onClose={handleClosePanel}
          authFetch={authFetch}
        />
      )}
      {adminOpen && (
        <AdminPanel
          onClose={handleCloseAdmin}
          authFetch={authFetch}
          onConfigChanged={() => fetchServicesRef.current?.()}
        />
      )}

    </div>
  )
}

export default App
