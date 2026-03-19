import React from 'react';
import { useApp } from '../../context/AppContext';
import { pdfToSlides } from '../../utils/pdfProcess';
import { exportSlidesToPptx } from '../../utils/pptxExport';
import { exportSlidesToPdf } from '../../utils/pdfExport';
import {
  FileType,
  FileDown,
  Merge,
} from 'lucide-react';

export function MergeAndExport() {
  const {
    uploadedFiles,
    slides,
    displayedSlides,
    setSlides,
    setStatus,
    setProgress,
    setError,
    addLog,
    status,
    progress,
    maskSettings,
    setCurrentSlideIdx,
    setVersionHistory,
  } = useApp();

  const runConvert = async () => {
    if (uploadedFiles.length === 0) {
      setError('먼저 PDF 파일을 추가해 주세요.');
      return;
    }
    try {
      setStatus('processing');
      setProgress(0);
      addLog('다중 PDF 변환 시작 (순서대로 병합)...');
      const allSlides = [];
      const totalFiles = uploadedFiles.length;
      let doneFiles = 0;
      for (const entry of uploadedFiles) {
        const slideList = await pdfToSlides(
          entry.file,
          maskSettings,
          (p) => setProgress(Math.round((doneFiles / totalFiles) * 100 + (p / totalFiles)))
        );
        slideList.forEach((s) => {
          allSlides.push({ ...s, sourceFileId: entry.id });
        });
        doneFiles += 1;
      }
      setSlides(allSlides);
      setVersionHistory([
        {
          version: 'V1.0',
          slides: JSON.parse(JSON.stringify(allSlides)),
          timestamp: new Date().toLocaleTimeString(),
          memo: '초기 변환',
        },
      ]);
      setCurrentSlideIdx(0);
      setStatus('preview');
      setProgress(100);
      addLog(`병합 완료: 총 ${allSlides.length}장 슬라이드`);
    } catch (err) {
      setError('PDF 처리 실패: ' + err.message);
      setStatus('error');
      addLog('오류: ' + err.message);
    }
  };

  const handleExportPptx = async () => {
    if (displayedSlides.length === 0) {
      addLog('저장할 슬라이드가 없습니다.');
      return;
    }
    try {
      setStatus('processing');
      addLog('PPTX 생성 중...');
      await exportSlidesToPptx(displayedSlides, `Slide_Master_${Date.now()}.pptx`);
      setStatus('preview');
      addLog('PPTX 다운로드 완료.');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  const handleExportPdf = async () => {
    if (displayedSlides.length === 0) {
      addLog('저장할 슬라이드가 없습니다.');
      return;
    }
    try {
      setStatus('processing');
      addLog(`올려진 슬라이드 ${displayedSlides.length}개를 하나의 PDF로 묶는 중...`);
      await exportSlidesToPdf(displayedSlides, `Slide_Export_${Date.now()}.pdf`);
      setStatus('preview');
      addLog(`PDF 다운로드 완료. (${displayedSlides.length}페이지 순서대로 저장)`);
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  if (status === 'processing') {
    return (
      <div className="lg:col-span-12 flex flex-col items-center justify-center h-full min-h-[200px]">
        <div className="relative w-40 h-40 mb-6">
          <div className="absolute inset-0 border-8 border-slate-200 rounded-full" />
          <div className="absolute inset-0 border-8 border-indigo-600 rounded-full border-t-transparent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center font-black text-2xl text-indigo-600">
            {progress}%
          </div>
        </div>
        <p className="text-lg font-black text-slate-700">처리 중...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={runConvert}
        disabled={uploadedFiles.length === 0}
        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Merge size={18} />
        순서대로 변환 후 병합
      </button>
      <button
        type="button"
        onClick={handleExportPptx}
        disabled={displayedSlides.length === 0}
        className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
        title="현재 슬라이드 순서대로 PPTX로 저장"
      >
        <FileType size={18} />
        PPTX 저장
      </button>
      <button
        type="button"
        onClick={handleExportPdf}
        disabled={displayedSlides.length === 0}
        title="올려진 슬라이드를 순서대로 하나의 PDF 파일로 저장"
        className="flex items-center gap-2 bg-slate-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-700 disabled:opacity-50"
      >
        <FileDown size={18} />
        PDF 저장
      </button>
    </div>
  );
}
