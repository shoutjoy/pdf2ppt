import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { DEFAULT_MASK_SETTINGS } from '../constants';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [slides, setSlides] = useState([]);
  const [sourceOrder, setSourceOrder] = useState([]);
  const [selectedSourceIds, setSelectedSourceIds] = useState(new Set());
  const [isSourceSidebarCollapsed, setIsSourceSidebarCollapsed] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [selectedSlideIndices, setSelectedSlideIndices] = useState(new Set());
  const [maskSettings, setMaskSettings] = useState({ ...DEFAULT_MASK_SETTINGS });
  const [projectName, setProjectName] = useState('');
  const [viewMode, setViewMode] = useState('single');
  const [slideOrientation, setSlideOrientation] = useState('landscape');
  const [versionHistory, setVersionHistory] = useState([]);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [editorZoom, setEditorZoom] = useState(100);
  const [isDragging, setIsDragging] = useState(false);
  const [isSlideshowActive, setIsSlideshowActive] = useState(false);
  const [slideshowSlideIdx, setSlideshowSlideIdx] = useState(0);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [savedProjectsList, setSavedProjectsList] = useState([]);
  const [imageCropSrc, setImageCropSrc] = useState(null);
  const [cropSelection, setCropSelection] = useState({ x: 0, y: 0, w: 1, h: 1 });
  const [imageCropNatural, setImageCropNatural] = useState({ w: 0, h: 0 });
  /** 참고 이미지 업로드 → 크롭 완료 후 data URL (병합/내보내기 등에서 활용 가능) */
  const [referenceImageDataUrl, setReferenceImageDataUrl] = useState(null);

  const addLog = useCallback((message) => {
    const msgString =
      typeof message === 'object' ? JSON.stringify(message) : String(message);
    setLogs((prev) => [
      { time: new Date().toLocaleTimeString(), message: msgString },
      ...prev.slice(0, 49),
    ]);
  }, []);

  const toggleSlideSelection = useCallback((index) => {
    setSelectedSlideIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const clearSlideSelection = useCallback(() => {
    setSelectedSlideIndices(new Set());
  }, []);

  const toggleSourceSelection = useCallback((sourceId) => {
    setSelectedSourceIds((prev) => {
      const next = new Set(prev);
      if (next.has(sourceId)) next.delete(sourceId);
      else next.add(sourceId);
      return next;
    });
  }, []);

  const reorderDisplayedSlides = useCallback((reorderedSlides) => {
    setSlides((prev) => {
      const reorderedSet = new Set(reorderedSlides);
      const rest = prev.filter((s) => !reorderedSet.has(s));
      return [...reorderedSlides, ...rest];
    });
  }, []);

  const displayedSlides = useMemo(() => {
    if (sourceOrder.length === 0) return slides;
    const selectedOrder =
      selectedSourceIds.size > 0
        ? sourceOrder.filter((id) => selectedSourceIds.has(id))
        : sourceOrder;
    if (selectedOrder.length === 0) return slides;
    return selectedOrder.flatMap((sourceId) =>
      slides.filter((s) => (s.sourceFileId ?? '') === sourceId)
    );
  }, [slides, sourceOrder, selectedSourceIds]);

  const value = {
    uploadedFiles,
    setUploadedFiles,
    slides,
    setSlides,
    status,
    setStatus,
    error,
    setError,
    progress,
    setProgress,
    logs,
    addLog,
    currentSlideIdx,
    setCurrentSlideIdx,
    selectedSlideIndices,
    setSelectedSlideIndices,
    toggleSlideSelection,
    clearSlideSelection,
    maskSettings,
    setMaskSettings,
    projectName,
    setProjectName,
    viewMode,
    setViewMode,
    slideOrientation,
    setSlideOrientation,
    versionHistory,
    setVersionHistory,
    selectedElementId,
    setSelectedElementId,
    editorZoom,
    setEditorZoom,
    isDragging,
    setIsDragging,
    isSlideshowActive,
    setIsSlideshowActive,
    slideshowSlideIdx,
    setSlideshowSlideIdx,
    showLoadModal,
    setShowLoadModal,
    savedProjectsList,
    setSavedProjectsList,
    imageCropSrc,
    setImageCropSrc,
    cropSelection,
    setCropSelection,
    imageCropNatural,
    setImageCropNatural,
    referenceImageDataUrl,
    setReferenceImageDataUrl,
    sourceOrder,
    setSourceOrder,
    selectedSourceIds,
    setSelectedSourceIds,
    isSourceSidebarCollapsed,
    setIsSourceSidebarCollapsed,
    toggleSourceSelection,
    displayedSlides,
    reorderDisplayedSlides,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
