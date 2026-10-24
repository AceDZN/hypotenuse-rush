/** UI diagrams use authoritative measurements; projection never decides reach. */
export const numberText = (n: number, decimals = 2) => Math.abs(n).toFixed(decimals).replace(/\.?0+$/, '');
export type Inspection = { dx: number; dy: number; dz: number; distance: number; reach: number; face: number };
const colors = { horizontal: '#57e4f0', vertical: '#ffcd66', depth: '#bb9aff', diagonal: '#fff1d3' };

function triangle(a: number, b: number, horizontal: string, vertical: string, diagonal: string, floor = false, compact = false) {
  const maxW = compact ? 100 : 210, maxH = compact ? 79 : 105;
  const scale = Math.min(maxW / Math.max(Math.abs(a), .01), maxH / Math.max(Math.abs(b), .01));
  const w = Math.max(35, Math.abs(a) * scale), h = Math.max(30, Math.abs(b) * scale);
  const x = (compact ? 24 : 38) + (maxW - w) / 2, y = compact ? 110 : 132, right = x + w, top = y - h;
  return `<svg class="flat-triangle" viewBox="0 0 ${compact ? 200 : 320} ${compact ? 145 : 165}" role="img" aria-label="ניצבים ${horizontal}, ${vertical}; יתר ${diagonal}">
    <path d="M${x},${y} L${right},${y} L${right},${top} Z" fill="${floor ? '#9e83db' : '#42b5cb'}" fill-opacity=".12"/>
    <path d="M${x},${y} H${right}" stroke="${colors.horizontal}" stroke-width="4" fill="none"/>
    <path d="M${right},${y} V${top}" stroke="${floor ? colors.depth : colors.vertical}" stroke-width="4" fill="none"/>
    <path d="M${x},${y} L${right},${top}" stroke="${colors.diagonal}" stroke-width="3" stroke-dasharray="7 5" fill="none"/>
    <path d="M${right - 12},${y} v-12 h12" stroke="#fff4db" stroke-width="2" fill="none"/>
    <circle cx="${x}" cy="${y}" r="4" fill="#fff4db"/>
    <text x="${x - 13}" y="${y + 5}" fill="#fff4db" font-size="14">P</text>
    <text x="${x + w / 2}" y="${y + 24}" fill="${colors.horizontal}" text-anchor="middle">${horizontal}</text>
    <text x="${right + 13}" y="${top + h / 2 + 5}" fill="${floor ? colors.depth : colors.vertical}" text-anchor="start">${vertical}</text>
    <text x="${x + w / 2 - 16}" y="${top + h / 2 - 12}" fill="${colors.diagonal}" text-anchor="middle">${diagonal}</text>
  </svg>`;
}
export function inspectionDiagram(info: Inspection, solved: boolean) {
  const dx = Math.abs(info.dx), dy = Math.abs(info.dy), dz = Math.abs(info.dz);
  const answer = solved ? `${numberText(info.distance)} m` : '? m';
  if (dz < .001) return triangle(dx, dy, `${numberText(dx)} m`, `${numberText(dy)} m`, answer);
  return `<div class="spatial-diagrams"><div><small>1 · המשולש על הקרקע</small>${triangle(dx, dz, `${numberText(dx)} m`, `${numberText(dz)} m`, solved ? `${numberText(info.face)} m` : 'f = ?', true, true)}</div><div><small>2 · מוסיפים את הגובה</small>${triangle(info.face, dy, solved ? `${numberText(info.face)} m` : 'f', `${numberText(dy)} m`, answer, false, true)}</div></div>`;
}
export function calculation(info: Inspection) {
  const parts = [info.dx, info.dy, ...(Math.abs(info.dz) > .001 ? [info.dz] : [])];
  const square = parts.reduce((sum, n) => sum + n * n, 0);
  return `<bdi>${parts.map(n => `${numberText(n)}²`).join(' + ')} = ${numberText(square)} m²</bdi><br><bdi>d = √${numberText(square)} ≈ ${numberText(info.distance)} m</bdi>`;
}
