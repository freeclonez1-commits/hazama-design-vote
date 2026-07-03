import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Mail } from 'lucide-react';
import { isFirebaseEnabled } from '../services/firebaseService';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(false);

  const mockAccounts = [
    { email: 'admin@hazama.com', label: 'Quản trị viên (Admin)', badge: 'Admin' },
    { email: 'ceo@hazama.com', label: 'Giám đốc (CEO)', badge: 'CEO' },
    { email: 'ads@gmail.com', label: 'Quảng cáo (Ads)', badge: 'Voter' },
    { email: 'hr@gmail.com', label: 'Nhân sự (HR)', badge: 'Voter' },
    { email: 'ke-toan@gmail.com', label: 'Kế toán', badge: 'Voter' }
  ];

  const handleGoogleLogin = async () => {
    if (isFirebaseEnabled) {
      setLoading(true);
      try {
        const success = await login('');
        if (!success) {
          toast('Tên miền chưa được ủy quyền Firebase Auth hoặc Popup bị chặn. Chuyển sang đăng nhập Email...', 'warning');
          setShowModal(true);
        }
      } catch (err) {
        toast('Chuyển sang đăng nhập Email...', 'info');
        setShowModal(true);
      } finally {
        setLoading(false);
      }
    } else {
      setShowModal(true);
    }
  };

  const handleMockLogin = async (email: string) => {
    setLoading(true);
    try {
      const success = await login(email);
      if (success) {
        toast(`Đăng nhập thành công với email ${email}`, 'success');
      } else {
        toast('Đăng nhập thất bại.', 'error');
      }
    } catch (e) {
      toast('Có lỗi xảy ra.', 'error');
    } finally {
      setLoading(false);
      setShowModal(false);
    }
  };

  const handleCustomLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      toast('Vui lòng nhập email.', 'warning');
      return;
    }
    await handleMockLogin(emailInput.trim());
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F9F9FB',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* 🔮 AMBIENT GLOWING ORBS BACKGROUND ANIMATIONS */}
      <div
        className="bg-orb-1"
        style={{
          position: 'absolute',
          top: '15%',
          left: '18%',
          width: '380px',
          height: '380px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 59, 48, 0.18) 0%, rgba(255, 149, 0, 0.08) 70%, rgba(255,255,255,0) 100%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
          zIndex: 1
        }}
      />
      <div
        className="bg-orb-2"
        style={{
          position: 'absolute',
          bottom: '12%',
          right: '15%',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(94, 92, 230, 0.16) 0%, rgba(0, 122, 255, 0.08) 70%, rgba(255,255,255,0) 100%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
          zIndex: 1
        }}
      />
      <div
        className="bg-orb-3"
        style={{
          position: 'absolute',
          top: '45%',
          right: '35%',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 45, 85, 0.12) 0%, rgba(255, 204, 0, 0.06) 70%, rgba(255,255,255,0) 100%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
          zIndex: 1
        }}
      />

      {/* Modern Fashion Grid Overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(#1D1D1F 0.75px, transparent 0.75px)',
          backgroundSize: '32px 32px',
          opacity: 0.03,
          pointerEvents: 'none',
          zIndex: 2
        }}
      />

      <div
        className="card animate-scale-up"
        style={{
          maxWidth: '420px',
          width: '100%',
          padding: '48px 36px',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          borderRadius: '24px',
          backgroundColor: 'rgba(255, 255, 255, 0.82)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          position: 'relative',
          zIndex: 10
        }}
      >
        {/* Official Hazama Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <img 
            src="https://bizweb.dktcdn.net/100/558/373/theme_temp/1024758/assets/logo-hazama-01-831cb57d-a357-419f-a4d9-e5d7a10f7f69-7f9fdab7-8bb7-494a-b91f-d4ba2604b1ce.png?1782204204270" 
            alt="Hazama Logo" 
            style={{ 
              height: '53px', 
              width: 'auto', 
              objectFit: 'contain'
            }} 
          />
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '8px',
            letterSpacing: '0px',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-sans)'
          }}
        >
          Design Vote
        </h2>
        
        {/* Subtitle */}
        <p
          style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            marginBottom: '36px',
            lineHeight: '1.4',
            fontWeight: 400
          }}
        >
          Đăng nhập nội bộ để tham gia bình chọn thiết kế bộ sưu tập mới
        </p>

        {/* Google Sign-In Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '13px 20px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            color: '#1D1D1F',
            backgroundColor: '#FFFFFF',
            border: '1px solid #D2D2D7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            cursor: 'pointer',
            transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = '#F5F5F7';
            e.currentTarget.style.borderColor = '#86868B';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = '#FFFFFF';
            e.currentTarget.style.borderColor = '#D2D2D7';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
          </svg>
          <span>Tiếp tục bằng tài khoản Google</span>
        </button>

        {/* Footer label */}
        <div style={{ marginTop: '48px', fontSize: '11px', color: '#86868B', opacity: 0.8, fontWeight: 400 }}>
          Dành riêng cho nhân sự Hazama. Bảo mật thông tin nội bộ.
        </div>
      </div>

      {/* Mock Auth Dialog Overlay */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowModal(false)}
          style={{ zIndex: 2000 }}
        >
          <div
            className="modal-content animate-scale-up"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '440px', borderRadius: '18px', overflow: 'hidden', border: '1px solid #E5E5EA', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}
          >
            <div style={{ padding: '32px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                Đăng nhập thử nghiệm (Demo Mode)
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.4' }}>
                Cấu hình Firebase chưa được thiết lập trong tệp tin <code style={{ color: 'var(--accent)', fontWeight: 600 }}>src/config/firebase.ts</code>. 
                <br /><br />
                Vui lòng chọn một tài khoản mẫu dưới đây hoặc nhập email bất kỳ để chạy thử ứng dụng:
              </p>

              {/* Mock accounts quick links */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                {mockAccounts.map(acc => (
                  <button
                    key={acc.email}
                    disabled={loading}
                    onClick={() => handleMockLogin(acc.email)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      width: '100%',
                      textAlign: 'left'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = '#F5F5F7';
                      e.currentTarget.style.borderColor = '#C7C7CC';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                      e.currentTarget.style.borderColor = 'var(--border)';
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{acc.label}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{acc.email}</span>
                    </div>
                    <span
                      className={`badge ${acc.badge === 'Admin' ? 'badge-danger' : acc.badge === 'CEO' ? 'badge-success' : 'badge-info'}`}
                      style={{ fontSize: '10px' }}
                    >
                      {acc.badge}
                    </span>
                  </button>
                ))}
              </div>

              {/* Arbitrary email input form */}
              <form onSubmit={handleCustomLoginSubmit}>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">Hoặc nhập email Google khác</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-secondary)', display: 'flex' }}>
                      <Mail size={16} />
                    </span>
                    <input
                      type="email"
                      className="input"
                      placeholder="email@example.com"
                      value={emailInput}
                      onChange={e => setEmailInput(e.target.value)}
                      disabled={loading}
                      style={{ paddingLeft: '40px', borderRadius: '10px', border: '1px solid #D2D2D7' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setShowModal(false)}
                    disabled={loading}
                    style={{ borderRadius: '10px', fontSize: '13px', padding: '10px 16px', fontWeight: 600 }}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                    style={{ borderRadius: '10px', fontSize: '13px', padding: '10px 20px', fontWeight: 600 }}
                  >
                    Tiếp tục
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
