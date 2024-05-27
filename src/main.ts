import * as core from '@actions/core';
import * as github from '@actions/github';

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const buildUrl: string = core.getInput('build-url');
    if (!buildUrl) {
      core.setFailed(`Missing config parameter: build-url.`)
    }

    const response = await fetch("https://dispatch.empirical.run", {
      method: "POST",
      body: JSON.stringify({
        repo: {
          owner: github.context.repo.owner,
          name: github.context.repo.repo
        },
        event_type: "on-demand-test",
        client_payload: {
          build_url: buildUrl,
          "unit": false,
          "integration": true
        }
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
