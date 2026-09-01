import { useState } from "react"
import "./Login.css"

function Login({ onLogin, error }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (username.trim() && password) onLogin(username.trim(), password, rememberMe)
  }

  return (
    <div className="login">
      <h1>Apollo Dashboard</h1>
      <form className="login-box" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          autoComplete="username"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
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
        {error && <p className="login-error">Invalid username or password</p>}
      </form>
    </div>
  )
}

export default Login
