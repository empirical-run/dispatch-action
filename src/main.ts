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
    console.log("Fetching branch for commit:", commitSha);
    const octokit = github.getOctokit(process.env.GITHUB_TOKEN!);
    const { data: branches } = await octokit.rest.repos.listBranchesForHeadCommit({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      commit_sha: commitSha,
    });
    console.log("Related branches for commit:", branches);
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
  console.log("Get branch name for event", github.context.eventName);
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
      console.log("Deployment event with sha and ref as same value:", sha);
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

async function getActor(): Promise<string> {
  console.log("Getting author for event:", github.context.eventName);
  
  switch (github.context.eventName) {
    case 'push':
      // For push events, the author is in event.commits[0].author.username or .name
      if (github.context.payload.commits && github.context.payload.commits.length > 0) {
        return github.context.payload.commits[0].author.username || 
               github.context.payload.commits[0].author.name || 
               github.context.actor;
      }
      break;
      
    case 'pull_request':
      // For PR events, we can get the author from the PR object
      if (github.context.payload.pull_request) {
        return github.context.payload.pull_request.user.login || github.context.actor;
      }
      break;
      
    case 'deployment':
    case 'deployment_status':
      // For deployment events, get the author of the commit using Octokit
      if (github.context.payload.deployment && github.context.payload.deployment.sha) {
        try {
          const commitSha = github.context.payload.deployment.sha;
          console.log("Fetching author for deployment commit:", commitSha);
          
          // Check if GITHUB_TOKEN is available
          if (process.env.GITHUB_TOKEN) {
            const octokit = github.getOctokit(process.env.GITHUB_TOKEN);
            
            const { data: commitData } = await octokit.rest.repos.getCommit({
              owner: github.context.repo.owner,
              repo: github.context.repo.repo,
              ref: commitSha
            });
            
            if (commitData && commitData.author) {
              console.log("Found author for deployment commit:", commitData.author.login);
              return commitData.author.login || github.context.actor;
            }
          } else {
            console.log("GITHUB_TOKEN not available, cannot fetch commit author");
          }
        } catch (error) {
          console.error("Error fetching commit author:", error);
        }
      }
      break;
  }
  
  // Default fallback to the actor who triggered the workflow
  // https://github.com/actions/toolkit/issues/1143#issuecomment-2193348740
  return process.env.GITHUB_TRIGGERING_ACTOR || github.context.actor;
}

export async function run(): Promise<void> {
  try {
    const buildUrl: string = core.getInput('build-url');
    if (!buildUrl) {
      core.setFailed(`Missing config parameter: build-url.`)
    } else if (!isValidUrl(buildUrl)) {
      core.setFailed(`Invalid config: build-url must be a valid URL.`)
    }

    // TOOD: Remove platform and only keep environment
    const platform: string = core.getInput('platform');
    if (platform) {
      console.warn(`Warning: platform is a deprecated input, you should use environment instead.`)
    }
    const environment = core.getInput('environment');
    if (!platform && !environment) {
      core.setFailed(`Missing config parameter: either of "environment" or "platform" (deprecated) needs to passed`)
    }

    const authKey = core.getInput('auth-key');
    if (!authKey) {
      core.setFailed(`Missing config parameter: auth-key`)
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (authKey) {
      headers['Authorization'] = `Bearer ${authKey}`;
    }

    const branch = await getBranchName();
    console.log(`Branch name: ${branch}`);
    const response = await fetch("https://dispatch.empirical.run/v1/trigger", {
      method: "POST",
      headers,
      body: JSON.stringify({
        origin: {
          owner: github.context.repo.owner,
          name: github.context.repo.repo
        },
        build: {
          url: buildUrl,
          commit: getCommitSha(),
          branch,
          commit_url: getCommitUrl(),
        },
        platform,
        environment: environment.toLowerCase(),
        github_actor: await getActor(),
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
