import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { useToast } from '../components/Toast';
import { Pagination } from '../components/Pagination';
import type { User } from '../types/models';
import { UserPlus, ArrowRightLeft, Check, ShieldAlert } from 'lucide-react';

export const Members: React.FC = () => {
  const { user: currentUser, updateUserPermission, switchUser } = useAuth();
  const { toast } = useToast();
  const [usersList, setUsersList] = useState<User[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // New member mock inputs
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<User['role']>('Designer');

  useEffect(() => {
    loadUsers();
  }, [currentUser]);

  const loadUsers = async () => {
    try {
      const data = await dbService.listUsers();
      setUsersList(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePermissionChange = async (uid: string, permission: User['permission']) => {
    try {
      await updateUserPermission(uid, permission);
      toast(`Đã thay đổi quyền thành công sang: ${permission}`, 'success');
      loadUsers();
    } catch (e) {
      toast('Lỗi khi cập nhật quyền.', 'error');
    }
  };

  const handleRoleChange = async (userToUpdate: User, newRole: string) => {
    try {
      await dbService.saveUser({ ...userToUpdate, role: newRole as User['role'] });
      toast(`Đã cập nhật Phòng ban cho ${userToUpdate.name}: ${newRole}`, 'success');
      loadUsers();
    } catch (e) {
      toast('Lỗi khi cập nhật phòng ban.', 'error');
    }
  };

  const handleApprovePending = async (uid: string, name: string, permission: 'Voter' | 'Viewer') => {
    try {
      await updateUserPermission(uid, permission);
      toast(`Đã duyệt kích hoạt tài khoản: "${name}" thành công!`, 'success');
      loadUsers();
    } catch (e) {
      toast('Lỗi khi kích hoạt tài khoản.', 'error');
    }
  };

  const handleSwitchToUser = async (uid: string, name: string) => {
    try {
      await switchUser(uid);
      toast(`Đã chuyển đổi sang tài khoản: ${name}`, 'success');
      // Redirect to home/vote page to see what that user sees
      window.location.hash = '#/';
    } catch (e) {
      toast('Không thể chuyển đổi tài khoản.', 'error');
    }
  };

  const handleRegisterMockUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newName.trim()) {
      toast('Vui lòng nhập đầy đủ thông tin.', 'warning');
      return;
    }

    try {
      const existing = await dbService.getUserByEmail(newEmail.trim());
      if (existing) {
        toast('Email này đã tồn tại trong hệ thống.', 'warning');
        return;
      }

      const newUser: User = {
        uid: `user_registered_${Date.now()}`,
        email: newEmail.trim().toLowerCase(),
        name: newName.trim(),
        role: newRole,
        permission: 'Pending', // Enforce Pending status by default to verify workflow
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dbService.saveUser(newUser);
      toast(`Đã đăng ký tài khoản thành công cho: ${newName}. Đang ở trạng thái Chờ duyệt.`, 'success');
      setNewName('');
      setNewEmail('');
      loadUsers();
    } catch (e) {
      toast('Có lỗi xảy ra.', 'error');
    }
  };

  // Split users into pending approval and active status
  const pendingUsers = usersList.filter(u => u.permission === 'Pending');
  const activeUsers = usersList.filter(u => u.permission !== 'Pending');

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* 1. PENDING APPROVALS LIST (Only rendered if there are pending users) */}
      {pendingUsers.length > 0 && (
        <section className="card animate-fade-in" style={{ padding: '24px 0', borderLeft: '5px solid var(--warning)' }}>
          <div style={{ padding: '0 24px 16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)', padding: '6px', borderRadius: '50%', display: 'flex' }}>
              <ShieldAlert size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Yêu cầu chờ kích hoạt tài khoản ({pendingUsers.length})</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Các nhân sự đã đăng nhập Google SNS lần đầu và hoàn thiện thông tin, đang chờ kích hoạt để tham gia bình chọn.
              </p>
            </div>
          </div>

          <div className="table-container" style={{ border: 'none', boxShadow: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Tên / Email</th>
                  <th>Phòng ban</th>
                  <th style={{ textAlign: 'right' }}>Duyệt kích hoạt</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map(u => (
                  <tr key={u.uid}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 700 }}>{u.name}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{u.email}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-secondary">{u.role}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          onClick={() => handleApprovePending(u.uid, u.name, 'Voter')}
                          className="btn btn-primary"
                          style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '6px', gap: '4px' }}
                        >
                          <Check size={12} />
                          <span>Duyệt: Voter</span>
                        </button>
                        <button
                          onClick={() => handleApprovePending(u.uid, u.name, 'Viewer')}
                          className="btn btn-outline"
                          style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '6px', gap: '4px' }}
                        >
                          <span>Duyệt: Viewer</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 2. ACTIVE MEMBERS LIST & REGISTER MOCK USER PANEL */}
      <div className="grid grid-cols-1 grid-cols-3-md" style={{ gap: '24px', alignItems: 'flex-start' }}>
        
        {/* Active Members Table */}
        <div className="card" style={{ padding: '24px 0', gridColumn: 'span 2' }}>
          <div style={{ padding: '0 24px 16px 24px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Thành viên đang hoạt động ({activeUsers.length})</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Phân định quyền truy cập giữa Admin (Quản trị hệ thống), Voter (Bỏ phiếu và xem kết quả) và Viewer (Chỉ xem kết quả biểu đồ).
            </p>
          </div>

          <div className="table-container" style={{ border: 'none', boxShadow: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Tên / Email</th>
                  <th>Phòng ban (Role)</th>
                  <th>Quyền hạn</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {activeUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(u => (
                  <tr key={u.uid} style={{ backgroundColor: u.uid === currentUser?.uid ? 'rgba(0,0,0,0.02)' : 'transparent' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            backgroundColor: u.permission === 'Admin' ? '#1D1D1F' : '#E5E5EA',
                            color: u.permission === 'Admin' ? '#FFFFFF' : '#1D1D1F',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '13px',
                            flexShrink: 0
                          }}
                        >
                          {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {u.name} {u.uid === currentUser?.uid && <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 600 }}>(Bạn)</span>}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <select
                        className="select"
                        value={u.role}
                        onChange={e => handleRoleChange(u, e.target.value)}
                        style={{ padding: '6px 10px', fontSize: '12px', width: 'auto', borderRadius: '8px', fontWeight: 600 }}
                      >
                        <option value="Designer">Designer</option>
                        <option value="CEO">CEO</option>
                        <option value="Ads">Ads</option>
                        <option value="Marketing">Marketing</option>
                        <option value="HR">HR (Nhân sự)</option>
                        <option value="Ke-toan">Kế toán</option>
                        <option value="Tech">Tech / IT</option>
                        <option value="Sales">Sales</option>
                        <option value="Executive">Executive</option>
                      </select>
                    </td>
                    <td>
                      <select
                        className="select"
                        value={u.permission}
                        disabled={u.uid === currentUser?.uid || u.email === 'admin@hazama.com'} // Protect main admin
                        onChange={e => handlePermissionChange(u.uid, e.target.value as User['permission'])}
                        style={{ padding: '6px 12px', fontSize: '12px', width: 'auto', borderRadius: '8px' }}
                      >
                        <option value="Admin">Admin</option>
                        <option value="Voter">Voter</option>
                        <option value="Viewer">Viewer</option>
                      </select>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {u.uid !== currentUser?.uid && (
                        <button
                          onClick={() => handleSwitchToUser(u.uid, u.name)}
                          className="btn btn-outline"
                          style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '8px', gap: '4px' }}
                        >
                          <ArrowRightLeft size={12} />
                          <span>Đăng nhập hộ</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Component */}
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(activeUsers.length / pageSize)}
              onPageChange={setCurrentPage}
              totalItems={activeUsers.length}
              pageSize={pageSize}
              itemLabel="thành viên"
            />
          </div>
        </div>

        {/* Register a new mock user */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <UserPlus size={18} color="var(--accent)" />
            <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Đăng ký thành viên mới</h3>
          </div>
          
          <form onSubmit={handleRegisterMockUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Họ và tên</label>
              <input
                type="text"
                className="input"
                placeholder="Ví dụ: Hoàng Minh Long"
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Email Google</label>
              <input
                type="email"
                className="input"
                placeholder="longhm@gmail.com"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Bộ phận (Phân tích Role)</label>
              <select
                className="select"
                value={newRole}
                onChange={e => setNewRole(e.target.value as User['role'])}
              >
                <option value="CEO">CEO</option>
                <option value="Designer">Designer</option>
                <option value="Ads">Ads</option>
                <option value="HR">HR</option>
                <option value="Kế toán">Kế toán</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '13px', borderRadius: '10px' }}>
              Thêm thành viên
            </button>
          </form>
        </div>

      </div>

    </div>
  );
};
