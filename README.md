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
    platform: web
```

Supported inputs
- [x] build-url: **Required** input, for the URl of the application build
- [x] slack-webhook-url: **Optional** input, for a Slack incoming webhook URL; [learn more](#get-slack-alerts)
- [x] platform: **Optional** input, for a Slack incoming webhook URL; [learn more](#get-slack-alerts)

> Note that this Action only supports whitelisted GitHub organizations. To get access, contact us.

### Get Slack alerts

Configure the `slack-webhook-url` input to get alerts like this.

<img width="517" alt="Slack alerts" src="https://github.com/empirical-run/dispatch-action/assets/284612/32ec902a-c8d0-48d6-afe3-447e0aaec049">

#### Configuration steps

In the following steps, we will create a new incoming webhook for your Slack workspace. For more verbose
steps, follow the [official Slack guide](https://api.slack.com/messaging/webhooks).

- Use [this link](https://api.slack.com/apps?new_app=1) to go to your Slack apps dashboard, and create a new app
- Select "From scratch" in the "Create an app" dialog
- Define an app name, say "Test alerts", and your workspace. Once submitted, your app is created
- In the app settings, click on "Incoming webhooks" in the sidebar
- Click on "Add new webhook to workspace" and choose the channel to send alerts to
- Copy the webhook URL and set it as `slack-webhook-url` in your GitHub Actions YML

## Development

```sh
npm install
npm run dev
```

The `dist/index.js` file needs to be committed.
