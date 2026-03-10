import { cp437ToUnicode } from '../../src/utils/cp437';

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
