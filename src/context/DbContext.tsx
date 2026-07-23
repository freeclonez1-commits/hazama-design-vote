import React, { createContext, useContext, useState, useEffect } from 'react';
import type { VoteSession, Design, Variant, Vote, ImportLog } from '../types/models';
import { dbService } from '../services/db';
import { parseFileName, generateDesignCode } from '../utils/fileValidation';
import { isFirebaseEnabled } from '../services/firebaseService';


interface DbContextType {
  sessions: VoteSession[];
  activeSession: VoteSession | null;
  designs: Design[];
  variants: Variant[];
  votes: Vote[];
  importLogs: ImportLog[];
  loading: boolean;
  refreshSessions: () => Promise<void>;
  loadSessionDetails: (sessionId: string) => Promise<void>;
  createSession: (title: string, collection: string, deadline: string, maxVotesPerUser: number) => Promise<VoteSession>;
  updateSessionStatus: (sessionId: string, status: VoteSession['status']) => Promise<void>;
  submitVote: (sessionId: string, userId: string, email: string, name: string, role: Vote['userRoleAtVote'], designIds: string[]) => Promise<void>;
  importFiles: (sessionId: string, files: { name: string; dataUrl: string }[]) => Promise<{ validCount: number; skippedCount: number }>;
  updateDesign: (design: Design) => Promise<void>;
  deleteDesign: (designId: string) => Promise<void>;
  deleteVariant: (variantId: string) => Promise<void>;
  mergeDesigns: (sourceDesignId: string, targetDesignId: string) => Promise<void>;
  splitDesign: (designId: string, variantIdsToMove: string[], newDesignNumber: string, newName: string) => Promise<void>;
  resetDatabase: () => Promise<void>;
}

const DbContext = createContext<DbContextType | undefined>(undefined);

export const DbProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessions, setSessions] = useState<VoteSession[]>([]);
  const [activeSession, setActiveSession] = useState<VoteSession | null>(null);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshSessions = async () => {
    try {
      const data = await dbService.listSessions();
      
      // Auto-expire published sessions whose deadline has passed
      const now = Date.now();
      let hasUpdates = false;
      const updatedData = await Promise.all(data.map(async (s) => {
        if (s.status === 'published' && new Date(s.deadline).getTime() <= now) {
          const updated = { ...s, status: 'closed' as const, updatedAt: new Date().toISOString() };
          await dbService.saveSession(updated);
          hasUpdates = true;
          return updated;
        }
        return s;
      }));

      // Sort sessions: active/published first, then drafts, then closed/archived.
      const sorted = [...updatedData].sort((a, b) => {
        const order: Record<string, number> = { published: 0, draft: 1, review: 2, closed: 3, approved: 4, archived: 5 };
        return (order[a.status] ?? 99) - (order[b.status] ?? 99);
      });
      
      setSessions(sorted);

      // If the current activeSession was updated, sync its state too
      if (hasUpdates && activeSession) {
        const currentActiveUpdated = updatedData.find(item => item.id === activeSession.id);
        if (currentActiveUpdated && currentActiveUpdated.status !== activeSession.status) {
          setActiveSession(currentActiveUpdated);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    refreshSessions();
  }, []);

  // Real-time vote synchronization listener
  useEffect(() => {
    if (!activeSession) {
      setVotes([]);
      return;
    }

    const unsubscribe = dbService.subscribeVotes(activeSession.id, (realtimeVotes) => {
      setVotes(realtimeVotes);
    });

    return () => unsubscribe();
  }, [activeSession?.id]);

  const loadSessionDetails = async (sessionId: string) => {
    setLoading(true);
    try {
      // Kiểm tra session trước — nếu không tồn tại thì không tải dữ liệu con
      const session = await dbService.getSession(sessionId);
      setActiveSession(session);

      if (session) {
        // Tải song song (parallel) các dữ liệu cơ bản của session
        const [loadedDesigns, loadedVotes, loadedLogs] = await Promise.all([
          dbService.listDesigns(sessionId),
          dbService.listVotes(sessionId),
          dbService.listImportLogs(sessionId)
        ]);

        setDesigns(loadedDesigns);
        setVotes(loadedVotes);
        setImportLogs(loadedLogs);

        // Chỉ tải những variants thuộc về designs của session này (Tối ưu hóa tối đa)
        const designIds = loadedDesigns.map(d => d.id);
        const sessionVariants = await dbService.listVariantsForDesigns(designIds);
        setVariants(sessionVariants);
      } else {
        setDesigns([]);
        setVariants([]);
        setVotes([]);
        setImportLogs([]);
      }
    } catch (e) {
      console.error('Error loading session details:', e);
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (title: string, collection: string, deadline: string, maxVotesPerUser: number): Promise<VoteSession> => {
    const now = new Date().toISOString();
    const newSession: VoteSession = {
      id: `session_${Date.now()}`,
      title: title.trim(),
      collection: collection.trim(),
      deadline,
      maxVotesPerUser,
      status: 'draft',
      createdAt: now,
      updatedAt: now
    };
    const saved = await dbService.saveSession(newSession);
    await refreshSessions();
    return saved;
  };

  const updateSessionStatus = async (sessionId: string, status: VoteSession['status']) => {
    const session = await dbService.getSession(sessionId);
    if (session) {
      let deadline = session.deadline;
      // Nếu công bố hoặc mở lại phiên mà thời hạn cũ đã quá hạn -> Tự động gia hạn thêm 3 ngày ở tương lai
      if (status === 'published' && new Date(session.deadline).getTime() <= Date.now()) {
        const d = new Date();
        d.setDate(d.getDate() + 3);
        d.setHours(17, 0, 0, 0); // 17:00
        deadline = d.toISOString();
      }

      const updated = { ...session, status, deadline, updatedAt: new Date().toISOString() };
      await dbService.saveSession(updated);
      if (activeSession && activeSession.id === sessionId) {
        setActiveSession(updated);
      }
      await refreshSessions();
    }
  };

  const submitVote = async (
    sessionId: string,
    userId: string,
    email: string,
    name: string,
    role: Vote['userRoleAtVote'],
    designIds: string[]
  ) => {
    const vote: Vote = {
      id: '', // dbService will generate it
      sessionId,
      userId,
      userEmail: email,
      userNameAtVote: name,
      userRoleAtVote: role,
      selectedDesignIds: designIds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await dbService.saveVote(vote);
    // NOTE: If Firebase is enabled, the realtime onSnapshot listener already updates
    // vote state automatically. Only reload in localStorage mode (no realtime listener).
    if (!isFirebaseEnabled) {
      const updatedVotes = await dbService.listVotes(sessionId);
      setVotes(updatedVotes);
    }
  };

  const importFiles = async (
    sessionId: string,
    files: { name: string; dataUrl: string }[]
  ): Promise<{ validCount: number; skippedCount: number }> => {
    setLoading(true);
    try {
      const session = await dbService.getSession(sessionId);
      if (!session) throw new Error('Session not found');

      const logs: ImportLog[] = [];
      const newVariants: Variant[] = [];
      const pendingDesignsMap: Record<string, { name: string; variants: Omit<Variant, 'designId'>[] }> = {};

      let validCount = 0;
      let skippedCount = 0;

      // Group existing designs to check for code matches
      const existingDesigns = await dbService.listDesigns(sessionId);
      const existingDesignIds = existingDesigns.map(d => d.id);
      const existingVariants = await dbService.listVariantsForDesigns(existingDesignIds);

      // 1. Process files
      for (const file of files) {
        const parsed = parseFileName(file.name);
        const nowStr = new Date().toISOString();

        if (!parsed.valid || !parsed.designNumber || !parsed.color || !parsed.view) {
          skippedCount++;
          logs.push({
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            sessionId,
            fileName: file.name,
            status: 'skipped',
            reason: parsed.reason || 'Lỗi định dạng tên file.',
            createdAt: nowStr
          });
          continue;
        }

        // Check if there is an existing design for this design number
        const designCode = generateDesignCode(session.createdAt, parsed.designNumber);
        const matchingExistingDesign = existingDesigns.find(d => d.code === designCode);
        
        validCount++;
        logs.push({
          id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          sessionId,
          fileName: file.name,
          status: 'valid',
          reason: `Hợp lệ: Mã số ${parsed.designNumber}, Màu ${parsed.color}, Mặt ${parsed.view === 'f' ? 'Trước' : 'Sau'}.`,
          createdAt: nowStr
        });

        const tempVariant = {
          id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          color: parsed.color,
          view: parsed.view,
          imageUrl: file.dataUrl,
          originalFileName: file.name,
          sortOrder: 0
        };

        if (matchingExistingDesign) {
          // Add variant directly to existing design
          const variantId = `${matchingExistingDesign.id}_${parsed.color}_${parsed.view}`;
          newVariants.push({
            ...tempVariant,
            id: variantId,
            designId: matchingExistingDesign.id,
            sortOrder: existingVariants.filter(v => v.designId === matchingExistingDesign.id).length + newVariants.length
          });
        } else {
          // Queue for creating a new design
          if (!pendingDesignsMap[parsed.designNumber]) {
            pendingDesignsMap[parsed.designNumber] = {
              name: `Mẫu thiết kế số ${parsed.designNumber}`,
              variants: []
            };
          }
          pendingDesignsMap[parsed.designNumber].variants.push(tempVariant);
        }
      }

      // 2. Create new designs and variants
      const createdDesigns: Design[] = [];
      const createdVariants: Variant[] = [];

      for (const designNumber of Object.keys(pendingDesignsMap)) {
        const designCode = generateDesignCode(session.createdAt, designNumber);
        const designId = `${sessionId}_design_${designNumber}`;
        const data = pendingDesignsMap[designNumber];

        const newDesign: Design = {
          id: designId,
          sessionId,
          code: designCode,
          name: data.name,
          coverImageUrl: '', // Filled below
          status: 'pending',
          sortOrder: existingDesigns.length + createdDesigns.length,
          createdAt: new Date().toISOString()
        };

        // Create variants
        data.variants.forEach((v, index) => {
          const varId = `${designId}_${v.color}_${v.view}`;
          const variant: Variant = {
            ...v,
            id: varId,
            designId,
            sortOrder: index
          };
          createdVariants.push(variant);
        });

        // Pick cover image (prefer front view)
        const frontVariant = createdVariants.find(v => v.designId === designId && v.view === 'f');
        newDesign.coverImageUrl = frontVariant ? frontVariant.imageUrl : (createdVariants.find(v => v.designId === designId)?.imageUrl || '');

        createdDesigns.push(newDesign);
      }

      // Save everything
      if (createdDesigns.length > 0) {
        await dbService.saveDesigns(createdDesigns);
      }
      if (createdVariants.length > 0 || newVariants.length > 0) {
        await dbService.saveVariants([...createdVariants, ...newVariants]);
      }
      if (logs.length > 0) {
        await dbService.saveImportLogs(logs);
      }

      // Update cover images for existing designs that might have received new images if they had none
      const designsToUpdate = [...existingDesigns];
      for (const d of designsToUpdate) {
        if (!d.coverImageUrl) {
          const allDesignVariants = await dbService.listVariants(d.id);
          const firstFront = allDesignVariants.find(v => v.view === 'f');
          if (firstFront) {
            d.coverImageUrl = firstFront.imageUrl;
            await dbService.saveDesign(d);
          } else if (allDesignVariants.length > 0) {
            d.coverImageUrl = allDesignVariants[0].imageUrl;
            await dbService.saveDesign(d);
          }
        }
      }

      // Reload
      await loadSessionDetails(sessionId);
      await refreshSessions();

      return { validCount, skippedCount };
    } catch (e) {
      console.error(e);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const updateDesign = async (design: Design) => {
    await dbService.saveDesign(design);
    if (activeSession) {
      await loadSessionDetails(activeSession.id);
    }
  };

  const deleteDesign = async (designId: string) => {
    await dbService.deleteDesign(designId);
    if (activeSession) {
      await loadSessionDetails(activeSession.id);
    }
  };

  const deleteVariant = async (variantId: string) => {
    // Find variant from current loaded state
    const target = variants.find(v => v.id === variantId);
    
    await dbService.deleteVariant(variantId);
    
    if (target && activeSession) {
      // If we deleted the variant, check if we need to update the cover image of the design
      const siblings = await dbService.listVariants(target.designId);
      const design = (await dbService.listDesigns(activeSession.id)).find(d => d.id === target.designId);
      
      if (design) {
        if (siblings.length === 0) {
          // If no variants left, delete the design entirely
          await dbService.deleteDesign(target.designId);
        } else {
          // If cover image was deleted, change to another one
          const coverStillExists = siblings.some(s => s.imageUrl === design.coverImageUrl);
          if (!coverStillExists) {
            const front = siblings.find(s => s.view === 'f') || siblings[0];
            design.coverImageUrl = front.imageUrl;
            await dbService.saveDesign(design);
          }
        }
      }
      
      await loadSessionDetails(activeSession.id);
    } else if (activeSession) {
      await loadSessionDetails(activeSession.id);
    }
  };

  const mergeDesigns = async (sourceDesignId: string, targetDesignId: string) => {
    // Merge source design variants into target design
    const sourceVariants = await dbService.listVariants(sourceDesignId);
    const targetVariants = await dbService.listVariants(targetDesignId);

    const updatedVariants = sourceVariants.map((sv, idx) => {
      // Avoid key conflicts by regenerating variant id
      return {
        ...sv,
        id: `${targetDesignId}_${sv.color}_${sv.view}_merged_${Date.now()}_${idx}`,
        designId: targetDesignId,
        sortOrder: targetVariants.length + idx
      };
    });

    // Save updated variants
    await dbService.saveVariants(updatedVariants);

    // Delete source design & its original variants from DB
    await dbService.deleteDesign(sourceDesignId);

    if (activeSession) {
      await loadSessionDetails(activeSession.id);
    }
  };

  const splitDesign = async (designId: string, variantIdsToMove: string[], newDesignNumber: string, newName: string) => {
    if (!activeSession) return;
    
    const activeVariants = await dbService.listVariants(designId);
    const variantsToMove = activeVariants.filter(v => variantIdsToMove.includes(v.id));
    
    if (variantsToMove.length === 0) return;

    // Create a new design record
    const designCode = generateDesignCode(activeSession.createdAt, newDesignNumber);
    const newDesignId = `${activeSession.id}_design_${newDesignNumber}_split_${Date.now()}`;
    const allDesigns = await dbService.listDesigns(activeSession.id);

    const newDesign: Design = {
      id: newDesignId,
      sessionId: activeSession.id,
      code: designCode,
      name: newName || `Mẫu tách từ ${newDesignNumber}`,
      coverImageUrl: '',
      status: 'pending',
      sortOrder: allDesigns.length,
      createdAt: new Date().toISOString()
    };

    // Update variants to point to the new design
    const updatedVariants = variantsToMove.map((v, index) => {
      return {
        ...v,
        id: `${newDesignId}_${v.color}_${v.view}`,
        designId: newDesignId,
        sortOrder: index
      };
    });

    newDesign.coverImageUrl = updatedVariants.find(v => v.view === 'f')?.imageUrl || updatedVariants[0]?.imageUrl || '';

    // Save new design and update variants
    await dbService.saveDesign(newDesign);
    await dbService.saveVariants(updatedVariants);

    // Remove the old variants from the database
    for (const v of variantsToMove) {
      await dbService.deleteVariant(v.id);
    }

    // Check if the original design has any variants left
    const remainingVariants = activeVariants.filter(v => !variantIdsToMove.includes(v.id));
    if (remainingVariants.length === 0) {
      await dbService.deleteDesign(designId);
    } else {
      // Re-verify cover image for original design
      const originalDesign = allDesigns.find(d => d.id === designId);
      if (originalDesign) {
        const coverStillExists = remainingVariants.some(s => s.imageUrl === originalDesign.coverImageUrl);
        if (!coverStillExists) {
          originalDesign.coverImageUrl = remainingVariants.find(s => s.view === 'f')?.imageUrl || remainingVariants[0].imageUrl;
          await dbService.saveDesign(originalDesign);
        }
      }
    }

    await loadSessionDetails(activeSession.id);
  };

  const resetDatabase = async () => {
    setLoading(true);
    // FIXED: Clear active session state first to prevent stale data after reset
    setActiveSession(null);
    setDesigns([]);
    setVariants([]);
    setVotes([]);
    setImportLogs([]);
    await dbService.resetDatabase();
    await refreshSessions();
    setLoading(false);
  };


  return (
    <DbContext.Provider value={{
      sessions,
      activeSession,
      designs,
      variants,
      votes,
      importLogs,
      loading,
      refreshSessions,
      loadSessionDetails,
      createSession,
      updateSessionStatus,
      submitVote,
      importFiles,
      updateDesign,
      deleteDesign,
      deleteVariant,
      mergeDesigns,
      splitDesign,
      resetDatabase
    }}>
      {children}
    </DbContext.Provider>
  );
};

export const useDb = () => {
  const context = useContext(DbContext);
  if (!context) {
    throw new Error('useDb must be used within a DbProvider');
  }
  return context;
};
