export const portraitDemoAssets = ['/assets/monochrome-bride.webp', '/assets/monochrome-groom.webp'];
const bounded = (value, fallback, min, max) => {
  const number = Number(value);
  return value == null || value === '' || !Number.isFinite(number) ? fallback : Math.max(min, Math.min(max, number));
};
export function normalizePortrait(value, personIndex) {
  return {src: typeof value?.src === 'string' ? value.src : '', x: bounded(value?.x,personIndex===0?8:personIndex===1?92:50,0,100), y: bounded(value?.y,50,0,100), zoom: bounded(value?.zoom,1,1,2)};
}
export function portraitStyle(value) {
  const p = normalizePortrait(value);
  return `--portrait-x:${p.x}%;--portrait-y:${p.y}%;--portrait-zoom:${p.zoom}`;
}
