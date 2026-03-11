import { parseLegacyXml, detectCustomizations, migrateLegacyConfig } from '../../src/services/legacyImporter';

describe('Legacy import flow', () => {
  it('full import pipeline: parse -> detect -> migrate', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<config>
  <formatStandard>&lt;title&gt; (&lt;year&gt;).&lt;imdb&gt;(&lt;rating100&gt;).&lt;saved&gt;</formatStandard>
  <removeThe>true</removeThe>
  <removeTerms>YIFY,BluRay,x264,CustomGroup</removeTerms>
  <keepTerms>720p,1080p</keepTerms>
</config>`;

    const parsed = parseLegacyXml(xml);
    expect(parsed.formatStandard).toContain('<title>');

    const customizations = detectCustomizations(parsed);
    expect(customizations.hasCustomRemoveTerms).toBe(true);
    expect(customizations.customRemoveTerms).toContain('CustomGroup');

    const config = migrateLegacyConfig(parsed);
    expect(config.removeThe).toBe(true);
    expect(config.removeTerms).toContain('CustomGroup');
    expect(config.formatStandard).toContain('<title>');
  });
});
