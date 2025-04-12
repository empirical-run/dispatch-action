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
    build-url: ${{ steps.prev-step.outputs.url }}
```

Supported inputs

- [x] auth-key: **Required** input, for authentication.
- [x] environment: **Required** input, to specify which environment to run the tests against. Configure environments by contacting us.
- [x] build-url: **Required** input, for the URL of the application build
  - For web, this points to a URL of the deployment (e.g. `https://staging.your-app.com`)
  - For mobile, this points to a downloadable file, ending in `.apk`, `.aab` or `.ipa`

### Vercel deployments

If you are dispatching test run requests for Vercel deployments, it is a good idea to add the GITHUB_TOKEN
environment variable to pull branch info.

```yml
- name: Dispatch for tests
  uses: empirical-run/dispatch-action@main
  with:
    environment: production # or staging or mobile
    build-url: ${{ steps.prev-step.outputs.url }}
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Development

```sh
npm install
npm run dev
```

The `dist/index.js` file needs to be committed.
