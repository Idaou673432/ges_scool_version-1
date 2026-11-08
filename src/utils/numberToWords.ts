/**
 * Utilitaire de conversion des montants numériques en lettres (Français / FCFA)
 * Ex: 8000 -> "Huit mille francs CFA"
 * Ex: 32500 -> "Trente-deux mille cinq cents francs CFA"
 */

const UNITES = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
const DIZAINES = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];
const PARTICULIERS: Record<number, string> = {
  11: 'onze', 12: 'douze', 13: 'treize', 14: 'quatorze', 15: 'quinze', 16: 'seize',
  71: 'soixante-onze', 72: 'soixante-douze', 73: 'soixante-treize', 74: 'soixante-quatorze',
  75: 'soixante-quinze', 76: 'soixante-seize', 77: 'soixante-dix-sept', 78: 'soixante-dix-huit', 79: 'soixante-dix-neuf',
  91: 'quatre-vingt-onze', 92: 'quatre-vingt-douze', 93: 'quatre-vingt-treize', 94: 'quatre-vingt-quatorze',
  95: 'quatre-vingt-quinze', 96: 'quatre-vingt-seize', 97: 'quatre-vingt-dix-sept', 98: 'quatre-vingt-dix-huit', 99: 'quatre-vingt-dix-neuf'
};

function convertLessThanHundred(n: number): string {
  if (n === 0) return '';
  if (n < 10) return UNITES[n];
  if (PARTICULIERS[n]) return PARTICULIERS[n];

  const d = Math.floor(n / 10);
  const u = n % 10;

  if (d === 1) {
    return 'dix-' + UNITES[u];
  }
  if (d === 7) {
    return 'soixante-' + (PARTICULIERS[10 + u] || ('dix-' + UNITES[u]));
  }
  if (d === 8) {
    if (u === 0) return 'quatre-vingts';
    return 'quatre-vingt-' + UNITES[u];
  }
  if (d === 9) {
    return 'quatre-vingt-' + (PARTICULIERS[10 + u] || ('dix-' + UNITES[u]));
  }

  if (u === 1) return DIZAINES[d] + ' et un';
  if (u === 0) return DIZAINES[d];
  return DIZAINES[d] + '-' + UNITES[u];
}

function convertLessThanThousand(n: number): string {
  if (n === 0) return '';
  const c = Math.floor(n / 100);
  const rest = n % 100;

  let centText = '';
  if (c === 1) {
    centText = 'cent';
  } else if (c > 1) {
    centText = UNITES[c] + (rest === 0 ? ' cents' : ' cent');
  }

  const restText = convertLessThanHundred(rest);
  if (!centText) return restText;
  if (!restText) return centText;
  return centText + ' ' + restText;
}

export function numberToFcfaWords(amount: number): string {
  if (!amount || amount === 0) return 'Zéro franc CFA';

  const n = Math.abs(Math.round(amount));

  const millions = Math.floor(n / 1000000);
  const thousands = Math.floor((n % 1000000) / 1000);
  const units = n % 1000;

  const parts: string[] = [];

  if (millions > 0) {
    if (millions === 1) {
      parts.push('un million');
    } else {
      parts.push(convertLessThanThousand(millions) + ' millions');
    }
  }

  if (thousands > 0) {
    if (thousands === 1) {
      parts.push('mille');
    } else {
      parts.push(convertLessThanThousand(thousands) + ' mille');
    }
  }

  if (units > 0) {
    parts.push(convertLessThanThousand(units));
  }

  const result = parts.join(' ').trim();
  // Capitalize first letter and append francs CFA
  return result.charAt(0).toUpperCase() + result.slice(1) + ' francs CFA';
}
