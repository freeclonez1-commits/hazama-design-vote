import React, { useState } from 'react';
import { useDb } from '../context/DbContext';
import { useToast } from '../components/Toast';
import { FolderPlus, ArrowLeft } from 'lucide-react';

interface CreateSessionProps {
  setTab: (tab: string) => void;
  setSelectedSessionId: (id: string) => void;
}

export const CreateSession: React.FC<CreateSessionProps> = ({ setTab, setSelectedSessionId }) => {
  const { createSession } = useDb();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [collection, setCollection] = useState('');
  
  // Set default deadline to 3 days from now
  const defaultDeadline = () => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    d.setHours(17, 0, 0, 0); // 17:00
    
    // Format to local ISO datetime-local input string: YYYY-MM-DDTHH:mm
    const tzoffset = d.getTimezoneOffset() * 60000; //offset in milliseconds
    const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
    return localISOTime;
  };
  
  const [deadline, setDeadline] = useState(defaultDeadline());
  const [maxVotes, setMaxVotes] = useState(3);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast('Vui lòng nhập tên phiên bình chọn.', 'warning');
      return;
    }
    if (!collection.trim()) {
      toast('Vui lòng nhập tên bộ sưu tập thiết kế.', 'warning');
      return;
    }
    if (!deadline) {
      toast('Vui lòng chọn thời hạn bình chọn.', 'warning');
      return;
    }
    if (new Date(deadline).getTime() <= Date.now()) {
      toast('Thời hạn bình chọn phải ở thời điểm tương lai.', 'warning');
      return;
    }
    if (maxVotes <= 0) {
      toast('Số lượt bình chọn tối đa phải từ 1 trở lên.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      // Create session in draft mode
      const created = await createSession(title, collection, new Date(deadline).toISOString(), maxVotes);
      toast(`Tạo phiên nháp "${created.title}" thành công!`, 'success');
      
      // Auto transition to Import Designs
      setSelectedSessionId(created.id);
      setTab('sessions-import');
    } catch (e) {
      console.error(e);
      toast('Có lỗi xảy ra khi tạo phiên bình chọn.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '640px' }}>
      
      {/* Back button */}
      <button
        onClick={() => setTab('overview')}
        className="btn btn-outline"
        style={{ fontSize: '13px', padding: '8px 16px', borderRadius: '10px', gap: '6px', marginBottom: '24px' }}
      >
        <ArrowLeft size={14} />
        <span>Quay lại tổng quan</span>
      </button>

      <div className="card" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
          <div style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)', padding: '12px', borderRadius: '12px' }}>
            <FolderPlus size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Tạo phiên bình chọn mới</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Tạo một phiên bình chọn nháp. Bạn có thể tải thiết kế lên sau khi tạo.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Title */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="session-title">Tên phiên bình chọn</label>
            <input
              id="session-title"
              type="text"
              className="input"
              placeholder="Ví dụ: Bình chọn mẫu T-Shirt Summer Basic 2026"
              value={title}
              onChange={e => setTitle(e.target.value)}
              disabled={submitting}
            />
          </div>

          {/* Collection Name */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="session-collection">Tên bộ sưu tập (Collection)</label>
            <input
              id="session-collection"
              type="text"
              className="input"
              placeholder="Ví dụ: BST Summer 2026"
              value={collection}
              onChange={e => setCollection(e.target.value)}
              disabled={submitting}
            />
          </div>

          {/* Double column details */}
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            {/* Deadline */}
            <div className="form-group" style={{ flex: 1, minWidth: '240px', marginBottom: 0 }}>
              <label className="form-label" htmlFor="session-deadline">Hạn bình chọn (Deadline)</label>
              <input
                id="session-deadline"
                type="datetime-local"
                className="input"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                disabled={submitting}
              />
            </div>

            {/* Max votes per user */}
            <div className="form-group" style={{ flex: 1, minWidth: '240px', marginBottom: 0 }}>
              <label className="form-label" htmlFor="session-maxvotes">Số vote tối đa mỗi nhân sự</label>
              <input
                id="session-maxvotes"
                type="number"
                min="1"
                max="10"
                className="input"
                value={maxVotes}
                onChange={e => setMaxVotes(parseInt(e.target.value) || 1)}
                disabled={submitting}
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setTab('overview')}
              disabled={submitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              Tiếp tục: Nhập thiết kế
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
