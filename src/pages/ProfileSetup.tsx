import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import type { User } from '../types/models';
import { UserCheck, Sparkles } from 'lucide-react';
import { OnboardingSteps } from '../components/OnboardingSteps';

export const ProfileSetup: React.FC = () => {
  const { user, completeProfile } = useAuth();
  const { toast } = useToast();
  const [nameInput, setNameInput] = useState('');
  const [roleInput, setRoleInput] = useState<User['role']>('Designer');
  const [submitting, setSubmitting] = useState(false);

  const rolesList: { value: User['role']; label: string }[] = [
    { value: 'CEO', label: 'Giám đốc (CEO)' },
    { value: 'Designer', label: 'Nhà thiết kế (Designer)' },
    { value: 'Ads', label: 'Quảng cáo (Ads)' },
    { value: 'HR', label: 'Nhân sự (HR)' },
    { value: 'Kế toán', label: 'Kế toán' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nameInput.trim()) {
      toast('Vui lòng nhập họ tên của bạn.', 'warning');
      return;
    }

    if (nameInput.trim().length < 3) {
      toast('Họ tên quá ngắn. Vui lòng nhập đầy đủ họ tên.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await completeProfile(nameInput, roleInput);
      toast('Cập nhật hồ sơ thành công!', 'success');
      // Redirect occurs automatically in App.tsx routing
    } catch (err) {
      console.error(err);
      toast('Có lỗi xảy ra khi lưu hồ sơ.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

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
          maxWidth: '460px',
          width: '100%',
          padding: '40px 32px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.03)',
          borderRadius: '18px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E5EA'
        }}
      >
        {/* Step progress bar */}
        <OnboardingSteps currentStep={1} />

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: '12px',
              backgroundColor: '#F5F5F7',
              color: '#1D1D1F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}
          >
            <Sparkles size={20} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Hoàn thiện thông tin
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
            Hãy điền thông tin để tiếp tục bình chọn. Email của bạn:<br />
            <strong style={{ color: 'var(--text-primary)' }}>{user?.email}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Full Name input */}
          <div className="form-group">
            <label className="form-label" htmlFor="full-name" style={{ fontSize: '12px', fontWeight: 600, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Họ tên của bạn
            </label>
            <input
              id="full-name"
              type="text"
              className="input"
              placeholder="Ví dụ: Nguyễn Văn A"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              disabled={submitting}
              autoFocus
              style={{ borderRadius: '10px', border: '1px solid #D2D2D7', fontSize: '14px', padding: '12px 16px' }}
            />
          </div>

          {/* Role select */}
          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label className="form-label" htmlFor="role-select" style={{ fontSize: '12px', fontWeight: 600, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Vai trò trong công ty
            </label>
            <select
              id="role-select"
              className="select"
              value={roleInput}
              onChange={e => setRoleInput(e.target.value as User['role'])}
              disabled={submitting}
              style={{ borderRadius: '10px', border: '1px solid #D2D2D7', fontSize: '14px', padding: '12px 16px', height: '46px' }}
            >
              {rolesList.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px', fontStyle: 'italic' }}>
              * Vai trò được sử dụng cho mục đích thống kê, phân tích biểu đồ bình chọn.
            </p>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              gap: '8px',
              justifyContent: 'center',
              backgroundColor: '#1D1D1F'
            }}
          >
            <UserCheck size={16} />
            <span>Tiếp tục</span>
          </button>
        </form>
      </div>
    </div>
  );
};
