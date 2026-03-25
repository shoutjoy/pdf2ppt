/** 도형 테두리 선 종류 (에디터·내보내기 공통) */

export const SHAPE_BORDER_LINE_OPTIONS = [
  { value: 'solid', label: '실선' },
  { value: 'dashed', label: '파선' },
  { value: 'dotted', label: '점선' },
  { value: 'dashdot', label: '일점쇄선' },
];

/** SVG stroke-dasharray (viewBox 0~100 기준) */
export function svgStrokeDashArray(style) {
  switch (style) {
    case 'dashed':
      return '6 4';
    case 'dotted':
      return '2 4';
    case 'dashdot':
      return '8 4 2 4';
    default:
      return undefined;
  }
}

/** Canvas: 선 스타일 적용 (stroke 전에 호출, 끝나면 setLineDash([]) 권장) */
export function canvasSetLineDash(ctx, style, scale = 1) {
  ctx.setLineDash([]);
  if (!style || style === 'solid') return;
  const s = scale;
  if (style === 'dashed') ctx.setLineDash([8 * s, 4 * s]);
  else if (style === 'dotted') ctx.setLineDash([2 * s, 5 * s]);
  else if (style === 'dashdot') ctx.setLineDash([8 * s, 4 * s, 2 * s, 4 * s]);
}

/** PptxGenJS line.dashType */
export function pptxDashType(style) {
  if (!style || style === 'solid') return undefined;
  const map = {
    dashed: 'dash',
    dotted: 'sysDot',
    dashdot: 'dashDot',
  };
  return map[style];
}

/** jsPDF: stroke 전에 호출, 끝에 pdf.setLineDashPattern([], 0) */
export function pdfApplyLineDash(pdf, style, lineWidth = 2) {
  if (typeof pdf?.setLineDashPattern !== 'function') return;
  pdf.setLineDashPattern([], 0);
  if (!style || style === 'solid') return;
  const u = Math.max(0.5, Number(lineWidth) || 2);
  if (style === 'dashed') pdf.setLineDashPattern([u * 4, u * 2], 0);
  else if (style === 'dotted') pdf.setLineDashPattern([u * 0.35, u * 2], 0);
  else if (style === 'dashdot') pdf.setLineDashPattern([u * 4, u * 2, u, u * 2], 0);
}
