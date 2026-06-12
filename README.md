# Dispatch action

## Usage

```yml
- name: Build step
  id: prev-step
  run: ...

- name: Dispatch for tests
  uses: empirical-run/dispatch-action@main
  with:
    auth-key: ${{ secrets.EMPIRICALRUN_KEY }}
    environment: production # or staging or mobile
    environment-variables: |
      BUILD_URL: ${{ steps.prev-step.outputs.url }}
```

Supported inputs

- [x] auth-key: **Required** input, for authentication.
- [x] environment: **Required** input, to specify which environment to run the tests against. Configure environments by contacting us.
- [ ] environment-variables: Optional environment variables for the test run, one per line (e.g. `NAME: value`). These override the environment's configured variables.
  - Use `BUILD_URL` to point the tests at the application build under test
  - For web, this points to a URL of the deployment (e.g. `https://staging.your-app.com`)
  - For mobile, this points to a downloadable file, ending in `.apk`, `.aab` or `.ipa`
- [ ] metadata: Optional key-value pairs for custom metadata, one per line (e.g. `key: value`)
- [ ] build-url: **Deprecated**, the build URL is sent to tests as the `BUILD_URL` environment variable — set it via `environment-variables` instead.

### With metadata

```yml
- name: Dispatch for tests
  uses: empirical-run/dispatch-action@main
  with:
    auth-key: ${{ secrets.EMPIRICALRUN_KEY }}
    environment: production
    environment-variables: |
      BUILD_URL: ${{ steps.prev-step.outputs.url }}
    metadata: |
      version: 1.2.3
      pr_number: 42
```

### Vercel deployments

If you are dispatching test run requests for Vercel deployments, it is a good idea to add the GITHUB_TOKEN
environment variable to pull branch info.

```yml
- name: Dispatch for tests
  uses: empirical-run/dispatch-action@main
  with:
    auth-key: ${{ secrets.EMPIRICALRUN_KEY }}
    environment: production # or staging or mobile
    environment-variables: |
      BUILD_URL: ${{ github.event.deployment_status.target_url }}
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Development

Source lives in the empirical monorepo under `github-actions/dispatch` (part of
the pnpm workspace). The public `empirical-run/dispatch-action` repo is a
distribution mirror (`action.yml` + generated `dist/`), published by the
`sync-github-action-dispatch` workflow on every push to main.

```sh
pnpm install
pnpm --filter @empiricalrun/shared-types build
pnpm --filter @empiricalrun/dispatch-action build
```

The request payload is typed against `DispatchTriggerRequestV1` from
`@empiricalrun/shared-types/api/dispatch`, which the dispatch-worker also uses —
contract drift fails `type-check`.
