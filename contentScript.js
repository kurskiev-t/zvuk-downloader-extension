function extractTitleFromDOM() {
  const selectors = ['h1', '[class*="title"]', '[class*="episode"]'];
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      const title = element.textContent.trim();
      console.log(`[DOM] Found title: ${title}`);
      return title;
    }
  }
  return null;
}

document.addEventListener('click', (event) => {
  const target = event.target.closest('[class*="episode"], [class*="title"], li, div');
  if (target) {
    const title = target.textContent.trim();
    if (title) {
      console.log(`[Click] Title: ${title}`);
      chrome.runtime.sendMessage({ type: 'domTitle', value: title });
    }
  }
});

const title = extractTitleFromDOM();
if (title) {
  chrome.runtime.sendMessage({ type: 'domTitle', value: title });
}