# CROP Module

이 폴더만 복사하면 다른 React 앱에서도 크롭 기능을 붙일 수 있도록 구성했습니다.

## 포함 파일

- `CropModal.jsx`: 크롭 UI 모달
- `useCrop.js`: 크롭 상태/드래그/실행 훅
- `cropUtils.js`: 크롭 처리/리사이즈 유틸
- `index.js`: 외부 노출 엔트리

## 빠른 적용

1. 이 `CROP` 폴더를 대상 앱 `src` 아래로 복사
2. 대상 앱에서 import

```js
import { CropModal, useCrop, resizeImageToMaxBase64 } from './CROP';
```

또는 최소 통합 예제를 바로 붙여 확인:

```js
import { CropIntegrationExample } from './CROP';
```

3. `useCrop`에 앱별 데이터 연결 콜백 주입

```js
const crop = useCrop({
  getSource: (target, cropHistoryRef) => {
    // target에 따라 원본 이미지 반환
    return sourceUrlOrDataUrl;
  },
  applyResult: (target, croppedDataUrl, cropHistoryRef) => {
    // target에 따라 결과 상태 반영
  },
  saveCropOriginal: async (id, originalUrl) => {
    // 선택: 원본 백업 저장
  },
});
```

## 필요 의존성

- `react`
- `lucide-react` (아이콘 사용 시)
- Tailwind 클래스는 필요 시 앱 스타일 시스템에 맞게 바꿔서 사용
