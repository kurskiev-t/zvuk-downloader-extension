chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.url.includes('episode/') && details.url.endsWith('.json')) {
      const episodeId = details.url.match(/episode\/(\d+)\.json/)[1];
      fetch(details.url)
        .then((response) => response.json())
        .then((data) => {
          const title = data.pageProps.hydrationData.episodeInfo.episodeInfo.episode.title;
          console.log(`[Episode] ID: ${episodeId}, Title: ${title}`);
          chrome.storage.local.get(['episodes'], (result) => {
            const episodes = result.episodes || {};
            episodes[episodeId] = { title };
            chrome.storage.local.set({ episodes });
          });
        });
    }
    if (details.url.includes('/stream?')) {
      const streamId = details.url.match(/track\/(\d+)\//)[1];
      chrome.storage.local.get(['episodes', 'streams'], (result) => {
        const episodes = result.episodes || {};
        const streams = result.streams || [];
        const title = episodes[streamId]?.title || 'Unknown';
        const stream = { id: streamId, url: details.url, title, timestamp: Date.now() };
        streams.push(stream);
        console.log(`[Stream] ID: ${streamId}, Title: ${title}, URL: ${details.url}`);
        chrome.storage.local.set({ streams }, () => {
          chrome.action.setBadgeText({ text: streams.length.toString() });
          chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
        });
      });
    }
  },
  { urls: ['https://zvuk.com/*', 'https://*.zvuk.com/*'] },
  ['requestBody']
);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'domTitle') {
    const title = message.value;
    console.log(`[DOM] Title: ${title}`);
    chrome.storage.local.get(['streams'], (result) => {
      const streams = result.streams || [];
      if (streams.length > 0) {
        const lastStream = streams[streams.length - 1];
        lastStream.title = title;
        chrome.storage.local.set({ streams });
      }
    });
  }
  if (message.type === 'download') {
    const { url, title } = message;
    const cleanTitle = title.replace(/[<>:"/\\|?*]+/g, '_');
    chrome.downloads.download({
      url,
      filename: `${cleanTitle}.mp3`,
      saveAs: false
    }, (downloadId) => {
      console.log(`[Download] ID: ${downloadId}, Title: ${cleanTitle}`);
    });
  }
});