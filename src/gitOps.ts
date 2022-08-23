import * as core from '@actions/core';
import { exec, strictExec } from './exec';
import { isEmpty } from './utils';

/**
 * Represents for Git CI input
 */
export type GitOpsConfig = {

  /**
   * CI: Allow git commit to fix version if not match
   * @type {boolean}
   */
  readonly allowCommit: boolean;
  /**
   * CI: Allow git tag if merged release branch
   * @type {boolean}
   */
  readonly allowTag: boolean;
  /**
   * CI: Required GPG sign
   * @type {string}
   */
  readonly mustSign: boolean;
  /**
   * CI: Prefix bot message
   * @type {string}
   */
  readonly prefixCiMsg: string;
  /**
   * CI: Correct version message template
   * @type {string}
   */
  readonly correctVerMsg: string;
  /**
   * CI: Next version message template
   * @type {string}
   */
  readonly nextVerMsg: string;
  /**
   * CI: Release version message template
   * @type {string}
   */
  readonly releaseVerMsg: string;
  /**
   * CI: Username to commit. Skip if any config visible in Runner git config
   * @type {string}
   */
  readonly userName: string;
  /**
   * CI: User email to commit. Skip if any config visible in Runner git config
   * @type {string}
   */
  readonly userEmail: string;

}

const defaultConfig: GitOpsConfig = {
  allowCommit: true,
  allowTag: true,
  correctVerMsg: 'Correct version',
  mustSign: false,
  nextVerMsg: 'Next version',
  prefixCiMsg: '<ci-auto-commit>',
  releaseVerMsg: 'Release version',
  userEmail: 'ci-bot',
  userName: 'actions@github.com',
};

export const createGitOpsConfig = (allowCommit: boolean, allowTag: boolean, prefixCiMsg: string, correctVerMsg: string,
  releaseVerMsg: string, username: string, userEmail: string, isSign: boolean, nextVerMsg: string): GitOpsConfig => {
  return {
    allowCommit: allowCommit ?? defaultConfig.allowCommit,
    allowTag: allowTag ?? defaultConfig.allowTag,
    mustSign: isSign ?? defaultConfig.mustSign,
    prefixCiMsg: prefixCiMsg ?? defaultConfig.prefixCiMsg,
    correctVerMsg: correctVerMsg ?? defaultConfig.correctVerMsg,
    releaseVerMsg: releaseVerMsg ?? defaultConfig.releaseVerMsg,
    nextVerMsg: nextVerMsg ?? defaultConfig.nextVerMsg,
    userName: username ?? defaultConfig.userName,
    userEmail: userEmail ?? defaultConfig.userEmail,
  };
};

export interface CommitStatus {
  isCommitted: boolean;
  isPushed: boolean;
  commitId?: string;
  commitMsg?: string;
}

/**
 * Represents for Git CI interactor like: commit, push, tag
 */
export class GitOps {

  private readonly config: GitOpsConfig;

  constructor(config: GitOpsConfig) {
    this.config = config;
  }

  static getCommitMsg = async (sha: string) => GitOps.execSilent(['log', '--format=%B', '-n', '1', sha]);

  static removeRemoteBranch = async (branch: string) => GitOps.execSilent(['push', 'origin', `:${branch}`]);

  async commit(msg: string, branch?: string): Promise<CommitStatus> {
    return this.doCommit(msg, msg, branch);
  }

  async commitVersionCorrection(branch: string, version: string): Promise<CommitStatus> {
    return this.doCommit(`${this.config.correctVerMsg} ${version}`,
      `Correct version in branch ${branch} => ${version}...`, branch);
  }

  async commitVersionUpgrade(nextVersion: string): Promise<CommitStatus> {
    return this.doCommit(`${this.config.nextVerMsg} ${nextVersion}`, `Upgrade to new version to ${nextVersion}`);
  };

  async tag(tag: string): Promise<CommitStatus> {
    if (!this.config.allowTag) {
      return { isCommitted: false, isPushed: false };
    }
    const commitMsg = `${this.config.releaseVerMsg} ${tag}`;
    const signArgs = this.config.mustSign ? ['-s'] : [];
    return core.group(`[GIT Tag] Tag new version ${tag}...`, () =>
      strictExec('git', ['fetch', '--depth=1'], 'Cannot fetch')
        .then(ignore => strictExec('git', ['rev-parse', '--short', 'HEAD'], 'Cannot show last commit'))
        .then(r => r.stdout)
        .then(commitId => this.configGitUser()
          .then(g => strictExec('git', [...g, 'tag', ...signArgs, '-a', '-m', commitMsg, tag, commitId], `Cannot tag`))
          .then(() => strictExec('git', ['show', '--shortstat', '--show-signature', tag], `Cannot show tag`, false))
          .then(() => ({ isCommitted: true, isPushed: false, commitMsg, commitId }))));
  };

  async pushCommit(status: CommitStatus, dryRun: boolean): Promise<CommitStatus> {
    if (dryRun || !status.isCommitted) {
      return { ...status, isPushed: false };
    }
    return strictExec('git', ['push'], `Cannot push commits`, false).then(s => ({ ...status, isPushed: s.success }));
  };

  async pushTag(tag: string, status: CommitStatus, dryRun: boolean): Promise<CommitStatus> {
    if (dryRun || !status.isCommitted) {
      return { ...status, isPushed: false };
    }
    return strictExec('git', ['push', '-uf', 'origin', tag], `Cannot push tag`, false)
      .then(s => ({ ...status, isPushed: s.success }));
  };

  private doCommit(msg: string, groupMsg: string, branch?: string): Promise<CommitStatus> {
    if (!this.config.allowCommit) {
      return Promise.resolve({ isCommitted: false, isPushed: false });
    }
    const commitMsg = `${this.config.prefixCiMsg} ${msg}`;
    const commitArgs = ['commit', ...this.config.mustSign ? ['-S'] : [], '-a', '-m', commitMsg];
    return core.group(`[GIT Commit] ${groupMsg}...`,
      () => GitOps.checkoutBranch(branch)
        .then(() => this.configGitUser())
        .then(gc => strictExec('git', [...gc, ...commitArgs], `Cannot commit`))
        .then(
          () => strictExec('git', ['show', '--shortstat', '--show-signature'], `Cannot show recently commit`, false))
        .then(() => strictExec('git', ['rev-parse', 'HEAD'], 'Cannot get recently commit'))
        .then(r => r.stdout)
        .then(commitId => ({ isCommitted: true, isPushed: false, commitMsg, commitId })));
  }

  private async configGitUser(): Promise<string[]> {
    const userName = await GitOps.execSilent(['config', 'user.name'], this.config.userName);
    const userEmail = await GitOps.execSilent(['config', 'user.email'], this.config.userEmail);
    return Promise.resolve(['-c', `user.name=${userName}`, '-c', `user.email=${userEmail}`]);
  };

  private static async checkoutBranch(branch?: string) {
    if (isEmpty(branch)) {
      return Promise.resolve();
    }
    await strictExec('git', ['fetch', '--depth=1'], 'Cannot fetch');
    await strictExec('git', ['checkout', branch!], 'Cannot checkout');
  };

  private static async execSilent(args: string[], fallback: string = ''): Promise<string> {
    const r = await exec('git', args);
    if (!r.success) {
      core.warning(`Cannot exec GIT ${args[0]}: ${r.stderr}`);
    }
    return r.success ? r.stdout : fallback;
  };
}
