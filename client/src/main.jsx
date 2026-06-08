import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext.jsx';
import App from './App.jsx';
import './styles.css';

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    if (this.state.err) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: 'sans-serif', padding: 24 }}>
          <div style={{ fontSize: 36 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Something went wrong</div>
          <div style={{ fontSize: 13, color: '#666', maxWidth: 400, textAlign: 'center' }}>{this.state.err.message}</div>
          <button onClick={() => window.location.reload()} style={{ marginTop: 8, padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1B4332', color: '#fff', cursor: 'pointer', fontSize: 14 }}>
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
