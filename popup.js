"use strict";

const STORAGE_KEY = "chatgptBookmarks";
const listElement = document.getElementById("bookmark-list");
const emptyElement = document.getElementById("empty");
const countElement = document.getElementById("count");

async function getBookmarks() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  return Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
}

async function setBookmarks(bookmarks) {
  await chrome.storage.local.set({ [STORAGE_KEY]: bookmarks });
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit"
  }).format(date);
}

function createBookmarkCard(bookmark) {
  const card = document.createElement("article");
  card.className = "bookmark-card";

  const title = document.createElement("button");
  title.className = "bookmark-title";
  title.type = "button";
  title.textContent = bookmark.title || "(제목 없음)";
  title.addEventListener("click", () => openBookmark(bookmark));

  const meta = document.createElement("div");
  meta.className = "bookmark-meta";
  meta.textContent = formatDate(bookmark.createdAt);

  const preview = document.createElement("p");
  preview.className = "bookmark-preview";
  preview.textContent = bookmark.preview || "";

  const remove = document.createElement("button");
  remove.className = "remove-button";
  remove.type = "button";
  remove.textContent = "삭제";
  remove.title = "이 북마크 삭제";
  remove.addEventListener("click", async () => {
    const bookmarks = await getBookmarks();
    await setBookmarks(bookmarks.filter(item => item.id !== bookmark.id));
    render();
  });

  const top = document.createElement("div");
  top.className = "card-top";
  top.append(title, remove);
  card.append(top, meta, preview);
  return card;
}

async function render() {
  const bookmarks = await getBookmarks();
  listElement.replaceChildren();
  countElement.textContent = String(bookmarks.length);
  emptyElement.hidden = bookmarks.length > 0;

  bookmarks.forEach(bookmark => {
    listElement.appendChild(createBookmarkCard(bookmark));
  });
}

async function sendJump(tabId, bookmark) {
  return chrome.tabs.sendMessage(tabId, {
    type: "CLB_JUMP_TO_BOOKMARK",
    bookmark
  });
}

async function openBookmark(bookmark) {
  try {
    const tabs = await chrome.tabs.query({ url: ["https://chatgpt.com/*", "https://chat.openai.com/*"] });
    const existingTab = tabs.find(tab => {
      try {
        return new URL(tab.url).pathname === new URL(bookmark.url).pathname;
      } catch {
        return false;
      }
    });

    let tabId;
    if (existingTab) {
      tabId = existingTab.id;
      await chrome.tabs.update(tabId, { active: true });
      if (existingTab.windowId !== undefined) {
        await chrome.windows.update(existingTab.windowId, { focused: true });
      }
    } else {
      const tab = await chrome.tabs.create({ url: bookmark.url, active: true });
      tabId = tab.id;
    }

    // Wait for the page/content script and streamed response to become available.
    let lastError;
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 700));
      try {
        const result = await sendJump(tabId, bookmark);
        if (result?.ok) {
          window.close();
          return;
        }
        lastError = result?.error || "해당 제목을 아직 찾지 못했습니다.";
      } catch (error) {
        lastError = error.message;
      }
    }

    alert(
      "대화는 열었지만 저장한 제목을 찾지 못했습니다.\n" +
      "응답이 모두 로딩된 후 북마크를 다시 눌러 주세요.\n\n" +
      (lastError || "")
    );
  } catch (error) {
    alert("북마크 이동 중 오류가 발생했습니다: " + error.message);
  }
}

document.getElementById("clear-all").addEventListener("click", async () => {
  const bookmarks = await getBookmarks();
  if (!bookmarks.length) return;
  if (!confirm("저장된 북마크를 모두 삭제할까요?")) return;
  await setBookmarks([]);
  render();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes[STORAGE_KEY]) render();
});

render();
