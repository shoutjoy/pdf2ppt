/** 앱 전역 상수 */

export const APP_VERSION = 'V2.0';

export const LIB_SCRIPTS = [
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdn.jsdelivr.net/gh/gitbrent/PptxGenJS@3.12.0/dist/pptxgen.bundle.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
];

export const FONT_FAMILIES = [
  { label: '맑은 고딕', value: 'Malgun Gothic' },
  { label: '굴림', value: 'Gulim' },
  { label: '돋움', value: 'Dotum' },
  { label: '바탕', value: 'Batang' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Verdana', value: 'Verdana' },
];

export const DEFAULT_MASK_SETTINGS = {
  widthRatio: 9.2,
  heightRatio: 3.1,
  xRatio: 96.9,
  yRatio: 98.4,
};
