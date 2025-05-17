function extractTitleFromDOM() {
  const selectors = [
    '.Info_titleInner__DIcGB', // Точный селектор для названия эпизода
    'h1[class*="title"]',
    '[class*="episode-title"]',
    '[data-title]'
  ];
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      const title = element.textContent.trim() || element.getAttribute('data-title');
      if (title && title !== 'Unknown') {
        console.log(`[DOM] Found title: ${title}`); // Для отладки
        return title;
      }
    }
  }
  return null;
}

document.addEventListener('click', (event) => {
  const target = event.target.closest('.Info_titleInner__DIcGB, [class*="episode"], [class*="title"]');
  if (target) {
    const title = target.textContent.trim();
    if (title && title !== 'Unknown') {
      console.log(`[Click] Title: ${title}`); // Для отладки
      chrome.runtime.sendMessage({ type: 'domTitle', value: title });
    }
  }
});

window.addEventListener('load', () => {
  chrome.storage.local.set({ streams: [] }, () => {
    console.log('[ContentScript] Streams cleared on page load');
    chrome.action.setBadgeText({ text: '0' }, () => {
      console.log('[ContentScript] Badge reset to 0');
    });
  });
});

const title = extractTitleFromDOM();
if (title) {
  chrome.runtime.sendMessage({ type: 'domTitle', value: title });
}