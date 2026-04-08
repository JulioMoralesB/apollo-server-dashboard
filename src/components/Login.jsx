import { useState } from "react"
import "./Login.css"

function Login({ onLogin, error }) {
  const [key, setKey] = useState("")
  const [rememberMe, setRememberMe] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (key.trim()) onLogin(key.trim(), rememberMe)
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
        <label className="remember-me">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          Remember me
        </label>
        <button type="submit">Enter</button>
        {error && <p className="login-error">Invalid API Key</p>}
      </form>
    </div>
  )
}

export default Login