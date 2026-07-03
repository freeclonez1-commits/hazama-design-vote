import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DbProvider, useDb } from './context/DbContext';
import { ToastProvider, useToast } from './components/Toast';

// Import Pages
import { Login } from './pages/Login';
import { ProfileSetup } from './pages/ProfileSetup';
import { Vote } from './pages/Vote';
import { AdminLayout } from './components/AdminLayout';
import { AdminOverview } from './pages/AdminOverview';
import { CreateSession } from './pages/CreateSession';
import { ImportDesigns } from './pages/ImportDesigns';
import { ReviewSession } from './pages/ReviewSession';
import { LiveResults } from './pages/LiveResults';
import { Loader2 } from 'lucide-react';
import { Members } from './pages/Members';
import { ImportLogs } from './pages/ImportLogs';
import { Settings } from './pages/Settings';
import { Sessions } from './pages/Sessions';
import { PendingApproval } from './pages/PendingApproval';
// import { MusicPlayer } from './components/MusicPlayer'; // Tạm ẩn
import { ErrorBoundary } from './components/ErrorBoundary';


const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const { sessions } = useDb();
  const { toast } = useToast();

  const [hash, setHash] = useState(window.location.hash || '#/');
  const [adminTab, setAdminTab] = useState('overview');
  const [selectedSessionId, setSelectedSessionId] = useState('');

  // Listen to hash change for routing
  useEffect(() => {
    const handleHashChange = () => {
      setHash(window.location.hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Show loading indicator
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--background)' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          <Loader2 size={36} color="#1D1D1F" style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600, letterSpacing: '0.2px' }}>
            Đang xác thực thông tin...
          </p>
        </div>
      </div>
    );
  }

  // 1. Force Login redirect
  if (!user) {
    // If they aren't on #/login, force them
    if (hash !== '#/login') {
      window.location.hash = '#/login';
    }
    return <Login />;
  }

  // 2. Force Profile Setup redirect if name is empty
  if (!user.name) {
    if (hash !== '#/profile-setup') {
      window.location.hash = '#/profile-setup';
    }
    return <ProfileSetup />;
  }

  // 3. Force Pending Approval page if permission is Pending
  if (user.permission === 'Pending') {
    if (hash !== '#/pending-approval') {
      window.location.hash = '#/pending-approval';
    }
    return <PendingApproval />;
  }

  // Prevent accessing login, profile-setup, or pending-approval if already fully configured
  if (hash === '#/login' || hash === '#/profile-setup' || hash === '#/pending-approval') {
    if (user.permission === 'Admin') {
      window.location.hash = '#/admin';
    } else {
      window.location.hash = '#/';
    }
  }

  // If Admin lands on home page (#/ or empty) and there are no active published sessions, redirect to #/admin
  if (user.permission === 'Admin' && (hash === '' || hash === '#/')) {
    const hasActiveSession = sessions.some(s => s.status === 'published');
    if (!hasActiveSession) {
      window.location.hash = '#/admin';
    }
  }

  // 3. Routing resolution
  const pathParts = hash.split('/');
  const route = pathParts[1] || ''; // 'admin', 'vote' or empty

  // Admin routes protection
  if (route === 'admin') {
    if (user.permission !== 'Admin') {
      // Voter/Viewer can not access Admin pages
      setTimeout(() => {
        toast('Bạn không có quyền truy cập vào trang Admin.', 'error');
      }, 100);
      window.location.hash = '#/';
      return <Vote />;
    }

    // Inside Admin Dashboard
    return (
      <AdminLayout currentTab={adminTab} setTab={setAdminTab}>
        {adminTab === 'overview' && (
          <AdminOverview setTab={setAdminTab} setSelectedSessionId={setSelectedSessionId} />
        )}
        
        {adminTab === 'sessions' && (
          <Sessions setTab={setAdminTab} setSelectedSessionId={setSelectedSessionId} />
        )}

        {adminTab === 'create-session' && (
          <CreateSession setTab={setAdminTab} setSelectedSessionId={setSelectedSessionId} />
        )}

        {adminTab === 'sessions-import' && (
          <ImportDesigns sessionId={selectedSessionId} setTab={setAdminTab} />
        )}

        {adminTab === 'sessions-review' && (
          <ReviewSession sessionId={selectedSessionId} setTab={setAdminTab} />
        )}

        {adminTab === 'sessions-results' && (
          <LiveResults sessionId={selectedSessionId} setTab={setAdminTab} />
        )}

        {adminTab === 'members' && <Members />}

        {adminTab === 'import-logs' && <ImportLogs />}

        {adminTab === 'settings' && <Settings />}
      </AdminLayout>
    );
  }

  // Specific session voter page (e.g. #/vote/session_1)
  if (route === 'vote' && pathParts[2]) {
    return <Vote sessionId={pathParts[2]} />;
  }

  // Default Voter Home page (loads active published session)
  return <Vote />;
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <DbProvider>
            <AppContent />
            {/* <MusicPlayer /> */}
          </DbProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;
