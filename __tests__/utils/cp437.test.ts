import { cp437ToUnicode, cp437StringToUnicode } from '../../src/utils/cp437';

describe('cp437ToUnicode', () => {
  it('converts standard ASCII unchanged', () => {
    expect(cp437ToUnicode(Buffer.from([0x41, 0x42, 0x43]))).toBe('ABC');
  });

  it('converts CP437 box-drawing characters', () => {
    expect(cp437ToUnicode(Buffer.from([0xc9, 0xcd, 0xbb]))).toBe('╔═╗');
  });

  it('converts CP437 block elements', () => {
    expect(cp437ToUnicode(Buffer.from([0xb0, 0xb1, 0xb2, 0xdb]))).toBe('░▒▓█');
  });

  it('handles empty input', () => {
    expect(cp437ToUnicode(Buffer.from([]))).toBe('');
  });
});

describe('cp437StringToUnicode', () => {
  it('converts a latin1-encoded string using CP437 table', () => {
    // 0xDA = ┌, 0xC4 = ─, 0xBF = ┐ in CP437
    const latin1 = String.fromCharCode(0xDA, 0xC4, 0xBF);
    expect(cp437StringToUnicode(latin1)).toBe('┌─┐');
  });

  it('preserves newlines, carriage returns, and tabs', () => {
    const latin1 = 'A' + String.fromCharCode(0x0A) + 'B' + String.fromCharCode(0x0D) + 'C' + String.fromCharCode(0x09) + 'D';
    expect(cp437StringToUnicode(latin1)).toBe('A\nB\rC\tD');
  });
});
