// ============================================================
//  themes.config.js
//  Admin can override these via DB / JSON without code changes.
//  Each theme drives: photo limits, layout, text fields, palette.
// ============================================================

const THEMES = {
  graduation: {
    id:          'graduation',
    label:       'Graduation',
    emoji:       '🎓',
    enabled:     true,
    maxPhotos:   50,
    heroCount:   1,
    layout:      'hero_collage',   // hero_collage | hero_grid | hero_stair | duo | full_grid
    outputSizes: ['24x36', '18x24'],
    palette: {
      primary:    '#D4A843',
      background: '#0A1628',
      accent:     '#FFFFFF',
    },
    textFields: [
      { id: 'name',   label: "Graduate's Name", placeholder: 'e.g. Alexandra Rivera', required: true  },
      { id: 'year',   label: 'Class Year',       placeholder: 'e.g. Class of 2026',    required: true  },
      { id: 'school', label: 'School Name',       placeholder: 'e.g. Lincoln High',     required: false },
    ],
    backgroundAsset: process.env.GRAD_BG_URL || 'assets/grad-bg.jpg',
    overlayOpacity:  0.65,
  },

  champion: {
    id:          'champion',
    label:       'Team Champion',
    emoji:       '🏆',
    enabled:     true,
    maxPhotos:   10,
    heroCount:   1,
    layout:      'hero_grid',
    outputSizes: ['24x36', '18x24'],
    palette: {
      primary:    '#D4A843',
      background: '#0A1628',
      accent:     '#1E8DC1',
    },
    textFields: [
      { id: 'year', label: 'Year', placeholder: 'e.g. 2025', required: false },
    ],
    fixedHeadline:   'CHAMPION',
    backgroundAsset: process.env.STADIUM_BG_URL || 'assets/stadium-bg.jpg',
    overlayOpacity:  0.70,
  },

  wedding: {
    id:          'wedding',
    label:       'Wedding',
    emoji:       '💒',
    enabled:     true,
    maxPhotos:   30,
    heroCount:   2,
    layout:      'duo',
    outputSizes: ['24x36', '18x24'],
    palette: {
      primary:    '#D4A8D4',
      background: '#2D1040',
      accent:     '#D4A843',
    },
    textFields: [
      { id: 'name1', label: 'Partner 1 Name', placeholder: 'e.g. Elena',         required: true  },
      { id: 'name2', label: 'Partner 2 Name', placeholder: 'e.g. Marco',          required: true  },
      { id: 'date',  label: 'Wedding Date',   placeholder: 'e.g. June 14, 2026',  required: false },
    ],
    backgroundAsset: process.env.WEDDING_BG_URL || 'assets/wedding-bg.jpg',
    overlayOpacity:  0.60,
  },

  anniversary: {
    id:          'anniversary',
    label:       'Anniversary',
    emoji:       '❤️',
    enabled:     true,
    maxPhotos:   25,
    heroCount:   2,
    layout:      'hero_grid',
    outputSizes: ['24x36', '18x24'],
    palette: {
      primary:    '#E05050',
      background: '#3D0A0A',
      accent:     '#D4A843',
    },
    textFields: [
      { id: 'names', label: 'Names',          placeholder: 'e.g. Elena & Marco',  required: true  },
      { id: 'years', label: 'Years Together', placeholder: 'e.g. 25 Years',       required: false },
    ],
    backgroundAsset: process.env.ANNIV_BG_URL || 'assets/anniversary-bg.jpg',
    overlayOpacity:  0.65,
  },

  pets: {
    id:          'pets',
    label:       'Pets',
    emoji:       '🐾',
    enabled:     true,
    maxPhotos:   20,
    heroCount:   1,
    layout:      'full_grid',
    outputSizes: ['24x36', '18x24'],
    palette: {
      primary:    '#5BAA5B',
      background: '#072010',
      accent:     '#FAF7F2',
    },
    textFields: [
      { id: 'petName', label: "Pet's Name", placeholder: "e.g. Biscuit",  required: true  },
      { id: 'caption', label: 'Caption',    placeholder: 'e.g. Best boy', required: false },
    ],
    backgroundAsset: process.env.PETS_BG_URL || 'assets/pets-bg.jpg',
    overlayOpacity:  0.55,
  },
};

// Print-ready output specs
const OUTPUT_SPECS = {
  '24x36': { widthIn: 24, heightIn: 36, dpi: 300, bleedIn: 0.125 },
  '18x24': { widthIn: 18, heightIn: 24, dpi: 300, bleedIn: 0.125 },
};

function getTheme(id) {
  const t = THEMES[id];
  if (!t || !t.enabled) return null;
  return t;
}

function getEnabledThemes() {
  return Object.values(THEMES).filter(t => t.enabled);
}

function getOutputSpec(size) {
  return OUTPUT_SPECS[size] || null;
}

module.exports = { THEMES, OUTPUT_SPECS, getTheme, getEnabledThemes, getOutputSpec };
