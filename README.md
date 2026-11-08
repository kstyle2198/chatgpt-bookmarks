# ChatGPT Bookmarks

**Bookmark important headings in ChatGPT answers and jump back to them later.**

ChatGPT Bookmarks is an unofficial Chrome extension that adds a bookmark star next to headings in ChatGPT assistant responses. Saved headings can be reviewed from the extension popup and used to navigate back to the relevant section.

- Repository: https://github.com/kstyle2198/chatgpt-bookmarks
- License: MIT
- Manifest: Chrome Extension Manifest V3

> This is an independent community project and is not affiliated with, endorsed by, or sponsored by OpenAI.

## Features

- Detect headings (`H1`–`H4`) in ChatGPT assistant responses.
- Add or remove a bookmark using the star next to a heading.
- Show saved bookmarks with a filled gold star.
- Highlight bookmarked headings in the conversation.
- Open a saved conversation and scroll to its bookmarked heading.
- Store bookmark records locally using `chrome.storage.local`.

## Supported websites

- https://chatgpt.com/
- https://chat.openai.com/ (legacy domain)

ChatGPT may change its page structure. If that happens, heading detection or navigation may need an update.

## Installation

### Install from source (developer mode)

1. Download or clone this repository.
2. Open `chrome://extensions` in Google Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the folder containing `manifest.json`.
6. Open or refresh ChatGPT.

### Install from Chrome Web Store

A Chrome Web Store listing will be linked here after publication.

## How to use

1. Open a ChatGPT conversation.
2. Find a heading in an assistant response.
3. Click the `☆` icon next to the heading to save it.
4. The star changes to a filled gold `★`; the heading receives a soft highlight.
5. Click the star again to remove the bookmark.
6. Open the extension popup and select a saved heading to return to it.

## Data and privacy

Bookmark information is stored in the browser's local extension storage (`chrome.storage.local`). The current version does not include an application server, analytics SDK, advertising SDK, or remote bookmark-sync service.

The extension reads heading text and a short surrounding response preview to create bookmark entries. A bookmark record can include:

- Heading title
- ChatGPT conversation URL and conversation identifier
- Message and heading positions used as navigation hints
- A short text preview (up to approximately 220 characters)
- Creation timestamp

See [PRIVACY.md](PRIVACY.md) for details.

## Permissions

| Permission | Why it is used |
|---|---|
| `storage` | Save and retrieve bookmarks locally in the browser. |
| `tabs` | Find, open, and activate a ChatGPT tab when navigating to a saved bookmark. |
| Host access to `chatgpt.com` and `chat.openai.com` | Run the content script on supported ChatGPT pages to detect headings and add bookmark controls. |

The extension does not need access to unrelated websites.

## Project structure

```text
chatgpt-bookmarks/
├── manifest.json
├── content.js
├── content.css
├── popup.html
├── popup.js
├── popup.css
├── README.md
├── PRIVACY.md
└── LICENSE
```

## Known limitations

- The extension depends on ChatGPT's page DOM. A ChatGPT UI update can affect heading detection or navigation.
- If multiple headings have the same text, navigation may use message and heading position as a fallback.
- If the target response has not loaded yet, navigation may not find the heading. Wait for the conversation to finish loading and try again.
- Bookmarks are local to the current Chrome profile. They are not automatically synced between devices.
- Clearing browser extension data or removing the extension may remove locally stored bookmarks. Export/backup is not currently provided.
- This project is currently focused on Chrome and Chromium browsers; other browsers have not been verified.

## Development

This project uses plain JavaScript, HTML, and CSS. No build step is required.

After changing extension files:

1. Open `chrome://extensions`.
2. Click the extension's **Reload** button.
3. Refresh the ChatGPT tab.

## Contributing

Issues and pull requests are welcome.

When reporting a bug, please include:

- Browser name and version
- Extension version
- The ChatGPT page URL pattern (do not include private conversation content)
- Steps to reproduce
- Relevant console errors, with personal information removed

Please avoid submitting private ChatGPT conversations, account information, access tokens, or other sensitive data.

## License

Distributed under the MIT License. See [LICENSE](LICENSE).
