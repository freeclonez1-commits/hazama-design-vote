import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useDb } from '../context/DbContext';
import { useToast } from '../components/Toast';
import { getMockTshirtSvg, dbService } from '../services/db';
import type { Variant, ImportLog } from '../types/models';
import {
  UploadCloud,
  ArrowLeft,
  Loader,
  Trash2,
  CheckCircle,
  Plus,
  AlertTriangle,
  FolderPlus
} from 'lucide-react';

interface ImportDesignsProps {
  sessionId: string;
  setTab: (tab: string) => void;
}

interface FileReviewItem {
  id: string;
  name: string;
  dataUrl: string;
  designCode: string;
  color: string;
  view: 'f' | 'b';
}

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


// Real image compressor: resize to max 1200px + quality 0.82 to stay within localStorage limits
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

const detectColor = (text: string): string => {
  const cleanText = text.toLowerCase();
  
  // Check Black
  if (
    cleanText.includes('màu đen') || 
    cleanText.includes('mau den') || 
    cleanText.includes('đen') || 
    cleanText.includes('den') || 
    cleanText.includes('black')
  ) {
    return 'black';
  }
  
  // Check Navy
  if (cleanText.includes('navy')) {
    return 'navy';
  }
  
  // Check Grey
  if (
    cleanText.includes('xám') || 
    cleanText.includes('xam')
  ) {
    return 'grey';
  }
  
  // Fallback search map for other colors
  const fallbackMap: Record<string, string> = {
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
  
  for (const [key, val] of Object.entries(fallbackMap)) {
    if (cleanText.includes(key)) {
      return val;
    }
  }

  // Check White (check last to prevent overriding compound colors like white-yellow, trang-vang)
  if (
    cleanText.includes('trắng') || 
    cleanText.includes('trang') || 
    cleanText.includes('white')
  ) {
    return 'white';
  }
  
  return 'white'; // default
};

const detectView = (text: string): 'f' | 'b' => {
  const cleanText = text.toLowerCase();
  if (
    cleanText.includes('back') || 
    cleanText.includes('sau') || 
    /\b(b|s)\b/.test(cleanText) ||
    cleanText.endsWith('b') ||
    cleanText.endsWith('s')
  ) {
    return 'b';
  }
  
  if (
    cleanText.includes('front') || 
    cleanText.includes('font') || 
    cleanText.includes('truoc') || 
    cleanText.includes('trước') || 
    /\b(f|t)\b/.test(cleanText) ||
    cleanText.endsWith('f') ||
    cleanText.endsWith('t')
  ) {
    return 'f';
  }
  
  return 'f'; // default
};

const parseFileInfo = (filename: string, relativePath = ''): { designCode: string; color: string; view: 'f' | 'b' } => {
  const cleanName = filename.toLowerCase().replace(/\.[^/.]+$/, ""); // Remove extension
  const combinedText = `${relativePath.toLowerCase()} / ${cleanName}`;

  const knownColors = [
    ...supportedColors.map(c => c.value),
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
    'cam', 'orange'
  ];

  const ignoreKeywords = ['truoc', 'trước', 'sau', 'front', 'font', 'back', 'f', 'b', 't', 's', ...knownColors];

  let designCode = '';

  // 1. ƯU TIÊN 1: Lấy Tên Thư Mục Cha (Folder Name) trực tiếp nếu kéo thả/tải thư mục
  if (relativePath && (relativePath.includes('/') || relativePath.includes('\\'))) {
    const pathParts = relativePath.split(/[/\\]+/).filter(Boolean);
    if (pathParts.length >= 2) {
      // Thư mục trực tiếp chứa file ảnh (ví dụ: "MOCK 1", "MOCK 2", "DESIGN A")
      const folderName = pathParts[pathParts.length - 2].trim();
      if (folderName && !ignoreKeywords.includes(folderName.toLowerCase())) {
        designCode = folderName.toUpperCase();
      }
    }
  }

  // 2. ƯU TIÊN 2: Trích xuất từ tên File nếu chưa có tên Thư mục cha
  if (!designCode) {
    const parts = cleanName.split(/[-_\s]+/);
    const codeParts: string[] = [];

    for (const part of parts) {
      if (ignoreKeywords.includes(part.toLowerCase())) {
        if (codeParts.length > 0) break; // Gặp tên màu/góc nhìn thì dừng gom mã
      } else {
        codeParts.push(part);
      }
    }

    if (codeParts.length > 0) {
      designCode = codeParts.join(' ').toUpperCase();
    }
  }

  // Fallback nếu không xác định được mã
  if (!designCode) {
    designCode = 'HZ-NEW';
  }

  const color = detectColor(combinedText);
  const view = detectView(combinedText);

  return {
    designCode,
    color,
    view
  };
};

interface GroupHeaderCodeInputProps {
  groupCode: string;
  onCodeChange: (newCode: string) => void;
}

const GroupHeaderCodeInput: React.FC<GroupHeaderCodeInputProps> = ({ groupCode, onCodeChange }) => {
  const [val, setVal] = useState(groupCode === 'HZ-NEW' ? '' : groupCode);

  useEffect(() => {
    setVal(groupCode === 'HZ-NEW' ? '' : groupCode);
  }, [groupCode]);

  const handleCommit = () => {
    const cleanCode = val.trim().toUpperCase();
    if (cleanCode && cleanCode !== groupCode) {
      onCodeChange(cleanCode);
    }
  };

  return (
    <input
      type="text"
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={handleCommit}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          handleCommit();
        }
      }}
      placeholder="Mã thiết kế (Ví dụ: HZ01)..."
      style={{ 
        borderRadius: '8px', 
        border: '1px solid #D2D2D7', 
        padding: '6px 12px', 
        fontSize: '14px', 
        fontWeight: 700,
        width: '240px', 
        outline: 'none',
        color: 'var(--text-primary)'
      }}
    />
  );
};

interface VariantCardProps {
  item: FileReviewItem;
  groupCode: string;
  groupKeys: string[];
  isDuplicate: boolean;
  onUpdateField: (id: string, field: keyof FileReviewItem, value: string) => void;
  onDelete: (id: string) => void;
  onMoveToGroup: (id: string, targetGroup: string) => void;
}

const VariantCard: React.FC<VariantCardProps> = React.memo(({ item, groupCode, groupKeys, isDuplicate, onUpdateField, onDelete, onMoveToGroup }) => {
  // Pending move confirmation state
  const [pendingGroup, setPendingGroup] = useState<string | null>(null);

  const handleGroupSelectChange = (newGroup: string) => {
    if (newGroup !== groupCode) {
      setPendingGroup(newGroup);
    }
  };

  const confirmMove = () => {
    if (pendingGroup) {
      onMoveToGroup(item.id, pendingGroup);
      setPendingGroup(null);
    }
  };

  const cancelMove = () => {
    setPendingGroup(null);
  };

  return (
    <div
      draggable={!pendingGroup}
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', item.id); }}
      style={{
        display: 'flex',
        gap: '12px',
        padding: '12px',
        borderRadius: '12px',
        border: isDuplicate ? '1.5px solid var(--warning)' : pendingGroup ? '1.5px solid var(--accent)' : '1px solid var(--border)',
        backgroundColor: isDuplicate ? 'rgba(255, 149, 0, 0.05)' : '#FAF9F6',
        position: 'relative',
        cursor: pendingGroup ? 'default' : 'grab',
        transition: 'border-color 0.15s, background-color 0.15s'
      }}
    >
      {/* Inline confirm overlay when pending move */}
      {pendingGroup && (
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '12px',
          backgroundColor: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(4px)',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          padding: '12px',
          border: '1.5px solid var(--accent)',
          boxShadow: '0 4px 20px rgba(90,200,250,0.15)'
        }}>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center', lineHeight: '1.4' }}>
            Chuyển ảnh này sang nhóm
            <br />
            <span style={{ color: 'var(--accent)', fontSize: '13px' }}>[{pendingGroup}]</span> ?
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={confirmMove}
              style={{
                padding: '5px 14px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'var(--accent)',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ✓ Xác nhận
            </button>
            <button
              onClick={cancelMove}
              style={{
                padding: '5px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: '#fff',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Thumbnail */}
      <div style={{ width: '60px', height: '80px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)' }}>
        <img src={item.dataUrl} alt="variant" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>

      {/* Fields */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'center' }}>
        {groupKeys.length > 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase' }}>Thuộc nhóm</span>
            <select
              value={groupCode}
              onChange={e => handleGroupSelectChange(e.target.value)}
              style={{ borderRadius: '6px', border: '1px solid var(--accent)', padding: '2px 6px', fontSize: '11px', fontWeight: 700, outline: 'none', height: '26px', backgroundColor: '#FFFFFF', color: '#1D1D1F' }}
            >
              {groupKeys.map(g => <option key={g} value={g}>Mẫu: {g}</option>)}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-secondary)' }}>Màu sắc</span>
          <select
            value={item.color}
            onChange={e => onUpdateField(item.id, 'color', e.target.value)}
            style={{ borderRadius: '6px', border: '1px solid #D2D2D7', padding: '4px 6px', fontSize: '12px', outline: 'none', height: '28px', backgroundColor: '#FFFFFF' }}
          >
            {supportedColors.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-secondary)' }}>Góc nhìn</span>
          <select
            value={item.view}
            onChange={e => onUpdateField(item.id, 'view', e.target.value)}
            style={{ borderRadius: '6px', border: '1px solid #D2D2D7', padding: '4px 6px', fontSize: '12px', outline: 'none', height: '28px', backgroundColor: '#FFFFFF' }}
          >
            <option value="f">Mặt trước</option>
            <option value="b">Mặt sau</option>
          </select>
        </div>
      </div>

      {/* Delete */}
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        style={{ position: 'absolute', top: '6px', right: '6px', border: 'none', background: 'none', cursor: 'pointer', color: '#8E8E93', padding: '2px', borderRadius: '4px', lineHeight: 1 }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
        onMouseLeave={e => (e.currentTarget.style.color = '#8E8E93')}
        title="Xóa ảnh biến thể này"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
});

export const ImportDesigns: React.FC<ImportDesignsProps> = ({ sessionId, setTab }) => {
  const { activeSession, loadSessionDetails, importLogs } = useDb();
  const { toast } = useToast();
  
  const [uploading, setUploading] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [filesToReview, setFilesToReview] = useState<FileReviewItem[]>([]);

  // Drag-drop confirm: { itemId, fromGroup, toGroup }
  const [dragConfirm, setDragConfirm] = useState<{ itemId: string; fromGroup: string; toGroup: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);



  // Helper to recursively read directory entries in HTML5
  const readEntry = (entry: any, path = ''): Promise<File[]> => {
    return new Promise((resolve) => {
      if (entry.isFile) {
        entry.file(
          (file: File) => {
            (file as any).relativePath = path + entry.name;
            resolve([file]);
          },
          () => resolve([])
        );
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        const readAllEntries = async () => {
          const allFiles: File[] = [];
          try {
            let entries = await new Promise<any[]>((res, resRej) => reader.readEntries(res, resRej));
            while (entries.length > 0) {
              for (const subEntry of entries) {
                const files = await readEntry(subEntry, path + entry.name + '/');
                allFiles.push(...files);
              }
              entries = await new Promise<any[]>((res, resRej) => reader.readEntries(res, resRej));
            }
          } catch (err) {
            console.error("Directory read error:", err);
          }
          resolve(allFiles);
        };
        readAllEntries();
      } else {
        resolve([]);
      }
    });
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.items) {
      const filesList: File[] = [];
      const entries = Array.from(e.dataTransfer.items)
        .map(item => item.webkitGetAsEntry())
        .filter(entry => entry !== null);
      
      setUploading(true);
      setProgressText('Đang quét thư mục và tệp tin...');

      for (const entry of entries) {
        const files = await readEntry(entry);
        filesList.push(...files);
      }

      await processUploadedFiles(filesList);
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processUploadedFiles(Array.from(e.dataTransfer.files));
    }
  };

  const targetGroupForUploadRef = useRef<string | null>(null);

  const triggerFileInputForGroup = (groupCode?: string) => {
    targetGroupForUploadRef.current = groupCode || null;
    fileInputRef.current?.click();
  };

  // Drop files or drag items directly into a specific group card
  const handleDropToSpecificGroup = async (e: React.DragEvent, targetGroupCode: string) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if dragging an existing variant item inside the review board
    const draggedItemId = e.dataTransfer.getData('text/plain');
    const draggedItem = filesToReview.find(i => i.id === draggedItemId);
    const isInternalItemDrag = !!draggedItem;

    if (isInternalItemDrag) {
      const fromGroup = draggedItem.designCode.trim().toUpperCase() || 'HZ-NEW';
      // Only show confirm if moving to a DIFFERENT group
      if (fromGroup !== targetGroupCode) {
        setDragConfirm({ itemId: draggedItemId, fromGroup, toGroup: targetGroupCode });
      }
      return;
    }

    // Drop new files/folders from desktop into this specific group
    if (e.dataTransfer.items) {
      const filesList: File[] = [];
      const entries = Array.from(e.dataTransfer.items)
        .map(item => item.webkitGetAsEntry())
        .filter(entry => entry !== null);
      
      setUploading(true);
      setProgressText(`Đang tải ảnh trực tiếp vào nhóm ${targetGroupCode}...`);

      for (const entry of entries) {
        const files = await readEntry(entry);
        filesList.push(...files);
      }

      await processUploadedFiles(filesList, targetGroupCode);
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processUploadedFiles(Array.from(e.dataTransfer.files), targetGroupCode);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const targetGroup = targetGroupForUploadRef.current || undefined;
      await processUploadedFiles(Array.from(e.target.files), targetGroup);
      targetGroupForUploadRef.current = null;
    }
  };

  // Process files with optional forcedDesignCode override
  const processUploadedFiles = async (files: File[], forcedDesignCode?: string) => {
    setUploading(true);
    setProgressText('Đang lọc hình ảnh...');

    try {
      const parsedItems: FileReviewItem[] = [];

      for (const file of files) {
        // Skip non-images
        if (!file.type.startsWith('image/')) {
          continue;
        }

        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        const relPath = (file as any).relativePath || file.webkitRelativePath || '';
        const parsed = parseFileInfo(file.name, relPath);
        parsedItems.push({
          id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          name: file.name,
          dataUrl,
          designCode: forcedDesignCode ? forcedDesignCode.trim().toUpperCase() : parsed.designCode,
          color: parsed.color,
          view: parsed.view
        });
      }

      if (parsedItems.length === 0) {
        toast('Không tìm thấy file hình ảnh hợp lệ để tải lên.', 'warning');
        return;
      }

      setFilesToReview(prev => [...prev, ...parsedItems]);
      toast(`Đã thêm ${parsedItems.length} hình ảnh vào nhóm [${forcedDesignCode || 'Mã tương ứng'}]`, 'success');
    } catch (err) {
      console.error(err);
      toast('Đã xảy ra lỗi khi đọc tệp tin.', 'error');
    } finally {
      setUploading(false);
      setProgressText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Confirm and save designs/variants directly to Firestore
  const handleConfirmImport = async () => {
    if (filesToReview.length === 0) return;
    
    // Group items by designCode
    const groups: Record<string, FileReviewItem[]> = {};
    filesToReview.forEach(item => {
      const code = item.designCode.trim().toUpperCase() || 'HZ-NEW';
      if (!groups[code]) groups[code] = [];
      groups[code].push(item);
    });

    // Auto resolve duplicate color/view combination in same group
    Object.entries(groups).forEach(([_code, items]) => {
      const seenKeys = new Set<string>();
      items.forEach(item => {
        const key = `${item.color}_${item.view}`;
        if (seenKeys.has(key)) {
          if (item.view === 'f') {
            item.view = 'b';
          }
        }
        seenKeys.add(`${item.color}_${item.view}`);
      });
    });

    setUploading(true);
    setProgressText('Đang tối ưu dung lượng ảnh & lưu vào cơ sở dữ liệu...');

    try {
      const nowStr = new Date().toISOString();
      const logs: ImportLog[] = [];

      // 1. Fetch existing designs and variants
      const existingDesigns = await dbService.listDesigns(sessionId);
      const existingVariants = await dbService.listAllVariants();

      let addedDesignsCount = 0;
      let addedVariantsCount = 0;

      // 2. Process each design code group with at least 1 image
      const codes = Object.keys(groups).filter(c => groups[c].length > 0);
      for (let i = 0; i < codes.length; i++) {
        const code = codes[i];
        const groupItems = groups[code];
        
        setProgressText(`Đang xử lý thiết kế: ${code} (${i + 1}/${codes.length})...`);

        // Check if design already exists
        let design = existingDesigns.find(d => d.code === code);
        if (!design) {
          // Create new Design
          const designId = `design_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          design = {
            id: designId,
            sessionId,
            code,
            name: `Thiết kế ${code}`,
            coverImageUrl: '',
            status: 'pending',
            sortOrder: existingDesigns.length + addedDesignsCount,
            createdAt: nowStr
          };
          addedDesignsCount++;
        }

        const newVariantsForDesign: Variant[] = [];

        // Process variants in group
        for (const item of groupItems) {
          const compressedDataUrl = await compressImage(item.dataUrl);

          const existingVar = existingVariants.find(
            v => v.designId === design!.id && v.color === item.color && v.view === item.view
          );

          const variantId = existingVar ? existingVar.id : `variant_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          
          const variant: Variant = {
            id: variantId,
            designId: design.id,
            color: item.color,
            view: item.view,
            imageUrl: compressedDataUrl,
            originalFileName: item.name,
            sortOrder: newVariantsForDesign.length
          };

          newVariantsForDesign.push(variant);
          addedVariantsCount++;

          logs.push({
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            sessionId,
            fileName: item.name,
            status: 'valid',
            reason: `Hợp lệ: Mã ${code}, Màu ${item.color}, Mặt ${item.view === 'f' ? 'Trước' : 'Sau'}.`,
            createdAt: nowStr
          });
        }

        // Save designs and variants
        await dbService.saveDesign(design);
        await dbService.saveVariants(newVariantsForDesign);

        // Update cover image to first front variant
        const firstFront = newVariantsForDesign.find(v => v.view === 'f') || newVariantsForDesign[0];
        if (firstFront && design.coverImageUrl !== firstFront.imageUrl) {
          design.coverImageUrl = firstFront.imageUrl;
          await dbService.saveDesign(design);
        }
      }

      if (logs.length > 0) {
        await dbService.saveImportLogs(logs);
      }

      // Refresh DB Context
      await loadSessionDetails(sessionId);

      toast(`Import thành công! Đã lưu ${addedDesignsCount} mẫu thiết kế và ${addedVariantsCount} hình ảnh vào phiên bình chọn.`, 'success');
      
      // Clear review state and redirect to session overview
      setFilesToReview([]);
      setCustomEmptyGroups([]);
      setTab('overview');
    } catch (err) {
      console.error("Import error:", err);
      toast('Đã xảy ra lỗi khi lưu dữ liệu. Vui lòng thử lại!', 'error');
    } finally {
      setUploading(false);
      setProgressText('');
    }
  };

  // Load mock designs to review list
  const handleGenerateMockSamples = () => {
    const mockFiles = [
      { name: '05-red-f.png', color: 'red', view: 'f', designCode: 'HZ-SAMPLE-05' },
      { name: '05-red-b.png', color: 'red', view: 'b', designCode: 'HZ-SAMPLE-05' },
      { name: '06-blue-f.png', color: 'blue', view: 'f', designCode: 'HZ-SAMPLE-06' },
      { name: '05-beige-f.webp', color: 'beige', view: 'f', designCode: 'HZ-SAMPLE-05' },
      { name: '05-beige-b.webp', color: 'beige', view: 'b', designCode: 'HZ-SAMPLE-05' },
      { name: 'ao-thun-hong.png', color: 'pink', view: 'f', designCode: 'AO-THUN' },
      { name: '07-den-f.png', color: 'black', view: 'f', designCode: '07' }
    ];

    const loadedItems: FileReviewItem[] = mockFiles.map((m, idx) => ({
      id: `mock_${idx}_${Date.now()}`,
      name: m.name,
      dataUrl: getMockTshirtSvg(m.color, m.view as 'f' | 'b', m.designCode),
      designCode: m.designCode,
      color: m.color,
      view: m.view as 'f' | 'b'
    }));

    setFilesToReview(prev => [...prev, ...loadedItems]);
    toast('Đã tải bộ 7 hình ảnh mẫu thử nghiệm vào danh sách kiểm duyệt!', 'success');
  };


  const handleUpdateReviewField = useCallback((id: string, field: keyof FileReviewItem, value: string) => {
    setFilesToReview(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  }, []);

  const handleDeleteReviewItem = useCallback((id: string) => {
    setFilesToReview(prev => prev.filter(item => item.id !== id));
  }, []);

  // Move item to another group (called after user confirms in VariantCard overlay)
  const handleMoveToGroup = useCallback((id: string, targetGroup: string) => {
    setFilesToReview(prev =>
      prev.map(item => (item.id === id ? { ...item, designCode: targetGroup } : item))
    );
    toast(`Đã chuyển ảnh vào nhóm [${targetGroup}]!`, 'success');
  }, [toast]);

  // Support manually created empty groups
  const [customEmptyGroups, setCustomEmptyGroups] = useState<string[]>([]);

  // Group files by designCode — memoized so only recomputes when data changes
  const groups = useMemo(() => {
    const g: Record<string, FileReviewItem[]> = {};
    customEmptyGroups.forEach(code => { g[code] = []; });
    filesToReview.forEach(item => {
      const code = item.designCode.trim().toUpperCase() || 'HZ-NEW';
      if (!g[code]) g[code] = [];
      g[code].push(item);
    });
    return g;
  }, [filesToReview, customEmptyGroups]);

  const handleCreateNewGroup = () => {
    const nextNum = Object.keys(groups).length + 1;
    const inputCode = prompt('Nhập Tên Mã Thiết Kế cho Nhóm Mới:', `MOCK ${nextNum}`);
    if (inputCode === null) return;
    const cleanCode = inputCode.trim().toUpperCase() || `MOCK ${nextNum}`;
    if (!customEmptyGroups.includes(cleanCode) && !groups[cleanCode]) {
      setCustomEmptyGroups(prev => [...prev, cleanCode]);
    }
    toast(`Đã tạo nhóm thiết kế mới [${cleanCode}]! Hãy chọn hoặc kéo ảnh vào nhóm này.`, 'success');
  };

  const handleMergeAllToSingleGroup = () => {
    if (filesToReview.length === 0) return;
    const inputCode = prompt('Nhập Mã thiết kế chung cho tất cả ảnh lượt này:', 'MOCK');
    if (inputCode === null) return; // User canceled
    const cleanCode = inputCode.trim().toUpperCase() || 'MOCK';
    setFilesToReview(prev => prev.map(item => ({ ...item, designCode: cleanCode })));
    toast(`Đã gộp tất cả ${filesToReview.length} ảnh thành 1 mẫu thiết kế [${cleanCode}]!`, 'success');
  };

  const handleClearAll = () => {
    setFilesToReview([]);
    setCustomEmptyGroups([]);
    targetGroupForUploadRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div 
      className="animate-fade-in" 
      style={{ display: 'flex', flexDirection: 'column', gap: '32px', position: 'relative' }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={handleDrop}
    >

      {/* Drag-drop confirm modal */}
      {dragConfirm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            padding: '32px 36px',
            maxWidth: '380px',
            width: '90%',
            boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            animation: 'var(--animate-fade-in)'
          }}>
            <div style={{ fontSize: '36px', lineHeight: 1 }}>🔄</div>
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Xác nhận chuyển nhóm?
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Chuyển ảnh từ nhóm{' '}
                <strong style={{ color: '#FF6B35' }}>[{dragConfirm.fromGroup}]</strong>
                {' '}sang nhóm{' '}
                <strong style={{ color: 'var(--accent)' }}>[{dragConfirm.toGroup}]</strong>?
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  setFilesToReview(prev =>
                    prev.map(i => (i.id === dragConfirm.itemId ? { ...i, designCode: dragConfirm.toGroup } : i))
                  );
                  toast(`Đã chuyển ảnh sang nhóm [${dragConfirm.toGroup}]!`, 'success');
                  setDragConfirm(null);
                }}
                style={{
                  padding: '10px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: 'var(--accent)',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,122,255,0.3)'
                }}
              >
                ✓ Xác nhận chuyển
              </button>
              <button
                onClick={() => setDragConfirm(null)}
                style={{
                  padding: '10px 24px',
                  borderRadius: '10px',
                  border: '1.5px solid var(--border)',
                  backgroundColor: '#FFFFFF',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. HEADER CONTROL */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => setTab('overview')}
          className="btn btn-outline"
          style={{ fontSize: '13px', padding: '8px 16px', borderRadius: '10px', gap: '6px' }}
        >
          <ArrowLeft size={14} />
          <span>Quay lại phiên bình chọn</span>
        </button>

        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Phiên: <strong>{activeSession?.title}</strong>
        </span>
      </div>

      {/* 2. UPLOADER OR REVIEW GRID */}
      {(filesToReview.length > 0 || customEmptyGroups.length > 0) ? (
        /* --- HIGHLY PRODUCTIVE GROUPED REVIEW MODE --- */
        <div className="grid grid-cols-1 grid-cols-3-md" style={{ gap: '24px', alignItems: 'flex-start' }}>
          
          {/* Main Review grouped Card list */}
          <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Bảng kiểm duyệt: {Object.keys(groups).length} mẫu thiết kế</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Kéo thêm tệp tin thả vào bất cứ đâu trên màn hình để thêm tệp, điều chỉnh mã thiết kế một lần cho tất cả biến thể bên trong.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleCreateNewGroup}
                    className="btn"
                    style={{
                      fontSize: '12px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--accent)',
                      color: '#FFFFFF',
                      border: 'none',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Tạo thêm 1 nhóm Mã thiết kế mới rỗng để xếp ảnh vào"
                  >
                    <FolderPlus size={14} />
                    <span>Tạo nhóm mới</span>
                  </button>

                  {Object.keys(groups).length > 1 && (
                    <button
                      onClick={handleMergeAllToSingleGroup}
                      className="btn"
                      style={{
                        fontSize: '12px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        backgroundColor: '#5E5CE6',
                        color: '#FFFFFF',
                        border: 'none',
                        fontWeight: 600
                      }}
                      title="Gộp tất cả ảnh trong đợt này về chung 1 mã thiết kế duy nhất"
                    >
                      <span>Gộp tất cả thành 1 mẫu</span>
                    </button>
                  )}

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-outline"
                    style={{ fontSize: '12px', padding: '8px 12px', borderRadius: '8px', gap: '4px' }}
                  >
                    <Plus size={14} />
                    Thêm ảnh
                  </button>
                  <button
                    onClick={handleClearAll}
                    className="btn btn-outline"
                    style={{ fontSize: '12px', padding: '8px 12px', borderRadius: '8px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                  >
                    Xóa tất cả
                  </button>
                </div>
              </div>
            </div>

            {/* Design Group Cards Loop */}
            {Object.entries(groups).map(([groupCode, items]) => {
              // Calculate duplicates (variants with same color + view) in this group
              const variantKeys = items.map(item => `${item.color}_${item.view}`);
              const hasDuplicates = variantKeys.length !== new Set(variantKeys).size;

              return (
                <div 
                  key={groupCode} 
                  className="card animate-fade-in" 
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => handleDropToSpecificGroup(e, groupCode)}
                  style={{ 
                    padding: '24px', 
                    borderLeft: hasDuplicates ? '5px solid var(--warning)' : '5px solid var(--accent)',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '16px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.01)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Group Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '14px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Mã thiết kế</span>
                        <GroupHeaderCodeInput
                          groupCode={groupCode}
                          onCodeChange={(newCode) => {
                            setFilesToReview(prev =>
                              prev.map(item => item.designCode.trim().toUpperCase() === groupCode ? { ...item, designCode: newCode } : item)
                            );
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Số lượng</span>
                        <span style={{ fontSize: '14px', fontWeight: 700, padding: '4px 0', color: 'var(--text-primary)' }}>{items.length} ảnh biến thể</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {hasDuplicates && (
                        <span className="badge badge-warning" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '20px' }}>
                          <AlertTriangle size={12} />
                          Trùng lặp mặt ảnh (trùng cả màu và mặt trước/sau)
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => triggerFileInputForGroup(groupCode)}
                        className="btn btn-outline"
                        style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px', color: 'var(--accent)', borderColor: 'var(--accent)' }}
                      >
                        <Plus size={13} />
                        Thêm ảnh vào nhóm này
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Xóa toàn bộ nhóm thiết kế ${groupCode}?`)) {
                            setFilesToReview(prev => prev.filter(item => item.designCode.trim().toUpperCase() !== groupCode));
                            setCustomEmptyGroups(prev => prev.filter(g => g !== groupCode));
                          }
                        }}
                        className="btn btn-outline"
                        style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px', color: 'var(--danger)', borderColor: 'var(--danger-light)' }}
                      >
                        Xóa nhóm
                      </button>
                    </div>
                  </div>

                  {/* Group Body: Grid of variants */}
                  {items.length === 0 ? (
                    <div 
                      onClick={() => triggerFileInputForGroup(groupCode)}
                      style={{ 
                        padding: '40px 20px', 
                        textAlign: 'center', 
                        backgroundColor: '#F9F9FB', 
                        borderRadius: '14px', 
                        border: '2px dashed #D2D2D7',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <UploadCloud size={32} color="var(--accent)" />
                      <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        Nhóm [{groupCode}] hiện đang rỗng
                      </p>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                        Kéo thả tệp/thư mục ảnh trực tiếp vào ô này, hoặc click chọn ảnh để nạp vào nhóm <strong>[{groupCode}]</strong>
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 grid-cols-2-sm grid-cols-3-md" style={{ gap: '16px' }}>
                      {items.map(item => {
                        const isDuplicate = items.filter(i => i.color === item.color && i.view === item.view).length > 1;
                        return (
                          <VariantCard
                            key={item.id}
                            item={item}
                            groupCode={groupCode}
                            groupKeys={Object.keys(groups)}
                            isDuplicate={isDuplicate}
                            onUpdateField={handleUpdateReviewField}
                            onDelete={handleDeleteReviewItem}
                            onMoveToGroup={handleMoveToGroup}
                          />
                        );
                      })}
                    </div>
                  )}
              </div>
            );
            })}

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>

          {/* Right Import Actions Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'sticky', top: '90px', zIndex: 50 }}>
            <h4 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              Xác nhận thông số Import
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Tổng số tệp tin ảnh:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{filesToReview.length} ảnh</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Số thiết kế (Mã):</span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {Object.keys(groups).length} nhóm thiết kế
                </strong>
              </div>
            </div>

            {uploading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '16px 0', borderTop: '1px solid var(--border)' }}>
                <Loader size={24} className="animate-pulse" style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: '1.4' }}>
                  {progressText}
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <button
                  onClick={handleConfirmImport}
                  className="btn btn-primary"
                  style={{ width: '100%', fontSize: '14px', padding: '12px', borderRadius: '10px', gap: '8px' }}
                >
                  <CheckCircle size={16} />
                  <span>Xác nhận Import ({filesToReview.length} ảnh)</span>
                </button>
                <button
                  onClick={handleClearAll}
                  className="btn btn-outline"
                  style={{ width: '100%', fontSize: '13px', padding: '10px', borderRadius: '10px' }}
                >
                  Hủy đợt tải lên
                </button>
              </div>
            )}
          </div>

        </div>
      ) : (
        /* --- UPLOAD DROP ZONE MODE --- */
        <div className="grid grid-cols-1 grid-cols-3-md" style={{ gap: '24px', alignItems: 'flex-start' }}>
          
          {/* Left Column: Drag & Drop Zone */}
          <div style={{ gridColumn: 'span 2' }} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '4px' }}>Tải hình ảnh lên hệ thiết kế</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                  Kéo thả thư mục chứa hình ảnh sản phẩm hoặc tạo nhóm thiết kế trước để phân loại.
                </p>
              </div>

              <button
                onClick={handleCreateNewGroup}
                className="btn"
                style={{
                  fontSize: '13px',
                  padding: '9px 16px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--accent)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FolderPlus size={16} />
                <span>+ Tạo nhóm thủ công</span>
              </button>
            </div>

            {/* Drag Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed var(--border)`,
                borderRadius: '16px',
                padding: '70px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: 'var(--background)',
                transition: 'all 0.25s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px'
              }}
            >
              <UploadCloud size={44} color="var(--text-secondary)" />
              <div>
                <p style={{ fontWeight: 600, fontSize: '14px' }}>
                  Kéo thả thư mục ảnh (Folder) hoặc nhiều file ảnh vào đây, hoặc click để chọn
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Hỗ trợ PNG, JPG, JPEG, WEBP. Hệ thống hỗ trợ đọc đệ quy thư mục thả vào.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>

            {/* Alternative Loader */}
            {uploading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '20px', justifyContent: 'center' }}>
                <Loader size={16} className="animate-pulse" />
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{progressText}</span>
              </div>
            )}
          </div>

          {/* Right Column: Rule guidelines & Tester */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Quy tắc đặt tên (Tự động nhận diện)
              </h4>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '8px' }}>
                Hệ thống tự nhận diện các trường thông tin nếu tên file tuân thủ quy tắc sau:
              </p>
              <ul style={{ fontSize: '12.5px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '16px' }}>
                <li><strong>Mã thiết kế</strong>: Phần đầu tên file (ví dụ: <code style={{ fontWeight: 600 }}>HZ01</code>, <code style={{ fontWeight: 600 }}>12</code>)</li>
                <li><strong>Màu sắc</strong>: Chữ tiếng Anh/Việt (ví dụ: <code style={{ fontWeight: 600 }}>black</code>, <code style={{ fontWeight: 600 }}>den</code>, <code style={{ fontWeight: 600 }}>navy</code>)</li>
                <li><strong>Góc nhìn</strong>: <code style={{ fontWeight: 600 }}>f</code> (trước) hoặc <code style={{ fontWeight: 600 }}>b</code> (sau)</li>
                <li><em>Ví dụ:</em> <code style={{ color: 'var(--accent)', fontWeight: 700 }}>HZ01-den-f.png</code>, <code style={{ color: 'var(--accent)', fontWeight: 700 }}>15-navy-b.jpg</code></li>
              </ul>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Môi trường thử nghiệm
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.4' }}>
                Click nút dưới để tự động sinh 7 hình ảnh mẫu thiết kế thử nghiệm và tải vào danh sách kiểm duyệt ngay lập tức.
              </p>
              <button
                onClick={handleGenerateMockSamples}
                className="btn btn-warning"
                style={{ width: '100%', fontSize: '13px', borderRadius: '10px', color: '#1D1D1F' }}
              >
                Tạo bộ file mẫu test nhanh
              </button>
            </div>
          </div>

        </div>
      )}

      {/* 3. SKIPPED FILES TABLE LOGS */}
      <section className="card" style={{ padding: '24px 0' }}>
        <div style={{ padding: '0 24px 16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Lịch sử log file import</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Theo dõi chi tiết các file hợp lệ hoặc bị bỏ qua để kiểm soát chất lượng dữ liệu của phiên.
            </p>
          </div>
        </div>

        {importLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Chưa có lịch sử import nào được ghi nhận. Hãy tải lên file ảnh để bắt đầu.
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none', boxShadow: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Tên file</th>
                  <th>Trạng thái</th>
                  <th>Lý do / Mô tả chi tiết</th>
                  <th>Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {importLogs.map(log => (
                  <tr key={log.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '13px' }}>
                      {log.fileName}
                    </td>
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
                      {new Date(log.createdAt).toLocaleTimeString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  );
};
