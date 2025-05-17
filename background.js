chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    // Перехват JSON-запросов с данными эпизодов
    if (details.url.includes('episode/') && details.url.endsWith('.json')) {
      const match = details.url.match(/episode\/(\d+)\.json/);
      if (match) {
        const episodeId = match[1];
        fetch(details.url)
          .then((response) => response.json())
          .then((data) => {
            const title = data?.pageProps?.hydrationData?.episodeInfo?.episodeInfo?.episode?.title || 'Unknown';
            console.log(`[Episode] ID: ${episodeId}, Title: ${title}`); // Для отладки
            chrome.storage.local.get(['episodes'], (result) => {
              const episodes = result.episodes || {};
              episodes[episodeId] = { title };
              chrome.storage.local.set({ episodes });
            });
          })
          .catch((error) => {
            console.error(`[Episode] Error fetching JSON for ID ${episodeId}:`, error);
          });
      }
    }

    // Перехват stream-запросов
    if (details.url.includes('/stream?')) {
      // Пытаемся найти ID эпизода в URL или referrer
      let episodeId = null;
      const urlMatch = details.url.match(/episode\/(\d+)/);
      const referrerMatch = details.referrer?.match(/episode\/(\d+)/);
      if (urlMatch) {
        episodeId = urlMatch[1];
      } else if (referrerMatch) {
        episodeId = referrerMatch[1];
      }

      chrome.storage.local.get(['episodes', 'streams'], (result) => {
        const episodes = result.episodes || {};
        const streams = result.streams || [];
        const title = episodeId && episodes[episodeId]?.title ? episodes[episodeId].title : 'Unknown';
        const stream = { id: episodeId || Date.now().toString(), url: details.url, title, timestamp: Date.now() };
        streams.push(stream);
        console.log(`[Stream] ID: ${episodeId || 'N/A'}, Title: ${title}, URL: ${details.url}, Referrer: ${details.referrer || 'N/A'}`); // Для отладки
        chrome.storage.local.set({ streams }, () => {
          chrome.action.setBadgeText({ text: streams.length.toString() });
          chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
        });
      });
    }
  },
  { urls: ['https://zvuk.com/*', 'https://*.zvuk.com/*'] },
  ['requestBody', 'extraHeaders']
);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'domTitle') {
    const title = message.value;
    console.log(`[DOM] Title: ${title}`); // Для отладки
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
      console.log(`[Download] ID: ${downloadId}, Title: ${cleanTitle}`); // Для отладки
    });
  }
});