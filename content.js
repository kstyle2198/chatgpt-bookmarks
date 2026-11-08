(() => {
  "use strict";

  if (window.__chatgptLearningBookmarksLoaded) return;
  window.__chatgptLearningBookmarksLoaded = true;

  const STORAGE_KEY = "chatgptBookmarks";
  const BUTTON_CLASS = "clb-bookmark-button";
  const SAVED_CLASS = "clb-bookmarked-heading";
  const HIGHLIGHT_CLASS = "clb-bookmark-highlight";
  const HEADING_SELECTOR = "h1, h2, h3, h4";
  let scanQueued = false;

  const normalize = value => (value || "").replace(/\s+/g, " ").trim();

  // Read only the heading's own text, excluding the injected bookmark button.
  function getHeadingTitle(heading) {
    const clone = heading.cloneNode(true);
    clone.querySelectorAll(`.${BUTTON_CLASS}`).forEach(node => node.remove());
    return normalize(clone.innerText || clone.textContent);
  }

  function getConversationId() {
    const match = location.pathname.match(/\/c\/([^/?#]+)/);
    return match ? match[1] : location.pathname;
  }

  function collectAssistantHeadings() {
    const explicitMessages = Array.from(
      document.querySelectorAll('[data-message-author-role="assistant"]')
    );

    if (explicitMessages.length) {
      const result = [];
      explicitMessages.forEach((message, messageIndex) => {
        message.querySelectorAll(HEADING_SELECTOR).forEach((heading, headingIndex) => {
          result.push({ heading, message, messageIndex, headingIndex });
        });
      });
      return result;
    }

    const main = document.querySelector("main") || document.body;
    return Array.from(main.querySelectorAll(HEADING_SELECTOR))
      .filter(heading => {
        if (heading.closest("nav, aside, header, footer, [role='navigation'], dialog")) return false;
        if (heading.closest('[data-message-author-role="user"]')) return false;
        return true;
      })
      .map((heading, index) => ({
        heading,
        message: heading.closest("article") ||
                 heading.closest('[data-testid^="conversation-turn"]') ||
                 heading.parentElement,
        messageIndex: 0,
        headingIndex: index
      }));
  }

  async function readBookmarks() {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    return Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
  }

  function makeId(conversationId, messageIndex, headingIndex, title) {
    return [conversationId, messageIndex, headingIndex, normalize(title)].join("::");
  }

  async function refreshButtons() {
    const bookmarks = await readBookmarks();
    const savedIds = new Set(bookmarks.map(item => item.id));

    document.querySelectorAll(`.${BUTTON_CLASS}`).forEach(button => {
      const saved = savedIds.has(button.dataset.bookmarkId);
      button.textContent = saved ? "★" : "☆";
      button.classList.toggle("is-saved", saved);
      button.title = saved ? "북마크 해제" : "북마크 추가";
      button.setAttribute("aria-label", button.title);
      button.setAttribute("aria-pressed", saved ? "true" : "false");

      const heading = button.closest(HEADING_SELECTOR);
      if (heading) heading.classList.toggle(SAVED_CLASS, saved);
    });
  }

  async function toggleBookmark(item) {
    const title = getHeadingTitle(item.heading);
    const conversationId = getConversationId();
    const id = makeId(conversationId, item.messageIndex, item.headingIndex, title);
    const bookmarks = await readBookmarks();
    const index = bookmarks.findIndex(bookmark => bookmark.id === id);

    if (index >= 0) {
      bookmarks.splice(index, 1);
    } else {
      bookmarks.unshift({
        id,
        title: title || "(제목 없음)",
        url: location.href,
        conversationId,
        messageIndex: item.messageIndex,
        headingIndex: item.headingIndex,
        preview: normalize(item.message?.innerText || item.heading.parentElement?.innerText).slice(0, 220),
        createdAt: new Date().toISOString()
      });
    }

    await chrome.storage.local.set({ [STORAGE_KEY]: bookmarks });
    await refreshButtons();
  }

  function addButtons() {
    const items = collectAssistantHeadings();

    items.forEach(item => {
      const heading = item.heading;
      if (heading.querySelector(`:scope > .${BUTTON_CLASS}`)) return;

      const button = document.createElement("button");
      button.type = "button";
      button.className = BUTTON_CLASS;
      button.textContent = "☆";
      button.title = "북마크 추가";
      button.setAttribute("aria-label", "북마크 추가");

      // Keep the same identity for saving and restoring the star state.
      button.dataset.bookmarkId = makeId(
        getConversationId(),
        item.messageIndex,
        item.headingIndex,
        getHeadingTitle(heading)
      );

      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        toggleBookmark(item).catch(error => {
          console.error("[ChatGPT Bookmarks] Save failed:", error);
        });
      });

      heading.appendChild(button);
    });

    refreshButtons().catch(console.error);
  }

  function scheduleScan() {
    if (scanQueued) return;
    scanQueued = true;
    requestAnimationFrame(() => {
      scanQueued = false;
      addButtons();
    });
  }

  function findHeading(bookmark) {
    const items = collectAssistantHeadings();
    const preferred = items.find(item =>
      item.messageIndex === bookmark.messageIndex &&
      item.headingIndex === bookmark.headingIndex &&
      getHeadingTitle(item.heading) === normalize(bookmark.title)
    );
    if (preferred) return preferred.heading;

    const exact = items.find(item => getHeadingTitle(item.heading) === normalize(bookmark.title));
    return exact?.heading || null;
  }

  function jumpToBookmark(bookmark) {
    const heading = findHeading(bookmark);
    if (!heading) {
      return { ok: false, error: "해당 제목을 아직 찾지 못했습니다. 응답 로딩이 끝난 뒤 다시 시도해 주세요." };
    }

    heading.scrollIntoView({ behavior: "smooth", block: "center" });
    heading.classList.add(HIGHLIGHT_CLASS);
    window.setTimeout(() => heading.classList.remove(HIGHLIGHT_CLASS), 2600);
    return { ok: true };
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === "CLB_JUMP_TO_BOOKMARK") {
      sendResponse(jumpToBookmark(message.bookmark));
    }
    return true;
  });

  const observer = new MutationObserver(scheduleScan);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  scheduleScan();
  window.setTimeout(scheduleScan, 1200);
  window.setTimeout(scheduleScan, 3500);

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes[STORAGE_KEY]) refreshButtons();
  });

  console.info("[ChatGPT Bookmarks] v1.2 active:", location.href);
})();
