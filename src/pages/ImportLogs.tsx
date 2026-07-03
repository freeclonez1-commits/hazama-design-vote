import React, { useEffect, useState } from 'react';
import { useDb } from '../context/DbContext';
import { dbService } from '../services/db';
import type { ImportLog } from '../types/models';
import { useToast } from '../components/Toast';
import { FileText, Filter, Trash2 } from 'lucide-react';

export const ImportLogs: React.FC = () => {
  const { sessions, refreshSessions } = useDb();
  const { toast } = useToast();
  
  const [allLogs, setAllLogs] = useState<ImportLog[]>([]);
  const [selectedSessionFilter, setSelectedSessionFilter] = useState<string>('All');

  useEffect(() => {
    refreshSessions();
    loadAllLogs();
  }, [sessions]);

  const loadAllLogs = async () => {
    try {
      // Gather logs across all sessions
      const logsAccumulator: ImportLog[] = [];
      const allSessions = await dbService.listSessions();
      
      for (const s of allSessions) {
        const logs = await dbService.listImportLogs(s.id);
        logsAccumulator.push(...logs);
      }

      // Sort logs by date descending
      const sortedLogs = logsAccumulator.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAllLogs(sortedLogs);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearLogs = async () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử log import trong máy?')) {
      // Remove all logs from localStorage
      localStorage.setItem('hazama_import_logs', JSON.stringify([]));
      toast('Đã dọn dẹp lịch sử log import!', 'success');
      loadAllLogs();
    }
  };

  const filteredLogs = selectedSessionFilter === 'All'
    ? allLogs
    : allLogs.filter(l => l.sessionId === selectedSessionFilter);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* 1. FILTER CONTROLS BAR */}
      <section className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} color="var(--text-secondary)" />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Lọc theo phiên:</span>
          </div>

          <select
            className="select"
            value={selectedSessionFilter}
            onChange={e => setSelectedSessionFilter(e.target.value)}
            style={{ width: 'auto', padding: '8px 12px', fontSize: '13px', borderRadius: '10px' }}
          >
            <option value="All">Tất cả phiên</option>
            {sessions.map(s => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>

        {allLogs.length > 0 && (
          <button
            onClick={handleClearLogs}
            className="btn btn-outline"
            style={{ borderColor: 'var(--danger-light)', color: 'var(--danger)', fontSize: '13px', borderRadius: '10px' }}
          >
            <Trash2 size={14} />
            <span>Xóa lịch sử log</span>
          </button>
        )}
      </section>

      {/* 2. LOGS TABLE */}
      <section className="card" style={{ padding: '24px 0' }}>
        <div style={{ padding: '0 24px 16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileText size={18} color="var(--text-secondary)" />
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Chi tiết lịch sử tải tệp tin</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Theo dõi chi tiết kết quả xử lý tên tệp tin, lý do bỏ qua các file không đúng định dạng.
            </p>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Không tìm thấy bản ghi log nào khớp với bộ lọc.
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none', boxShadow: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Tên phiên bình chọn</th>
                  <th>Tên tệp hình ảnh</th>
                  <th>Trạng thái</th>
                  <th>Lý do chi tiết</th>
                  <th>Thời gian xử lý</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => {
                  const sTitle = sessions.find(s => s.id === log.sessionId)?.title || 'Phiên đã xóa';
                  return (
                    <tr key={log.id}>
                      <td style={{ fontSize: '13px', fontWeight: 600 }}>{sTitle}</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '12px' }}>{log.fileName}</td>
                      <td>
                        {log.status === 'valid' ? (
                          <span className="badge badge-success">Thành công</span>
                        ) : (
                          <span className="badge badge-danger">Bỏ qua</span>
                        )}
                      </td>
                      <td style={{ fontSize: '13px', color: log.status === 'valid' ? 'var(--text-secondary)' : 'var(--danger)' }}>
                        {log.reason}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {new Date(log.createdAt).toLocaleDateString('vi-VN')} {new Date(log.createdAt).toLocaleTimeString('vi-VN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  );
};
