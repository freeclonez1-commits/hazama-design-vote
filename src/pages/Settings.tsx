import React from 'react';
import { useDb } from '../context/DbContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { RefreshCw, ShieldAlert, Database } from 'lucide-react';

export const Settings: React.FC = () => {
  const { resetDatabase, loading } = useDb();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const handleResetDb = async () => {
    if (window.confirm('Khôi phục dữ liệu? Hành động này sẽ xoá sạch dữ liệu hiện tại trong LocalStorage và nạp lại dữ liệu thử nghiệm chuẩn ban đầu.')) {
      try {
        await resetDatabase();
        toast('Đã khôi phục dữ liệu mặc định hệ thống thành công!', 'success');
      } catch (e) {
        toast('Khôi phục dữ liệu thất bại.', 'error');
      }
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '640px' }}>
      
      {/* 1. RESET CARD */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '12px', borderRadius: '12px' }}>
            <ShieldAlert size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Khu vực nguy hiểm (Danger Zone)</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Thực hiện các thao tác đặt lại trạng thái hệ thống.
            </p>
          </div>
        </div>

        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Nếu dữ liệu bình chọn bị lộn xộn hoặc các file hình ảnh bị lỗi trong quá trình thử nghiệm import, bạn có thể Khôi phục cơ sở dữ liệu ban đầu. Toàn bộ thiết kế mẫu, phiếu bầu mẫu chuẩn của CEO/Ads/HR/Quản trị viên sẽ được ghi đè lại.
        </p>

        <button
          onClick={handleResetDb}
          className="btn btn-danger"
          disabled={loading}
          style={{
            alignSelf: 'flex-start',
            gap: '8px',
            fontSize: '14px',
            padding: '12px 20px',
            borderRadius: '12px'
          }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>Khôi phục dữ liệu mặc định</span>
        </button>
      </div>

      {/* 2. SYSTEM INFO CARD */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)', padding: '12px', borderRadius: '12px' }}>
            <Database size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Thông tin kỹ thuật (System Info)</h3>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
            <span>Động cơ lưu trữ:</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>LocalStorage (Wired for Firestore Schema)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
            <span>Giao thức Auth:</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Google Authentication Simulator</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
            <span>Ngôn ngữ chính:</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Tiếng Việt (Vietnamese UI)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Tài khoản hiện tại:</span>
            <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{currentUser?.email} ({currentUser?.permission})</span>
          </div>
        </div>
      </div>

    </div>
  );
};
