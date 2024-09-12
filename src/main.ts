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

const isValidPlatform = (s: string) => {
  return ["web", "ios", "android"].includes(s);
}

function getBranchName(): string {
  // TODO: should we support `release` eventName 
  if (github.context.eventName === 'pull_request') {
    // ref is refs/pull/<pr_number>/merge
    // so we pick the `head_ref` from the payload
    console.log(github.context.payload.pull_request!.head);
  } else if (github.context.eventName === 'push') {
    // ref is refs/heads/<branch_name>
    return github.context.ref.replace("refs/heads/", "");
  }
  return github.context.ref;
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
    if (platform && !isValidPlatform(platform)) {
      core.setFailed(`Invalid config: platform must be one of web, android or ios.`)
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
          commit: github.context.sha,
          branch: getBranchName(),
        },
        platform,
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
