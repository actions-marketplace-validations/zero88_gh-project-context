import * as core from '@actions/core';
import * as aexec from '@actions/exec';
import { ExecOptions } from '@actions/exec';

export interface ExecResult {
  success: boolean;
  stdout: string;
  stderr: string;
}

export const exec = async (command: string, args: string[] = [], silent?: boolean): Promise<ExecResult> => {
  let stdout: string = '';
  let stderr: string = '';

  const options: ExecOptions = {
    silent: silent,
    ignoreReturnCode: true,
    listeners: {
      stdout: (data: Buffer) => stdout += data.toString(),
      stderr: (data: Buffer) => stderr += data.toString(),
    },
  };

  const returnCode: number = await aexec.exec(command, args, options);

  return { success: returnCode === 0, stdout: stdout.trim(), stderr: stderr.trim() };
};

export const strictExec = async (command: string, args: string[], msgIfError: string,
  silent: boolean = true): Promise<ExecResult> => {
  return exec(command, args ?? [], silent).then(r => {
    if (!r.success) {
      core.warning(r.stdout);
      throw `${msgIfError}. Error: ${r.stderr}`;
    }
    return r;
  });
};

export const readEnv = (envVar: string): string => process.env[envVar] ?? '';
