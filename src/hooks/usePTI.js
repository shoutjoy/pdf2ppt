import { useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
  saveProjectToIndexedDB,
  listProjectsFromIndexedDB,
  loadProjectFromIndexedDB,
  serializePTI,
  parsePTI,
} from '../ptiStorage';

export function usePTI() {
  const {
    slides,
    setSlides,
    currentSlideIdx,
    setCurrentSlideIdx,
    slideOrientation,
    viewMode,
    setSlideOrientation,
    setViewMode,
    setStatus,
    setError,
    setVersionHistory,
    setProjectName,
    projectName,
    setShowLoadModal,
    setSavedProjectsList,
    setSourceOrder,
    setSelectedSourceIds,
    addLog,
  } = useApp();

  const getPTIData = useCallback(
    () => ({
      slides: JSON.parse(JSON.stringify(slides)),
      currentSlideIdx,
      slideOrientation,
      viewMode,
    }),
    [slides, currentSlideIdx, slideOrientation, viewMode]
  );

  const loadPTIFromFile = useCallback(
    (file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = parsePTI(reader.result);
          if (!data?.slides || !Array.isArray(data.slides)) {
            setError('올바른 PTI 파일이 아닙니다.');
            setStatus('error');
            return;
          }
          setSlides(data.slides);
          if (typeof data.currentSlideIdx === 'number')
            setCurrentSlideIdx(Math.min(data.currentSlideIdx, data.slides.length - 1));
          if (data.slideOrientation) setSlideOrientation(data.slideOrientation);
          if (data.viewMode) setViewMode(data.viewMode);
          setProjectName(file.name);
          setStatus('preview');
          setVersionHistory([]);
          setSourceOrder([]);
          setSelectedSourceIds(new Set());
          setError(null);
          addLog(`PTI 불러옴: ${file.name}`);
        } catch (err) {
          setError(err.message);
          setStatus('error');
        }
      };
      reader.readAsText(file);
    },
    [
      setSlides,
      setCurrentSlideIdx,
      setSlideOrientation,
      setViewMode,
      setProjectName,
      setStatus,
      setError,
      setVersionHistory,
      setSourceOrder,
      setSelectedSourceIds,
      addLog,
    ]
  );

  const openLoadModal = useCallback(async () => {
    try {
      const list = await listProjectsFromIndexedDB();
      setSavedProjectsList(list);
      setShowLoadModal(true);
    } catch (err) {
      addLog('목록 불러오기 실패: ' + err.message);
    }
  }, [setSavedProjectsList, setShowLoadModal, addLog]);

  const loadPTIFromIndexedDB = useCallback(
    async (id) => {
      try {
        const data = await loadProjectFromIndexedDB(id);
        if (!data?.slides || !Array.isArray(data.slides)) {
          addLog('올바른 PTI 데이터가 아닙니다.');
          return;
        }
        setSlides(data.slides);
        if (typeof data.currentSlideIdx === 'number')
          setCurrentSlideIdx(Math.min(data.currentSlideIdx, data.slides.length - 1));
        if (data.slideOrientation) setSlideOrientation(data.slideOrientation);
        if (data.viewMode) setViewMode(data.viewMode);
        setProjectName(id);
        setStatus('preview');
        setShowLoadModal(false);
        setVersionHistory([]);
        setSourceOrder([]);
        setSelectedSourceIds(new Set());
        addLog(`불러옴: ${id}`);
      } catch (err) {
        addLog('불러오기 실패: ' + err.message);
      }
    },
    [
      setSlides,
      setCurrentSlideIdx,
      setSlideOrientation,
      setViewMode,
      setProjectName,
      setStatus,
      setShowLoadModal,
      setVersionHistory,
      setSourceOrder,
      setSelectedSourceIds,
      addLog,
    ]
  );

  const savePTIToIndexedDB = useCallback(async () => {
    if (!slides.length) {
      addLog('저장할 슬라이드가 없습니다.');
      return;
    }
    const name = projectName.trim() || window.prompt('저장할 프로젝트 이름 (.his)', `Project_${Date.now()}.his`);
    if (!name) return;
    const finalName = /\.(his|pti)$/i.test(name) ? name : `${name}.his`;
    try {
      await saveProjectToIndexedDB(finalName, getPTIData());
      setProjectName(finalName);
      addLog(`HIS 저장됨: ${finalName}`);
    } catch (err) {
      setError('저장 실패: ' + err.message);
      setStatus('error');
    }
  }, [slides.length, projectName, getPTIData, setProjectName, setError, setStatus, addLog]);

  const exportPTIFile = useCallback(() => {
    if (!slides.length) {
      addLog('내보낼 슬라이드가 없습니다.');
      return;
    }
    const json = serializePTI(getPTIData());
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = projectName || `Project_${Date.now()}.his`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
    addLog('HIS 파일로 내보냈습니다.');
  }, [slides.length, projectName, getPTIData, addLog]);

  return {
    getPTIData,
    loadPTIFromFile,
    openLoadModal,
    loadPTIFromIndexedDB,
    savePTIToIndexedDB,
    exportPTIFile,
  };
}
