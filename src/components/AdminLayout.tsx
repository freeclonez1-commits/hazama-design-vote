import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  LogOut,
  ChevronRight
} from 'lucide-react';

interface AdminLayoutProps {
  currentTab: string;
  setTab: (tab: string) => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentTab,
  setTab,
  children
}) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'sessions', label: 'Phiên bình chọn', icon: CalendarDays },
    { id: 'members', label: 'Thành viên', icon: Users }
  ];

  return (
    <div className="admin-layout">
      {/* Desktop Sidebar */}
      <aside className="admin-sidebar animate-fade-in">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '0 8px', marginBottom: '8px' }}>
          <img 
            src="https://bizweb.dktcdn.net/100/558/373/theme_temp/1024758/assets/logo-hazama-01-831cb57d-a357-419f-a4d9-e5d7a10f7f69-7f9fdab7-8bb7-494a-b91f-d4ba2604b1ce.png?1782204204270" 
            alt="Hazama Logo" 
            style={{ 
              height: '34px', 
              width: 'auto', 
              objectFit: 'contain',
              alignSelf: 'flex-start'
            }} 
          />
          <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent)', letterSpacing: '1.2px', textTransform: 'uppercase' }}>
            ADMIN PANEL
          </span>
        </div>

        {/* Navigation list */}
        <nav style={{ flex: 1 }}>
          <ul className="admin-nav-list">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id || (item.id === 'sessions' && currentTab.startsWith('sessions-'));
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setTab(item.id)}
                    className={`admin-nav-item ${isActive ? 'admin-nav-item-active' : ''}`}
                    style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                    {isActive && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Card & Logout */}
        <div
          style={{
            borderTop: '1px solid var(--border)',
            paddingTop: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 8px' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: 'var(--accent)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '14px'
              }}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {user?.name || 'Admin'}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{user?.role || 'Quản lý'}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="btn btn-outline"
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: '13px',
              borderRadius: '10px',
              justifyContent: 'flex-start',
              gap: '10px',
              border: '1px solid #FF3B30',
              color: '#FF3B30'
            }}
          >
            <LogOut size={16} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-content animate-fade-in">
        {/* Header (Desktop-only header elements, e.g. path title) */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '32px',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '16px'
          }}
        >
          <div>
            <h2 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.5px' }}>
              {navItems.find(i => i.id === currentTab)?.label || 
               (currentTab.startsWith('sessions-') ? 'Chi tiết phiên' : 'Quản lý')}
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Chào mừng trở lại, {user?.name || 'Admin'}. Hệ thống đang hoạt động ổn định.
            </p>
          </div>

          {/* Quick link button to switch to Voter layout to check things */}
          <button
            onClick={() => window.location.hash = '#/'}
            className="btn btn-outline"
            style={{ fontSize: '13px', padding: '8px 16px', borderRadius: '10px' }}
          >
            Về trang bình chọn
          </button>
        </header>

        {children}
      </main>

      {/* Mobile Drawer / Bottom navigation */}
      <nav className="admin-mobile-nav">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id || (item.id === 'sessions' && currentTab.startsWith('sessions-'));
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`admin-mobile-item ${isActive ? 'admin-mobile-item-active' : ''}`}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <Icon size={20} />
              <span>{item.label.split(' ')[0]}</span> {/* Truncate labels for tiny mobile screens */}
            </button>
          );
        })}
        <button
          onClick={logout}
          className="admin-mobile-item"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF3B30' }}
        >
          <LogOut size={20} />
          <span>Thoát</span>
        </button>
      </nav>
    </div>
  );
};
