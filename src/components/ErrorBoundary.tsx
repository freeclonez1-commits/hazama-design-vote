import React, { Component } from 'react';

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Hazama Design Vote — Uncaught Error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.hash = '#/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FAF9F6',
            padding: '24px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
          }}
        >
          <div
            style={{
              maxWidth: '440px',
              width: '100%',
              background: '#FFFFFF',
              border: '1px solid #E5E5EA',
              borderRadius: '18px',
              padding: '40px 32px',
              textAlign: 'center',
              boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
            }}
          >
            {/* Error icon */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '14px',
                backgroundColor: '#FFF2F0',
                color: '#FF3B30',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px auto',
                fontSize: '28px'
              }}
            >
              ⚠️
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1D1D1F', marginBottom: '10px' }}>
              Ứng dụng gặp sự cố
            </h2>
            <p style={{ fontSize: '13px', color: '#8E8E93', lineHeight: 1.6, marginBottom: '8px' }}>
              Đã xảy ra lỗi không mong muốn. Thông tin lỗi đã được ghi lại.
            </p>
            {this.state.error && (
              <p
                style={{
                  fontSize: '11px',
                  color: '#FF3B30',
                  background: '#FFF2F0',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  marginBottom: '24px',
                  textAlign: 'left',
                  wordBreak: 'break-word',
                  fontFamily: 'monospace'
                }}
              >
                {this.state.error.message}
              </p>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: '1px solid #D2D2D7',
                  background: '#FFFFFF',
                  color: '#1D1D1F',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Tải lại trang
              </button>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#1D1D1F',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Về trang chủ
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
