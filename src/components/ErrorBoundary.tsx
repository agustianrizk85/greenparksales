import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
  stack: string;
}

/**
 * Catches render-time errors so a single failing panel shows a readable message
 * (with the component stack) instead of unmounting the whole app to a blank
 * screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, stack: "" };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Dashboard render error:", error, info.componentStack);
    this.setState({ stack: info.componentStack ?? "" });
  }

  render() {
    if (this.state.error) {
      return (
        <div style={wrap}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#b3261e" }}>
            Terjadi error pada tampilan
          </div>
          <div style={{ fontSize: 14, color: "#16241c", fontWeight: 700 }}>
            {this.state.error.message}
          </div>
          <pre style={pre}>
            {(this.state.error.stack || "") + "\n--- component stack ---" + this.state.stack}
          </pre>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={btn} onClick={() => this.setState({ error: null, stack: "" })}>
              Coba lagi
            </button>
            <button style={btn} onClick={() => location.reload()}>
              Muat ulang halaman
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const wrap: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "#fff",
  color: "#16241c",
  padding: 32,
  display: "flex",
  flexDirection: "column",
  gap: 14,
  overflow: "auto",
  zIndex: 99999,
  fontFamily: "system-ui, sans-serif",
};
const pre: React.CSSProperties = {
  fontSize: 12,
  lineHeight: 1.5,
  color: "#3a4a40",
  background: "#f2f5f1",
  border: "1px solid #e4eae5",
  borderRadius: 8,
  padding: 14,
  maxHeight: "60vh",
  overflow: "auto",
  whiteSpace: "pre-wrap",
};
const btn: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  padding: "10px 18px",
  borderRadius: 9,
  border: "none",
  background: "#1f9d54",
  color: "#fff",
  cursor: "pointer",
};
