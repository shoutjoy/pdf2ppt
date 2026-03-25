import React, { useCallback, useRef, useState, useMemo } from 'react';
import { Image as ImageIcon, Crop } from 'lucide-react';
import { useApp } from '../src/context/AppContext';
import { useCrop } from './useCrop';
import CropModal from './CropModal';

const ACCEPT = 'image/jpeg,image/jpg,image/png,image/gif,image/webp';
const ACCEPT_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(new Error('read failed'));
    r.readAsDataURL(file);
  });
}

function isAllowedImage(file) {
  if (!file) return false;
  if (file.type && file.type.startsWith('image/')) {
    const ok = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type);
    if (ok) return true;
  }
  const name = (file.name || '').toLowerCase();
  const ext = name.split('.').pop();
  return ACCEPT_EXT.includes(ext);
}

/**
 * 이미지 업로드·붙여넣기 → 미리보기 후 Crop 버튼으로 크롭 모달 진입
 * @param {(dataUrl: string) => void} [onCropCommitted] — 크롭 커밋 직후 (슬라이드 삽입·모달 닫기 등)
 */
export function ReferenceImageUpload({ className = '', onCropCommitted }) {
  const { addLog, setReferenceImageDataUrl } = useApp();
  const inputRef = useRef(null);
  const cropSourceRef = useRef(null);
  const [cropModalSrc, setCropModalSrc] = useState(null);
  const [zoneDragging, setZoneDragging] = useState(false);
  /** 크롭 전, 불러온 원본(data URL) — Crop 버튼으로만 크롭 모달 오픈 */
  const [pendingImageSrc, setPendingImageSrc] = useState(null);

  const applyCropResult = useCallback(
    (_, dataUrl) => {
      addLog('참고 이미지 크롭이 저장되었습니다.');
      cropSourceRef.current = null;
      setCropModalSrc(null);
      setPendingImageSrc(null);
      setReferenceImageDataUrl(null);
      onCropCommitted?.(dataUrl);
    },
    [addLog, onCropCommitted, setReferenceImageDataUrl]
  );

  const cropOpts = useMemo(
    () => ({
      getSource: (target) => (target === 'ref' ? cropSourceRef.current : null),
      applyResult: applyCropResult,
    }),
    [applyCropResult]
  );

  const {
    isCropping,
    cropSelection,
    cropContainerRef,
    startCrop,
    handleCropMouseDown,
    executeCrop,
    onCancelCrop,
  } = useCrop(cropOpts);

  /** 새 파일 선택·붙여넣기 전에 이전 대기/크롭/참고 미리보기 정리 */
  const resetReferenceFlowForNewPick = useCallback(() => {
    cropSourceRef.current = null;
    setCropModalSrc(null);
    setPendingImageSrc(null);
    onCancelCrop();
    setReferenceImageDataUrl(null);
  }, [onCancelCrop, setReferenceImageDataUrl]);

  const openCrop = useCallback(
    (dataUrl) => {
      if (!dataUrl || !dataUrl.startsWith('data:image')) {
        addLog('이미지 데이터를 읽을 수 없습니다.');
        return;
      }
      cropSourceRef.current = dataUrl;
      setCropModalSrc(dataUrl);
      startCrop('ref');
    },
    [addLog, startCrop]
  );

  const handlePickFile = useCallback(
    async (fileList) => {
      const file = Array.from(fileList || []).find(isAllowedImage);
      if (!file) {
        addLog('JPG, PNG, GIF, WebP 이미지만 사용할 수 있습니다.');
        return;
      }
      try {
        resetReferenceFlowForNewPick();
        const url = await readFileAsDataUrl(file);
        if (!url.startsWith('data:image')) {
          addLog('이미지 데이터를 읽을 수 없습니다.');
          return;
        }
        setPendingImageSrc(url);
        addLog('이미지를 불러왔습니다. Crop으로 영역을 지정하세요.');
      } catch {
        addLog('이미지를 불러오지 못했습니다.');
      }
    },
    [addLog, resetReferenceFlowForNewPick]
  );

  const handleCropButtonClick = useCallback(() => {
    if (!pendingImageSrc) return;
    openCrop(pendingImageSrc);
  }, [pendingImageSrc, openCrop]);

  /** 크롭 모달 없이 원본 그대로 슬라이드에 반영 — 삽입 후 패널 상태 초기화 */
  const handleInsertWithoutCrop = useCallback(() => {
    if (!pendingImageSrc) return;
    const src = pendingImageSrc;
    addLog('크롭 없이 이미지를 삽입했습니다.');
    setPendingImageSrc(null);
    setReferenceImageDataUrl(null);
    cropSourceRef.current = null;
    setCropModalSrc(null);
    onCancelCrop();
    onCropCommitted?.(src);
  }, [pendingImageSrc, setReferenceImageDataUrl, addLog, onCropCommitted, onCancelCrop]);

  const handleCancelCrop = useCallback(() => {
    cropSourceRef.current = null;
    setCropModalSrc(null);
    onCancelCrop();
  }, [onCancelCrop]);

  const onPaste = useCallback(
    (e) => {
      const items = e.clipboardData?.items;
      if (!items?.length) return;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.kind === 'file' && it.type.startsWith('image/')) {
          const f = it.getAsFile();
          if (f && isAllowedImage(f)) {
            e.preventDefault();
            handlePickFile([f]);
            return;
          }
        }
      }
    },
    [handlePickFile]
  );

  return (
    <>
      <div
        className={`w-full max-w-3xl rounded-2xl border-2 border-dashed border-slate-600 bg-slate-950 p-4 sm:p-5 overflow-x-hidden ${className}`}
      >
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-stretch">
          {/* 왼쪽: 업로드 존 */}
          <div className="flex-1 min-w-0">
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setZoneDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setZoneDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setZoneDragging(false);
                handlePickFile(e.dataTransfer?.files);
              }}
              className={`h-full rounded-xl border-2 border-dashed p-4 flex flex-col items-center justify-center text-center transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-blue-500/50 ${
                zoneDragging
                  ? 'border-blue-400 bg-blue-950'
                  : 'border-blue-500/60 bg-slate-900 hover:border-blue-400/90'
              }`}
              onClick={() => inputRef.current?.click()}
            >
              <ImageIcon className="w-10 h-10 text-blue-400 mb-2" strokeWidth={1.5} />
              <p className="text-blue-400 font-black text-sm sm:text-base">이미지 업로드</p>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-1 font-medium">JPG, PNG, GIF, WebP</p>
              <p className="text-[10px] text-slate-600 mt-3 font-bold">드래그 앤 드롭</p>
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept={ACCEPT}
                onChange={(e) => {
                  handlePickFile(e.target.files);
                  e.target.value = '';
                }}
              />
            </div>
          </div>

          {/* 오른쪽: 붙여넣기 안내 */}
          <div
            tabIndex={0}
            onPaste={onPaste}
            className="flex-1 min-w-0 rounded-xl border border-slate-700 bg-slate-900 p-4 flex flex-col items-center justify-center text-center outline-none focus:ring-2 focus:ring-slate-500/50 cursor-default"
          >
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed font-medium">
              이 공간을 클릭한 뒤{' '}
              <kbd className="inline-flex items-center px-2 py-1 rounded-md bg-slate-800 border border-slate-600 text-slate-200 text-[10px] sm:text-xs font-mono font-bold shadow">
                Ctrl+V
              </kbd>
              로 이미지 붙여넣기
            </p>
            <p className="text-[10px] text-slate-600 mt-2">클립보드에 복사된 이미지를 붙여넣을 수 있습니다</p>
          </div>
        </div>

        {pendingImageSrc && (
          <div className="mt-4 rounded-xl border border-teal-800 bg-slate-900 p-4 flex flex-col gap-4 overflow-hidden">
            <p className="text-[10px] font-bold text-teal-400/90 uppercase tracking-wide">불러온 이미지</p>
            {/* 썸네일은 작게 고정 — 가로형·세로형 모두 Crop 영역이 잘리지 않도록 */}
            <div className="flex justify-center sm:justify-start">
              <div className="relative max-h-[140px] max-w-[200px] w-full sm:w-auto rounded-lg border border-slate-600 bg-neutral-950 overflow-hidden flex items-center justify-center">
                <img
                  src={pendingImageSrc}
                  alt="불러온 원본"
                  className="max-h-[140px] max-w-[200px] w-auto h-auto object-contain"
                  style={{ maxHeight: 140, maxWidth: 200 }}
                />
              </div>
            </div>
            <div className="flex flex-col gap-3 min-w-0 w-full">
              <p className="text-xs text-slate-400 leading-relaxed">
                영역을 조절하려면 <span className="text-slate-200 font-bold">Crop</span>을 누르세요.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCropButtonClick();
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-black text-white shadow-md hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-400/60 shrink-0"
                >
                  <Crop size={18} strokeWidth={2.5} />
                  Crop
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleInsertWithoutCrop();
                  }}
                  className="inline-flex items-center justify-center rounded-xl bg-fuchsia-600 px-5 py-2.5 text-sm font-black text-white shadow-md hover:bg-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/60 shrink-0"
                >
                  이미지 삽입
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPendingImageSrc(null);
                    addLog('불러온 이미지를 취소했습니다.');
                  }}
                  className="inline-flex items-center rounded-xl border border-slate-600 px-4 py-2 text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-slate-200 shrink-0"
                >
                  다른 이미지
                </button>
              </div>
            </div>
          </div>
        )}

        <ReferenceImagePreview />
      </div>

      <CropModal
        isOpen={isCropping}
        imageSrc={cropModalSrc}
        cropSelection={cropSelection}
        containerRef={cropContainerRef}
        onCropMouseDown={handleCropMouseDown}
        onCommit={executeCrop}
        onCancel={handleCancelCrop}
      />
    </>
  );
}

function ReferenceImagePreview() {
  const { referenceImageDataUrl, setReferenceImageDataUrl } = useApp();
  if (!referenceImageDataUrl) return null;
  return (
    <div className="mt-4 pt-4 border-t border-slate-700/80 flex flex-col sm:flex-row items-start gap-3">
      <p className="text-[10px] font-bold text-slate-500 uppercase shrink-0">크롭 결과</p>
      <div className="flex items-center gap-3 flex-wrap">
        <img
          src={referenceImageDataUrl}
          alt="참고 이미지 미리보기"
          className="max-h-24 rounded-lg border border-slate-600 object-contain bg-neutral-950"
        />
        <button
          type="button"
          onClick={() => setReferenceImageDataUrl(null)}
          className="text-xs font-bold text-red-400 hover:text-red-300"
        >
          제거
        </button>
      </div>
    </div>
  );
}
