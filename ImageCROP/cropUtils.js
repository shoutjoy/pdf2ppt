/**
 * CROP/cropUtils.js
 * - 크롭(비율 기반 % 좌표) 실행
 * - API 전송용 이미지 리사이즈
 */

/** API 전송용 최대 변 길이 (Face/Ghost 추출 시 페이로드·타임아웃 방지) */
const API_IMAGE_MAX_SIZE = 1024;

/**
 * 이미지를 최대 변 길이 이하로 리사이즈한 뒤 base64 반환 (API 전송용)
 * @param {string} dataUrlOrBase64 - data:image/...;base64,... 또는 raw base64
 * @param {number} [maxSize=1024] - 긴 변 최대 픽셀
 * @returns {Promise<string>} 리사이즈된 이미지의 base64 (data URL 접두어 없음)
 */
export function resizeImageToMaxBase64(dataUrlOrBase64, maxSize = API_IMAGE_MAX_SIZE) {
  return new Promise((resolve, reject) => {
    if (!dataUrlOrBase64 || typeof dataUrlOrBase64 !== 'string') {
      reject(new Error('이미지 데이터가 없습니다.'));
      return;
    }
    const dataUrl = dataUrlOrBase64.includes(',')
      ? dataUrlOrBase64
      : `data:image/png;base64,${dataUrlOrBase64}`;
    const img = new Image();
    img.onload = () => {
      try {
        let w = img.width;
        let h = img.height;
        if (w <= maxSize && h <= maxSize) {
          const base = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrlOrBase64;
          resolve(base);
          return;
        }
        if (w > h) {
          h = Math.round((h * maxSize) / w);
          w = maxSize;
        } else {
          w = Math.round((w * maxSize) / h);
          h = maxSize;
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const resizedDataUrl = canvas.toDataURL('image/png');
        resolve(resizedDataUrl.split(',')[1]);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('이미지 로드 실패'));
    img.src = dataUrl;
  });
}

/** 기본 크롭 선택 영역 (전체의 80% 중앙) */
export const DEFAULT_CROP_SELECTION = { x: 10, y: 10, width: 80, height: 80 };

/**
 * 이미지 data URL을 비율 기반 선택 영역으로 크롭한 뒤 새 data URL 반환
 * @param {string} dataUrl - data:image/png;base64,... 형태
 * @param {{ x: number, y: number, width: number, height: number }} selection - 퍼센트 (0~100)
 * @returns {Promise<string>} 크롭된 이미지 data URL
 */
export function applyCropToImageDataUrl(dataUrl, selection) {
  return new Promise((resolve, reject) => {
    if (!dataUrl || typeof selection !== 'object') {
      reject(new Error('Invalid input'));
      return;
    }
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const cw = (img.width * selection.width) / 100;
        const ch = (img.height * selection.height) / 100;
        const cx = (img.width * selection.x) / 100;
        const cy = (img.height * selection.y) / 100;
        canvas.width = cw;
        canvas.height = ch;
        ctx.drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = dataUrl;
  });
}
