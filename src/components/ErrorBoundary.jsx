import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="notfound">
        <h1>Something broke</h1>
        <pre className="muted">{String(this.state.error?.message || this.state.error)}</pre>
        <p>
          <a href="#/" onClick={() => this.setState({ error: null })}>
            Back to the course
          </a>
        </p>
      </div>
    );
  }
}
