import { parseLegacyXml, detectCustomizations, migrateLegacyConfig } from '../../src/services/legacyImporter';

const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<config>
  <formatStandard>&lt;title&gt; (&lt;year&gt;).&lt;imdb&gt;(&lt;rating100&gt;).&lt;saved&gt;</formatStandard>
  <removeThe>true</removeThe>
  <removeTerms>YIFY,BluRay,x264,CustomGroup</removeTerms>
  <keepTerms>720p,1080p</keepTerms>
  <reFilenamePartsSplitter>[._ -]+</reFilenamePartsSplitter>
</config>`;

describe('legacyImporter', () => {
  it('parses legacy XML config into key-value map', () => {
    const parsed = parseLegacyXml(sampleXml);
    expect(parsed.formatStandard).toBe('<title> (<year>).<imdb>(<rating100>).<saved>');
    expect(parsed.removeThe).toBe('true');
  });

  it('detects customized remove terms', () => {
    const parsed = parseLegacyXml(sampleXml);
    const customizations = detectCustomizations(parsed);
    expect(customizations.hasCustomRemoveTerms).toBe(true);
    expect(customizations.customRemoveTerms).toContain('CustomGroup');
  });

  it('migrates legacy config to new ZeebConfig shape', () => {
    const parsed = parseLegacyXml(sampleXml);
    const config = migrateLegacyConfig(parsed);
    expect(config.removeThe).toBe(true);
    expect(config.removeTerms).toContain('CustomGroup');
    expect(config.formatStandard).toContain('<title>');
  });

  it('preserves custom regex patterns', () => {
    const parsed = parseLegacyXml(sampleXml);
    const config = migrateLegacyConfig(parsed);
    expect(config.customRegexPatterns?.reFilenamePartsSplitter).toBe('[._ -]+');
  });
});
