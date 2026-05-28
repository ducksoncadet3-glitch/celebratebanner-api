const fs = require('fs');
const path = require('path');
const { LANGUAGES } = require('../config/languages');

const OUTPUTS_ROOT = path.join(__dirname, '..', 'outputs');

function writeMultilingualOutput(agent, multilingualContent, suffix) {
  const stamp = Date.now();
  const written = [];

  for (const lang of LANGUAGES) {
    const dir = path.join(OUTPUTS_ROOT, lang.code);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filename = `${agent}-${suffix || stamp}.txt`;
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, multilingualContent[lang.code] || '');
    written.push({ lang: lang.code, path: filepath });
  }

  return written;
}

module.exports = { writeMultilingualOutput };
