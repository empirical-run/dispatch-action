# Dispatch action

## Usage

```yml
- name: Build step
  id: prev-step
  run: ...

- name: Dispatch for tests
  uses: empirical-run/dispatch-action@main
  with:
    build-url: ${{ steps.prev-step.outputs.url }}
```

Supported inputs
- [x] build-url: **Required** input, with url to the application build
- [ ] slack-channel: Slack channel for reporting results

## Development

```sh
npm install
npm run dev
```

The `dist/index.js` file needs to be committed.
