import React, { useEffect, useState } from 'react';
import { useDb } from '../context/DbContext';
import { useToast } from '../components/Toast';
import type { User, DesignComment, Design } from '../types/models';
import { dbService } from '../services/db';

import {
  ArrowLeft,
  Download,
  CheckCircle,
  Archive,
  Lock,
  Filter,
  Trophy,
  Users,
  RotateCcw,
  X,
  Eye,
  MessageSquare
} from 'lucide-react';

interface LiveResultsProps {
  sessionId: string;
  setTab: (tab: string) => void;
}

type RoleFilterType = 'All' | 'CEO' | 'Designer' | 'Ads' | 'HR' | 'Kế toán';

export const LiveResults: React.FC<LiveResultsProps> = ({ sessionId, setTab }) => {
  const { activeSession, designs, variants, votes, loadSessionDetails, updateSessionStatus, updateDesign } = useDb();
  const { toast } = useToast();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [roleFilter, setRoleFilter] = useState<RoleFilterType>('All');
  const [totalVotesCount, setTotalVotesCount] = useState(0);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [activeFeedTab, setActiveFeedTab] = useState<'progress' | 'votes'>('progress');

  // Product Detail Modal State
  const [selectedDesignForModal, setSelectedDesignForModal] = useState<Design | null>(null);
  const [modalSelectedColor, setModalSelectedColor] = useState<string>('');
  const [modalViewTab, setModalViewTab] = useState<'f' | 'b'>('f');
  const [modalComments, setModalComments] = useState<DesignComment[]>([]);
  const [modalLoadingComments, setModalLoadingComments] = useState<boolean>(false);

  // When selectedDesignForModal changes, initialize color and load comments
  useEffect(() => {
    if (selectedDesignForModal) {
      const designVars = variants.filter(v => v.designId === selectedDesignForModal.id);
      const colors = Array.from(new Set(designVars.map(v => v.color)));
      if (colors.length > 0) {
        setModalSelectedColor(colors[0]);
      } else {
        setModalSelectedColor('');
      }
      setModalViewTab('f');

      // Fetch comments for this design
      setModalLoadingComments(true);
      dbService.listComments(selectedDesignForModal.id)
        .then(setModalComments)
        .catch(console.error)
        .finally(() => setModalLoadingComments(false));
    }
  }, [selectedDesignForModal, variants]);

  useEffect(() => {
    dbService.listUsers().then(setAllUsers);
  }, [votes]);

  useEffect(() => {
    if (sessionId) {
      loadSessionDetails(sessionId);
    }
  }, [sessionId]);

  // Recalculate total votes based on role filter
  useEffect(() => {
    if (votes) {
      const filteredVotes = roleFilter === 'All'
        ? votes
        : votes.filter(v => v.userRoleAtVote === roleFilter);
      setTotalVotesCount(filteredVotes.length);
    }
  }, [votes, roleFilter]);

  if (!activeSession) return null;

  // Process vote count for each design
  const processedResults = designs.map(d => {
    // Filter votes that selected this design
    const designVotes = votes.filter(v => {
      const matchesSession = v.sessionId === sessionId;
      const matchesDesign = v.selectedDesignIds.includes(d.id);
      const matchesRole = roleFilter === 'All' || v.userRoleAtVote === roleFilter;
      return matchesSession && matchesDesign && matchesRole;
    });

    // Breakdown votes by roles
    const breakdown = {
      ceo: votes.filter(v => v.selectedDesignIds.includes(d.id) && v.userRoleAtVote === 'CEO').length,
      designer: votes.filter(v => v.selectedDesignIds.includes(d.id) && v.userRoleAtVote === 'Designer').length,
      ads: votes.filter(v => v.selectedDesignIds.includes(d.id) && v.userRoleAtVote === 'Ads').length,
      hr: votes.filter(v => v.selectedDesignIds.includes(d.id) && v.userRoleAtVote === 'HR').length,
      accounting: votes.filter(v => v.selectedDesignIds.includes(d.id) && v.userRoleAtVote === 'Kế toán').length
    };

    return {
      design: d,
      voteCount: designVotes.length,
      breakdown
    };
  }).sort((a, b) => b.voteCount - a.voteCount); // Rank by highest vote count first

  const handleApproveWinner = async (designId: string) => {
    try {
      // Mark selected design as selected/winner, mark others as rejected if they are not selected
      const promises = designs.map(async (d) => {
        const status = d.id === designId ? 'selected' : 'rejected';
        await updateDesign({ ...d, status });
      });

      await Promise.all(promises);
      
      // Save approvedWinnerIds inside the session document
      const updatedSession = {
        ...activeSession,
        status: 'approved' as const,
        approvedWinnerIds: [designId],
        updatedAt: new Date().toISOString()
      };
      await dbService.saveSession(updatedSession);
      
      toast('Đã phê duyệt người chiến thắng và chốt kết quả!', 'success');
      loadSessionDetails(sessionId);
    } catch (e) {
      toast('Không thể duyệt người chiến thắng.', 'error');
    }
  };

  const handleCloseSession = async () => {
    if (window.confirm('Bạn có muốn Đóng phiên bình chọn này? Votere sẽ không thể gửi thêm bình chọn nữa.')) {
      await updateSessionStatus(sessionId, 'closed');
      toast('Đã đóng phiên bình chọn.', 'success');
      loadSessionDetails(sessionId);
    }
  };

  const handleArchiveSession = async () => {
    if (window.confirm('Lưu trữ phiên bình chọn này? Phiên sẽ bị ẩn khỏi danh sách hoạt động chính.')) {
      await updateSessionStatus(sessionId, 'archived');
      toast('Đã đưa phiên vào lưu trữ (Archived).', 'success');
      setTab('overview');
    }
  };

  // Reset session: xóa winner, xóa votes cũ, trả designs về pending, mở lại bình chọn
  const handleResetToPublished = async () => {
    try {
      // 1. Xóa toàn bộ votes cũ — quan trọng: user phải vote lại từ đầu
      await dbService.clearVotesBySession(sessionId);

      // 2. Đưa tất cả designs về pending
      await Promise.all(designs.map(d => updateDesign({ ...d, status: 'pending' })));

      // 3. Reset session: xóa approvedWinnerIds, set published
      const resetSession = {
        ...activeSession,
        status: 'published' as const,
        approvedWinnerIds: [],
        updatedAt: new Date().toISOString()
      };
      await dbService.saveSession(resetSession);

      toast('Đã đặt lại phiên bình chọn. Người dùng có thể bình chọn lại.', 'success');
      loadSessionDetails(sessionId);
      setShowResetConfirm(false);
    } catch (e) {
      console.error(e);
      toast('Không thể đặt lại phiên bình chọn.', 'error');
    }
  };

  // CSV Exporter
  const handleExportCSV = () => {
    try {
      let csvContent = "\ufeff"; // UTF-8 BOM to prevent Excel display errors (Tiếng Việt)
      csvContent += "Hạng,Mã thiết kế,Tên thiết kế,Tổng số vote,CEO,Designer,Ads,HR,Kế toán,Trạng thái\n";

      processedResults.forEach((r, index) => {
        const d = r.design;
        const statusMap: Record<string, string> = {
          pending: 'Đang chờ',
          selected: 'Chiến thắng (Approved)',
          rejected: 'Không được chọn',
          need_edit: 'Cần sửa đổi'
        };
        csvContent += `${index + 1},"${d.code}","${d.name}",${r.voteCount},${r.breakdown.ceo},${r.breakdown.designer},${r.breakdown.ads},${r.breakdown.hr},${r.breakdown.accounting},"${statusMap[d.status] || d.status}"\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `hazama_results_${activeSession.collection.replace(/\s+/g, '_').toLowerCase()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast('Xuất kết quả CSV thành công!', 'success');
    } catch (e) {
      toast('Không thể xuất file CSV.', 'error');
    }
  };

  const rolesList: { value: RoleFilterType; label: string }[] = [
    { value: 'All', label: 'Tất cả vai trò' },
    { value: 'CEO', label: 'Giám đốc (CEO)' },
    { value: 'Designer', label: 'Nhà thiết kế (Designer)' },
    { value: 'Ads', label: 'Quảng cáo (Ads)' },
    { value: 'HR', label: 'Nhân sự (HR)' },
    { value: 'Kế toán', label: 'Kế toán' }
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* 1. BACK BUTTON & PATH HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <button
          onClick={() => setTab('overview')}
          className="btn btn-outline"
          style={{ fontSize: '13px', padding: '8px 16px', borderRadius: '10px', gap: '6px' }}
        >
          <ArrowLeft size={14} />
          <span>Quay lại tổng quan</span>
        </button>

        <div style={{ display: 'flex', gap: '10px' }}>
          {/* Close vote */}
          {activeSession.status === 'published' && (
            <button
              onClick={handleCloseSession}
              className="btn btn-danger"
              style={{ fontSize: '13px', borderRadius: '10px' }}
            >
              <Lock size={16} />
              <span>Đóng bình chọn</span>
            </button>
          )}

          {/* Archive */}
          {(activeSession.status === 'closed' || activeSession.status === 'approved') && (
            <button
              onClick={handleArchiveSession}
              className="btn btn-secondary"
              style={{ fontSize: '13px', borderRadius: '10px' }}
            >
              <Archive size={16} />
              <span>Lưu trữ phiên</span>
            </button>
          )}

          {/* 🔄 RESET / CÔNG BỐ LẠI — chỉ hiện khi session đã approved (có winner) */}
          {activeSession.status === 'approved' && (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="btn"
              style={{
                fontSize: '13px',
                borderRadius: '10px',
                gap: '6px',
                backgroundColor: '#FF9500',
                color: '#FFFFFF',
                border: 'none',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              <RotateCcw size={15} />
              <span>Công bố lại từ đầu</span>
            </button>
          )}

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="btn btn-primary"
            style={{ fontSize: '13px', borderRadius: '10px', gap: '6px' }}
          >
            <Download size={16} />
            <span>Xuất file CSV</span>
          </button>
        </div>
      </div>

      {/* 2. RESULTS HERO BLOCK & ROLE FILTER */}
      <section className="card" style={{ display: 'flex', flexFlow: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: 800 }}>Kết quả bình chọn thời gian thực</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Phiên: <strong>{activeSession.title}</strong> • Tổng cộng <strong>{votes.length} người bỏ phiếu</strong>
            </p>
          </div>

          {/* Filter selectors */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} color="var(--text-secondary)" />
            <select
              className="select"
              style={{ width: 'auto', padding: '8px 12px', fontSize: '13px', borderRadius: '10px' }}
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value as RoleFilterType)}
            >
              {rolesList.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Display filtered summary card */}
        {roleFilter !== 'All' && (
          <div style={{ backgroundColor: 'var(--accent-light)', padding: '12px 16px', borderRadius: '12px', fontSize: '13px', color: 'var(--accent)', fontWeight: 600 }}>
            Hệ thống đang hiển thị kết quả bình chọn lọc riêng của nhóm: {roleFilter} ({totalVotesCount} phiếu)
          </div>
        )}
      </section>

      {/* 3. LEADERBOARD BARS & GRID */}
      <section className="grid grid-cols-1 grid-cols-2-md" style={{ gap: '24px', alignItems: 'flex-start' }}>
        
        {/* Left Card: Leaderboard ranks with custom CSS progress bars */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={18} color="var(--warning)" />
            <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Bảng xếp hạng thiết kế</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {processedResults.map((r, index) => {
              const maxVoteCount = processedResults[0]?.voteCount || 1;
              // Percentage calculation for progress bar
              const progressPercentage = maxVoteCount > 0 ? (r.voteCount / maxVoteCount) * 100 : 0;
              const globalPercentage = votes.length > 0 ? Math.round((r.voteCount / votes.length) * 100) : 0;
              
              const isWinner = r.design.status === 'selected';

              return (
                <div key={r.design.id} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  {/* Rank number badge */}
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      backgroundColor: index === 0 ? 'var(--warning-light)' : index === 1 ? '#E5E5EA' : '#F5F5F7',
                      color: index === 0 ? 'var(--warning)' : 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      fontWeight: 700
                    }}
                  >
                    {index + 1}
                  </div>

                  {/* Thumbnail (Clickable to view detail modal) */}
                  <div
                    onClick={() => setSelectedDesignForModal(r.design)}
                    style={{
                      width: 44,
                      height: 44,
                      backgroundColor: '#F2F2F7',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      transition: 'transform 0.15s, border-color 0.15s',
                      flexShrink: 0
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--accent)';
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    title="Bấm để xem chi tiết mẫu sản phẩm"
                  >
                    {r.design.coverImageUrl && (
                      <img src={r.design.coverImageUrl} alt={r.design.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    )}
                  </div>

                  {/* Code and Progress bar */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                      <span
                        onClick={() => setSelectedDesignForModal(r.design)}
                        style={{
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-primary)'}
                        title="Bấm để xem chi tiết mẫu sản phẩm"
                      >
                        <strong>{r.design.code}</strong> - {r.design.name}
                        <Eye size={13} color="var(--accent)" />
                      </span>
                      <span style={{ color: 'var(--accent)' }}>
                        {r.voteCount} vote ({globalPercentage}%)
                      </span>
                    </div>

                    {/* Custom CSS rounded progress bar */}
                    <div style={{ height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${progressPercentage}%`,
                          backgroundColor: index === 0 ? 'var(--warning)' : 'var(--accent)',
                          borderRadius: '4px',
                          transition: 'width 0.4s ease-out'
                        }}
                      />
                    </div>
                  </div>

                  {/* Approve/Winner controls */}
                  {isWinner ? (
                    <span className="badge badge-success" style={{ gap: '2px', fontSize: '10px' }}>
                      <CheckCircle size={10} /> Winner
                    </span>
                  ) : (
                    (activeSession.status === 'closed' || activeSession.status === 'published') && (
                      <button
                        onClick={() => handleApproveWinner(r.design.id)}
                        className="btn btn-outline"
                        style={{ fontSize: '11px', padding: '6px 12px', borderRadius: '8px' }}
                      >
                        Chọn Winner
                      </button>
                    )
                  )}

                </div>
              );
            })}
          </div>
        </div>

        {/* Right Card: Full details table including role breakdown */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowX: 'auto' }}>
          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} color="var(--accent)" />
            <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Phân tích số liệu theo vai trò</h3>
          </div>

          <table className="table" style={{ fontSize: '13px' }}>
            <thead>
              <tr>
                <th>Mã</th>
                <th>Tổng</th>
                <th style={{ color: '#FF9500' }}>CEO</th>
                <th style={{ color: '#007AFF' }}>Des.</th>
                <th style={{ color: '#34C759' }}>Ads</th>
                <th style={{ color: '#FF3B30' }}>HR</th>
                <th style={{ color: '#AF52DE' }}>K.Toán</th>
              </tr>
            </thead>
            <tbody>
              {processedResults.map(r => (
                <tr key={r.design.id}>
                  <td
                    onClick={() => setSelectedDesignForModal(r.design)}
                    style={{ fontWeight: 700, cursor: 'pointer', color: 'var(--accent)' }}
                    title="Bấm để xem chi tiết mẫu sản phẩm"
                  >
                    {r.design.code} 👁️
                  </td>
                  <td style={{ fontWeight: 800, color: 'var(--accent)' }}>{r.voteCount}</td>
                  <td>{r.breakdown.ceo}</td>
                  <td>{r.breakdown.designer}</td>
                  <td>{r.breakdown.ads}</td>
                  <td>{r.breakdown.hr}</td>
                  <td>{r.breakdown.accounting}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </section>

      {/* 4. VOTERS LIST / PROGRESS TRACKER TABS */}
      <section className="card" style={{ padding: '24px 0' }}>
        <div style={{ padding: '0 24px 16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Nhật ký & Tiến độ bình chọn</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Theo dõi tiến độ tham gia của nhân sự và xem chi tiết phiếu bầu.
            </p>
          </div>

          {/* Tab buttons */}
          <div style={{ display: 'flex', gap: '4px', backgroundColor: '#F5F5F7', padding: '4px', borderRadius: '10px' }}>
            <button
              onClick={() => setActiveFeedTab('progress')}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: activeFeedTab === 'progress' ? '#FFFFFF' : 'transparent',
                color: activeFeedTab === 'progress' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: activeFeedTab === 'progress' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.1s'
              }}
            >
              Tiến độ bỏ phiếu
            </button>
            <button
              onClick={() => setActiveFeedTab('votes')}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: activeFeedTab === 'votes' ? '#FFFFFF' : 'transparent',
                color: activeFeedTab === 'votes' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: activeFeedTab === 'votes' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.1s'
              }}
            >
              Phiếu bầu chi tiết
            </button>
          </div>
        </div>

        {activeFeedTab === 'progress' ? (
          /* TAB 1: VOTER PROGRESS TRACKER */
          <div>
            {/* Progress stats bar */}
            {(() => {
              const eligibleVoters = allUsers.filter(u => u.permission !== 'Admin' && u.permission !== 'Pending');
              const votedVoters = eligibleVoters.filter(u => 
                votes.some(v => v.userEmail.toLowerCase() === u.email.toLowerCase())
              );
              const percentage = eligibleVoters.length > 0 ? Math.round((votedVoters.length / eligibleVoters.length) * 100) : 0;

              return (
                <div style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '13px', fontWeight: 600 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Tỷ lệ tham gia:</span>
                    <span style={{ color: 'var(--accent)' }}>{votedVoters.length} / {eligibleVoters.length} nhân viên ({percentage}%)</span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px', overflow: 'hidden', marginBottom: '24px' }}>
                    <div style={{ height: '100%', width: `${percentage}%`, backgroundColor: 'var(--success)', borderRadius: '4px', transition: 'width 0.4s' }} />
                  </div>

                  <div className="table-container" style={{ border: '1px solid var(--border)', boxShadow: 'none' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Nhân sự</th>
                          <th>Bộ phận</th>
                          <th>Trạng thái bỏ phiếu</th>
                          <th>Thời điểm vote</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eligibleVoters.length === 0 ? (
                          <tr>
                            <td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                              Không có thành viên biểu quyết nào được đăng ký.
                            </td>
                          </tr>
                        ) : (
                          eligibleVoters.map(voter => {
                            const matchingVote = votes.find(v => v.userEmail.toLowerCase() === voter.email.toLowerCase());
                            return (
                              <tr key={voter.uid}>
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontWeight: 700 }}>{voter.name || 'Chưa hoàn thiện profile'}</span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{voter.email}</span>
                                  </div>
                                </td>
                                <td>
                                  <span className="badge badge-secondary">{voter.role}</span>
                                </td>
                                <td>
                                  {matchingVote ? (
                                    <span className="badge badge-success">Đã bình chọn</span>
                                  ) : (
                                    <span className="badge badge-warning">Chưa bình chọn</span>
                                  )}
                                </td>
                                <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                  {matchingVote 
                                    ? `${new Date(matchingVote.createdAt).toLocaleDateString('vi-VN')} ${new Date(matchingVote.createdAt).toLocaleTimeString('vi-VN')}` 
                                    : '-'
                                  }
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          /* TAB 2: DETAILED VOTES LIST */
          <div className="table-container" style={{ border: 'none', boxShadow: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Họ tên nhân sự</th>
                  <th>Vai trò</th>
                  <th>Mẫu đã chọn</th>
                  <th>Thời gian vote</th>
                </tr>
              </thead>
              <tbody>
                {votes.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--text-secondary)' }}>
                      Chưa có ai bỏ phiếu cho phiên này.
                    </td>
                  </tr>
                ) : (
                  votes.map(v => (
                    <tr key={v.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 700 }}>{v.userNameAtVote}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{v.userEmail}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-secondary">{v.userRoleAtVote}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {v.selectedDesignIds.map(dId => {
                            const dCode = designs.find(d => d.id === dId)?.code || 'HZ-XX';
                            return (
                              <span key={dId} className="badge badge-info" style={{ fontSize: '11px' }}>
                                {dCode}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {new Date(v.createdAt).toLocaleDateString('vi-VN')} {new Date(v.createdAt).toLocaleTimeString('vi-VN')}
                      </td>
                    </tr>
                  ))
                )}\n              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* RESET CONFIRM MODAL */}
      {showResetConfirm && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 3000,
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px'
          }}
          onClick={() => setShowResetConfirm(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '36px 32px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
              textAlign: 'center'
            }}
          >
            <div style={{
              width: 64, height: 64, borderRadius: '16px',
              background: 'linear-gradient(135deg, #FF9500, #FFCC00)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px auto', fontSize: '30px'
            }}>
              🔄
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1D1D1F', marginBottom: '10px', letterSpacing: '-0.4px' }}>
              Công bố lại từ đầu?
            </h3>
            <p style={{ fontSize: '13px', color: '#8E8E93', lineHeight: 1.65, marginBottom: '12px' }}>
              Hành động này sẽ:
            </p>
            <ul style={{ textAlign: 'left', fontSize: '13px', color: '#3A3A3C', lineHeight: 1.8, marginBottom: '28px', paddingLeft: '20px' }}>
              <li>Xóa kết quả winner hiện tại</li>
              <li>Đưa tất cả thiết kế về trạng thái <strong>Chờ duyệt</strong></li>
              <li>Mở lại phiên bình chọn (<strong>Published</strong>)</li>
              <li>Người dùng có thể bình chọn lại từ đầu</li>
            </ul>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowResetConfirm(false)}
                style={{
                  flex: 1, padding: '13px', borderRadius: '12px',
                  border: '1px solid #D2D2D7', background: '#FFFFFF',
                  fontSize: '14px', fontWeight: 600, color: '#1D1D1F', cursor: 'pointer'
                }}
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleResetToPublished}
                style={{
                  flex: 1.5, padding: '13px', borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #FF9500, #FF6B00)',
                  fontSize: '14px', fontWeight: 700, color: '#FFFFFF', cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(255,149,0,0.4)'
                }}
              >
                ✓ Xác nhận công bố lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT DETAIL PREVIEW MODAL */}
      {selectedDesignForModal && (() => {
        const designVars = variants.filter(v => v.designId === selectedDesignForModal.id);
        const colorOptions = Array.from(new Set(designVars.map(v => v.color)));
        const activeModalVariant = designVars.find(v => v.color === modalSelectedColor && v.view === modalViewTab) || designVars[0];
        
        // Find stats for this design
        const designStat = processedResults.find(r => r.design.id === selectedDesignForModal.id);
        const voteCount = designStat ? designStat.voteCount : 0;
        const globalPercentage = votes.length > 0 ? Math.round((voteCount / votes.length) * 100) : 0;

        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              backgroundColor: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => setSelectedDesignForModal(null)}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '24px',
                maxWidth: '920px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
              }}
              className="animate-scale-up"
            >
              {/* Modal Header */}
              <div style={{
                padding: '20px 28px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'sticky',
                top: 0,
                backgroundColor: '#FFFFFF',
                zIndex: 10,
                borderTopLeftRadius: '24px',
                borderTopRightRadius: '24px'
              }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Chi tiết sản phẩm thiết kế • Mã {selectedDesignForModal.code}
                  </span>
                  <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: '2px 0 0 0' }}>
                    {selectedDesignForModal.name}
                  </h3>
                </div>

                <button
                  onClick={() => setSelectedDesignForModal(null)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: '1px solid var(--border)',
                    backgroundColor: '#F5F5F7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#8E8E93',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#E5E5EA'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F5F5F7'}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Content Grid */}
              <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
                {/* Left Column: Image Preview & Views */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                  {/* Image Container */}
                  <div style={{
                    width: '100%',
                    height: '360px',
                    borderRadius: '16px',
                    backgroundColor: '#FAF9F6',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    {activeModalVariant ? (
                      <img
                        src={activeModalVariant.imageUrl}
                        alt="Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <div style={{ color: '#8E8E93', fontSize: '13px' }}>Chưa có ảnh biến thể</div>
                    )}
                  </div>

                  {/* View Switcher: Front / Back */}
                  <div style={{ display: 'flex', gap: '8px', backgroundColor: '#F2F2F7', padding: '4px', borderRadius: '12px' }}>
                    <button
                      onClick={() => setModalViewTab('f')}
                      style={{
                        padding: '6px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: modalViewTab === 'f' ? '#FFFFFF' : 'transparent',
                        color: modalViewTab === 'f' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontSize: '12px',
                        fontWeight: modalViewTab === 'f' ? 700 : 500,
                        cursor: 'pointer',
                        boxShadow: modalViewTab === 'f' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                      }}
                    >
                      Mặt trước (Front)
                    </button>
                    <button
                      onClick={() => setModalViewTab('b')}
                      style={{
                        padding: '6px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: modalViewTab === 'b' ? '#FFFFFF' : 'transparent',
                        color: modalViewTab === 'b' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontSize: '12px',
                        fontWeight: modalViewTab === 'b' ? 700 : 500,
                        cursor: 'pointer',
                        boxShadow: modalViewTab === 'b' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                      }}
                    >
                      Mặt sau (Back)
                    </button>
                  </div>

                  {/* Color selector pills */}
                  {colorOptions.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                        Màu sắc biến thể ({colorOptions.length})
                      </span>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {colorOptions.map(c => (
                          <button
                            key={c}
                            onClick={() => setModalSelectedColor(c)}
                            style={{
                              padding: '5px 14px',
                              borderRadius: '20px',
                              border: modalSelectedColor === c ? '2px solid var(--accent)' : '1px solid var(--border)',
                              backgroundColor: modalSelectedColor === c ? '#EBF5FF' : '#FFFFFF',
                              color: modalSelectedColor === c ? 'var(--accent)' : 'var(--text-primary)',
                              fontSize: '12px',
                              fontWeight: modalSelectedColor === c ? 700 : 500,
                              cursor: 'pointer'
                            }}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Vote Breakdown Stats & Comments */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Vote summary card */}
                  <div style={{
                    backgroundColor: '#FAF9F6',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    border: '1px solid var(--border)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Thống kê phiếu bầu</span>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent)' }}>
                        {voteCount} phiếu ({globalPercentage}%)
                      </span>
                    </div>

                    {/* Role breakdown pills */}
                    {designStat && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '12px' }}>
                        <div style={{ backgroundColor: '#FFFFFF', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ color: '#FF9500', fontWeight: 700 }}>CEO</div>
                          <div style={{ fontWeight: 800 }}>{designStat.breakdown.ceo}</div>
                        </div>
                        <div style={{ backgroundColor: '#FFFFFF', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ color: '#007AFF', fontWeight: 700 }}>Designer</div>
                          <div style={{ fontWeight: 800 }}>{designStat.breakdown.designer}</div>
                        </div>
                        <div style={{ backgroundColor: '#FFFFFF', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ color: '#34C759', fontWeight: 700 }}>Ads</div>
                          <div style={{ fontWeight: 800 }}>{designStat.breakdown.ads}</div>
                        </div>
                        <div style={{ backgroundColor: '#FFFFFF', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ color: '#FF3B30', fontWeight: 700 }}>HR</div>
                          <div style={{ fontWeight: 800 }}>{designStat.breakdown.hr}</div>
                        </div>
                        <div style={{ backgroundColor: '#FFFFFF', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ color: '#AF52DE', fontWeight: 700 }}>Kế toán</div>
                          <div style={{ fontWeight: 800 }}>{designStat.breakdown.accounting}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Team Feedback / Comments List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 700 }}>
                      <MessageSquare size={16} color="var(--accent)" />
                      <span>Góp ý & Nhận xét ({modalComments.length})</span>
                    </div>

                    {modalLoadingComments ? (
                      <div style={{ fontSize: '13px', color: '#8E8E93' }}>Đang tải bình luận...</div>
                    ) : modalComments.length === 0 ? (
                      <div style={{ fontSize: '13px', color: '#8E8E93', fontStyle: 'italic' }}>
                        Chưa có ý kiến đóng góp nào cho thiết kế này.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '220px', overflowY: 'auto' }}>
                        {modalComments.map(c => (
                          <div key={c.id} style={{ backgroundColor: '#F9F9FB', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#86868B', marginBottom: '4px' }}>
                              <strong>{c.isAnonymous ? 'Thành viên ẩn danh' : c.userName} ({c.userRole})</strong>
                              <span>{new Date(c.createdAt).toLocaleDateString('vi-VN')}</span>
                            </div>
                            <p style={{ margin: 0, fontSize: '13px', color: '#1D1D1F', lineHeight: '1.4' }}>{c.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};
