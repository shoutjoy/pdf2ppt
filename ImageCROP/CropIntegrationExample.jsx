import React, { useMemo, useState } from 'react';
import { CropModal, useCrop } from './index';

/**
 * CropIntegrationExample
 * - 다른 앱으로 CROP 폴더를 복사한 뒤 바로 참고할 수 있는 최소 통합 예제
 * - target: 'main' | 'history'
 */
export default function CropIntegrationExample() {
  const [mainImage, setMainImage] = useState(null);
  const [history, setHistory] = useState([]);
  const [currentHistoryId, setCurrentHistoryId] = useState(null);

  const currentHistoryItem = useMemo(
    () => history.find((h) => h.id === currentHistoryId) ?? null,
    [history, currentHistoryId]
  );

  const crop = useCrop({
    getSource: (target, cropHistoryRef) => {
      if (target === 'main') return mainImage;
      if (target === 'history') {
        const item = cropHistoryRef?.current;
        return item?.url ?? null;
      }
      return null;
    },
    applyResult: (target, dataUrl, cropHistoryRef) => {
      if (target === 'main') {
        setMainImage(dataUrl);
        return;
      }
      if (target === 'history' && cropHistoryRef?.current) {
        const itemId = cropHistoryRef.current.itemId;
        setHistory((prev) => prev.map((h) => (h.id === itemId ? { ...h, url: dataUrl } : h)));
      }
    },
    saveCropOriginal: async (id, originalUrl) => {
      // 필요 시 서버/DB에 원본 백업 저장
      // eslint-disable-next-line no-console
      console.log('[crop backup]', { id, originalUrlLength: originalUrl?.length ?? 0 });
    },
  });

  const onPickImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setMainImage(dataUrl);
      setHistory((prev) => [{ id: Date.now(), url: dataUrl }, ...prev]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-sm font-bold text-neutral-300">CROP 최소 통합 예제</h2>

      <div className="flex items-center gap-2">
        <input type="file" accept="image/*" onChange={onPickImage} />
        <button
          type="button"
          disabled={!mainImage}
          onClick={() => crop.startCrop('main')}
          className="px-3 py-1.5 rounded bg-blue-600 text-white disabled:opacity-50"
        >
          Main Crop
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded border border-neutral-700 p-2">
          <div className="text-[11px] text-neutral-500 mb-2">Main</div>
          {mainImage ? (
            <img src={mainImage} alt="" className="w-full h-56 object-contain bg-black rounded" />
          ) : (
            <div className="w-full h-56 bg-neutral-900 rounded flex items-center justify-center text-neutral-600 text-xs">
              이미지 없음
            </div>
          )}
        </div>

        <div className="rounded border border-neutral-700 p-2">
          <div className="text-[11px] text-neutral-500 mb-2">History</div>
          <div className="flex gap-2 overflow-x-auto">
            {history.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCurrentHistoryId(item.id)}
                onDoubleClick={() => {
                  crop.cropHistoryRef.current = { url: item.url, itemId: item.id };
                  crop.startCrop('history');
                }}
                className={`w-16 h-16 rounded overflow-hidden border-2 flex-shrink-0 ${
                  currentHistoryId === item.id ? 'border-blue-500' : 'border-neutral-700'
                }`}
                title="클릭: 선택 / 더블클릭: 히스토리 크롭"
              >
                <img src={item.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>

          {currentHistoryItem && (
            <button
              type="button"
              onClick={() => {
                crop.cropHistoryRef.current = { url: currentHistoryItem.url, itemId: currentHistoryItem.id };
                crop.startCrop('history');
              }}
              className="mt-3 px-3 py-1.5 rounded bg-violet-600 text-white"
            >
              선택 히스토리 Crop
            </button>
          )}
        </div>
      </div>

      <CropModal
        isOpen={crop.isCropping}
        imageSrc={
          crop.cropTarget === 'history'
            ? (crop.cropHistoryRef.current?.url ?? '')
            : (mainImage ?? '')
        }
        cropSelection={crop.cropSelection}
        containerRef={crop.cropContainerRef}
        onCropMouseDown={crop.handleCropMouseDown}
        onCommit={crop.executeCrop}
        onCancel={crop.onCancelCrop}
      />
    </div>
  );
}
