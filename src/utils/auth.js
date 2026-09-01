import { safeLocalStorage, safeSessionStorage } from "./storage"

const ACCESS_KEY = "accessToken"
const REFRESH_KEY = "refreshToken"

export function loadStoredAuth() {
  const accessToken =
    safeLocalStorage.getItem(ACCESS_KEY) || safeSessionStorage.getItem(ACCESS_KEY) || ""
  const refreshToken =
    safeLocalStorage.getItem(REFRESH_KEY) || safeSessionStorage.getItem(REFRESH_KEY) || ""
  return { accessToken, refreshToken }
}

export function persistAuth({ accessToken, refreshToken, rememberMe }) {
  const store = rememberMe ? safeLocalStorage : safeSessionStorage
  store.setItem(ACCESS_KEY, accessToken)
  store.setItem(REFRESH_KEY, refreshToken)
}

export function persistAccessToken(accessToken) {
  // Keep it in whichever storage already holds the refresh token
  const store = safeLocalStorage.getItem(REFRESH_KEY) ? safeLocalStorage : safeSessionStorage
  store.setItem(ACCESS_KEY, accessToken)
}

export function clearAuth() {
  safeLocalStorage.removeItem(ACCESS_KEY)
  safeLocalStorage.removeItem(REFRESH_KEY)
  safeSessionStorage.removeItem(ACCESS_KEY)
  safeSessionStorage.removeItem(REFRESH_KEY)
}

export function login(username, password) {
  return fetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  }).then((res) => {
    if (!res.ok) throw new Error("Invalid username or password")
    return res.json()
  })
}

export function refreshAccessToken(refreshToken) {
  return fetch("/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => data?.access_token ?? null)
    .catch(() => null)
}
