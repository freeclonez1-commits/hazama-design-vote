import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Clock, LogOut } from 'lucide-react';
import { OnboardingSteps } from '../components/OnboardingSteps';

export const PendingApproval: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FAF9F6',
        padding: '24px'
      }}
    >
      <div
        className="card animate-scale-up"
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E5EA',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.03)',
          padding: '40px 32px',
          textAlign: 'center',
          borderRadius: '18px'
        }}
      >
        {/* Onboarding Step Indicators */}
        <OnboardingSteps currentStep={2} />

        {/* Brand Logo */}
        <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'center' }}>
          <img 
            src="https://bizweb.dktcdn.net/100/558/373/theme_temp/1024758/assets/logo-hazama-01-831cb57d-a357-419f-a4d9-e5d7a10f7f69-7f9fdab7-8bb7-494a-b91f-d4ba2604b1ce.png?1782204204270" 
            alt="Hazama Logo" 
            style={{ height: '30px', width: 'auto', objectFit: 'contain' }} 
          />
        </div>

        {/* Icon */}
        <div
          style={{
            display: 'inline-flex',
            backgroundColor: '#F5F5F7',
            color: '#1D1D1F',
            width: 50,
            height: 50,
            borderRadius: '12px',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px'
          }}
        >
          <Clock size={20} />
        </div>

        {/* Header */}
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: '12px' }}>
          Tài khoản đang chờ duyệt
        </h2>

        {/* Message */}
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '24px' }}>
          Chào <strong>{user?.name || user?.email}</strong>, tài khoản nội bộ của bạn hiện đang ở trạng thái chờ kích hoạt từ Quản trị viên. 
          Vui lòng liên hệ Admin của bộ phận để được duyệt quyền truy cập bình chọn.
        </p>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Vai trò đã đăng ký: <strong style={{ color: 'var(--text-primary)' }}>{user?.role}</strong>
          </div>
          
          <button
            onClick={logout}
            className="btn btn-outline"
            style={{
              marginTop: '12px',
              width: '100%',
              borderRadius: '10px',
              padding: '12px',
              fontSize: '13px',
              fontWeight: 600,
              gap: '6px',
              justifyContent: 'center'
            }}
          >
            <LogOut size={14} /> Đăng xuất tài khoản
          </button>
        </div>
      </div>
    </div>
  );
};
