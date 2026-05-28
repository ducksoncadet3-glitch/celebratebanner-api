const { LANGUAGE_BY_COUNTRY } = require('../config/countries');
const { SOURCE_LANGUAGE } = require('../config/languages');

function detectLanguage(country) {
  if (!country) return SOURCE_LANGUAGE;
  return LANGUAGE_BY_COUNTRY[country] || SOURCE_LANGUAGE;
}

module.exports = { detectLanguage };
