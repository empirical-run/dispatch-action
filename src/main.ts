import * as core from '@actions/core';
import * as github from '@actions/github';

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const buildUrl: string = core.getInput('build-url')

    // const payload = JSON.stringify(github.context.payload, undefined, 2);
    const response = await fetch("https://dispatch-worker.saikatmitra91.workers.dev", {
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

    // Debug logs are only output if the `ACTIONS_STEP_DEBUG` secret is true
    core.debug(`Response from worker: ${content}`)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
