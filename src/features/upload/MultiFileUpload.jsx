import React, { useCallback } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FileListWithOrder } from './FileListWithOrder';

export function MultiFileUpload({ onDrop: externalOnDrop, onConvert }) {
  const {
    uploadedFiles,
    setUploadedFiles,
    status,
    setStatus,
    setError,
    addLog,
    isDragging,
    setIsDragging,
  } = useApp();

  const handleFiles = useCallback(
    (files) => {
      if (!files?.length) return;
      const pdfs = Array.from(files).filter((f) => f.type === 'application/pdf');
      if (pdfs.length === 0) {
        setError('PDF 파일만 업로드 가능합니다.');
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
      addLog(`파일 ${newEntries.length}개 추가: ${newEntries.map((e) => e.name).join(', ')}`);
    },
    [setUploadedFiles, setStatus, setError, addLog]
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      if (externalOnDrop) externalOnDrop(e.dataTransfer.files);
      else handleFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (id) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearAll = () => {
    setUploadedFiles([]);
    setStatus('idle');
    setError(null);
    addLog('파일 목록 비움.');
  };

  return (
    <div className="lg:col-span-12 flex items-center justify-center h-full overflow-auto">
      <div
        className={`max-w-2xl w-full p-8 sm:p-12 bg-white border-4 border-dashed rounded-3xl text-center transition-all ${
          isDragging ? 'border-indigo-500 bg-indigo-50 scale-[1.02]' : 'border-slate-200 hover:border-indigo-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload
          size={56}
          className={`mx-auto mb-4 transition-colors ${
            isDragging ? 'text-indigo-600 animate-bounce' : 'text-slate-300'
          }`}
        />
        <h2 className="text-xl font-black text-slate-700">PDF 파일을 여러 개 올려주세요</h2>
        <p className="text-slate-400 mt-1 font-medium text-sm">
          드래그 앤 드롭 또는 아래 버튼으로 선택 (순서는 아래에서 변경 가능)
        </p>
        <label className="mt-4 inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 cursor-pointer">
          <FileText size={18} />
          PDF 파일 선택 (다중 선택 가능)
          <input
            type="file"
            className="hidden"
            accept=".pdf,.his,.pti,application/pdf,application/json"
            multiple
            onChange={(e) => {
              const files = e.target.files;
              if (files?.length) {
                if (externalOnDrop) externalOnDrop(files);
                else handleFiles(files);
              }
              e.target.value = '';
            }}
          />
        </label>

        {uploadedFiles.length > 0 && (
          <div className="mt-8 text-left">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-slate-600">
                업로드된 파일 ({uploadedFiles.length}개) — 순서대로 병합됩니다
              </span>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs font-bold text-red-500 hover:text-red-600"
              >
                전체 삭제
              </button>
            </div>
            <FileListWithOrder onRemove={removeFile} />
            {onConvert && uploadedFiles.length > 0 && (
              <button
                type="button"
                onClick={onConvert}
                className="mt-4 w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-xl text-sm font-bold hover:bg-indigo-700"
              >
                순서대로 변환 후 병합
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
