import React, { useEffect, useState } from 'react';
import { useDb } from '../context/DbContext';
import { dbService } from '../services/db';
import { Pagination } from '../components/Pagination';
import {
  Users,
  Vote,
  FolderLock,
  Plus,
  Play,
  Archive,
  Trash2,
  PieChart,
  CheckCircle2
} from 'lucide-react';

interface AdminOverviewProps {
  setTab: (tab: string) => void;
  setSelectedSessionId: (id: string) => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({ setTab, setSelectedSessionId }) => {
  const { sessions, refreshSessions } = useDb();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVotes: 0,
    activeSessions: 0,
    archivedSessions: 0
  });

  useEffect(() => {
    refreshSessions();
    loadDashboardStats();
  }, [sessions]);

  const loadDashboardStats = async () => {
    try {
      const allUsers = await dbService.listUsers();
      const allSessions = await dbService.listSessions();
      
      let votesCount = 0;
      for (const s of allSessions) {
        const vList = await dbService.listVotes(s.id);
        votesCount += vList.length;
      }

      setStats({
        totalUsers: allUsers.length,
        totalVotes: votesCount,
        activeSessions: allSessions.filter(s => s.status === 'published').length,
        archivedSessions: allSessions.filter(s => s.status === 'archived').length
      });
    } catch (e) {
      console.error(e);
    }
  };

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
      loadDashboardStats();
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* 1. STATS BANNER */}
      <section className="grid grid-cols-1 grid-cols-2-sm grid-cols-4-lg" style={{ gap: '20px' }}>
        
        {/* Total Users */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)', padding: '16px', borderRadius: '16px' }}>
            <Users size={24} />
          </div>
          <div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Nhân sự đã đăng nhập</span>
            <h3 style={{ fontSize: '24px', fontWeight: 800, marginTop: '2px' }}>{stats.totalUsers}</h3>
          </div>
        </div>

        {/* Total Votes */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', padding: '16px', borderRadius: '16px' }}>
            <Vote size={24} />
          </div>
          <div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Tổng số lượt bình chọn</span>
            <h3 style={{ fontSize: '24px', fontWeight: 800, marginTop: '2px' }}>{stats.totalVotes}</h3>
          </div>
        </div>

        {/* Active Sessions */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)', padding: '16px', borderRadius: '16px' }}>
            <Play size={24} />
          </div>
          <div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Phiên đang chạy</span>
            <h3 style={{ fontSize: '24px', fontWeight: 800, marginTop: '2px' }}>{stats.activeSessions}</h3>
          </div>
        </div>

        {/* Archived Sessions */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ backgroundColor: '#E5E5EA', color: 'var(--text-secondary)', padding: '16px', borderRadius: '16px' }}>
            <Archive size={24} />
          </div>
          <div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Phiên lưu trữ (Archived)</span>
            <h3 style={{ fontSize: '24px', fontWeight: 800, marginTop: '2px' }}>{stats.archivedSessions}</h3>
          </div>
        </div>

      </section>

      {/* 2. SESSIONS DATA TABLE */}
      <section className="card" style={{ padding: '24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px 20px 24px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Tất cả phiên bình chọn</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Danh sách phiên bình chọn thiết kế BST nội bộ của Hazama.
            </p>
          </div>

          <button
            onClick={handleCreateSessionClick}
            className="btn btn-primary"
            style={{ fontSize: '14px', padding: '10px 16px', borderRadius: '12px' }}
          >
            <Plus size={16} />
            <span>Tạo phiên mới</span>
          </button>
        </div>

        {sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-secondary)' }}>
            <FolderLock size={36} style={{ opacity: 0.5, marginBottom: '12px' }} />
            <p style={{ fontWeight: 600 }}>Chưa có phiên bình chọn nào được tạo.</p>
            <button
              onClick={handleCreateSessionClick}
              className="btn btn-outline"
              style={{ marginTop: '16px', borderRadius: '10px', fontSize: '13px' }}
            >
              Tạo ngay
            </button>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none', boxShadow: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Tên phiên / Bộ sưu tập</th>
                  <th>Trạng thái</th>
                  <th>Hạn bình chọn</th>
                  <th>Số bình chọn</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {sessions.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(s => {
                  const deadlineDate = new Date(s.deadline);
                  const isExpired = deadlineDate.getTime() < Date.now();
                  
                  return (
                    <tr key={s.id}>
                      {/* Name & Collection */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.title}</span>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Bộ sưu tập: {s.collection}
                          </span>
                        </div>
                      </td>

                      {/* Status badge */}
                      <td>
                        {s.status === 'draft' && <span className="badge badge-secondary">Bản nháp</span>}
                        {s.status === 'review' && <span className="badge badge-warning">Review</span>}
                        {s.status === 'published' && (
                          <span className={`badge ${isExpired ? 'badge-danger' : 'badge-success'}`}>
                            {isExpired ? 'Đã hết hạn' : 'Đang chạy'}
                          </span>
                        )}
                        {s.status === 'closed' && <span className="badge badge-danger">Đã đóng</span>}
                        {s.status === 'approved' && <span className="badge badge-success" style={{ gap: '4px' }}><CheckCircle2 size={12} /> Đã duyệt Winner</span>}
                        {s.status === 'archived' && <span className="badge badge-secondary">Lưu trữ</span>}
                      </td>

                      {/* Deadline */}
                      <td>
                        <span style={{ fontSize: '13px', color: isExpired && s.status === 'published' ? 'var(--danger)' : 'var(--text-primary)' }}>
                          {deadlineDate.toLocaleDateString('vi-VN')} {deadlineDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      {/* Vote statistics shortcut (Calculated inside useEffect normally, placeholder for UX) */}
                      <td>
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>
                          {s.maxVotesPerUser} vote/người
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                          {/* Live results icon button */}
                          {(s.status === 'published' || s.status === 'closed' || s.status === 'approved' || s.status === 'archived') && (
                            <button
                              onClick={() => handleViewResults(s.id)}
                              className="btn btn-outline btn-icon-only"
                              title="Xem kết quả biểu đồ"
                              style={{ width: 34, height: 34 }}
                            >
                              <PieChart size={14} />
                            </button>
                          )}

                          {/* Import designs button */}
                          {(s.status === 'draft' || s.status === 'review') && (
                            <button
                              onClick={() => handleImportDesigns(s.id)}
                              className="btn btn-outline"
                              style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '8px' }}
                            >
                              Import
                            </button>
                          )}

                          {/* Review/Edit button */}
                          <button
                            onClick={() => handleEditSession(s.id)}
                            className="btn btn-secondary"
                            style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '8px' }}
                          >
                            Thiết lập
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => handleDeleteSession(s.id, s.title)}
                            className="btn btn-outline btn-icon-only"
                            title="Xóa phiên"
                            style={{ width: 34, height: 34, color: 'var(--danger)', borderColor: 'var(--danger-light)' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Component */}
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(sessions.length / pageSize)}
              onPageChange={setCurrentPage}
              totalItems={sessions.length}
              pageSize={pageSize}
              itemLabel="phiên bình chọn"
            />
          </div>
        )}
      </section>

    </div>
  );
};
