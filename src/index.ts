import * as core from "@actions/core";
import * as github from "@actions/github";
import {
  getActor,
  getBranchName,
  getCommitSha,
  getCommitUrl,
  isValidUrl,
} from "./main";

function parseMetadata(
  input: string,
): { data: Record<string, string | number> } | { error: string } {
  const metadata: Record<string, string | number> = {};
  const lines = input.split("\n").filter((line) => line.trim());
  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) {
      return { error: `Invalid metadata line: "${line}". Expected format: "key: value"` };
    }
    const key = line.slice(0, colonIndex).trim();
    const rawValue = line.slice(colonIndex + 1).trim();
    const numValue = Number(rawValue);
    metadata[key] = isNaN(numValue) ? rawValue : numValue;
  }
  return { data: metadata };
}

(async function run(): Promise<void> {
  try {
    const buildUrl: string = core.getInput("build-url");
    if (!buildUrl) {
      core.setFailed(`Missing config parameter: build-url.`);
    } else if (!isValidUrl(buildUrl)) {
      core.setFailed(`Invalid config: build-url must be a valid URL.`);
    }
    const slackWebhookUrl: string = core.getInput("slack-webhook-url");
    if (slackWebhookUrl) {
      console.log(
        `Warning: slack-webhook-url is not a supported input, and will be ignored.`,
      );
    }
    const platform: string = core.getInput("platform");
    if (platform) {
      console.warn(
        `Warning: platform is a deprecated input, you should use environment instead.`,
      );
    }

    const environment = core.getInput("environment");
    if (!platform && !environment) {
      core.setFailed(
        `Missing config parameter: either of "environment" or "platform" (deprecated) needs to passed`,
      );
    }

    const authKey = core.getInput("auth-key");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "@empiricalrun/dispatch-action",
    };
    if (authKey) {
      console.log(`Setting an auth header for the request.`);
      headers["Authorization"] = `Bearer ${authKey}`;
    }

    const branch = await getBranchName();
    console.log(`Branch name: ${branch}`);

    const metadataInput = core.getInput("metadata");
    let metadata: Record<string, string | number> | undefined;
    if (metadataInput) {
      const result = parseMetadata(metadataInput);
      if ("error" in result) {
        core.warning(result.error);
      } else {
        metadata = result.data;
      }
    }

    const response = await fetch("https://dispatch.empirical.run/v1/trigger", {
      method: "POST",
      headers,
      body: JSON.stringify({
        origin: {
          owner: github.context.repo.owner,
          name: github.context.repo.repo,
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
        metadata,
      }),
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
})();
