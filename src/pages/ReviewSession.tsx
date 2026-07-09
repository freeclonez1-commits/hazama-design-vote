import React, { useEffect, useState } from 'react';
import { useDb } from '../context/DbContext';
import { useToast } from '../components/Toast';
import type { Design, Variant } from '../types/models';
import { dbService } from '../services/db';
import { Modal } from '../components/Modal';
import {
  Share2,
  Play,
  Eye,
  Trash2,
  AlertTriangle,
  Plus,
  Loader,
  RotateCcw,
  GripVertical,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

const supportedColors = [
  { value: 'black', label: 'Black (Đen)' },
  { value: 'white', label: 'White (Trắng)' },
  { value: 'grey', label: 'Grey (Xám)' },
  { value: 'navy', label: 'Navy (Xanh đen)' },
  { value: 'beige', label: 'Beige (Be)' },
  { value: 'red', label: 'Red (Đỏ)' },
  { value: 'blue', label: 'Blue (Xanh dương)' },
  { value: 'green', label: 'Green (Xanh lá)' },
  { value: 'brown', label: 'Brown (Nâu)' },
  { value: 'pink', label: 'Pink (Hồng)' },
  { value: 'purple', label: 'Purple (Tím)' },
  { value: 'yellow', label: 'Yellow (Vàng)' },
  { value: 'orange', label: 'Orange (Cam)' }
];

const colorMap: Record<string, string> = {
  'den': 'black', 'black': 'black', 'dark': 'black',
  'trang': 'white', 'white': 'white', 'light': 'white',
  'xam': 'grey', 'grey': 'grey', 'gray': 'grey',
  'navy': 'navy', 'xanh-den': 'navy', 'xanhden': 'navy',
  'kem': 'beige', 'beige': 'beige', 'be': 'beige',
  'do': 'red', 'red': 'red',
  'xanh': 'blue', 'blue': 'blue', 'xanh-duong': 'blue',
  'xanh-la': 'green', 'green': 'green', 'xanhla': 'green',
  'nau': 'brown', 'brown': 'brown',
  'hong': 'pink', 'pink': 'pink',
  'tim': 'purple', 'purple': 'purple',
  'vang': 'yellow', 'yellow': 'yellow',
  'cam': 'orange', 'orange': 'orange'
};

// Real image compressor: resize to max 1200px + quality 0.82 to avoid Firestore/localStorage size limits
const compressImage = (base64Str: string): Promise<string> => {
  // SVG data URIs (mock thumbnails) don't need compression
  if (base64Str.startsWith('data:image/svg')) return Promise.resolve(base64Str);

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1200;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        const ratio = Math.min(MAX / width, MAX / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(base64Str); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => resolve(base64Str);
    img.src = base64Str;
  });
};

const parseFileInfo = (filename: string, relativePath = ''): { designCode: string; color: string; view: 'f' | 'b' } => {
  const cleanName = filename.toLowerCase().replace(/\.[^/.]+$/, "");
  const parts = cleanName.split(/[-_\s]+/);

  const ignoreKeywords = [
    'den', 'đen', 'black',
    'trang', 'trắng', 'white',
    'xam', 'xám', 'grey', 'gray',
    'navy', 'kem', 'be', 'beige',
    'do', 'đỏ', 'red',
    'xanh', 'blue', 'green', 'xanhla', 'xanh-la',
    'nau', 'nâu', 'brown',
    'hong', 'hồng', 'pink',
    'tim', 'tím', 'purple',
    'vang', 'vàng', 'yellow',
    'cam', 'orange',
    'truoc', 'trước', 'sau', 'front', 'font', 'back', 'f', 'b', 't', 's'
  ];

  let designCode = '';

  // 1. ƯU TIÊN 1: Lấy Tên Thư Mục Cha (Folder Name) trực tiếp nếu có relativePath
  if (relativePath && (relativePath.includes('/') || relativePath.includes('\\'))) {
    const pathParts = relativePath.split(/[/\\]+/).filter(Boolean);
    if (pathParts.length >= 2) {
      const folderName = pathParts[pathParts.length - 2].trim();
      if (folderName && !ignoreKeywords.includes(folderName.toLowerCase())) {
        designCode = folderName.toUpperCase();
      }
    }
  }

  // 2. ƯU TIÊN 2: Trích xuất từ tên File nếu chưa có tên Thư mục cha
  if (!designCode) {
    const codeParts: string[] = [];
    for (const part of parts) {
      if (ignoreKeywords.includes(part.toLowerCase())) {
        if (codeParts.length > 0) break;
      } else {
        codeParts.push(part);
      }
    }
    if (codeParts.length > 0) {
      designCode = codeParts.join(' ').toUpperCase();
    }
  }

  let color = 'white';
  for (const part of parts) {
    if (colorMap[part]) {
      color = colorMap[part];
      break;
    }
  }

  let view: 'f' | 'b' = 'f';
  for (const part of parts) {
    if (part === 'f' || part === 'front' || part === 'truoc' || part === 't') {
      view = 'f';
      break;
    } else if (part === 'b' || part === 'back' || part === 'sau' || part === 's') {
      view = 'b';
      break;
    }
  }

  return {
    designCode: designCode || 'HZ-NEW',
    color,
    view
  };
};

interface ReviewSessionProps {
  sessionId: string;
  setTab: (tab: string) => void;
}

export const ReviewSession: React.FC<ReviewSessionProps> = ({ sessionId, setTab }) => {
  const {
    activeSession,
    designs,
    variants,
    loadSessionDetails,
    updateSessionStatus,
    updateDesign,
    deleteDesign
  } = useDb();

  const { toast } = useToast();

  // Settings state
  const [title, setTitle] = useState('');
  const [collection, setCollection] = useState('');
  const [deadline, setDeadline] = useState('');
  const [maxVotes, setMaxVotes] = useState(3);
  
  // Detailed Modals state
  const [editDesign, setEditDesign] = useState<Design | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [localVariants, setLocalVariants] = useState<Variant[]>([]);
  const [deletedVariantIds, setDeletedVariantIds] = useState<string[]>([]);
  const [modalSaving, setModalSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    if (sessionId) {
      loadSessionDetails(sessionId);
    }
  }, [sessionId]);

  useEffect(() => {
    if (activeSession) {
      setTitle(activeSession.title);
      setCollection(activeSession.collection);
      
      // format datetime local
      const d = new Date(activeSession.deadline);
      const tzoffset = d.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
      setDeadline(localISOTime);
      
      setMaxVotes(activeSession.maxVotesPerUser);
    }
  }, [activeSession]);

  const handleUpdateSessionConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;
    
    try {
      const updated = {
        ...activeSession,
        title: title.trim(),
        collection: collection.trim(),
        deadline: new Date(deadline).toISOString(),
        maxVotesPerUser: maxVotes,
        updatedAt: new Date().toISOString()
      };
      await dbService.saveSession(updated);
      toast('Cập nhật cấu hình phiên thành công!', 'success');
      loadSessionDetails(sessionId);
    } catch (e) {
      toast('Có lỗi xảy ra khi lưu thiết lập.', 'error');
    }
  };

  const handlePublish = async () => {
    if (designs.length === 0) {
      toast('Không thể công bố phiên bình chọn không có thiết kế nào. Vui lòng import hình ảnh trước.', 'error');
      return;
    }
    
    try {
      await updateSessionStatus(sessionId, 'published');
      toast('Phiên bình chọn đã được công bố chính thức!', 'success');
    } catch (e) {
      toast('Lỗi khi công bố phiên.', 'error');
    }
  };

  const handleCloseSession = async () => {
    try {
      await updateSessionStatus(sessionId, 'closed');
      toast('Đã đóng phiên bình chọn!', 'success');
    } catch (e) {
      toast('Lỗi khi đóng phiên.', 'error');
    }
  };

  // Reset session: xóa winner, xóa votes cũ, trả designs về pending, mở lại bình chọn
  const handleResetToPublished = async () => {
    try {
      // 1. Xóa toàn bộ votes cũ — quan trọng: phải làm trước
      await dbService.clearVotesBySession(sessionId);

      // 2. Đưa tất cả designs về pending
      await Promise.all(designs.map(d => updateDesign({ ...d, status: 'pending' })));

      // 3. Reset session: xóa approvedWinnerIds, trả về published
      const resetSession = {
        ...activeSession!,
        status: 'published' as const,
        approvedWinnerIds: [],
        updatedAt: new Date().toISOString()
      };
      await dbService.saveSession(resetSession);

      toast('Đã đặt lại phiên bình chọn. Người dùng có thể bình chọn lại!', 'success');
      loadSessionDetails(sessionId);
      setShowResetConfirm(false);
    } catch (e) {
      console.error(e);
      toast('Không thể đặt lại phiên.', 'error');
    }
  };

  const handleCopyLink = () => {
    // Generate public link
    const link = `${window.location.origin}${window.location.pathname}#/vote/${sessionId}`;
    navigator.clipboard.writeText(link).then(() => {
      toast('Đã copy đường dẫn bình chọn! Sẵn sàng chia sẻ qua Zalo, Messenger.', 'success');
    }).catch(() => {
      toast('Không thể tự động copy link.', 'error');
    });
  };

  // Design and Variant Detailed Editor actions
  const [codeEditInput, setCodeEditInput] = useState('');

  const handleOpenRename = (design: Design) => {
    setEditDesign(design);
    setRenameInput(design.name);
    setCodeEditInput(design.code);
    
    // Filter variants belonging to this design
    const designVars = variants.filter(v => v.designId === design.id);
    setLocalVariants(JSON.parse(JSON.stringify(designVars))); // deep clone
    setDeletedVariantIds([]);
  };

  const handleUpdateLocalVariant = (vid: string, field: keyof Variant, value: any) => {
    setLocalVariants(prev =>
      prev.map(v => (v.id === vid ? { ...v, [field]: value } : v))
    );
  };

  const handleDeleteLocalVariant = (vid: string) => {
    setLocalVariants(prev => prev.filter(v => v.id !== vid));
    if (!vid.startsWith('new_var_')) {
      setDeletedVariantIds(prev => [...prev, vid]);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (_e: React.DragEvent, index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;
    
    const list = [...localVariants];
    const temp = list[draggedIndex];
    list[draggedIndex] = list[index];
    list[index] = temp;
    
    setDraggedIndex(index);
    setLocalVariants(list);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleMoveVariantOrder = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= localVariants.length) return;
    const list = [...localVariants];
    const temp = list[index];
    list[index] = list[newIndex];
    list[newIndex] = temp;
    setLocalVariants(list);
  };



  const handleReplaceLocalVariantImage = async (vid: string, file: File) => {
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
    
    const compressed = await compressImage(dataUrl);
    handleUpdateLocalVariant(vid, 'imageUrl', compressed);
    handleUpdateLocalVariant(vid, 'originalFileName', file.name);
    toast('Đã thay ảnh biến thể thành công!', 'success');
  };

  const handleAddLocalVariant = async (files: FileList) => {
    const newVars: Variant[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      
      const compressed = await compressImage(dataUrl);
      const parsed = parseFileInfo(file.name);
      
      newVars.push({
        id: `new_var_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        designId: editDesign!.id,
        color: parsed.color,
        view: parsed.view,
        imageUrl: compressed,
        originalFileName: file.name,
        sortOrder: localVariants.length + newVars.length
      });
    }
    setLocalVariants(prev => [...prev, ...newVars]);
    toast(`Đã thêm ${files.length} ảnh biến thể mới!`, 'success');
  };

  const handleSaveDesignDetails = async () => {
    if (!editDesign) return;
    setModalSaving(true);
    
    try {
      // 1. Save design code, name and cover image
      const updatedDesign = {
        ...editDesign,
        code: codeEditInput.trim() || editDesign.code,
        name: renameInput.trim()
      };
      
      const firstFront = localVariants.find(v => v.view === 'f') || localVariants[0];
      if (firstFront) {
        updatedDesign.coverImageUrl = firstFront.imageUrl;
      } else {
        updatedDesign.coverImageUrl = '';
      }
      
      await dbService.saveDesign(updatedDesign);

      // 2. Delete removed variants
      for (const vid of deletedVariantIds) {
        await dbService.deleteVariant(vid);
      }

      // 3. Save new and updated variants
      if (localVariants.length > 0) {
        const sanitizedVariants = localVariants.map((v, index) => {
          const id = v.id.startsWith('new_var_') 
            ? `variant_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
            : v.id;
          return { ...v, id, sortOrder: index };
        });
        await dbService.saveVariants(sanitizedVariants);
      } else {
        // If all variants deleted, delete the design entirely
        await dbService.deleteDesign(editDesign.id);
      }

      toast('Cập nhật chi tiết thiết kế thành công.', 'success');
      setEditDesign(null);
      loadSessionDetails(sessionId);
    } catch (e) {
      console.error(e);
      toast('Có lỗi xảy ra khi lưu chi tiết.', 'error');
    } finally {
      setModalSaving(false);
    }
  };

  const handleDeleteDesignClick = async (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc muốn xóa thiết kế "${name}" và toàn bộ biến thể ảnh?`)) {
      await deleteDesign(id);
      toast('Đã xóa thiết kế.', 'success');
      loadSessionDetails(sessionId);
    }
  };







  if (!activeSession) return null;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* 1. SESSION GENERAL CONTROLS HEADER */}
      <section className="card" style={{ borderLeft: '5px solid var(--accent)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: 800 }}>{activeSession.title}</h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
              <span className="badge badge-info">Bộ sưu tập: {activeSession.collection}</span>
              <span className="badge badge-secondary">Cấu hình: {activeSession.maxVotesPerUser} vote/voter</span>
              
              {activeSession.status === 'draft' && <span className="badge badge-secondary">Bản nháp</span>}
              {activeSession.status === 'published' && <span className="badge badge-success">Đang công bố</span>}
              {activeSession.status === 'closed' && <span className="badge badge-danger">Đã đóng</span>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            
            {/* User Preview Link */}
            <button
              onClick={() => window.location.hash = `#/vote/${sessionId}`}
              className="btn btn-outline"
              style={{ fontSize: '13px', borderRadius: '10px' }}
            >
              <Eye size={16} />
              <span>Xem thử Giao diện Voter</span>
            </button>

            {/* Import shortcut */}
            {(activeSession.status === 'draft' || activeSession.status === 'review' || (activeSession.status === 'published' && new Date(activeSession.deadline).getTime() > Date.now())) && (
              <button
                onClick={() => setTab('sessions-import')}
                className="btn btn-secondary"
                style={{ fontSize: '13px', borderRadius: '10px' }}
              >
                <span>Tải thêm ảnh</span>
              </button>
            )}

            {/* Share Link (Zalo) */}
            {activeSession.status === 'published' && (
              <button
                onClick={handleCopyLink}
                className="btn btn-secondary"
                style={{ fontSize: '13px', borderRadius: '10px', gap: '6px' }}
              >
                <Share2 size={16} />
                <span>Chia sẻ Zalo</span>
              </button>
            )}

            {/* Status transitions */}
            {activeSession.status === 'draft' && (
              <button
                onClick={handlePublish}
                className="btn btn-success"
                style={{ fontSize: '13px', borderRadius: '10px' }}
              >
                <Play size={16} />
                <span>Công bố Bình chọn</span>
              </button>
            )}

            {activeSession.status === 'published' && (
              <button
                onClick={handleCloseSession}
                className="btn btn-danger"
                style={{ fontSize: '13px', borderRadius: '10px' }}
              >
                <span>Đóng Bình chọn</span>
              </button>
            )}

            {/* 🔄 Công bố lại từ đầu — hiện khi session đã approved (có winner) hoặc closed */}
            {(activeSession.status === 'approved' || activeSession.status === 'closed') && (
              <button
                onClick={() => setShowResetConfirm(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg, #FF9500, #FF6B00)',
                  color: '#FFFFFF', fontSize: '13px', fontWeight: 700,
                  cursor: 'pointer', boxShadow: '0 3px 10px rgba(255,149,0,0.35)'
                }}
              >
                <RotateCcw size={15} />
                <span>Công bố lại từ đầu</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 2. TABBED DETAIL EDIT: SETTINGS vs. DESIGNS LIST */}
      <div className="grid grid-cols-1 grid-cols-3-md" style={{ gap: '24px', alignItems: 'flex-start' }}>
        
        {/* Left Column: Designs List (Span 2) */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '4px' }}>
              Danh sách thiết kế ({designs.length})
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Các tệp tin ảnh cùng mã số thiết kế đã được gom nhóm. Bấm "Chỉnh sửa" để đổi tên, bổ sung ảnh hoặc quản lý biến thể.
            </p>

            {designs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 12px', color: 'var(--text-secondary)' }}>
                Chưa có thiết kế nào. Hãy import file để tiếp tục.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {designs.map((d) => {
                  const dVars = variants.filter(v => v.designId === d.id);
                  const isMissingFront = !dVars.some(v => v.view === 'f');
                  const isMissingBack = !dVars.some(v => v.view === 'b');
                  
                  return (
                    <div
                      key={d.id}
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: '16px',
                        padding: '16px',
                        display: 'flex',
                        gap: '16px',
                        backgroundColor: '#FFFFFF',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flex: 1 }}>
                        {/* Cover Thumbnail */}
                        <div
                          style={{
                            width: 72,
                            height: 72,
                            backgroundColor: '#F2F2F7',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid var(--border)',
                            flexShrink: 0
                          }}
                        >
                          {d.coverImageUrl ? (
                            <img src={d.coverImageUrl} alt={d.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          ) : (
                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>No Image</span>
                          )}
                        </div>

                        {/* Design Info & Variants Info */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent)' }}>{d.code}</span>
                            <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1D1D1F' }}>{d.name}</h4>
                            
                            {isMissingFront && (
                              <span style={{ backgroundColor: '#FFF8F0', color: '#FF9500', border: '1px solid #FFE6C8', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <AlertTriangle size={10} /> Thiếu mặt trước
                              </span>
                            )}

                            {isMissingBack && (
                              <span style={{ backgroundColor: '#FFF8F0', color: '#FF9500', border: '1px solid #FFE6C8', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <AlertTriangle size={10} /> Thiếu mặt sau
                              </span>
                            )}
                          </div>

                          {/* Variants Info Tags (Static display only) */}
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {dVars.map(v => (
                              <span
                                key={v.id}
                                style={{
                                  border: '1px solid #E5E5EA',
                                  borderRadius: '6px',
                                  padding: '3px 8px',
                                  fontSize: '11px',
                                  fontWeight: 500,
                                  color: '#3A3A3C',
                                  backgroundColor: '#F9F9FB',
                                  textTransform: 'capitalize'
                                }}
                              >
                                {v.color} ({v.view === 'f' ? 'Trước' : 'Sau'})
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Operations: ONLY 2 buttons (Chỉnh sửa & Xóa) */}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                        <button
                          onClick={() => handleOpenRename(d)}
                          className="btn btn-outline"
                          style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '8px', fontWeight: 600 }}
                        >
                          Chỉnh sửa
                        </button>
                        
                        <button
                          onClick={() => handleDeleteDesignClick(d.id, d.name)}
                          className="btn btn-outline"
                          style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '8px', fontWeight: 600, color: '#FF3B30', borderColor: '#FFE5E5', backgroundColor: '#FFF5F5' }}
                        >
                          Xóa
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Update Configuration form */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>Cấu hình phiên</h3>
          <form onSubmit={handleUpdateSessionConfig} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Tên phiên</label>
              <input type="text" className="input" value={title} onChange={e => setTitle(e.target.value)} />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Bộ sưu tập</label>
              <input type="text" className="input" value={collection} onChange={e => setCollection(e.target.value)} />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Hạn đóng cửa</label>
              <input type="datetime-local" className="input" value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Số vote tối đa / người</label>
              <input type="number" min="1" max="10" className="input" value={maxVotes} onChange={e => setMaxVotes(parseInt(e.target.value) || 1)} />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '13px', borderRadius: '10px' }}>
              Lưu thiết lập
            </button>
          </form>
        </div>

      </div>

      {/* --- MODAL 1: EDIT DESIGN DETAILS --- */}
      <Modal isOpen={!!editDesign} onClose={() => setEditDesign(null)} title={`Chỉnh sửa mẫu: ${editDesign?.code}`}>
        {editDesign && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Design Code & Name Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Mã thiết kế</label>
                <input
                  type="text"
                  className="input"
                  value={codeEditInput}
                  onChange={e => setCodeEditInput(e.target.value)}
                  placeholder="Mã mẫu..."
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Tên mẫu thiết kế</label>
                <input
                  type="text"
                  className="input"
                  value={renameInput}
                  onChange={e => setRenameInput(e.target.value)}
                  placeholder="Nhập tên mẫu..."
                  autoFocus
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label className="form-label" style={{ marginBottom: 0, fontWeight: 600 }}>Danh sách ảnh biến thể ({localVariants.length})</label>
                
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.multiple = true;
                    fileInput.accept = 'image/*';
                    fileInput.onchange = (e: any) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleAddLocalVariant(e.target.files);
                      }
                    };
                    fileInput.click();
                  }}
                  style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px', gap: '4px' }}
                >
                  <Plus size={14} />
                  Upload thêm ảnh
                </button>
              </div>

              {localVariants.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 16px', border: '1px dashed var(--border)', borderRadius: '12px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  Thiết kế chưa có ảnh biến thể nào. Vui lòng bấm "Upload thêm ảnh"!
                </div>
              ) : (
                <div style={{ maxHeight: '320px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '12px' }}>
                  <table className="table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '60px', padding: '10px', textAlign: 'center' }}>Thứ tự</th>
                        <th style={{ width: '60px', padding: '10px' }}>Ảnh</th>
                        <th style={{ padding: '10px' }}>Màu sắc</th>
                        <th style={{ padding: '10px' }}>Loại ảnh</th>
                        <th style={{ width: '140px', padding: '10px', textAlign: 'center' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {localVariants.map((v, index) => {
                        const isDragging = draggedIndex === index;
                        return (
                          <tr
                            key={v.id}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={handleDragOver}
                            onDragEnter={(e) => handleDragEnter(e, index)}
                            onDragEnd={handleDragEnd}
                            style={{
                              opacity: isDragging ? 0.4 : 1,
                              backgroundColor: isDragging ? 'rgba(0, 0, 0, 0.03)' : 'transparent',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {/* Drag & Move Controls */}
                            <td style={{ padding: '10px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                <div
                                  style={{ color: '#8E8E93', cursor: 'grab', display: 'flex', alignItems: 'center' }}
                                  title="Kéo thả để sắp xếp thứ tự trước/sau"
                                >
                                  <GripVertical size={16} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <button
                                    type="button"
                                    disabled={index === 0}
                                    onClick={() => handleMoveVariantOrder(index, 'up')}
                                    style={{ border: 'none', background: 'none', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.2 : 0.7, padding: 0 }}
                                    title="Chuyển lên trước"
                                  >
                                    <ChevronUp size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={index === localVariants.length - 1}
                                    onClick={() => handleMoveVariantOrder(index, 'down')}
                                    style={{ border: 'none', background: 'none', cursor: index === localVariants.length - 1 ? 'default' : 'pointer', opacity: index === localVariants.length - 1 ? 0.2 : 0.7, padding: 0 }}
                                    title="Chuyển xuống sau"
                                  >
                                    <ChevronDown size={12} />
                                  </button>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '10px' }}>
                              <img
                                src={v.imageUrl}
                                alt="variant preview"
                                style={{ width: '40px', height: '52px', objectFit: 'contain', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: '#F9F9FB' }}
                              />
                            </td>
                            <td style={{ padding: '10px' }}>
                              <select
                                className="select"
                                value={v.color}
                                onChange={e => handleUpdateLocalVariant(v.id, 'color', e.target.value)}
                                style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '6px', height: '32px', border: '1px solid #D2D2D7' }}
                              >
                                {supportedColors.map(c => (
                                  <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: '10px' }}>
                              <select
                                className="select"
                                value={v.view}
                                onChange={e => handleUpdateLocalVariant(v.id, 'view', e.target.value as 'f' | 'b')}
                                style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '6px', height: '32px', border: '1px solid #D2D2D7' }}
                              >
                                <option value="f">Mặt trước</option>
                                <option value="b">Mặt sau</option>
                              </select>
                            </td>
                            <td style={{ padding: '10px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  className="btn btn-outline"
                                  onClick={() => {
                                    const fileInput = document.createElement('input');
                                    fileInput.type = 'file';
                                    fileInput.accept = 'image/*';
                                    fileInput.onchange = (e: any) => {
                                      if (e.target.files && e.target.files.length > 0) {
                                        handleReplaceLocalVariantImage(v.id, e.target.files[0]);
                                      }
                                    };
                                    fileInput.click();
                                  }}
                                  style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px' }}
                                >
                                  Đổi ảnh
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline"
                                  onClick={() => handleDeleteLocalVariant(v.id)}
                                  style={{ padding: '4px 8px', borderRadius: '6px', color: '#FF3B30', borderColor: '#FFE5E5' }}
                                  title="Xóa biến thể này"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <button className="btn btn-outline" onClick={() => setEditDesign(null)} disabled={modalSaving}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSaveDesignDetails} disabled={modalSaving} style={{ gap: '8px' }}>
                {modalSaving && <Loader size={14} className="animate-pulse" />}
                <span>Lưu thay đổi</span>
              </button>
            </div>
          </div>
        )}
      </Modal>



      {/* 🔄 RESET CONFIRM MODAL — công bố lại từ đầu */}
      {showResetConfirm && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 4000,
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px'
          }}
          onClick={() => setShowResetConfirm(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="animate-scale-up"
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '36px 32px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
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
            <ul style={{ textAlign: 'left', fontSize: '13px', color: '#3A3A3C', lineHeight: 1.9, marginBottom: '28px', paddingLeft: '20px' }}>
              <li>Xóa kết quả winner hiện tại</li>
              <li>Đưa tất cả thiết kế về <strong>Chờ duyệt</strong></li>
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

    </div>
  );
};
