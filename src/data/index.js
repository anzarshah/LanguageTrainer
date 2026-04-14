// Pre-built language data — all 13 languages work without API calls for content
// Users still need an API key for interactive features (speaking, journal, conversation)

import french from './french.js';
import german from './german.js';
import persian from './persian.js';
import arabic from './arabic.js';
import spanish from './spanish.js';
import japanese from './japanese.js';
import italian from './italian.js';
import mandarin from './mandarin.js';
import portuguese from './portuguese.js';
import hindi from './hindi.js';
import korean from './korean.js';
import turkish from './turkish.js';
import swahili from './swahili.js';

const PREBUILT = {
  French: french,
  German: german,
  Persian: persian,
  Arabic: arabic,
  Spanish: spanish,
  Japanese: japanese,
  Italian: italian,
  'Mandarin Chinese': mandarin,
  Portuguese: portuguese,
  Hindi: hindi,
  Korean: korean,
  Turkish: turkish,
  Swahili: swahili,
};

// Case-insensitive lookup
export function getPrebuiltData(language) {
  const key = Object.keys(PREBUILT).find(
    k => k.toLowerCase() === language.toLowerCase()
  );
  return key ? PREBUILT[key] : null;
}

export function hasPrebuiltData(language) {
  return Object.keys(PREBUILT).some(
    k => k.toLowerCase() === language.toLowerCase()
  );
}

export const PREBUILT_LANGUAGES = Object.keys(PREBUILT);
