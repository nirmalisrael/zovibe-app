/** Hermes-safe base64 encode for ASCII strings (password obfuscation). */
export function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  // eslint-disable-next-line no-restricted-globals
  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(binary);
  }
  const base64abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  while (i < binary.length) {
    const a = binary.charCodeAt(i++);
    const b = i < binary.length ? binary.charCodeAt(i++) : NaN;
    const c = i < binary.length ? binary.charCodeAt(i++) : NaN;
    const triplet = (a << 16) | ((b as number) << 8) | (c as number);
    if (Number.isNaN(b)) {
      result += base64abc[(triplet >> 18) & 63] + base64abc[(triplet >> 12) & 63] + '==';
    } else if (Number.isNaN(c)) {
      result +=
        base64abc[(triplet >> 18) & 63] +
        base64abc[(triplet >> 12) & 63] +
        base64abc[(triplet >> 6) & 63] +
        '=';
    } else {
      result +=
        base64abc[(triplet >> 18) & 63] +
        base64abc[(triplet >> 12) & 63] +
        base64abc[(triplet >> 6) & 63] +
        base64abc[triplet & 63];
    }
  }
  return result;
}
