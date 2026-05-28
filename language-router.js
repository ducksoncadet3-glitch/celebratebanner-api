const COUNTRIES = {
  en: ['USA', 'Canada', 'UK', 'Australia', 'Ireland'],
  fr: ['Haiti', 'France', 'Quebec', 'Senegal', 'Ivory Coast', 'Morocco', 'Belgium'],
  es: ['Mexico', 'Argentina', 'Colombia', 'Dominican Republic', 'Spain', 'Chile', 'Peru'],
};

const LANGUAGE_BY_COUNTRY = Object.entries(COUNTRIES).reduce((acc, [lang, list]) => {
  list.forEach((country) => {
    acc[country] = lang;
  });
  return acc;
}, {});

module.exports = { COUNTRIES, LANGUAGE_BY_COUNTRY };
