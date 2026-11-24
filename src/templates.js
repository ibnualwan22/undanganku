export const DEFAULT_TEMPLATE_ID = 'floral-reverie';

// Only ready templates can create or render an invitation. Planned concepts
// remain visible in the catalogue without pretending to have a working preview.
export const templates = [
  {
    id: DEFAULT_TEMPLATE_ID,
    name: 'Floral Reverie',
    description: 'Bunga cat air, ivory hangat, dan hijau sage. Romantis dan tenang.',
    category: 'Floral', status: 'ready',
    palette: ['#f8f6ef', '#50624b', '#d9b8af'],
    decoration: '/assets/floral-watercolor.png',
    preview: '/demo/floral-reverie',
  },
  {
    id: 'sunset-bloom',
    name: 'Sunset Bloom',
    description: 'Bunga taman yang rimbun, terracotta, jingga, dan kuning lembut. Hangat dan penuh perayaan.',
    category: 'Floral', status: 'ready',
    palette: ['#fff3d9', '#a3472d', '#e6ad49'],
    decoration: '/assets/sunset-bloom.webp',
    preview: '/demo/sunset-bloom',
  },
  {
    id: 'monochrome-vows', name: 'Monochrome Vows', status: 'ready', category: 'Portrait',
    description: 'Potret separuh wajah, hitam-putih, dan tipografi editorial. Intim, tegas, dan sinematik.',
    palette: ['#111111', '#ffffff', '#999999'], decoration: '',
    preview: '/demo/monochrome-vows',
  },
  {
    id: 'garden-celebration', name: 'Garden Celebration', status: 'planned',
    description: 'Burgundy, coral, peach, dan ivory dengan aksen emas. Meriah dan elegan.',
    palette: ['#6c253b', '#df876e', '#f7ebdb'],
  },
  {
    id: 'lilac-romance', name: 'Lilac Romance', status: 'planned',
    description: 'Ungu, mauve, dan pink dengan rangkaian bunga bertingkat. Romantis dan lembut.',
    palette: ['#695179', '#bc92b4', '#f6e7ee'],
  },
];

export const availableTemplates = templates.filter(template => template.status === 'ready');
export function findTemplate(id) { return availableTemplates.find(template => template.id === id); }
export function getTemplate(id) { return findTemplate(id) || findTemplate(DEFAULT_TEMPLATE_ID); }

export function decorationForTemplate(currentDecoration, nextTemplateId) {
  // A custom upload or an explicitly removed decoration belongs to the couple.
  return currentDecoration == null || availableTemplates.some(template => template.decoration && template.decoration === currentDecoration)
    ? getTemplate(nextTemplateId).decoration : currentDecoration;
}
