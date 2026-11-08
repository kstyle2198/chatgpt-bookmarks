# Privacy Policy

**Last updated: November 8, 2026**

ChatGPT Bookmarks ("the Extension") is an independent browser extension that lets users bookmark headings in ChatGPT responses.

This policy describes what information the current version handles and how it is stored.

## 1. Information the Extension handles

When a user saves a heading, the Extension may store the following bookmark information:

- The heading text.
- The URL and identifier of the ChatGPT conversation.
- Message and heading indexes used to help locate the heading again.
- A short preview extracted from the surrounding assistant response (up to approximately 220 characters).
- The date and time the bookmark was created.

The Extension also reads ChatGPT page headings in order to place bookmark controls beside them.

## 2. Where information is stored

Bookmark records are stored in Chrome's local extension storage (`chrome.storage.local`) in the user's browser profile.

The current version does not operate a developer-controlled server or cloud database for bookmark data. It does not provide cross-device bookmark synchronization.

## 3. Sharing and sale

The current version does not send bookmark records to the project maintainer or sell them to third parties.

The Extension does not include advertising or third-party analytics code.

Information may still be handled by the browser and ChatGPT according to their own privacy policies and settings.

## 4. Permissions

The Extension requests these permissions:

- `storage`: to save and retrieve bookmarks in local extension storage.
- `tabs`: to locate, open, or activate a ChatGPT tab when the user chooses a saved bookmark.
- Host access to `https://chatgpt.com/*` and `https://chat.openai.com/*`: to run the content script on supported ChatGPT pages and interact with headings in those pages.

## 5. User choices and deletion

Users can remove an individual bookmark from the Extension popup or remove all saved bookmarks using the available delete control.

Uninstalling the Extension or clearing its browser extension data may also remove locally stored bookmarks. Users should export or otherwise preserve information they want to keep before removing the Extension; export functionality is not currently included.

## 6. Security

Bookmark data is stored using the browser's extension storage facility. Users should protect access to their browser profile and device.

No method of electronic storage is completely secure. The project does not guarantee absolute security.

## 7. Children's privacy

The Extension is a general-purpose productivity tool and is not designed specifically for children. The project does not knowingly collect personal information from children through a developer-operated service.

## 8. Changes to this policy

This policy may be updated when the Extension's features, permissions, or data practices change. The latest version will be published in the project's GitHub repository.

## 9. Contact

For privacy questions or concerns, please open an issue in the project repository:

https://github.com/kstyle2198/chatgpt-bookmarks/issues

Please do not include private ChatGPT conversation content, passwords, access tokens, or other sensitive information in public issues.

---

ChatGPT Bookmarks is an independent project and is not affiliated with, endorsed by, or sponsored by OpenAI.
