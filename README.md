# Dispatch action

## Usage

```yml
- name: Build step
  id: prev-step
  run: ...

- name: Dispatch for tests
  uses: empirical-run/dispatch-action@v1
  with:
    auth-key: ${{ secrets.EMPIRICALRUN_KEY }}
    environment: production # or staging or mobile
    environment-variables: |
      BUILD_URL: ${{ steps.prev-step.outputs.url }}
    concurrency: |
      group: production/acme/web
      on-conflict: wait
```

Supported inputs

- [x] auth-key: **Required** input, for authentication.
- [x] environment: **Required** input, to specify which environment to run the tests against. Configure environments by contacting us.
- [ ] environment-variables: Optional environment variables for the test run, one per line (e.g. `NAME: value`). These override the environment's configured variables.
  - Use `BUILD_URL` to point the tests at the application build under test
  - For web, this points to a URL of the deployment (e.g. `https://staging.your-app.com`)
  - For mobile, this points to a downloadable file, ending in `.apk`, `.aab` or `.ipa`
- [ ] metadata: Optional key-value pairs for custom metadata, one per line (e.g. `key: value`)
- [ ] concurrency: Optional concurrency settings, with `group` and `on-conflict` (`cancel` or `wait`) on separate lines.
- [ ] build-url: **Deprecated**, the build URL is sent to tests as the `BUILD_URL` environment variable — set it via `environment-variables` instead.

### With metadata

```yml
- name: Dispatch for tests
  uses: empirical-run/dispatch-action@v1
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
  uses: empirical-run/dispatch-action@v1
  with:
    auth-key: ${{ secrets.EMPIRICALRUN_KEY }}
    environment: production # or staging or mobile
    environment-variables: |
      BUILD_URL: ${{ github.event.deployment_status.target_url }}
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Versioning

Use `@v1` to receive backwards-compatible fixes without automatically adopting
breaking releases. Pin an exact version such as `@v1.0.0` when you need an
unchanging release reference.

## Development

Source lives in the empirical monorepo under `github-actions/dispatch` (part of
the pnpm workspace). The public `empirical-run/dispatch-action` repo is a
distribution mirror (`action.yml` + generated `dist/`), published by the
`sync-github-action-dispatch` workflow. Monorepo `main` syncs to both public
`main` (v1 and legacy `@main` consumers) and public `release/v2`. Stable
releases are published as exact and moving major-version tags. See the
[release guide](https://github.com/empirical-run/test-generator/blob/main/github-actions/RELEASING.md)
for the release steps.

```sh
pnpm install
pnpm --filter @empiricalrun/shared-types build
pnpm --filter @empiricalrun/dispatch-action build
```
