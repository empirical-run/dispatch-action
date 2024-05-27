import * as core from '@actions/core';
import * as github from '@actions/github';
import { wait } from './wait';

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const ms: string = core.getInput('milliseconds')

    const payload = JSON.stringify(github.context.payload, undefined, 2);
    console.log(`The event payload: ${payload}`);

    const rawResponse = await fetch("https://dispatch-worker.saikatmitra91.workers.dev", {
			method: "POST",
			body: JSON.stringify({
        repo: {
          owner: github.context.repo.owner,
          name: github.context.repo.repo
        },
        event_type: "on-demand-test",
        client_payload: { "unit": false, "integration": true }
      })
		});

    // Debug logs are only output if the `ACTIONS_STEP_DEBUG` secret is true
    core.debug(`Waiting ${ms} milliseconds ...`)

    // Log the current timestamp, wait, then log the new timestamp
    core.debug(new Date().toTimeString())
    await wait(parseInt(ms, 10))
    core.debug(new Date().toTimeString())

    // Set outputs for other workflow steps to use
    core.setOutput('time', new Date().toTimeString())
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
