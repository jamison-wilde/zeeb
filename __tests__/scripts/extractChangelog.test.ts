import { describe, it, expect } from 'vitest';
import { extractVersionSection } from '../../scripts/extract-changelog';

const SAMPLE = `# Changelog

## [4.1.0] - 2026-04-01

### Added
- New feature

## [4.0.0] - 2026-03-14

### Added
- Initial release
`;

describe('extractVersionSection', () => {
  it('extracts the correct version section', () => {
    const result = extractVersionSection(SAMPLE, '4.0.0');
    expect(result).toContain('Initial release');
    expect(result).not.toContain('New feature');
  });

  it('extracts first version section', () => {
    const result = extractVersionSection(SAMPLE, '4.1.0');
    expect(result).toContain('New feature');
    expect(result).not.toContain('Initial release');
  });

  it('returns null for missing version', () => {
    expect(extractVersionSection(SAMPLE, '9.9.9')).toBeNull();
  });

  it('handles version being the last section (no trailing ## header)', () => {
    const single = '# Changelog\n\n## [1.0.0] - 2026-01-01\n\n### Added\n- Only item\n';
    const result = extractVersionSection(single, '1.0.0');
    expect(result).toContain('Only item');
  });
});
