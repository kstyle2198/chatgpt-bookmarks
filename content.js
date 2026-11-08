(() => {
  "use strict";

  if (window.__chatgptLearningBookmarksLoaded) return;
  window.__chatgptLearningBookmarksLoaded = true;

  const STORAGE_KEY = "chatgptBookmarks";
  const BUTTON_CLASS = "clb-bookmark-button";
  const SAVED_CLASS = "clb-bookmarked-heading";
  const HIGHLIGHT_CLASS = "clb-bookmark-highlight";
  const HEADING_SELECTOR = "h1, h2, h3, h4";
  // Current ChatGPT response renderer (class suffix is generated, prefix is stable).
  const RESPONSE_ROOT_SELECTOR = '[class*="DilResponseRoot"]';
  let scanTimer = null;
  let scanRunning = false;
  let scanRequested = false;
  let lastUrl = location.href;

  const normalize = value => (value || "").replace(/\s+/g, " ").trim();

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
    const main = document.querySelector("main") || document.body;
    const allHeadings = Array.from(main.querySelectorAll(HEADING_SELECTOR));
    const globalIndex = new Map(allHeadings.map((heading, index) => [heading, index]));
    const roots = Array.from(main.querySelectorAll(RESPONSE_ROOT_SELECTOR));
    const result = [];

    roots.forEach((root, rootIndex) => {
      root.querySelectorAll(HEADING_SELECTOR).forEach(heading => {
        if (heading.closest("nav, aside, header, footer, [role='navigation'], dialog")) return;
        if (heading.querySelector(`.${BUTTON_CLASS}`)) {
          // Keep existing buttons in the collection so bookmark state and jump lookup work.
        }
        const title = getHeadingTitle(heading);
        if (!title) return;
        result.push({
          heading,
          message: root,
          // Keep the original v1.1 identity scheme compatible where possible:
          // messageIndex 0 + global heading index in the main content.
          messageIndex: 0,
          headingIndex: globalIndex.get(heading) ?? result.length,
          rootIndex
        });
      });
    });
    return result;
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

  async function addButtons() {
    if (scanRunning) return;
    scanRunning = true;
    try {
      const items = collectAssistantHeadings();
      let added = 0;

      items.forEach(item => {
        const heading = item.heading;
        if (heading.querySelector(`:scope > .${BUTTON_CLASS}`)) return;

        const button = document.createElement("button");
        button.type = "button";
        button.className = BUTTON_CLASS;
        button.textContent = "☆";
        button.title = "북마크 추가";
        button.setAttribute("aria-label", "북마크 추가");
        button.setAttribute("aria-pressed", "false");
        button.dataset.bookmarkId = makeId(
          getConversationId(), item.messageIndex, item.headingIndex, getHeadingTitle(heading)
        );

        button.addEventListener("click", event => {
          event.preventDefault();
          event.stopPropagation();
          toggleBookmark(item).catch(error => {
            console.error("[ChatGPT Bookmarks] Save failed:", error);
          });
        });

        heading.appendChild(button);
        added += 1;
      });

      await refreshButtons();
      if (added) console.info(`[ChatGPT Bookmarks] Added ${added} response heading button(s).`);
      console.debug("[ChatGPT Bookmarks] scan:", {
        responseRoots: document.querySelectorAll(RESPONSE_ROOT_SELECTOR).length,
        responseHeadings: items.length,
        bookmarkButtons: document.querySelectorAll(`.${BUTTON_CLASS}`).length
      });
    } catch (error) {
      console.error("[ChatGPT Bookmarks] Scan failed:", error);
    } finally {
      scanRunning = false;
    }
  }

  // Throttle scans instead of debouncing them.
  // A debounce that resets on every streamed token can postpone scanning
  // until generation finishes, which is why buttons appeared only after refresh.
  function scheduleScan(delay = 80) {
    scanRequested = true;

    // Keep the first pending timer. Do not reset it for every streamed mutation.
    if (scanTimer !== null) return;

    scanTimer = window.setTimeout(async () => {
      scanTimer = null;

      // If an async scan is still running, retry shortly rather than losing
      // the DOM changes that arrived during that scan.
      if (scanRunning) {
        scheduleScan(100);
        return;
      }

      scanRequested = false;
      await addButtons();

      // If mutations arrived while addButtons() was running, process them.
      if (scanRequested) scheduleScan(0);
    }, delay);
  }

  function findHeading(bookmark) {
    const items = collectAssistantHeadings();
    const exact = items.find(item => getHeadingTitle(item.heading) === normalize(bookmark.title));
    if (exact) return exact.heading;

    const compatible = items.find(item =>
      item.headingIndex === bookmark.headingIndex &&
      getHeadingTitle(item.heading) === normalize(bookmark.title)
    );
    return compatible?.heading || null;
  }

  function jumpToBookmark(bookmark) {
    const heading = findHeading(bookmark);
    if (!heading) {
      return { ok: false, error: "해당 제목을 아직 찾지 못했습니다. 응답이 표시된 후 다시 시도해 주세요." };
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

  // Observe streamed response rendering and DOM replacement without injecting page scripts.
  const observer = new MutationObserver(() => scheduleScan(70));
  function observeDocument() {
    const target = document.documentElement;
    if (!target) return;
    observer.observe(target, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class", "data-state"]
    });
  }
  observeDocument();

  // Initial scans cover the case where the response root is mounted after document_idle.
  scheduleScan(0);
  [250, 700, 1400, 2600, 4500].forEach(delay => window.setTimeout(() => scheduleScan(0), delay));

  // ChatGPT is an SPA; detect URL changes even when the DOM change is minimal.
  window.setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      scheduleScan(0);
    }
  }, 800);

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes[STORAGE_KEY]) refreshButtons();
  });

  console.info("[ChatGPT Bookmarks] v1.2.1 active:", location.href);
})();
