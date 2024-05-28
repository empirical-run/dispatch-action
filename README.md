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
    slack-webhook-url: https://hooks.slack.com/optional/input
```

Supported inputs
- [x] build-url: **Required** input, for the URl of the application build
- [x] slack-webhook-url: **Optional** input, for a Slack incoming webhook URL; [learn more](#slack-alerts)

> Note that this Action only supports whitelisted GitHub organizations. To get access, contact us.

## Development

```sh
npm install
npm run dev
```

The `dist/index.js` file needs to be committed.

## Slack alerts

Configure the `slack-webhook-url` input to get alerts like this.

<img width="517" alt="Slack alerts" src="https://github.com/empirical-run/dispatch-action/assets/284612/32ec902a-c8d0-48d6-afe3-447e0aaec049">

### Get a new incoming webhook URL

1. Go to https://api.slack.com/apps?new_app=1
2. Select "From Scratch"
3. Define an App name, say "Test alerts" and workspace
4. Click on incoming webhooks in the sidebar
5. Click on "Add new webhook to workspace" and choose the channel to send alerts
6. Copy the webhook URL and input it in the YML config
