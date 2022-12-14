import { replaceInFile } from 'replace-in-file';
import { isEmpty, RegexUtils } from './utils';
import { mergeVersionResult, VersionPattern, VersionResult } from './versionStrategy';

const replace = (pattern: VersionPattern, version: string, dryRun: boolean): Promise<VersionResult> =>
  replaceInFile({
    files: pattern.files, from: pattern.pattern, dry: dryRun,
    to: (match, _) => RegexUtils.replaceMatch(version, match, pattern.pattern, pattern.group),
  }).then(rr => {
    const files = rr.filter(r => r.hasChanged).map(r => r.file);
    return { files, isChanged: !isEmpty(files), version };
  });

const search = (pattern: VersionPattern): Promise<string> => {
  const versions = new Array<string>();
  const config = {
    files: pattern.files, from: pattern.pattern, dry: true,
    to: (match, _) => {
      versions.push(RegexUtils.searchMatch(match, pattern.pattern, pattern.group));
      return match;
    },
  };
  return replaceInFile(config).then(_ => versions.find(v => v) ?? '');
};

export const VersionPatternParser = {
  replace: (versionPatterns: VersionPattern[], version: string, dryRun: boolean): Promise<VersionResult> =>
    Promise.all(versionPatterns.map(pattern => replace(pattern, version, dryRun)))
      .then(result => result.reduce((p, n) => mergeVersionResult(p, n))),
  search: (versionPatterns: VersionPattern[], fallbackVersion: string): Promise<VersionResult> =>
    Promise.all(versionPatterns.map(search))
      .then(versions => versions.find(v => v))
      .then(v => ({ files: [], isChanged: false, version: v ?? fallbackVersion })),

};
