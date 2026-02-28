import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

class ErrorBoundary extends React.Component {
  state = { hasError: false, message: '' }
  static getDerivedStateFromError(err) {
    return { hasError: true, message: err?.message || String(err) }
  }
  componentDidCatch(err, info) {
    console.error(err, info)
  }
  render() {
    if (this.state.hasError)
      return (
        <div style={{ padding: 20, fontFamily: "sans-serif" }}>
          <h2>렌더링 오류</h2>
          <pre style={{ background: "#f5f5f5", padding: 10 }}>{this.state.message}</pre>
          <button onClick={() => this.setState({ hasError: false })}>다시 시도</button>
        </div>
      )
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)