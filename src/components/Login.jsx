import { useState } from "react"
import "./Login.css"

function Login({ onLogin, error }) {
  const [key, setKey] = useState("")

  const handleSubmit = (e) => {
    e.preventDefault()
    if (key.trim()) onLogin(key.trim())
  }

  return (
    <div className="login">
      <h1>Apollo Dashboard</h1>
      <form className="login-box" onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="Password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          autoFocus
        />
        <button type="submit">Enter</button>
        {error && <p className="login-error">Invalid API Key</p>}
      </form>
    </div>
  )
}

export default Login