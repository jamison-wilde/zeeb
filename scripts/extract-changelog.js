const fs = require('fs');
const path = require('path');

/**
 * Extract a specific version's section from a Keep a Changelog file.
 * @param {string} changelog - Full changelog content
 * @param {string} version - Version to extract (e.g. '4.0.0')
 * @returns {string|null} The section content, or null if not found
 */
function extractVersionSection(changelog, version) {
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^## \\[${escaped}\\][^\n]*\n`, 'm');
  const match = pattern.exec(changelog);
  if (!match) return null;

  const start = match.index + match[0].length;
  const nextHeader = changelog.indexOf('\n## [', start);
  const end = nextHeader === -1 ? changelog.length : nextHeader;
  return changelog.substring(start, end).trim();
}

// When run directly: extract current version to assets/release-notes.md
if (require.main === module) {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));
  const changelog = fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.md'), 'utf-8');
  const section = extractVersionSection(changelog, pkg.version);

  if (!section) {
    console.error(`No changelog section found for version ${pkg.version}`);
    process.exit(1);
  }

  const outDir = path.join(__dirname, '..', 'assets');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'release-notes.md'), section, 'utf-8');
  console.log(`Extracted release notes for v${pkg.version} to assets/release-notes.md`);
}

module.exports = { extractVersionSection };
