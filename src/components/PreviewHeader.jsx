import React, { useRef } from 'react';
import {
  Save,
  FolderOpen,
  Upload,
  Download,
  Play,
  History,
  FileType,
  FileDown,
  X,
  Plus,
  Smartphone,
  FileArchive,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { usePTI } from '../hooks/usePTI';
import { useEditorActions } from '../hooks/useEditorActions';
import { useConvert } from '../hooks/useConvert';
import { MergeAndExport } from '../features/merge/MergeAndExport';
import { exportSlidesToPptx } from '../utils/pptxExport';
import { exportSlidesToPdf } from '../utils/pdfExport';
import { exportSlidesToVerticalImage } from '../utils/verticalImageExport';
import { exportSlidesToZipImage } from '../utils/zipImageExport';

export function PreviewHeader() {
  const fileInputRef = useRef(null);
  const {
    status,
    projectName,
    setProjectName,
    setStatus,
    setSlides,
    setUploadedFiles,
    setSourceOrder,
    setSelectedSourceIds,
    slides,
    displayedSlides,
    addLog,
    setError,
    currentSlideIdx,
    setSlideshowSlideIdx,
    setIsSlideshowActive,
  } = useApp();
  const { addAndConvertFile } = useConvert();
  const {
    savePTIToIndexedDB,
    openLoadModal,
    loadPTIFromIndexedDB,
    loadPTIFromFile,
    exportPTIFile,
  } = usePTI();
  const { saveVersion } = useEditorActions();

  const handleExportPptx = () => {
    if (displayedSlides.length === 0) {
      addLog('저장할 슬라이드가 없습니다.');
      return;
    }
    addLog('PPTX 생성 중... (백그라운드)');
    exportSlidesToPptx(displayedSlides, `Slide_Master_${Date.now()}.pptx`)
      .then(() => addLog('PPTX 다운로드 완료.'))
      .catch((err) => addLog(`PPTX 오류: ${err.message}`));
  };

  const handleExportPdf = async () => {
    if (displayedSlides.length === 0) {
      addLog('저장할 슬라이드가 없습니다.');
      return;
    }
    try {
      setStatus('processing');
      addLog('PDF 생성 중...');
      await exportSlidesToPdf(displayedSlides, `Slide_Export_${Date.now()}.pdf`);
      setStatus('preview');
      addLog('PDF 다운로드 완료.');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  const startSlideshow = () => {
    if (!displayedSlides.length) return;
    setSlideshowSlideIdx(currentSlideIdx);
    setIsSlideshowActive(true);
  };

  const handleExportVerticalImage = async () => {
    if (displayedSlides.length === 0) {
      addLog('저장할 슬라이드가 없습니다.');
      return;
    }
    try {
      setStatus('processing');
      addLog('세로 이미지 생성 중...');
      await exportSlidesToVerticalImage(displayedSlides, `Vertical_Image_${Date.now()}.png`);
      setStatus('preview');
      addLog('세로 이미지 다운로드 완료.');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  const handleExportZipImage = async () => {
    if (displayedSlides.length === 0) {
      addLog('저장할 슬라이드가 없습니다.');
      return;
    }
    try {
      setStatus('processing');
      addLog('ZIP 이미지 생성 중...');
      await exportSlidesToZipImage(displayedSlides, `Images_${Date.now()}`);
      setStatus('preview');
      addLog('ZIP 이미지 다운로드 완료.');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  const reset = () => {
    setUploadedFiles([]);
    setStatus('idle');
    setSlides([]);
    setSourceOrder([]);
    setSelectedSourceIds(new Set());
  };

  const handleAddFiles = () => {
    fileInputRef.current?.click();
  };

  if (status !== 'preview') return null;

  return (
    <div className="flex gap-2 flex-wrap items-center justify-end">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = e.target?.files;
          if (files?.length) {
            addAndConvertFile(files);
          }
          e.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={handleAddFiles}
        className="flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-700"
      >
        <Plus size={12} /> 파일추가
      </button>
      <input
        type="text"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        placeholder="이름.his"
        className="w-24 px-2 py-1 rounded border border-slate-200 text-xs"
      />
      <button
        type="button"
        onClick={savePTIToIndexedDB}
        className="flex items-center gap-1 bg-violet-600 text-white px-2 py-1 rounded-lg text-xs font-bold"
      >
        <Save size={12} /> hisSave
      </button>
      <button
        type="button"
        onClick={openLoadModal}
        className="flex items-center gap-1 bg-violet-500 text-white px-2 py-1 rounded-lg text-xs font-bold"
      >
        <FolderOpen size={12} /> hisOpen
      </button>
      <label className="flex items-center gap-1 bg-slate-600 text-white px-2 py-1 rounded-lg text-xs font-bold cursor-pointer">
        <Upload size={12} /> hisOpen
        <input
          type="file"
          accept=".his,.pti,application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target?.files?.[0];
            if (f) loadPTIFromFile(f);
            e.target.value = '';
          }}
        />
      </label>
      <button
        type="button"
        onClick={exportPTIFile}
        className="flex items-center gap-1 bg-slate-500 text-white px-2 py-1 rounded-lg text-xs font-bold"
      >
        <Download size={12} /> hisExport
      </button>
      <button
        type="button"
        onClick={startSlideshow}
        className="flex items-center gap-1 bg-rose-500 text-white px-2 py-1 rounded-lg text-xs font-bold"
      >
        <Play size={12} /> 슬라이드쇼
      </button>
      <button
        type="button"
        onClick={() => saveVersion(displayedSlides, '수동 저장')}
        className="hidden flex items-center gap-1 bg-slate-800 text-white px-2 py-1 rounded-lg text-xs font-bold"
      >
        <History size={12} /> 버전 저장
      </button>
      <button
        type="button"
        onClick={handleExportVerticalImage}
        className="flex items-center gap-1 bg-orange-500 text-white px-2 py-1 rounded-lg text-xs font-bold hover:bg-orange-600"
      >
        <Smartphone size={12} /> 세로이미지제작
      </button>
      <button
        type="button"
        onClick={handleExportZipImage}
        className="flex items-center gap-1 bg-amber-600 text-white px-2 py-1 rounded-lg text-xs font-bold hover:bg-amber-700"
      >
        <FileArchive size={12} /> ZIP이미지
      </button>
      <button
        type="button"
        onClick={handleExportPptx}
        className="flex items-center gap-1 bg-indigo-600 text-white px-2 py-1 rounded-lg text-xs font-bold"
      >
        <FileType size={12} /> PPTX
      </button>
      <button
        type="button"
        onClick={handleExportPdf}
        className="flex items-center gap-1 bg-emerald-600 text-white px-2 py-1 rounded-lg text-xs font-bold"
      >
        <FileDown size={12} /> PDF
      </button>
      <button
        type="button"
        onClick={reset}
        className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg"
      >
        <X size={14} />
      </button>
    </div>
  );
}
