import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDb } from '../context/DbContext';
import { useToast } from '../components/Toast';
import { DesignCard } from '../components/DesignCard';
import { Modal } from '../components/Modal';
import type { Design, Variant, DesignComment, UserPresence } from '../types/models';
import { dbService } from '../services/db';
import { isFirebaseEnabled } from '../services/firebaseService';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Trophy,
  ExternalLink,
  MessageSquare,
  Send,
  Trash2,
  Lock,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  FolderDown
} from 'lucide-react';

const ConfettiCanvas: React.FC = () => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const handleResize = () => {
      if (canvas) {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    const colors = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#FF2D55'];
    const particles = Array.from({ length: 85 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height - height,
      r: Math.random() * 5 + 3,
      d: Math.random() * height,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 5,
      tiltAngleIncremental: Math.random() * 0.05 + 0.02,
      tiltAngle: 0
    }));

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p, idx) => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
        p.x += Math.sin(p.tiltAngle);
        p.tilt = Math.sin(p.tiltAngle - idx / 3) * 10;

        if (p.y > height) {
          p.x = Math.random() * width;
          p.y = -20;
          p.tilt = Math.random() * 10 - 5;
        }

        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1500
      }}
    />
  );
};

const COLORS_MAP: Record<string, string> = {
  black: '#1C1C1E',
  white: '#FFFFFF',
  grey: '#8E8E93',
  navy: '#1D2E44',
  beige: '#E5D3B3',
  red: '#FF3B30',
  blue: '#007AFF',
  green: '#34C759',
  brown: '#A2845E',
  pink: '#FF2D55',
  purple: '#AF52DE',
  yellow: '#FFCC00',
  orange: '#FF9500'
};

interface VoteProps {
  sessionId?: string; // Optional: if omitted, load the first published session
}

export const Vote: React.FC<VoteProps> = ({ sessionId }) => {
  const { user, logout } = useAuth();
  const {
    sessions,
    activeSession,
    designs,
    variants,
    votes,
    loading,
    loadSessionDetails,
    submitVote
  } = useDb();
  const { toast } = useToast();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hasVotedBefore, setHasVotedBefore] = useState(false);
  const [votedDesigns, setVotedDesigns] = useState<Design[]>([]);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [showVoteConfirmModal, setShowVoteConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFireworks, setShowFireworks] = useState(false);
  // Sync ref guard to prevent double-submit even with React batch updates
  const isSubmittingRef = useRef(false);

  // Detail Modal States
  const [detailDesign, setDetailDesign] = useState<Design | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [detailVariants, setDetailVariants] = useState<Variant[]>([]);
  const [viewTab, setViewTab] = useState<'f' | 'b'>('f');

  // Internal Feedback Comments States
  const [comments, setComments] = useState<DesignComment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [isAnonymousComment, setIsAnonymousComment] = useState(false);




  useEffect(() => {
    if (detailDesign) {
      loadDesignComments(detailDesign.id);
    }
  }, [detailDesign]);

  const loadDesignComments = async (designId: string) => {
    try {
      const data = await dbService.listComments(designId);
      setComments(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !detailDesign || !user) return;
    try {
      const newComment: DesignComment = {
        id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        designId: detailDesign.id,
        userEmail: user.email,
        userName: user.name,
        userRole: user.role,
        isAnonymous: isAnonymousComment,
        content: commentInput.trim(),
        createdAt: new Date().toISOString()
      };
      await dbService.saveComment(newComment);
      setCommentInput('');
      toast('Đã gửi góp ý thành công!', 'success');
      loadDesignComments(detailDesign.id);
    } catch (e) {
      toast('Có lỗi khi gửi góp ý.', 'error');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await dbService.deleteComment(commentId);
      toast('Đã xóa góp ý.', 'info');
      if (detailDesign) loadDesignComments(detailDesign.id);
    } catch (e) {
      toast('Lỗi khi xóa.', 'error');
    }
  };

  // Download Options Menu State
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  // High quality lossless image downloader via Blob URL
  const downloadSingleImageBlob = async (url: string, fileName: string) => {
    try {
      if (url.startsWith('data:')) {
        const res = await fetch(url);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      } else {
        const res = await fetch(url);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      }
    } catch (e) {
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Option 1: Download currently viewed image
  const handleDownloadActiveVariant = async () => {
    if (!activeModalVariant) return;
    setShowDownloadMenu(false);
    let fileName = activeModalVariant.originalFileName;
    if (!fileName) {
      const ext = activeModalVariant.imageUrl.includes('png') ? 'png' : 'jpg';
      fileName = `${detailDesign?.code || 'design'}_${selectedColor}_${viewTab === 'f' ? 'front' : 'back'}.${ext}`;
    }
    await downloadSingleImageBlob(activeModalVariant.imageUrl, fileName);
    toast(`Đã tải xuống ảnh gốc: ${fileName}`, 'success');
  };

  // Option 2: Download ALL variants of current Design (Project)
  const handleDownloadCurrentDesignAllImages = async () => {
    if (!detailDesign) return;
    setShowDownloadMenu(false);
    const designVariants = variants.filter(v => v.designId === detailDesign.id);
    if (designVariants.length === 0) {
      toast('Không có ảnh nào trong mẫu này.', 'warning');
      return;
    }

    toast(`Đang tải toàn bộ ${designVariants.length} ảnh của mẫu ${detailDesign.code}...`, 'info');
    for (let i = 0; i < designVariants.length; i++) {
      const v = designVariants[i];
      let fn = v.originalFileName || `${detailDesign.code}_${v.color}_${v.view === 'f' ? 'front' : 'back'}.${v.imageUrl.includes('png') ? 'png' : 'jpg'}`;
      await downloadSingleImageBlob(v.imageUrl, fn);
      await new Promise(r => setTimeout(r, 300));
    }
    toast(`Hoàn tất tải ${designVariants.length} ảnh của ${detailDesign.code}!`, 'success');
  };

  // Option 3: Download ALL images of entire Collection (Session)
  const handleDownloadCollectionAllImages = async () => {
    if (!activeSession) return;
    setShowDownloadMenu(false);
    if (variants.length === 0) {
      toast('Bộ sưu tập chưa có hình ảnh nào.', 'warning');
      return;
    }

    toast(`Đang khởi tạo tải ${variants.length} ảnh toàn bộ Bộ sưu tập ${activeSession.collection}...`, 'info');
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      const parentDesign = designs.find(d => d.id === v.designId);
      const code = parentDesign ? parentDesign.code : 'MOCK';
      let fn = v.originalFileName || `${code}_${v.color}_${v.view === 'f' ? 'front' : 'back'}.${v.imageUrl.includes('png') ? 'png' : 'jpg'}`;
      await downloadSingleImageBlob(v.imageUrl, fn);
      await new Promise(r => setTimeout(r, 250));
    }
    toast(`Hoàn tất tải toàn bộ ${variants.length} ảnh của Bộ sưu tập!`, 'success');
  };



  // High performance DOM Ref Magnifier Handler (60fps - Zero React Re-render Lag)
  const magnifierRef = useRef<HTMLDivElement | null>(null);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);

  const handleUpdateMagnifierPosition = (clientX: number, clientY: number, container: HTMLDivElement) => {
    const glass = magnifierRef.current;
    if (!glass || !activeModalVariant) return;

    const rect = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));

    const isMobile = window.innerWidth <= 768;
    const glassRadius = isMobile ? 65 : 85;
    const zoomFactor = 2.4;

    glass.style.display = 'block';
    glass.style.left = `${x - glassRadius}px`;
    glass.style.top = `${y - glassRadius}px`;
    glass.style.backgroundImage = `url(${activeModalVariant.imageUrl})`;
    glass.style.backgroundPosition = `${-x * zoomFactor + glassRadius}px ${-y * zoomFactor + glassRadius}px`;
    glass.style.backgroundSize = `${rect.width * zoomFactor}px ${rect.height * zoomFactor}px`;
  };

  const handleHideMagnifier = () => {
    if (magnifierRef.current) {
      magnifierRef.current.style.display = 'none';
    }
  };

  const handleMagnifierMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    handleUpdateMagnifierPosition(e.clientX, e.clientY, e.currentTarget);
  };

  const handleMagnifierTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.cancelable) {
      e.preventDefault();
    }
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      handleUpdateMagnifierPosition(touch.clientX, touch.clientY, e.currentTarget);
    }
  };

  const handleMagnifierMouseLeave = () => {
    handleHideMagnifier();
  };

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  // 1. Resolve session: support multi-published-session selector
  // Hide expired sessions from the picker and automatically treat them as closed/ended.
  const publishedSessions = sessions.filter(
    s => s.status === 'published' && new Date(s.deadline).getTime() > Date.now()
  );

  const [chosenSessionId, setChosenSessionId] = useState<string>('');
  const [showSessionPicker, setShowSessionPicker] = useState<boolean>(false);

  // Track which sessions the logged-in user has already voted in
  const [userVotedSessionIds, setUserVotedSessionIds] = useState<Set<string>>(new Set());

  const targetSessionId = sessionId
    || chosenSessionId
    || (publishedSessions.length === 1 ? publishedSessions[0].id : '');

  useEffect(() => {
    if (targetSessionId) {
      loadSessionDetails(targetSessionId);
    }
  }, [targetSessionId]);

  const [presenceList, setPresenceList] = useState<UserPresence[]>([]);

  // Real-time Presence Tracking (Google Sheets style)
  useEffect(() => {
    if (!user || !targetSessionId) return;

    // Gửi tín hiệu online ban đầu
    let currentStatus: 'online' | 'idle' = 'online';
    const reportPresence = async (status: 'online' | 'idle') => {
      currentStatus = status;
      try {
        await dbService.updatePresence({
          uid: user.uid,
          name: user.name,
          email: user.email,
          role: user.role,
          sessionId: targetSessionId,
          lastActive: new Date().toISOString(),
          status
        });
      } catch (err) {
        console.error('Failed to report presence:', err);
      }
    };

    reportPresence('online');

    // Nhịp tim (heartbeat) cập nhật trạng thái mỗi 10 giây
    const heartbeat = setInterval(() => {
      reportPresence(currentStatus);
    }, 10000);

    // Lắng nghe hoạt động để phát hiện treo máy (idle) sau 2 phút không tương tác
    let idleTimeout: any;
    const resetIdleTimer = () => {
      clearTimeout(idleTimeout);
      
      if (currentStatus === 'idle') {
        reportPresence('online');
      }

      idleTimeout = setTimeout(() => {
        reportPresence('idle');
      }, 120000); // 2 phút
    };

    resetIdleTimer();

    const activityEvents = ['mousemove', 'keypress', 'click', 'scroll', 'touchstart'];
    activityEvents.forEach(evt => {
      window.addEventListener(evt, resetIdleTimer);
    });

    // Reset idle khi user quay lại tab Vote sau khi đã chuyển sang tab khác
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        resetIdleTimer();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Dọn dẹp trạng thái khi tắt trình duyệt/đóng tab
    const handleUnload = () => {
      dbService.removePresence(user.uid).catch(e => console.error('Unload presence error:', e));
    };
    window.addEventListener('beforeunload', handleUnload);

    // Đăng ký nhận danh sách người truy cập thời gian thực
    const unsubscribe = dbService.subscribePresence(targetSessionId, (list) => {
      const now = Date.now();
      // Chỉ giữ lại những người có nhịp tim cập nhật trong 35 giây qua
      const activeList = list.filter(p => {
        const timeDiff = now - new Date(p.lastActive).getTime();
        return timeDiff < 35000;
      });
      setPresenceList(activeList);
    });

    return () => {
      clearInterval(heartbeat);
      clearTimeout(idleTimeout);
      activityEvents.forEach(evt => {
        window.removeEventListener(evt, resetIdleTimer);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleUnload);
      handleUnload();
      unsubscribe();
    };
  }, [user?.uid, targetSessionId]);

  // Tạo danh sách hiển thị: bản thân + người khác (thật + mock bổ sung nếu chưa đủ)
  const displayPresence = useMemo(() => {
    if (!user || !targetSessionId) return [];

    // Entry của bản thân — luôn hiện ở cuối bên phải
    const selfEntry: UserPresence = {
      uid: user.uid,
      name: user.name,
      email: user.email,
      role: user.role,
      sessionId: targetSessionId,
      lastActive: new Date().toISOString(),
      status: 'online'
    };

    // Người khác đang online thật sự (từ Firestore hoặc localStorage)
    const others = presenceList.filter(p => p.uid !== user.uid);

    // Demo users — hiện khi chưa có đủ 2 người thật khác online
    // để Avatar Stack luôn trông sống động và nhiều màu sắc
    const demoUsers: UserPresence[] = [
      {
        uid: 'demo_ceo',
        name: 'Trần Việt Anh',
        email: 'ceo@hazama.com',
        role: 'CEO',
        sessionId: targetSessionId,
        lastActive: new Date().toISOString(),
        status: 'online'
      },
      {
        uid: 'demo_hr',
        name: 'Phạm Thu Thảo',
        email: 'hr@hazama.com',
        role: 'HR',
        sessionId: targetSessionId,
        lastActive: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        status: 'idle'
      }
    ];

    const combined = [...others];

    // Chỉ bổ sung mock users trong chế độ Mock/Demo (khi Firebase bị tắt)
    if (!isFirebaseEnabled && others.length < 2) {
      demoUsers.forEach(du => {
        // Không thêm nếu trùng với bản thân hoặc đã có trong danh sách thật
        if (
          user.email !== du.email &&
          !combined.some(p => p.uid === du.uid || p.email === du.email)
        ) {
          combined.push(du);
        }
      });
    }

    // Bản thân luôn ở cuối cùng (ngoài cùng bên phải)
    combined.push(selfEntry);

    return combined;
  }, [presenceList, targetSessionId, user]);

  useEffect(() => {
    if (user && publishedSessions.length > 0) {
      Promise.all(
        publishedSessions.map(async (s) => {
          try {
            const sVotes = await dbService.listVotes(s.id);
            const userVote = sVotes.find(v => v.userEmail.toLowerCase() === user.email.toLowerCase());
            return userVote ? s.id : null;
          } catch (e) {
            return null;
          }
        })
      ).then(results => {
        const votedIds = new Set(results.filter((id): id is string => id !== null));
        setUserVotedSessionIds(votedIds);
      });
    }
  }, [user, publishedSessions, votes]);



  // Lắng nghe thay đổi localStorage từ tab Admin (ví dụ: Admin reset votes)
  // Giúp Vote page phản ứng ngay thay vì chờ 3s polling
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'hazama_votes' && targetSessionId) {
        loadSessionDetails(targetSessionId);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [targetSessionId]);

  // 2. Check if user has already voted
  useEffect(() => {
    if (activeSession && votes && user) {
      const userVote = votes.find(v => v.userEmail.toLowerCase() === user.email.toLowerCase());
      if (userVote) {
        setHasVotedBefore(true);
        setSelectedIds(userVote.selectedDesignIds);
        // Find voted designs to show on success screen if needed
        const filtered = designs.filter(d => userVote.selectedDesignIds.includes(d.id));
        setVotedDesigns(filtered);
        setShowSuccessScreen(true);
      } else {
        setHasVotedBefore(false);
        setSelectedIds([]);
        setVotedDesigns([]);
        setShowSuccessScreen(false);
      }
    }
  }, [activeSession, votes, user, designs]);

  // 3. Countdown timer logic
  useEffect(() => {
    if (!activeSession) return;

    const timer = setInterval(() => {
      const difference = +new Date(activeSession.deadline) - +new Date();
      if (difference <= 0) {
        setTimeLeft(null);
        clearInterval(timer);
      } else {
        const d = Math.floor(difference / (1000 * 60 * 60 * 24));
        const h = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const m = Math.floor((difference / 1000 / 60) % 60);
        const s = Math.floor((difference / 1000) % 60);
        setTimeLeft({ d, h, m, s });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeSession]);

  // 4. Detail modal color variants selection
  useEffect(() => {
    if (detailDesign) {
      const designVars = variants.filter(v => v.designId === detailDesign.id);
      setDetailVariants(designVars);

      const colors = Array.from(new Set(designVars.map(v => v.color)));
      if (colors.length > 0 && !colors.includes(selectedColor)) {
        setSelectedColor(colors[0]);
      }
    }
  }, [detailDesign, variants]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--background)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="skeleton skeleton-image" style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px auto' }} />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Đang tải dữ liệu bình chọn...</p>
        </div>
      </div>
    );
  }

  // Check user permission
  if (user && user.permission === 'Pending') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexFlow: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--background)', padding: '24px' }}>
        <div className="card animate-scale-up" style={{ maxWidth: '480px', width: '100%', padding: '40px', textAlign: 'center', boxShadow: 'var(--shadow-lg)', borderRadius: '24px', backgroundColor: '#FFFFFF' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'var(--warning-light)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
            <Clock size={32} />
          </div>
          <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '-0.5px' }}>Tài khoản đang chờ duyệt</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
            Chào <strong>{user.name}</strong> ({user.role}), tài khoản Google của bạn đã được đăng ký thành công trên hệ thống. 
            <br /><br />
            Tuy nhiên, bạn cần được <strong>Quản trị viên (Admin) phê duyệt kích hoạt</strong> trước khi có thể tham gia bỏ phiếu. Vui lòng liên hệ Admin để kích hoạt nhanh.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={logout} className="btn btn-outline" style={{ flex: 1, borderRadius: '12px', fontSize: '14px', padding: '10px' }}>
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Multi-session picker: show when ≥2 published sessions and (user clicked change session OR no session chosen yet) ---
  if (!sessionId && publishedSessions.length >= 2 && (showSessionPicker || !chosenSessionId)) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F8F9FA',
        backgroundImage: 'radial-gradient(at 10% 10%, rgba(0, 122, 255, 0.05) 0px, transparent 50%), radial-gradient(at 90% 90%, rgba(255, 149, 0, 0.05) 0px, transparent 50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '32px 20px 48px 20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, sans-serif'
      }}>
        {/* Top Navbar */}
        <header style={{
          width: '100%',
          maxWidth: '1040px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '36px',
          padding: '10px 16px',
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '16px',
          border: '1px solid rgba(0, 0, 0, 0.06)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
        }}>
          <img
            src="https://bizweb.dktcdn.net/100/558/373/theme_temp/1024758/assets/logo-hazama-01-831cb57d-a357-419f-a4d9-e5d7a10f7f69-7f9fdab7-8bb7-494a-b91f-d4ba2604b1ce.png?1782204204270"
            alt="Hazama Logo"
            style={{ height: '26px', maxHeight: '26px', objectFit: 'contain', display: 'block' }}
          />

          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#F2F2F7', padding: '4px 10px 4px 6px', borderRadius: '20px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '11px',
                  flexShrink: 0
                }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#1D1D1F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '110px' }}>
                  {user.name}
                </span>
                <span className="hide-mobile" style={{ fontSize: '11px', color: '#86868B', whiteSpace: 'nowrap' }}>
                  ({user.role})
                </span>
              </div>

              {user.permission === 'Admin' && (
                <button
                  onClick={() => window.location.hash = '#/admin'}
                  className="btn btn-outline"
                  style={{ padding: '3px 8px', fontSize: '11px', borderRadius: '8px', fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                  Admin
                </button>
              )}

              <button
                onClick={logout}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#FF3B30',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '3px 6px',
                  whiteSpace: 'nowrap'
                }}
              >
                Đăng xuất
              </button>
            </div>
          )}
        </header>

        {/* Hero Title Section */}
        <div style={{ textAlign: 'center', marginBottom: '40px', maxWidth: '600px' }} className="animate-fade-in">
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            backgroundColor: 'rgba(52, 199, 89, 0.1)',
            color: '#28CD41',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 700,
            marginBottom: '16px'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#34C759', display: 'inline-block', boxShadow: '0 0 10px #34C759' }} />
            {publishedSessions.length} phiên đang diễn ra
          </div>
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#1D1D1F', letterSpacing: '-1px', margin: '0 0 12px 0', lineHeight: 1.2 }}>
            Chọn phiên bình chọn
          </h2>
          <p style={{ fontSize: '15px', color: '#6E6E73', margin: 0, lineHeight: 1.5 }}>
            Vui lòng chọn bộ sưu tập hoặc sự kiện bạn muốn tham gia bỏ phiếu đánh giá thiết kế.
          </p>
        </div>

        {/* Sessions Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: publishedSessions.length === 2 ? 'repeat(auto-fit, minmax(320px, 1fr))' : 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          maxWidth: '960px',
          width: '100%'
        }}>
          {publishedSessions.map(s => {
            const deadline = new Date(s.deadline);
            const now = new Date();
            const msLeft = +deadline - +now;
            const daysLeft = Math.max(0, Math.floor(msLeft / (1000 * 60 * 60 * 24)));
            const hoursLeft = Math.max(0, Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
            const isUrgent = msLeft < 24 * 60 * 60 * 1000;
            const formattedDeadline = deadline.toLocaleString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={s.id}
                onClick={() => {
                  setChosenSessionId(s.id);
                  setShowSessionPicker(false);
                }}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '24px',
                  padding: '32px 28px',
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '24px',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                className="hover-card"
                onMouseEnter={e => {
                  const card = e.currentTarget;
                  card.style.transform = 'translateY(-4px)';
                  card.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.08)';
                  card.style.borderColor = 'var(--accent)';
                }}
                onMouseLeave={e => {
                  const card = e.currentTarget;
                  card.style.transform = 'translateY(0)';
                  card.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.04)';
                  card.style.borderColor = 'rgba(0, 0, 0, 0.06)';
                }}
              >
                {/* Top badges bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 12px',
                      borderRadius: '30px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: '#EBF5FF',
                      color: '#007AFF'
                    }}>
                      <span style={{ fontSize: '12px' }}>👕</span>
                      {s.collection || 'BST Hazama'}
                    </span>

                    {userVotedSessionIds.has(s.id) && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '5px 12px',
                        borderRadius: '30px',
                        fontSize: '11px',
                        fontWeight: 800,
                        backgroundColor: '#ECFDF5',
                        color: '#059669',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        boxShadow: '0 2px 6px rgba(16, 185, 129, 0.12)'
                      }}>
                        ✓ Đã vote
                      </span>
                    )}
                  </div>

                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '5px 12px',
                    borderRadius: '30px',
                    backgroundColor: isUrgent ? '#FFF0F0' : '#F2F2F7',
                    color: isUrgent ? '#FF3B30' : '#6E6E73'
                  }}>
                    {isUrgent ? `⚡ Còn ${hoursLeft}h` : `⏰ Hạn ${daysLeft} ngày`}
                  </span>
                </div>

                {/* Main Session Content */}
                <div>
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: 800,
                    color: '#1D1D1F',
                    letterSpacing: '-0.5px',
                    lineHeight: 1.35,
                    margin: '0 0 10px 0'
                  }}>
                    {s.title}
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: '#86868B', marginTop: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#1D1D1F', fontWeight: 600 }}>🗳️ Quy định:</span>
                      <span>Tối đa <strong style={{ color: '#1D1D1F' }}>{s.maxVotesPerUser} vote</strong> / người</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#1D1D1F', fontWeight: 600 }}>📅 Hạn chót:</span>
                      <span>{formattedDeadline}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Action Button */}
                <div style={{
                  paddingTop: '16px',
                  borderTop: '1px solid #F2F2F7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: userVotedSessionIds.has(s.id) ? '#059669' : 'var(--accent)',
                  fontWeight: 700,
                  fontSize: '14px'
                }}>
                  <span>{userVotedSessionIds.has(s.id) ? 'Xem lại bình chọn' : 'Tham gia bình chọn'}</span>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: userVotedSessionIds.has(s.id) ? 'rgba(5, 150, 105, 0.1)' : 'rgba(0, 122, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px'
                  }}>
                    →
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info (pushed to bottom of screen via marginTop: auto) */}
        <div style={{ marginTop: 'auto', paddingTop: '40px', fontSize: '12px', color: '#A1A1A6', textAlign: 'center' }}>
          © {new Date().getFullYear()} Hazama Design Vote System. All rights reserved.
        </div>
      </div>
    );
  }

  if (!activeSession) {
    return (
      <div 
        className="animate-fade-in"
        style={{ 
          backgroundColor: '#FAF9F6', 
          minHeight: '100vh', 
          padding: '60px 24px', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
        }}
      >
        {/* Brand Logo Header */}
        <div style={{ marginBottom: '40px', textAlign: 'center' }}>
          <img 
            src="https://bizweb.dktcdn.net/100/558/373/theme_temp/1024758/assets/logo-hazama-01-831cb57d-a357-419f-a4d9-e5d7a10f7f69-7f9fdab7-8bb7-494a-b91f-d4ba2604b1ce.png?1782204204270" 
            alt="Hazama Logo" 
            style={{ height: '42px', objectFit: 'contain' }} 
          />
        </div>

        {/* Main Hero Card */}
        <div 
          className="landing-card"
          style={{ 
            maxWidth: '680px', 
            width: '100%', 
            textAlign: 'center', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            border: '1px solid rgba(0, 0, 0, 0.04)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.02)'
          }}
        >
          <h2 
            style={{ 
              fontSize: '24px', 
              fontWeight: 700, 
              color: '#1D1D1F', 
              letterSpacing: '-1px', 
              lineHeight: '1.2',
              margin: 0
            }}
          >
            Nơi ý tưởng của bạn <br className="mobile-only" />trở thành sản phẩm
          </h2>

          <p 
            style={{ 
              fontSize: '14px', 
              color: 'var(--text-secondary)', 
              lineHeight: '1.4', 
              margin: '0 max(16px, 4%)',
              fontWeight: 400
            }}
          >
            Hệ thống bình chọn thiết kế độc quyền dành cho thành viên của Hazama. Tiếng nói của bạn sẽ trực tiếp quyết định các mẫu sản phẩm được sản xuất thương mại tiếp theo.
          </p>

          {/* Status Indicator Bar */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              padding: '12px 20px', 
              backgroundColor: '#FAF9F6', 
              borderRadius: '50px',
              border: '1px solid rgba(0, 0, 0, 0.03)',
              marginTop: '8px'
            }}
          >
            <span 
              className="animate-pulse"
              style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                backgroundColor: '#FF9500', 
                display: 'inline-block' 
              }} 
            />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#1D1D1F' }}>
              Trạng thái: Đang cập nhật bộ sưu tập mới
            </span>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(0, 0, 0, 0.05)', width: '100%', margin: '16px 0' }} />

          {/* User Logged In Info */}
          {user && (
            <div 
              className="landing-info-box"
              style={{ 
                width: '100%',
                padding: '12px 16px', 
                backgroundColor: '#FAF9F6', 
                borderRadius: '12px', 
                fontSize: '12px', 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                border: '1px solid rgba(0, 0, 0, 0.02)'
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}>Đang đăng nhập</div>
                <div style={{ fontWeight: 600, color: '#1D1D1F', marginTop: '2px' }}>{user.email}</div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span className="badge badge-secondary" style={{ textTransform: 'capitalize', fontSize: '10px' }}>{user.permission}</span>
              </div>
            </div>
          )}

          {/* Button Actions */}
          <div className="landing-actions" style={{ display: 'flex', gap: '12px', width: '100%', flexWrap: 'wrap', marginTop: '8px' }}>
            <button 
              onClick={logout} 
              className="btn btn-outline" 
              style={{ 
                flex: 1, 
                borderRadius: '10px', 
                fontSize: '13px', 
                padding: '12px',
                justifyContent: 'center',
                backgroundColor: '#FFFFFF'
              }}
            >
              Đăng xuất tài khoản
            </button>

            {user?.permission === 'Admin' ? (
              <button
                onClick={() => window.location.hash = '#/admin'}
                className="btn btn-primary"
                style={{ 
                  flex: 1.2, 
                  borderRadius: '10px', 
                  fontSize: '13px', 
                  padding: '12px',
                  justifyContent: 'center',
                  backgroundColor: '#1D1D1F',
                  color: '#FFFFFF'
                }}
              >
                Vào trang quản trị
              </button>
            ) : (
              <a
                href="https://hazama.vn"
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
                style={{ 
                  flex: 1.2, 
                  borderRadius: '10px', 
                  fontSize: '13px', 
                  padding: '12px',
                  justifyContent: 'center',
                  backgroundColor: '#1D1D1F',
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>Ghé cửa hàng Hazama</span>
                <ExternalLink size={14} />
              </a>
            )}
          </div>

        </div>

        {/* Footer copyright */}
        <div style={{ marginTop: '40px', fontSize: '11px', color: 'var(--text-secondary)' }}>
          © {new Date().getFullYear()} Hazama. All rights reserved.
        </div>
      </div>
    );
  }


  // Session state checks
  // FIXED: Compute deadline directly — do NOT use timeLeft===null as closed indicator
  // (timeLeft starts null before interval fires, causing published sessions to briefly appear closed)
  const isDeadlinePassed = activeSession ? new Date(activeSession.deadline).getTime() <= Date.now() : false;
  const isClosed = activeSession.status === 'closed' || activeSession.status === 'approved' || activeSession.status === 'archived' || isDeadlinePassed;
  const isNotPublishedYet = activeSession.status === 'draft' || activeSession.status === 'review';
  const isWinnerRevealActive = (activeSession.status === 'approved' || activeSession.status === 'closed') && !!activeSession.approvedWinnerIds && activeSession.approvedWinnerIds.length > 0;

  const handleSelectDesign = (id: string) => {
    if (isClosed) {
      toast('Phiên bình chọn đã đóng cửa. Bạn không thể thay đổi bình chọn.', 'warning');
      return;
    }

    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        if (prev.length >= activeSession.maxVotesPerUser) {
          toast(`Bạn chỉ được chọn tối đa ${activeSession.maxVotesPerUser} thiết kế.`, 'warning');
          return prev;
        }
        return [...prev, id];
      }
    });
  };

  const handleOpenDetailModal = (design: Design) => {
    setDetailDesign(design);
    setViewTab('f');
    handleHideMagnifier();
  };

  const handleVoteSubmit = () => {
    if (selectedIds.length === 0) {
      toast('Vui lòng chọn ít nhất 1 thiết kế để bình chọn.', 'warning');
      return;
    }
    if (!user) {
      toast('Bạn chưa đăng nhập. Vui lòng đăng nhập lại.', 'error');
      return;
    }
    // Open custom confirm modal instead of window.confirm
    setShowVoteConfirmModal(true);
  };

  const handleConfirmVote = async () => {
    // Sync ref check prevents double-submit even before React re-render
    if (isSubmittingRef.current) return;
    if (!user || !activeSession) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setShowVoteConfirmModal(false);

    try {
      await submitVote(
        activeSession.id,
        user.uid,
        user.email,
        user.name,
        user.role,
        selectedIds
      );
      toast('Gửi bình chọn thành công! 🎉', 'success');
      setShowSuccessScreen(true);
      setHasVotedBefore(true);
      // Trigger fireworks 🎆
      setShowFireworks(true);
      setTimeout(() => setShowFireworks(false), 4000);
    } catch (e) {
      console.error(e);
      toast('Gửi bình chọn thất bại. Vui lòng thử lại.', 'error');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Helper to get image of variant in modal
  const activeModalVariant = detailVariants.find(v => v.color === selectedColor && v.view === viewTab);
  const colorOptions = Array.from(new Set(detailVariants.map(v => v.color)));
  // Calculate leaderboard statistics
  const totalSessionVotesCount = votes.length;
  const leaderboardData = designs.map(d => {
    const count = votes.filter(v => v.selectedDesignIds.includes(d.id)).length;
    const percentage = totalSessionVotesCount > 0 ? Math.round((count / totalSessionVotesCount) * 100) : 0;
    return {
      design: d,
      count,
      percentage
    };
  }).sort((a, b) => b.count - a.count);

  return (
    <div style={{ backgroundColor: 'var(--background)', minHeight: '100vh', paddingBottom: showSuccessScreen && isClosed ? '40px' : '100px' }}>
      {/* Fireworks confetti effect after successful vote */}
      {showFireworks && <ConfettiCanvas />}
      
      {/* HEADER SECTION */}
      <header
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
          padding: '14px 24px',
          position: 'sticky',
          top: 0,
          zIndex: 90
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: '12px' }}>
          
          {/* Logo & Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a href="#/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
              <img 
                src="https://bizweb.dktcdn.net/100/558/373/theme_temp/1024758/assets/logo-hazama-01-831cb57d-a357-419f-a4d9-e5d7a10f7f69-7f9fdab7-8bb7-494a-b91f-d4ba2604b1ce.png?1782204204270" 
                alt="Hazama Logo" 
                style={{ 
                  height: '32px', 
                  maxHeight: '32px', 
                  width: 'auto', 
                  objectFit: 'contain',
                  display: 'block' 
                }} 
              />
            </a>
          </div>

          {/* User Profile Info & Control */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
            
            {/* Google Sheets-style Avatar Stack */}
            {displayPresence.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', borderRight: '1px solid rgba(0,0,0,0.08)', paddingRight: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {displayPresence.map((p, idx) => {
                    const PALETTE = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF2D55', '#5856D6', '#FF6B35', '#00B4D8'];
                    let hash = 0;
                    for (let i = 0; i < p.uid.length; i++) {
                      hash = p.uid.charCodeAt(i) + ((hash << 5) - hash);
                    }
                    const bgColor = PALETTE[Math.abs(hash) % PALETTE.length];
                    const isIdle = p.status === 'idle';
                    const isSelf = p.uid === user?.uid;
                    // Avatar bên phải có zIndex cao hơn → hover luôn đúng người
                    const baseZ = idx + 1;
                    const tooltipText = `${p.name} (${p.role})${isSelf ? ' — Bạn' : ''} • ${isIdle ? 'Treo máy' : 'Đang hoạt động'}`;

                    return (
                      <div
                        key={p.uid}
                        style={{
                          position: 'relative',
                          marginLeft: idx === 0 ? '0px' : '-8px',
                          zIndex: baseZ,
                          transition: 'all 0.2s ease',
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                        onMouseEnter={e => {
                          const el = e.currentTarget as HTMLDivElement;
                          el.style.transform = 'translateY(-3px)';
                          el.style.zIndex = '99';
                          // Hiện tooltip tùy chỉnh
                          const tip = el.querySelector('.avatar-tooltip') as HTMLElement;
                          if (tip) tip.style.opacity = '1';
                        }}
                        onMouseLeave={e => {
                          const el = e.currentTarget as HTMLDivElement;
                          el.style.transform = 'translateY(0)';
                          el.style.zIndex = String(baseZ);
                          const tip = el.querySelector('.avatar-tooltip') as HTMLElement;
                          if (tip) tip.style.opacity = '0';
                        }}
                      >
                        {/* Avatar vòng tròn */}
                        <div
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '50%',
                            backgroundColor: isIdle ? '#C7C7CC' : bgColor,
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 700,
                            border: isSelf
                              ? '2.5px solid #007AFF'
                              : isIdle
                              ? '1.5px dashed #AEAEB2'
                              : '2px solid #FFFFFF',
                            opacity: isIdle ? 0.5 : 1,
                            boxShadow: isSelf
                              ? '0 0 0 2px rgba(0,122,255,0.25)'
                              : isIdle
                              ? 'none'
                              : '0 2px 6px rgba(0,0,0,0.15)',
                            transition: 'all 0.2s ease',
                            userSelect: 'none',
                            pointerEvents: 'none' // Chặn inner div chiếm hover
                          }}
                        >
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        {/* Chấm trạng thái nhỏ góc dưới-phải */}
                        <div style={{
                          position: 'absolute',
                          bottom: '0px',
                          right: '0px',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: isIdle ? '#FF9F0A' : '#30D158',
                          border: '1.5px solid #FFFFFF',
                          boxShadow: isIdle ? 'none' : '0 0 0 2px rgba(48,209,88,0.3)',
                          pointerEvents: 'none'
                        }} />
                        {/* Tooltip tùy chỉnh — luôn hiện đúng tên */}
                        <div
                          className="avatar-tooltip"
                          style={{
                            position: 'absolute',
                            bottom: 'calc(100% + 8px)',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            backgroundColor: 'rgba(30,30,30,0.92)',
                            color: '#FFFFFF',
                            fontSize: '11px',
                            fontWeight: 500,
                            padding: '5px 9px',
                            borderRadius: '8px',
                            whiteSpace: 'nowrap',
                            pointerEvents: 'none',
                            opacity: 0,
                            transition: 'opacity 0.15s ease',
                            zIndex: 9999,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                            backdropFilter: 'blur(4px)'
                          }}
                        >
                          {tooltipText}
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 0, height: 0,
                            borderLeft: '5px solid transparent',
                            borderRight: '5px solid transparent',
                            borderTop: '5px solid rgba(30,30,30,0.92)'
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '110px' }}>{user?.name}</p>
              <p className="hide-mobile" style={{ fontSize: '10px', color: 'var(--text-secondary)', margin: 0 }}>
                {user?.role}
              </p>
            </div>

            {user?.permission === 'Admin' && (
              <button
                onClick={() => window.location.hash = '#/admin'}
                className="btn btn-outline"
                style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '8px', fontWeight: 600 }}
                title="Quản trị viên"
              >
                Admin
              </button>
            )}

            <button
              onClick={logout}
              className="btn btn-outline"
              style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '8px', borderColor: 'var(--danger-light)', color: 'var(--danger)', fontWeight: 600 }}
              title="Đăng xuất"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      {/* BODY CONTENT CONTAINER */}
      <div style={{ maxWidth: '1280px', margin: '20px auto 0 auto', padding: '0 16px' }} className="animate-fade-in">
        
        {/* SESSION STATUS / COUNTDOWN HERO BANNER */}
        <div
          className="animate-fade-in"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '24px',
            padding: '16px 0',
            borderBottom: '1px solid var(--border)'
          }}
        >
          <div style={{ flex: 1, minWidth: '240px' }}>
            {/* Standard Breadcrumb Navigation positioned directly above H1 title */}
            <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <a 
                href="#/" 
                onClick={(e) => {
                  if (publishedSessions.length >= 2) {
                    e.preventDefault();
                    setShowSessionPicker(true);
                    setChosenSessionId('');
                  }
                }}
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  transition: 'color 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                Trang chủ
              </a>

              <ChevronRight size={13} color="#8E8E93" style={{ flexShrink: 0 }} />

              {publishedSessions.length >= 2 ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowSessionPicker(true);
                    setChosenSessionId('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    color: 'var(--accent)',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0, 122, 255, 0.08)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  title="Xem tất cả phiên bình chọn"
                >
                  <span>Phiên bình chọn</span>
                  <span style={{
                    backgroundColor: 'rgba(0, 122, 255, 0.12)',
                    color: '#007AFF',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    fontSize: '10px',
                    fontWeight: 800
                  }}>
                    {publishedSessions.length}
                  </span>
                </button>
              ) : (
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Phiên bình chọn
                </span>
              )}

              <ChevronRight size={13} color="#8E8E93" style={{ flexShrink: 0 }} />

              <span style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                padding: '2px 8px',
                borderRadius: '6px'
              }}>
                {activeSession.collection || 'BST Hazama'}
              </span>
            </nav>

            <h1 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.6px', lineHeight: '1.2', margin: 0 }}>{activeSession.title}</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 400 }}>
              Mỗi nhân sự được chọn tối đa <strong>{activeSession.maxVotesPerUser} mẫu thiết kế</strong> yêu thích nhất.
            </p>
          </div>

          {/* Countdown Clock Panel */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: 'var(--text-primary)',
              color: '#FFFFFF',
              padding: '10px 20px',
              borderRadius: '30px',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <Clock size={15} color={isClosed ? 'var(--danger)' : '#FFFFFF'} />
            
            {isClosed ? (
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--danger)' }}>Bình chọn đã đóng</span>
            ) : isNotPublishedYet ? (
               <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--warning)' }}>Bản nháp</span>
            ) : timeLeft ? (
              <div style={{ display: 'flex', gap: '6px', fontSize: '13px', fontWeight: 700, fontFamily: 'monospace' }}>
                <span style={{ fontFamily: 'var(--font-sans)', opacity: 0.7, fontWeight: 500 }}>Còn lại:</span>
                <span>{timeLeft.d}d</span>
                <span>{timeLeft.h.toString().padStart(2, '0')}:{timeLeft.m.toString().padStart(2, '0')}:{timeLeft.s.toString().padStart(2, '0')}</span>
              </div>
            ) : (
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--danger)' }}>Đã hết hạn</span>
            )}
          </div>
        </div>

        {/* NOTIFICATION INFO ON CLOSED OR UNPUBLISHED */}
        {isClosed && !showSuccessScreen && (
          <div className="card" style={{ backgroundColor: 'var(--danger-light)', borderColor: 'var(--danger)', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
            <AlertCircle size={24} />
            <div>
              <p style={{ fontWeight: 700 }}>Phiên bình chọn này đã kết thúc!</p>
              <p style={{ fontSize: '13px', opacity: 0.9 }}>Thời hạn bình chọn đã qua hoặc quản trị viên đã đóng phiên. Bạn không thể bỏ phiếu hoặc thay đổi lượt vote.</p>
            </div>
          </div>
        )}

        {isNotPublishedYet && (
          <div className="card" style={{ backgroundColor: 'var(--warning-light)', borderColor: 'var(--warning)', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
            <AlertCircle size={24} />
            <div>
              <p style={{ fontWeight: 700 }}>Phiên bình chọn đang chuẩn bị!</p>
              <p style={{ fontSize: '13px', opacity: 0.9 }}>Hệ thống đang ở trạng thái nháp/review nội bộ. Bạn có thể xem trước các thiết kế, nhưng nút bình chọn sẽ bị khóa cho đến khi Admin công bố chính thức.</p>
            </div>
          </div>
        )}

        {/* SUCCESS SCREEN STATE */}
        {showSuccessScreen ? (
          <div className="animate-fade-in">
            <div
              className="card animate-scale-up"
              style={{
                textAlign: 'center',
                backgroundColor: '#FFFFFF',
                borderColor: 'var(--border)',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.02)',
                padding: '24px 24px',
                borderRadius: '12px',
                marginBottom: '32px'
              }}
            >
              <div style={{ display: 'inline-flex', backgroundColor: '#F5F5F7', color: 'var(--text-primary)', padding: '10px', borderRadius: '50%', marginBottom: '10px' }}>
                <CheckCircle size={24} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px', margin: 0 }}>
                Cảm ơn bạn đã bình chọn!
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '800px', margin: '4px auto 0 auto', lineHeight: '1.4' }}>
                Bình chọn của bạn đã được ghi nhận vào biểu đồ phân tích thời gian thực và được khóa cố định. Bạn không thể thay đổi hoặc bình chọn lại.
              </p>
            </div>

            {/* Voted Designs Display */}
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: '#1D1D1F' }}>
                  Thiết kế đã bình chọn
                </span>
                <span style={{ backgroundColor: 'rgba(52, 199, 89, 0.12)', color: '#28CD41', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '12px' }}>
                  ✓ Đã chọn ({votedDesigns.length})
                </span>
              </div>
              <div className="grid grid-cols-1 grid-cols-2-sm grid-cols-3-md grid-cols-4-lg" style={{ gap: '24px' }}>
                {votedDesigns.map(d => {
                  const dVars = variants.filter(v => v.designId === d.id);
                  return (
                    <DesignCard
                      key={d.id}
                      design={d}
                      variants={dVars}
                      selectable={false}
                      onViewDetails={() => handleOpenDetailModal(d)}
                    />
                  );
                })}
              </div>
            </div>

            {/* Unvoted Designs Display */}
            {(() => {
              const unvotedDesigns = designs.filter(d => !votedDesigns.some(v => v.id === d.id));
              if (unvotedDesigns.length === 0) return null;

              return (
                <div style={{ marginTop: '44px', borderTop: '1px solid var(--border)', paddingTop: '32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                      Thiết kế bạn không chọn
                    </span>
                    <span style={{ backgroundColor: '#F2F2F7', color: '#86868B', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>
                      {unvotedDesigns.length} thiết kế
                    </span>
                  </div>
                  <div className="grid grid-cols-1 grid-cols-2-sm grid-cols-3-md grid-cols-4-lg" style={{ gap: '24px', opacity: 0.85 }}>
                    {unvotedDesigns.map(d => {
                      const dVars = variants.filter(v => v.designId === d.id);
                      return (
                        <DesignCard
                          key={d.id}
                          design={d}
                          variants={dVars}
                          selectable={false}
                          onViewDetails={() => handleOpenDetailModal(d)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* LIVE LEADERBOARD RESULTS */}
            <div style={{ marginTop: '48px', borderTop: '1px solid var(--border)', paddingTop: '40px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '24px', color: 'var(--text-secondary)' }}>
                Bảng xếp hạng thời gian thực
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {leaderboardData.map((item, index) => {
                  const isTop = index === 0 && item.count > 0;
                  
                  return (
                    <div
                      key={item.design.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '12px 16px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid var(--border)',
                        position: 'relative'
                      }}
                    >
                      {/* Rank number */}
                      <div
                        style={{
                          width: '24px',
                          fontSize: '14px',
                          fontWeight: 800,
                          color: isTop ? 'var(--text-primary)' : 'var(--text-secondary)',
                          textAlign: 'center'
                        }}
                      >
                        {index + 1}
                      </div>

                      {/* Thumbnail Image */}
                      <div
                        style={{
                          width: '40px',
                          height: '53px',
                          backgroundColor: '#FAF9F6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          border: '1px solid rgba(0,0,0,0.03)'
                        }}
                      >
                        {item.design.coverImageUrl ? (
                          <img
                            src={item.design.coverImageUrl}
                            alt={item.design.name}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        ) : (
                          <div style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>No image</div>
                        )}
                      </div>

                      {/* Details */}
                      <div style={{ flex: 1, minWidth: '120px' }}>
                        <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.5px', marginBottom: '2px' }}>
                          {item.design.code}
                        </p>
                        <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                          {item.design.name}
                        </h4>
                      </div>

                      {/* Progress bar */}
                      <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: '12px', paddingRight: '24px' }} className="hide-mobile">
                        <div style={{ width: '100%', height: '6px', backgroundColor: '#F5F5F7', position: 'relative' }}>
                          <div
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              height: '100%',
                              width: `${item.percentage}%`,
                              backgroundColor: isTop ? 'var(--text-primary)' : '#8E8E93',
                              transition: 'width 0.8s ease-out'
                            }}
                          />
                        </div>
                      </div>

                      {/* Statistics */}
                      <div style={{ textAlign: 'right', minWidth: '80px' }}>
                        <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                          {item.count} lượt vote
                        </p>
                        <p style={{ fontSize: '10px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                          {item.percentage}% tổng số
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : isWinnerRevealActive ? (
          /* WINNER REVEAL PODIUM SCREEN */
          <div className="animate-fade-in" style={{ position: 'relative' }}>
            <ConfettiCanvas />
            
            <div
              className="card animate-scale-up"
              style={{
                textAlign: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                padding: '48px 24px',
                borderRadius: '24px',
                marginBottom: '40px',
                border: '1px solid rgba(0, 0, 0, 0.05)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.03)'
              }}
            >
              <div style={{ display: 'inline-flex', backgroundColor: 'var(--warning-light)', color: 'var(--warning)', padding: '16px', borderRadius: '50%', marginBottom: '16px', animation: 'pulse 2s infinite' }}>
                <Trophy size={48} />
              </div>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.8px' }}>
                Thiết Kế Chiến Thắng Chung Cuộc!
              </h2>
              <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginTop: '8px', maxWidth: '600px', margin: '8px auto 0 auto', lineHeight: '1.5' }}>
                Chúc mừng! Dưới đây là các thiết kế được chọn lọc xuất sắc nhất từ cuộc bình chọn của toàn bộ thành viên trong bộ sưu tập <strong>{activeSession.collection}</strong> và đã được phê duyệt làm sản phẩm chính thức.
              </p>
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '32px', textAlign: 'center', letterSpacing: '-0.3px' }}>
              Danh sách sản phẩm thắng cuộc được duyệt:
            </h3>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', flexWrap: 'wrap' }}>
              {(() => {
                const winners = designs.filter(d => activeSession.approvedWinnerIds?.includes(d.id));
                return winners.map((d, index) => {
                  const dVars = variants.filter(v => v.designId === d.id);
                  return (
                    <div key={d.id} style={{ width: '280px', position: 'relative', transform: index === 0 ? 'scale(1.05)' : 'none', zIndex: index === 0 ? 2 : 1, marginTop: '20px' }}>
                      {/* Trophy rank crown */}
                      <div
                        style={{
                          position: 'absolute',
                          top: -15,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          backgroundColor: 'var(--warning)',
                          color: '#FFFFFF',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          zIndex: 10,
                          boxShadow: 'var(--shadow-sm)'
                        }}
                      >
                        Winner #{index + 1}
                      </div>

                      <DesignCard
                        design={d}
                        variants={dVars}
                        selectable={false}
                        onViewDetails={() => handleOpenDetailModal(d)}
                      />
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        ) : (
          /* REGULAR DESIGN SELECTION GRID */
          <div>
            {designs.length === 0 ? (
              <div className="card" style={{ padding: '80px 24px', textAlign: 'center' }}>
                <Clock size={40} style={{ color: 'var(--text-secondary)', margin: '0 auto 16px auto', opacity: 0.5 }} />
                <h4 style={{ fontSize: '16px', fontWeight: 700 }}>Thiết kế đang được cập nhật</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                  Quản trị viên chưa tải lên mẫu thiết kế nào cho phiên này.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 grid-cols-2-sm grid-cols-3-md grid-cols-4-lg" style={{ gap: '24px' }}>
                {designs.map(d => {
                  const dVars = variants.filter(v => v.designId === d.id);
                  const isSelected = selectedIds.includes(d.id);
                  return (
                    <DesignCard
                      key={d.id}
                      design={d}
                      variants={dVars}
                      selected={isSelected}
                      selectable={!isClosed && !isNotPublishedYet}
                      onSelect={() => handleSelectDesign(d.id)}
                      onViewDetails={() => handleOpenDetailModal(d)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* STICKY BOTTOM SUBMIT BAR (Only shown when not in success view, not closed and not draft) */}
      {!showSuccessScreen && !isClosed && !isNotPublishedYet && (
        <div className="sticky-bar" style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(0, 0, 0, 0.05)', padding: '16px 24px', boxShadow: '0 -4px 30px rgba(0, 0, 0, 0.02)' }}>
          <div className="sticky-bar-content">
            <div>
              <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
                Đã chọn: <span style={{ color: 'var(--accent)' }}>{selectedIds.length}</span> / {activeSession.maxVotesPerUser} mẫu
              </p>
              <p className="hide-mobile" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Lưu ý: Bấm trực tiếp vào các card thiết kế để chọn/bỏ chọn.
              </p>
            </div>
            
            <button
              onClick={handleVoteSubmit}
              className="btn btn-primary"
              disabled={selectedIds.length === 0 || isSubmitting}
              style={{
                padding: '12px 28px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                boxShadow: selectedIds.length > 0 ? '0 4px 12px rgba(0, 0, 0, 0.16)' : 'none',
                opacity: isSubmitting ? 0.7 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              <span>{isSubmitting ? 'Đang gửi...' : (hasVotedBefore ? 'Cập nhật bình chọn' : 'Gửi bình chọn')}</span>
            </button>
          </div>
        </div>
      )}

      {/* DETAIL VIEW LOOKBOOK MODAL */}
      {/* DETAIL VIEW LOOKBOOK MODAL */}
      <Modal
        isOpen={!!detailDesign}
        onClose={() => setDetailDesign(null)}
        title={detailDesign ? `${detailDesign.code} — ${detailDesign.name}` : ''}
        maxWidth="860px"
      >
        {detailDesign && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="detail-modal-layout">
              
              {/* Left Panel: Big Image Display with Smooth Rounded Corners */}
              <div
                ref={imageContainerRef}
                onMouseMove={handleMagnifierMouseMove}
                onMouseLeave={handleMagnifierMouseLeave}
                onTouchMove={handleMagnifierTouchMove}
                onTouchStart={e => {
                  if (e.touches.length > 0) {
                    const touch = e.touches[0];
                    handleUpdateMagnifierPosition(touch.clientX, touch.clientY, e.currentTarget);
                  }
                }}
                onTouchEnd={handleHideMagnifier}
                style={{
                  flex: 1,
                  aspectRatio: '3 / 4',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  backgroundColor: '#F9F9FB',
                  border: '1px solid #E5E5EA',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  cursor: 'zoom-in',
                  touchAction: 'none'
                }}
              >
                {activeModalVariant ? (
                  <>
                    <img
                      src={activeModalVariant.imageUrl}
                      alt={detailDesign.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '16px' }}
                    />
                    
                    {/* Zero-Lag 60fps DOM Ref Magnifier Circle Glass */}
                    <div
                      ref={magnifierRef}
                      className="magnifier-glass-circle"
                      style={{
                        display: 'none',
                        position: 'absolute',
                        pointerEvents: 'none',
                        width: window.innerWidth <= 768 ? '130px' : '170px',
                        height: window.innerWidth <= 768 ? '130px' : '170px',
                        borderRadius: '50%',
                        border: '2px solid #FFFFFF',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.25), inset 0 0 10px rgba(0,0,0,0.15)',
                        backgroundColor: '#FFFFFF',
                        backgroundRepeat: 'no-repeat',
                        zIndex: 15
                      }}
                    />
                  </>
                ) : (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                    Không tìm thấy hình ảnh tương ứng.
                  </div>
                )}

                {/* Left/Right Next/Prev Navigation Buttons Overlay */}
                {detailVariants.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleHideMagnifier();
                        const idx = detailVariants.findIndex(v => v.id === activeModalVariant?.id);
                        const prevIdx = (idx - 1 + detailVariants.length) % detailVariants.length;
                        const prevVar = detailVariants[prevIdx];
                        if (prevVar) {
                          setSelectedColor(prevVar.color);
                          setViewTab(prevVar.view);
                        }
                      }}
                      style={{
                        position: 'absolute',
                        left: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        color: '#1D1D1F',
                        border: '1px solid #D2D2D7',
                        borderRadius: '50%',
                        width: 36,
                        height: 36,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                        zIndex: 25,
                        transition: 'all 0.2s ease'
                      }}
                      title="Xem ảnh trước"
                    >
                      <ChevronLeft size={18} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleHideMagnifier();
                        const idx = detailVariants.findIndex(v => v.id === activeModalVariant?.id);
                        const nextIdx = (idx + 1) % detailVariants.length;
                        const nextVar = detailVariants[nextIdx];
                        if (nextVar) {
                          setSelectedColor(nextVar.color);
                          setViewTab(nextVar.view);
                        }
                      }}
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        color: '#1D1D1F',
                        border: '1px solid #D2D2D7',
                        borderRadius: '50%',
                        width: 36,
                        height: 36,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                        zIndex: 25,
                        transition: 'all 0.2s ease'
                      }}
                      title="Xem ảnh tiếp theo"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </>
                )}

                {/* Floating Admin Download Options Menu Overlay */}
                {user?.permission === 'Admin' && activeModalVariant && (
                  <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 20 }}>
                    <button
                      onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                      style={{
                        backgroundColor: '#1D1D1F',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
                        transition: 'all 0.2s ease'
                      }}
                      title="Tùy chọn tải ảnh gốc"
                    >
                      <Download size={12} />
                      <span>Tải ảnh</span>
                      <ChevronDown size={12} />
                    </button>

                    {/* Download Dropdown Options Menu */}
                    {showDownloadMenu && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          marginTop: '6px',
                          backgroundColor: '#FFFFFF',
                          borderRadius: '12px',
                          border: '1px solid #E5E5EA',
                          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                          width: '240px',
                          padding: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                          zIndex: 30
                        }}
                      >
                        <button
                          onClick={handleDownloadActiveVariant}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: '#1D1D1F',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F2F2F7'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Download size={14} color="var(--accent)" />
                          <div>
                            <div>Tải ảnh đang xem</div>
                            <div style={{ fontSize: '10px', color: '#8E8E93', fontWeight: 400 }}>File gốc ({selectedColor})</div>
                          </div>
                        </button>

                        <button
                          onClick={handleDownloadCurrentDesignAllImages}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: '#1D1D1F',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F2F2F7'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Layers size={14} color="#34C759" />
                          <div>
                            <div>Tải full ảnh Mẫu này</div>
                            <div style={{ fontSize: '10px', color: '#8E8E93', fontWeight: 400 }}>{detailDesign.code} ({variants.filter(v => v.designId === detailDesign.id).length} ảnh)</div>
                          </div>
                        </button>

                        <button
                          onClick={handleDownloadCollectionAllImages}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: '#1D1D1F',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F2F2F7'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <FolderDown size={14} color="#AF52DE" />
                          <div>
                            <div>Tải full cả Bộ sưu tập</div>
                            <div style={{ fontSize: '10px', color: '#8E8E93', fontWeight: 400 }}>{activeSession.collection} ({variants.length} ảnh)</div>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Panel: Controls & Options */}
              <div className="detail-modal-sidebar">
                
                {/* Product Title & Code Header in Modal */}
                <div style={{ borderBottom: '1px solid #E5E5EA', paddingBottom: '16px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {detailDesign.code}
                  </span>
                  <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#1D1D1F', margin: '4px 0 0 0', letterSpacing: '-0.4px' }}>
                    {detailDesign.name}
                  </h3>
                </div>

                {/* Colors Select */}
                <div>
                  <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#8E8E93', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '10px' }}>
                    MÀU SẮC CÓ SẴN ({colorOptions.length})
                  </h4>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {colorOptions.map(color => {
                      const isActive = selectedColor === color;
                      return (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            border: isActive ? '2px solid #1D1D1F' : '1px solid #E5E5EA',
                            backgroundColor: isActive ? '#1D1D1F' : '#FFFFFF',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 700,
                            color: isActive ? '#FFFFFF' : '#1D1D1F',
                            textTransform: 'capitalize',
                            boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.12)' : 'none',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              backgroundColor: COLORS_MAP[color] || '#CCCCCC',
                              border: color === 'white' ? '1px solid #D2D2D7' : 'none'
                            }}
                          />
                          <span>{color}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Comments Section */}
                <div style={{ borderTop: '1px solid #E5E5EA', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minHeight: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MessageSquare size={14} color="#1D1D1F" />
                      <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#1D1D1F', letterSpacing: '0.8px', textTransform: 'uppercase', margin: 0 }}>
                        BÌNH LUẬN ({comments.length})
                      </h4>
                    </div>
                    {user?.permission === 'Admin' && (
                      <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: 'rgba(94, 92, 230, 0.1)', color: '#5E5CE6', padding: '2px 8px', borderRadius: '12px' }}>
                        Admin Mode
                      </span>
                    )}
                  </div>

                  {/* Comment Input Box */}
                  <form onSubmit={handleAddComment} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        value={commentInput}
                        onChange={e => setCommentInput(e.target.value)}
                        placeholder="Thêm bình luận cho mẫu này..."
                        style={{
                          width: '100%',
                          padding: '10px 42px 10px 14px',
                          fontSize: '13px',
                          borderRadius: '12px',
                          border: '1px solid #D2D2D7',
                          outline: 'none',
                          color: '#1D1D1F',
                          backgroundColor: '#FFFFFF',
                          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                        }}
                      />
                      <button
                        type="submit"
                        disabled={!commentInput.trim()}
                        style={{
                          position: 'absolute',
                          right: '6px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          border: 'none',
                          backgroundColor: commentInput.trim() ? '#1D1D1F' : '#E5E5EA',
                          color: '#FFFFFF',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          cursor: commentInput.trim() ? 'pointer' : 'default',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Send size={12} />
                      </button>
                    </div>

                    {/* Anonymous toggle check */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#8E8E93', cursor: 'pointer', userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={isAnonymousComment}
                        onChange={e => setIsAnonymousComment(e.target.checked)}
                        style={{ accentColor: '#1D1D1F', cursor: 'pointer' }}
                      />
                      <Lock size={11} color={isAnonymousComment ? '#1D1D1F' : '#8E8E93'} />
                      <span style={{ color: isAnonymousComment ? '#1D1D1F' : '#8E8E93', fontWeight: isAnonymousComment ? 700 : 500 }}>
                        Đăng bình luận <strong>Ẩn danh 🔒</strong>
                      </span>
                    </label>
                  </form>

                  {/* Comments List (Dynamically expands to fill remaining height) */}
                  <div style={{ flex: 1, minHeight: '120px', maxHeight: '260px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                    {comments.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '16px 0', backgroundColor: '#F9F9FB', borderRadius: '12px', border: '1px dashed #E5E5EA' }}>
                        <p style={{ fontSize: '12px', color: '#8E8E93', fontStyle: 'italic', margin: 0 }}>
                          Chưa có góp ý nào. Hãy là người bóc tem sản phẩm này!
                        </p>
                      </div>
                    ) : (
                      comments.map(c => {
                        const isOwner = c.userEmail === user?.email;
                        const isAdminUser = user?.permission === 'Admin';
                        const canDelete = isOwner || isAdminUser; // User thường CHỈ được xóa comment của chính họ, Admin xóa được tất cả
                        
                        return (
                          <div
                            key={c.id}
                            style={{
                              backgroundColor: '#F9F9FB',
                              padding: '10px 12px',
                              borderRadius: '12px',
                              border: '1px solid #E5E5EA',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              position: 'relative'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                {c.isAnonymous ? (
                                  isAdminUser ? (
                                    /* ADMIN MODE: nhìn thấy được chính xác ai ẩn danh */
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#5E5CE6' }}>
                                      🔒 Ẩn danh <span style={{ fontWeight: 500, opacity: 0.8 }}>({c.userName} - {c.userRole || 'Voter'})</span>
                                    </span>
                                  ) : (
                                    /* USER THƯỜNG MODE: chỉ thấy Nhân sự ẩn danh */
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#8E8E93' }}>
                                      🔒 Nhân sự ẩn danh
                                    </span>
                                  )
                                ) : (
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#1D1D1F' }}>
                                    {c.userName} <span style={{ fontWeight: 500, color: '#8E8E93' }}>({c.userRole || 'Voter'})</span>
                                  </span>
                                )}
                              </div>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '10px', color: '#8E8E93' }}>
                                  {new Date(c.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {canDelete && (
                                  <button
                                    onClick={() => handleDeleteComment(c.id)}
                                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 0, opacity: 0.7 }}
                                    title={isAdminUser && !isOwner ? "Xóa comment (Admin)" : "Xóa comment của bạn"}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
                            <p style={{ fontSize: '12px', color: '#1D1D1F', margin: 0, lineHeight: '1.4', wordBreak: 'break-word', fontWeight: 400 }}>
                              {c.content}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Vote Action Toggle inside Modal */}
            {!showSuccessScreen && !isClosed && !isNotPublishedYet && (
              <div
                style={{
                  borderTop: '1px solid #E5E5EA',
                  paddingTop: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Trạng thái:</span>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      padding: '4px 12px',
                      borderRadius: '20px',
                      backgroundColor: selectedIds.includes(detailDesign.id) ? '#E8F5E9' : '#F2F2F7',
                      color: selectedIds.includes(detailDesign.id) ? '#2E7D32' : '#8E8E93'
                    }}
                  >
                    {selectedIds.includes(detailDesign.id) ? '✓ Đã chọn bình chọn' : 'Chưa chọn'}
                  </span>
                </div>

                <button
                  onClick={() => handleSelectDesign(detailDesign.id)}
                  style={{
                    borderRadius: '14px',
                    padding: '12px 28px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: selectedIds.includes(detailDesign.id) ? '1px solid #E5E5EA' : 'none',
                    backgroundColor: selectedIds.includes(detailDesign.id) ? '#FFFFFF' : '#1D1D1F',
                    color: selectedIds.includes(detailDesign.id) ? 'var(--danger)' : '#FFFFFF',
                    boxShadow: selectedIds.includes(detailDesign.id) ? 'none' : '0 4px 16px rgba(0, 0, 0, 0.16)'
                  }}
                >
                  {selectedIds.includes(detailDesign.id) ? 'Bỏ chọn mẫu này' : 'BÌNH CHỌN MẪU NÀY'}
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* VOTE CONFIRM MODAL — replaces window.confirm() */}
      {showVoteConfirmModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 3000,
            backgroundColor: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px'
          }}
          onClick={() => setShowVoteConfirmModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="animate-scale-up"
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
              textAlign: 'center'
            }}
          >
            {/* Icon */}
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              background: 'linear-gradient(135deg, #1D1D1F 0%, #3A3A3C 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px auto', fontSize: '26px'
            }}>
              🗳️
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1D1D1F', marginBottom: '10px', letterSpacing: '-0.4px' }}>
              Xác nhận bình chọn
            </h3>
            <p style={{ fontSize: '13px', color: '#8E8E93', lineHeight: 1.6, marginBottom: '20px' }}>
              Bạn đã chọn <strong style={{ color: '#1D1D1F' }}>{selectedIds.length} thiết kế</strong>.
              Sau khi gửi, lựa chọn sẽ được ghi nhận chính thức.
            </p>

            {/* Selected designs preview */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '24px' }}>
              {designs.filter(d => selectedIds.includes(d.id)).map(d => (
                <div key={d.id} style={{
                  background: '#F5F5F7',
                  borderRadius: '10px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#1D1D1F'
                }}>
                  {d.code}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowVoteConfirmModal(false)}
                style={{
                  flex: 1, padding: '13px', borderRadius: '12px',
                  border: '1px solid #D2D2D7', background: '#FFFFFF',
                  fontSize: '14px', fontWeight: 600, color: '#1D1D1F', cursor: 'pointer'
                }}
              >
                Xem lại
              </button>
              <button
                onClick={handleConfirmVote}
                disabled={isSubmitting}
                style={{
                  flex: 1.5, padding: '13px', borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #1D1D1F 0%, #3A3A3C 100%)',
                  fontSize: '14px', fontWeight: 700, color: '#FFFFFF', cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  opacity: isSubmitting ? 0.7 : 1
                }}
              >
                {isSubmitting ? 'Đang gửi...' : '✓ Gửi bình chọn'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
