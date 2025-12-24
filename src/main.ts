import * as github from "@actions/github";

const URL = require("url").URL;

export const isValidUrl = (s: string) => {
  try {
    new URL(s);
    return true;
  } catch (err) {
    return false;
  }
};

export function getCommitSha(): string {
  if (github.context.eventName === "pull_request") {
    // github.context.sha will give sha for the merged commit
    return github.context.payload.pull_request!.head.sha;
  }
  return github.context.sha;
}

async function getBranchForCommit(
  commitSha: string,
): Promise<string | undefined> {
  const octokit = github.getOctokit(process.env.GITHUB_TOKEN!);
  const { owner, repo } = github.context.repo;

  // Strategy 1: Check if commit is HEAD of any branch
  try {
    console.log("Fetching branch for commit:", commitSha);
    const { data: branches } =
      await octokit.rest.repos.listBranchesForHeadCommit({
        owner,
        repo,
        commit_sha: commitSha,
      });
    console.log("Related branches for commit:", branches);
    if (branches.length > 0) {
      return branches[0].name;
    }
    console.log("No related branches found for commit:", commitSha);
  } catch (error) {
    console.error("Error fetching branches for HEAD commit:", error);
  }

  // Strategy 2: Find via associated PRs (works for merged PRs where commit is no longer at HEAD)
  try {
    console.log("Trying to find branch via associated PRs...");
    const { data: prs } =
      await octokit.rest.repos.listPullRequestsAssociatedWithCommit({
        owner,
        repo,
        commit_sha: commitSha,
      });
    if (prs && prs.length > 0) {
      // Prefer the PR where this commit is the merge commit
      const mergePR = prs.find((pr) => pr.merge_commit_sha === commitSha);
      const pr = mergePR ?? prs[0];
      if (pr.base?.ref) {
        console.log("Found branch via associated PR:", pr.base.ref);
        return pr.base.ref;
      }
    }
    console.log("No associated PRs found for commit:", commitSha);
  } catch (error) {
    console.error("Error fetching associated PRs:", error);
  }

  return undefined;
}

export async function getBranchName(): Promise<string | undefined> {
  console.log("Get branch name for event", github.context.eventName);
  if (github.context.eventName === "pull_request") {
    // github.context.ref will give ref for the merged commit, which is refs/pull/<pr_number>/merge
    // so we pick the ref of the `head` from the pull request object
    return github.context.payload.pull_request!.head.ref;
  }
  if (
    github.context.eventName === "deployment_status" ||
    github.context.eventName === "deployment"
  ) {
    const deployment = github.context.payload.deployment!;
    const sha = deployment.sha;
    const ref = deployment.ref;
    if (sha === ref) {
      console.log("Deployment event with sha and ref as same value:", sha);
      // Vercel deployments have the sha and ref as the same value, both
      // contain the commit sha. We want to get the branch name instead.
      // We don't want to send the `ref` as branch name in this case.
      let branchName: string | undefined = undefined;
      if (process.env.GITHUB_TOKEN) {
        // If GITHUB_TOKEN is available, we will get the branch name via Octokit.
        branchName = await getBranchForCommit(sha);
      }

      return branchName;
    } else {
      return ref;
    }
  }

  // For push events
  if (github.context.ref) {
    // ref is fully-formed (e.g. refs/heads/<branch_name>)
    if (github.context.ref.startsWith("refs/heads/")) {
      return github.context.ref.replace("refs/heads/", "");
    }
    // Handle other ref formats if needed
    if (github.context.ref.startsWith("refs/tags/")) {
      return github.context.ref.replace("refs/tags/", "");
    }
  }

  console.log(`No branch info found for event: ${github.context.eventName}`);
  return "";
}

export function getCommitUrl(): string {
  const commitSha = getCommitSha();
  const owner = github.context.repo.owner;
  const name = github.context.repo.repo;
  return `https://github.com/${owner}/${name}/commit/${commitSha}`;
}

export async function getActor(): Promise<string> {
  console.log("Getting author for event:", github.context.eventName);

  switch (github.context.eventName) {
    case "push":
      // For push events, the author is in event.commits[0].author.username or .name
      if (
        github.context.payload.commits &&
        github.context.payload.commits.length > 0
      ) {
        return (
          github.context.payload.commits[0].author.username ||
          github.context.payload.commits[0].author.name ||
          github.context.actor
        );
      }
      break;

    case "pull_request":
      // For PR events, we can get the author from the PR object
      if (github.context.payload.pull_request) {
        return (
          github.context.payload.pull_request.user.login || github.context.actor
        );
      }
      break;

    case "deployment":
    case "deployment_status":
      // For deployment events, get the author of the commit using Octokit
      if (
        github.context.payload.deployment &&
        github.context.payload.deployment.sha
      ) {
        try {
          const commitSha = github.context.payload.deployment.sha;
          console.log("Fetching author for deployment commit:", commitSha);

          // Check if GITHUB_TOKEN is available
          if (process.env.GITHUB_TOKEN) {
            const octokit = github.getOctokit(process.env.GITHUB_TOKEN);

            const { data: commitData } = await octokit.rest.repos.getCommit({
              owner: github.context.repo.owner,
              repo: github.context.repo.repo,
              ref: commitSha,
            });

            if (commitData && commitData.author) {
              console.log(
                "Found author for deployment commit:",
                commitData.author.login,
              );
              return commitData.author.login || github.context.actor;
            }
          } else {
            console.log(
              "GITHUB_TOKEN not available, cannot fetch commit author",
            );
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
