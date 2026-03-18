import { useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { pdfToSlides } from '../utils/pdfProcess';

export function useConvert() {
  const {
    uploadedFiles,
    setUploadedFiles,
    setSlides,
    setStatus,
    setProgress,
    setError,
    addLog,
    maskSettings,
    setCurrentSlideIdx,
    setVersionHistory,
    setSourceOrder,
    setSelectedSourceIds,
  } = useApp();

  const runConvert = useCallback(async () => {
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
          (p) => setProgress(Math.round((doneFiles / totalFiles) * 100 + p / totalFiles))
        );
        slideList.forEach((s) => allSlides.push({ ...s, sourceFileId: entry.id }));
        doneFiles += 1;
      }
      setSlides(allSlides);
      setSourceOrder(uploadedFiles.map((f) => f.id));
      setSelectedSourceIds(new Set(uploadedFiles.map((f) => f.id)));
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
  }, [
    uploadedFiles,
    maskSettings,
    setSlides,
    setStatus,
    setProgress,
    setError,
    addLog,
    setCurrentSlideIdx,
    setVersionHistory,
    setSourceOrder,
    setSelectedSourceIds,
  ]);

  const addAndConvertFile = useCallback(
    async (files) => {
      if (!files?.length) return;
      const pdfs = Array.from(files).filter((f) => f.type === 'application/pdf');
      if (pdfs.length === 0) {
        setError('PDF 파일만 추가할 수 있습니다.');
        return;
      }
      const newEntries = pdfs.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        name: file.name,
      }));
      setUploadedFiles((prev) => [...prev, ...newEntries]);
      setSourceOrder((prev) => [...prev, ...newEntries.map((e) => e.id)]);
      setSelectedSourceIds((prev) => {
        const next = new Set(prev);
        newEntries.forEach((e) => next.add(e.id));
        return next;
      });
      try {
        setStatus('processing');
        addLog(`새 파일 ${newEntries.length}개 변환 중...`);
        for (const entry of newEntries) {
          const slideList = await pdfToSlides(entry.file, maskSettings);
          setSlides((prev) => [
            ...prev,
            ...slideList.map((s) => ({ ...s, sourceFileId: entry.id })),
          ]);
        }
        setStatus('preview');
        addLog(`파일 ${newEntries.length}개 추가 완료`);
      } catch (err) {
        setError('PDF 처리 실패: ' + err.message);
        setStatus('error');
        setUploadedFiles((prev) => prev.filter((f) => !newEntries.some((e) => e.id === f.id)));
        setSourceOrder((prev) => prev.filter((id) => !newEntries.some((e) => e.id === id)));
      }
    },
    [
      setUploadedFiles,
      setSlides,
      setStatus,
      setError,
      addLog,
      setSourceOrder,
      setSelectedSourceIds,
      maskSettings,
    ]
  );

  return { runConvert, addAndConvertFile };
}
