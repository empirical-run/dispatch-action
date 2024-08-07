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

const eventType = (platform: string) => {
  switch (platform) {
    case "web":
      return "run-tests";
    case "android": 
      return "run-tests-android";
    case "ios": 
      return "run-tests-ios";
    default:
      return "run-tests";
  }
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const buildUrl: string = core.getInput('build-url');
    if (!buildUrl) {
      core.setFailed(`Missing config parameter: build-url.`)
    } else if (!isValidUrl(buildUrl)) {
      core.setFailed(`Invalid config: build-url must be a valid URL.`)
    }
    const slackWebhookUrl: string = core.getInput('slack-webhook-url');
    if (slackWebhookUrl && !isValidUrl(slackWebhookUrl)) {
      core.setFailed(`Invalid config: slack-webhook-url must be a valid URL.`)
    }
    const platform: string = core.getInput('platform');
    if (platform && !isValidPlatform(platform)) {
      core.setFailed(`Invalid config: platform must be one of web, android or ios.`)
    }

    const clientPayload: any = {
      build_url: buildUrl
    };
    if (slackWebhookUrl) {
      clientPayload.slack_webhook_url = slackWebhookUrl;
    }

    const response = await fetch("https://dispatch.empirical.run", {
      method: "POST",
      body: JSON.stringify({
        repo: {
          owner: github.context.repo.owner,
          name: github.context.repo.repo
        },
        event_type: eventType(platform),
        client_payload: clientPayload
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
