import React, { useEffect, useState } from 'react';
import { useDb } from '../context/DbContext';
import { dbService } from '../services/db';
import {
  Calendar,
  Plus,
  Trash2,
  PieChart,
  Edit,
  FolderOpen
} from 'lucide-react';
import { useToast } from '../components/Toast';

interface SessionsProps {
  setTab: (tab: string) => void;
  setSelectedSessionId: (id: string) => void;
}

export const Sessions: React.FC<SessionsProps> = ({ setTab, setSelectedSessionId }) => {
  const { sessions, refreshSessions } = useDb();
  const { toast } = useToast();
  
  const [filter, setFilter] = useState<'All' | 'draft' | 'published' | 'closed' | 'approved'>('All');

  useEffect(() => {
    refreshSessions();
  }, []);

  const handleCreateSessionClick = () => {
    setTab('create-session');
  };

  const handleEditSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setTab(`sessions-review`);
  };

  const handleViewResults = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setTab(`sessions-results`);
  };

  const handleImportDesigns = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setTab(`sessions-import`);
  };

  const handleDeleteSession = async (id: string, title: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa toàn bộ phiên bình chọn: "${title}"?\nHành động này cũng xóa toàn bộ thiết kế, biến thể và bình chọn liên quan!`)) {
      await dbService.deleteSession(id);
      await refreshSessions();
      toast('Đã xóa phiên bình chọn.', 'success');
    }
  };

  const filteredSessions = filter === 'All'
    ? sessions
    : sessions.filter(s => s.status === filter);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        {/* Status Filter buttons */}
        <div style={{ display: 'flex', gap: '8px', backgroundColor: '#FFFFFF', padding: '4px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          {(['All', 'draft', 'published', 'closed', 'approved'] as const).map(status => {
            const isActive = filter === status;
            const labels: Record<string, string> = {
              All: 'Tất cả',
              draft: 'Bản nháp',
              published: 'Đang chạy',
              closed: 'Đã đóng',
              approved: 'Đã duyệt'
            };
            return (
              <button
                key={status}
                onClick={() => setFilter(status)}
                style={{
                  border: 'none',
                  background: 'none',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: isActive ? 'var(--accent-light)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  transition: 'all 0.15s'
                }}
              >
                {labels[status]}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleCreateSessionClick}
          className="btn btn-primary"
          style={{ fontSize: '13px', borderRadius: '10px' }}
        >
          <Plus size={16} />
          <span>Tạo phiên mới</span>
        </button>
      </div>

      {/* Sessions Grid */}
      {filteredSessions.length === 0 ? (
        <div className="card" style={{ padding: '60px 12px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Calendar size={36} style={{ opacity: 0.5, marginBottom: '12px', margin: '0 auto' }} />
          <p style={{ fontWeight: 600 }}>Không tìm thấy phiên bình chọn nào.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 grid-cols-2-md grid-cols-3-lg" style={{ gap: '20px' }}>
          {filteredSessions.map(s => {
            const deadlineDate = new Date(s.deadline);
            const isExpired = deadlineDate.getTime() < Date.now();
            
            return (
              <div
                key={s.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  borderTop: `4px solid ${
                    s.status === 'published' ? (isExpired ? 'var(--danger)' : 'var(--success)') :
                    s.status === 'draft' ? 'var(--text-secondary)' :
                    s.status === 'approved' ? 'var(--success)' : 'var(--danger)'
                  }`
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      BST: {s.collection.toUpperCase()}
                    </span>
                    
                    {s.status === 'draft' && <span className="badge badge-secondary">Bản nháp</span>}
                    {s.status === 'published' && (
                      <span className={`badge ${isExpired ? 'badge-danger' : 'badge-success'}`}>
                        {isExpired ? 'Đã hết hạn' : 'Đang chạy'}
                      </span>
                    )}
                    {s.status === 'closed' && <span className="badge badge-danger">Đã đóng</span>}
                    {s.status === 'approved' && <span className="badge badge-success">Đã duyệt</span>}
                  </div>

                  <h4 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: '1.3' }}>
                    {s.title}
                  </h4>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div>Hạn chót: <strong>{deadlineDate.toLocaleDateString('vi-VN')} {deadlineDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</strong></div>
                  <div>Giới hạn: <strong>Tối đa {s.maxVotesPerUser} vote / người</strong></div>
                </div>

                {/* Card Actions */}
                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: 'auto' }}>
                  
                  {/* Result Detail Chart */}
                  {(s.status === 'published' || s.status === 'closed' || s.status === 'approved') && (
                    <button
                      onClick={() => handleViewResults(s.id)}
                      className="btn btn-outline"
                      title="Biểu đồ kết quả"
                      style={{ flex: 1, padding: '8px', fontSize: '12px', borderRadius: '8px', gap: '4px' }}
                    >
                      <PieChart size={14} />
                      <span>Kết quả</span>
                    </button>
                  )}

                  {/* Import design */}
                  {(s.status === 'draft' || s.status === 'review') && (
                    <button
                      onClick={() => handleImportDesigns(s.id)}
                      className="btn btn-outline"
                      style={{ flex: 1, padding: '8px', fontSize: '12px', borderRadius: '8px', gap: '4px' }}
                    >
                      <FolderOpen size={14} />
                      <span>Import</span>
                    </button>
                  )}

                  {/* Settings */}
                  <button
                    onClick={() => handleEditSession(s.id)}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '8px', fontSize: '12px', borderRadius: '8px', gap: '4px' }}
                  >
                    <Edit size={14} />
                    <span>Chi tiết</span>
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDeleteSession(s.id, s.title)}
                    className="btn btn-outline btn-icon-only"
                    style={{ borderColor: 'var(--danger-light)', color: 'var(--danger)', borderRadius: '8px' }}
                    title="Xóa phiên"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
