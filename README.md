# Easy Block for X

A Chrome extension that adds a one-click block button to posts on X (Twitter).

## Features

- Adds a block button next to the "..." menu on every tweet
- One-click blocking - no confirmation dialogs
- Visual feedback: red hover, spinning while loading, green on success
- Dynamically captures auth tokens from your session (no hardcoded credentials)

## Installation

1. Clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the cloned folder

## Usage

Navigate to x.com while logged in. You'll see a block icon (circle with slash) next to the "..." menu on each tweet. Click it to instantly block that user.

## How it Works

The extension:
1. Injects an interceptor at page load to capture the Bearer token from X's own API requests
2. Reads the CSRF token from cookies
3. When you click block, it fetches the user ID via X's GraphQL API
4. Calls the block API endpoint

## Files

- `manifest.json` - Chrome extension manifest (Manifest V3)
- `injector.js` - Runs at document_start to inject scripts into page context
- `interceptor.js` - Captures Bearer token from X's fetch/XHR requests
- `content.js` - Main logic: adds buttons, handles clicks, calls APIs
- `styles.css` - Button styling and animations

## Built With

This extension was built with [OpenCode](https://opencode.ai). View the session: https://opncd.ai/share/vi0jGZL7

## License

MIT
