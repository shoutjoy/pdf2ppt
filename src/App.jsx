import React, { useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Layout, X, AlertCircle } from 'lucide-react';
import { APP_VERSION } from './constants';
import { AppProvider, useApp } from './context/AppContext';
import { useLibraryScripts } from './hooks/useLibraryScripts';
import { useConvert } from './hooks/useConvert';
import { usePTI } from './hooks/usePTI';
import { MultiFileUpload } from './features/upload/MultiFileUpload';
import { PreviewHeader } from './components/PreviewHeader';
import { EditorView } from './features/editor';

function IdleView() {
  const { runConvert } = useConvert();
  const { loadPTIFromFile } = usePTI();
  const { setUploadedFiles, setStatus, setError, addLog } = useApp();

  const handleOpenFiles = useCallback(
    (files) => {
      if (!files?.length) return;
      const list = Array.from(files);
      const hisFile = list.find(
        (f) =>
          (f.name || '').toLowerCase().endsWith('.his') ||
          (f.name || '').toLowerCase().endsWith('.pti') ||
          f.type === 'application/json'
      );
      if (hisFile) {
        loadPTIFromFile(hisFile);
        return;
      }
      const pdfs = list.filter((f) => f.type === 'application/pdf');
      if (pdfs.length === 0) {
        setError('PDF 또는 HIS 파일을 선택해 주세요.');
        return;
      }
      const newEntries = pdfs.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        name: file.name,
      }));
      setUploadedFiles((prev) => [...prev, ...newEntries]);
      setStatus('idle');
      setError(null);
      addLog(`파일 ${newEntries.length}개 추가`);
    },
    [loadPTIFromFile, setUploadedFiles, setStatus, setError, addLog]
  );

  return <MultiFileUpload onDrop={handleOpenFiles} onConvert={runConvert} />;
}

function AppContent() {
  const {
    status,
    progress,
    error,
    setStatus,
    setError,
    setSlides,
    showLoadModal,
    setShowLoadModal,
    savedProjectsList,
    slides,
    displayedSlides,
    isSlideshowActive,
    setIsSlideshowActive,
    slideshowSlideIdx,
    setSlideshowSlideIdx,
  } = useApp();
  const { loadPTIFromIndexedDB } = usePTI();
  useLibraryScripts();

  return (
    <div className="min-h-screen bg-slate-100 p-2 sm:p-4 md:p-6 font-sans text-slate-900 select-none flex flex-col overflow-x-hidden">
      <header className="mb-2 sm:mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 bg-white p-2 rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 shrink-0">
        <div className="flex items-center gap-1 min-w-0">
          <div className="bg-indigo-600 p-1 rounded-lg text-white flex items-center justify-center flex-shrink-0">
            <Layout size={12} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-black tracking-tight text-slate-800 truncate">
              PDF to PPT Master <span className="text-indigo-600">{APP_VERSION}</span>
            </h1>
            <p className="text-[7px] sm:text-[8px] text-slate-400 font-bold uppercase tracking-widest hidden sm:block">
              다중 PDF · 순서 변경 · 병합 PPTX: 연세대학교 인지공학 연구실 박중희 박사 shoutjoy1@yonsei.ac.kr
            </p>
          </div>
        </div>
        {status === 'idle' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">PDF를 올린 뒤 아래에서 순서를 바꾸고 변환하세요</span>
          </div>
        )}
        {status === 'preview' && <PreviewHeader />}
      </header>

      {/* PTI 불러오기 모달 */}
      {showLoadModal && (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowLoadModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full max-h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-black text-slate-800">저장된 HIS 불러오기</h2>
              <button
                onClick={() => setShowLoadModal(false)}
                className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {savedProjectsList.length === 0 ? (
                <p className="text-slate-500 text-sm">저장된 프로젝트가 없습니다.</p>
              ) : (
                savedProjectsList.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => loadPTIFromIndexedDB(p.id)}
                    className="w-full p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-left transition-all"
                  >
                    <p className="font-bold text-slate-800 truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {p.savedAt ? new Date(p.savedAt).toLocaleString() : ''}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 슬라이드쇼 - Portal로 body에 렌더링하여 overflow 영향 제거 */}
      {isSlideshowActive &&
        displayedSlides.length > 0 &&
        createPortal(
          <div
            className="fixed inset-0 z-[1200] bg-black flex items-center justify-center"
            onClick={() => setSlideshowSlideIdx((i) => (i < displayedSlides.length - 1 ? i + 1 : i))}
          >
            <div className="absolute inset-4 flex items-center justify-center">
              <div
                className="relative bg-slate-900 shrink-0"
                style={{
                  width: '100%',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  aspectRatio: `${displayedSlides[slideshowSlideIdx]?.width || 1000}/${displayedSlides[slideshowSlideIdx]?.height || 562.5}`,
                }}
              >
                <div
                  className="absolute inset-0 bg-contain bg-center bg-no-repeat"
                  style={{
                    backgroundImage: displayedSlides[slideshowSlideIdx]?.baseImage
                      ? `url(${displayedSlides[slideshowSlideIdx].baseImage})`
                      : undefined,
                  }}
                />
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSlideshowSlideIdx((i) => (i > 0 ? i - 1 : i));
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/20 hover:bg-white/40 text-white z-10"
            >
              ←
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSlideshowSlideIdx((i) => (i < displayedSlides.length - 1 ? i + 1 : i));
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/20 hover:bg-white/40 text-white z-10"
            >
              →
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/50 text-white text-sm font-bold z-10">
              {slideshowSlideIdx + 1} / {displayedSlides.length}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsSlideshowActive(false);
              }}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/40 text-white z-10"
            >
              <X size={24} />
            </button>
          </div>,
          document.body
        )}

      {status === 'idle' && <IdleView />}
      {status === 'processing' && (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[200px]">
          <div className="relative w-40 h-40 mb-6">
            <div className="absolute inset-0 border-8 border-slate-200 rounded-full" />
            <div className="absolute inset-0 border-8 border-indigo-600 rounded-full border-t-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center font-black text-2xl text-indigo-600">
              {progress}%
            </div>
          </div>
          <p className="text-lg font-black text-slate-700">처리 중...</p>
        </div>
      )}
      {status === 'preview' && <EditorView />}

      {status === 'error' && error && (
        <div className="fixed inset-0 bg-red-600/90 backdrop-blur-md flex items-center justify-center z-[1000] p-10">
          <div className="bg-white p-10 rounded-3xl text-center max-w-md shadow-2xl">
            <AlertCircle size={64} className="mx-auto text-red-500 mb-6" />
            <h2 className="text-2xl font-black mb-2 text-slate-800">오류가 발생했습니다</h2>
            <p className="text-slate-500 mb-8">{error}</p>
            <button
              onClick={() => {
                setStatus('idle');
                setError(null);
                setSlides([]);
              }}
              className="w-full bg-red-600 text-white py-4 rounded-2xl font-black"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
