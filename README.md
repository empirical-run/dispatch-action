# Dispatch action

## Usage

```yml
- name: Build step
  id: prev-step
  run: ...

- name: Dispatch for tests
  uses: empirical-run/dispatch-action@main
  with:
    environment: production # or staging or mobile
    build-url: ${{ steps.prev-step.outputs.url }}
```

Supported inputs

- [x] environment: **Required** input, to specify which environment to run the tests against. Configure environments by contacting us.
- [x] build-url: **Required** input, for the URL of the application build
  - For web, this points to a URL of the deployment (e.g. `https://staging.your-app.com`)
  - For mobile, this points to a downloadable file, ending in `.apk`, `.aab` or `.ipa`

> Note that this Action only supports whitelisted GitHub organizations. To get access, contact us.

## Development

```sh
npm install
npm run dev
```

The `dist/index.js` file needs to be committed.
