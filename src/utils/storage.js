const memoryStore = {}

function safeGet(storage, key) {
  try {
    return storage.getItem(key)
  } catch (err) {
    console.error("Storage read failed, falling back to memory:", err)
    return memoryStore[key] ?? null
  }
}

function safeSet(storage, key, value) {
  try {
    storage.setItem(key, value)
  } catch (err) {
    console.error("Storage write failed, falling back to memory:", err)
    memoryStore[key] = value
  }
}

function safeRemove(storage, key) {
  try {
    storage.removeItem(key)
  } catch (err) {
    console.error("Storage remove failed, falling back to memory:", err)
    delete memoryStore[key]
  }
}

export const safeLocalStorage = {
  getItem: (key) => safeGet(localStorage, key),
  setItem: (key, value) => safeSet(localStorage, key, value),
  removeItem: (key) => safeRemove(localStorage, key),
}

export const safeSessionStorage = {
  getItem: (key) => safeGet(sessionStorage, key),
  setItem: (key, value) => safeSet(sessionStorage, key, value),
  removeItem: (key) => safeRemove(sessionStorage, key),
}
