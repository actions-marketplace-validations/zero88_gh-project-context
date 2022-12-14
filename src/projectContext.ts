import { ChangelogResult } from './changelog';

export interface Decision {
  /**
   * Should run the next step: such as build & test
   * <p>
   * Default value is True if `!output.ci.isPushed && !output.isClosed`
   */
  readonly build: boolean;
  /**
   * Should publish artifact: such as push artifact to any registry: npm, docker, maven, pypi, etc...
   * <p>
   * Default value is True if `output.decision.build && (output.isOnMaster || output.isTag)`
   */
  readonly publish: boolean;
}

export interface CIContext {
  /**
   * Check whether if auto commit is pushed to remote
   */
  readonly isPushed: boolean;
  /**
   * Need to fix version to match with release name
   */
  readonly mustFixVersion?: boolean;
  /**
   * Need to tag new version if release branch is merged
   */
  readonly needTag?: boolean;
  /**
   * Need to upgrade next version after release branch is merged
   */
  readonly needUpgrade?: boolean;
  /**
   * CI auto commit id
   */
  readonly commitId?: string;
  /**
   * CI auto commit message
   */
  readonly commitMsg?: string;

  /**
   * CI changelog result
   */
  readonly changelog?: ChangelogResult;
}

export interface Versions {
  /**
   * Current branch version from tag/release version
   */
  readonly branch: string;
  /**
   * Current version in configuration file or tag/release version
   */
  readonly current: string;
  /**
   * Suggest next major version if after release
   */
  readonly nextMajor?: string;
  /**
   * Suggest next minor version if after release
   */
  readonly nextMinor?: string;
  /**
   * Suggest next path version if after release
   */
  readonly nextPath?: string;
}

export interface ProjectContext {
  /**
   * Current branch name or tag name
   */
  readonly branch: string;
  /**
   * Check whether current event is on default branch or not
   * @type {boolean}
   */
  readonly onDefaultBranch: boolean;
  /**
   * Check whether current event is on pull request or not
   * @type {boolean}
   */
  readonly isPR: boolean;
  /**
   * Check whether current event is on release pull request or not
   * @type {boolean}
   */
  readonly isReleasePR: boolean;
  /**
   * Check whether current event is a merged commit after merged release pull request into default branch or not
   * @type {boolean}
   */
  readonly isAfterMergedReleasePR: boolean;
  /**
   * Check whether current event is merged PR
   * @type {boolean}
   */
  readonly isMerged: boolean;
  /**
   * Check whether current event is close PR but not merged into target branch
   * @type {boolean}
   */
  readonly isClosed: boolean;
  /**
   * Check whether current event is on ref tag
   * @type {boolean}
   */
  readonly isTag: boolean;
  /**
   * Check whether manual or schedule event
   */
  readonly isManualOrSchedule: boolean;
  /**
   * Current version
   * @type {string}
   */
  readonly version: string;
  /**
   * Latest commit message
   * @type {string}
   */
  readonly commitMsg: string;
  /**
   * Latest commit id
   * @type {string}
   */
  readonly commitId: string;
  /**
   * Latest short commit id
   * @type {string}
   */
  readonly shortCommitId: string;
  /**
   * CI context
   */
  readonly ci: CIContext;
  /**
   * Decision output
   */
  readonly decision: Decision;
  /**
   * Version output
   */
  readonly versions: Versions;
}
