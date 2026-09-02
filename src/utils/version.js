import { safeSessionStorage } from "./storage"

export const BUILD_VERSION = import.meta.env.VITE_APP_VERSION ?? "dev"

const RELOAD_FLAG_KEY = "versionReloadPending"

// A tab left open across a deploy keeps running the old JS bundle against a
// newer backend indefinitely — nothing about a normal page load would ever
// tell it otherwise. This makes it self-heal by reloading once when the
// backend's version no longer matches what this bundle was built with.
// Guards against a reload loop if a broken deploy leaves the mismatch
// unresolved after the reload.
export function checkVersion() {
  fetch("/version")
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      const backendVersion = data?.version
      if (!backendVersion || backendVersion === BUILD_VERSION) {
        safeSessionStorage.removeItem(RELOAD_FLAG_KEY)
        return
      }
      if (safeSessionStorage.getItem(RELOAD_FLAG_KEY) === backendVersion) {
        console.warn(
          `Version mismatch persists after reload (frontend ${BUILD_VERSION}, backend ${backendVersion})`
        )
        return
      }
      safeSessionStorage.setItem(RELOAD_FLAG_KEY, backendVersion)
      window.location.reload()
    })
    .catch(() => {})
}
