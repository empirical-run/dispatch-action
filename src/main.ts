import * as core from '@actions/core';
import * as github from '@actions/github';
const URL = require("url").URL;

const isValidUrl = (s: string) => {
  try {
    new URL(s);
    return true;
  } catch (err) {
    return false;
  }
};

function getCommitSha(): string {
  if (github.context.eventName === 'pull_request') {
    // github.context.sha will give sha for the merged commit
    return github.context.payload.pull_request!.head.sha;
  }
  return github.context.sha;
}

async function getBranchForCommit(commitSha: string): Promise<string | undefined> {
  try {
    const octokit = github.getOctokit(process.env.GITHUB_TOKEN!);
    const { data: branches } = await octokit.rest.repos.listBranchesForHeadCommit({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      commit_sha: commitSha,
    });
    if (branches.length === 0) {
      console.error('No related branches found for commit:', commitSha);
      return undefined;
    }
    // Return the first branch that contains this commit
    return branches[0].name;
  } catch (error) {
    console.error('Error fetching branch:', error);
  }
  return undefined;
}

async function getBranchName(): Promise<string | undefined> {
  if (github.context.eventName === 'pull_request') {
    // github.context.ref will give ref for the merged commit, which is refs/pull/<pr_number>/merge
    // so we pick the ref of the `head` from the pull request object
    return github.context.payload.pull_request!.head.ref;
  }

  if (
    github.context.eventName === 'deployment_status' ||
    github.context.eventName === 'deployment'
  ) {
    const sha = github.context.payload.deployment!.sha;
    const ref = github.context.payload.deployment!.ref;
    if (sha === ref) {
      // Vercel deployments have the sha and ref as the same value, both 
      // contain the commit sha. We want to get the branch name instead.
      // We don't want to send the `ref` as branch name in this case.
      let branchName = undefined;
      if (process.env.GITHUB_TOKEN) {
        // If GITHUB_TOKEN is available, we will get the branch name via Octokit.
        branchName = getBranchForCommit(sha);
      }
      return branchName;
    } else {
      return ref;
    }
  }

  // For push events
  if (github.context.ref) {
    // ref is fully-formed (e.g. refs/heads/<branch_name>)
    if (github.context.ref.startsWith('refs/heads/')) {
      return github.context.ref.replace('refs/heads/', '');
    }
    // Handle other ref formats if needed
    if (github.context.ref.startsWith('refs/tags/')) {
      return github.context.ref.replace('refs/tags/', '');
    }
  }

  console.log(`No branch info found for event: ${github.context.eventName}`);
  return "";
}

function getCommitUrl(): string {
  const commitSha = getCommitSha();
  const owner = github.context.repo.owner;
  const name = github.context.repo.repo;
  return `https://github.com/${owner}/${name}/commit/${commitSha}`;
}

export async function run(): Promise<void> {
  try {
    const buildUrl: string = core.getInput('build-url');
    if (!buildUrl) {
      core.setFailed(`Missing config parameter: build-url.`)
    } else if (!isValidUrl(buildUrl)) {
      core.setFailed(`Invalid config: build-url must be a valid URL.`)
    }
    const slackWebhookUrl: string = core.getInput('slack-webhook-url');
    if (slackWebhookUrl) {
      console.log(`Warning: slack-webhook-url is not a supported input, and will be ignored.`)
    }
    const platform: string = core.getInput('platform');
    if (platform) {
      console.warn(`Warning: platform is a deprecated input, you should use environment instead.`)
    }

    const environment = core.getInput('environment');
    if (!platform && !environment) {
      core.setFailed(`Missing config parameter: either of "environment" or "platform" (deprecated) needs to passed`)
    }

    const response = await fetch("https://dispatch.empirical.run/v1/trigger", {
      method: "POST",
      body: JSON.stringify({
        origin: {
          owner: github.context.repo.owner,
          name: github.context.repo.repo
        },
        build: {
          url: buildUrl,
          commit: getCommitSha(),
          branch: (await getBranchName()),
          commit_url: getCommitUrl()
        },
        platform,
        environment,
      })
    });
    const content = await response.text();
    if (!response.ok) {
      core.setFailed(`${content}`);
    } else {
      console.log(`Dispatch request successful.`);
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message);
  }
}
