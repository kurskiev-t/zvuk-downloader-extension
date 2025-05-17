const processedEpisodes = new Set();

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    // Перехват JSON-запросов с данными эпизодов
    if (details.url.includes('/episode/') && details.url.includes('.json') && details.url.includes('zvuk.com')) {
      const match = details.url.match(/episode\/(\d+)\.json/);
      if (match) {
        const episodeId = match[1];
        if (processedEpisodes.has(episodeId)) {
          console.log(`[Episode] Skipped duplicate ID: ${episodeId}`); // Для отладки
          return;
        }
        processedEpisodes.add(episodeId);
        fetch(details.url)
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
          })
          .then((data) => {
            const title = data?.pageProps?.hydrationData?.episodeInfo?.episodeInfo?.episode?.title || 'Unknown';
            console.log(`[Episode] ID: ${episodeId}, Title: ${title}, URL: ${details.url}`); // Для отладки
            chrome.storage.local.get(['episodes'], (result) => {
              const episodes = result.episodes || {};
              episodes[episodeId] = { title };
              chrome.storage.local.set({ episodes }, () => {
                console.log(`[Episode] Saved episode: ${episodeId} - ${title}`); // Для отладки
              });
            });
          })
          .catch((error) => {
            console.error(`[Episode] Error fetching JSON for ID ${episodeId}: ${error.message}`, {
              url: details.url,
              error
            });
          });
      } else {
        console.log(`[Episode] No ID match in JSON URL: ${details.url}`); // Для отладки
      }
    }

    // Перехват stream-запросов
    if (details.url.includes('/stream?')) {
      let episodeId = null;
      const urlTrackMatch = details.url.match(/track\/(\d+)/);
      const urlEpisodeMatch = details.url.match(/episode\/(\d+)/);
      const referrerMatch = details.referrer?.match(/episode\/(\d+)/);
      const queryMatch = new URLSearchParams(new URL(details.url).search).get('id');
      if (urlTrackMatch) {
        episodeId = urlTrackMatch[1]; // Приоритет для Track ID
      } else if (urlEpisodeMatch) {
        episodeId = urlEpisodeMatch[1];
      } else if (referrerMatch) {
        episodeId = referrerMatch[1];
      } else if (queryMatch && /^\d+$/.test(queryMatch)) {
        episodeId = queryMatch;
      }

      chrome.storage.local.get(['episodes', 'streams'], (result) => {
        const episodes = result.episodes || {};
        const streams = result.streams || [];
        const title = episodeId && episodes[episodeId]?.title ? episodes[episodeId].title : 'Unknown';

        const tryGetTitle = (callback) => {
        if (title !== 'Unknown' || !episodeId) {
          callback(title);
          return;
        }
        setTimeout(() => {
          chrome.storage.local.get(['episodes'], (retryResult) => {
            const retryTitle = retryResult.episodes?.[episodeId]?.title || 'Unknown';
            callback(retryTitle);
          });
        }, 500);
      };

        // Проверка на дубликат стрима
        const isDuplicate = streams.some(stream => 
          (episodeId && stream.id === episodeId) || stream.url === details.url
        );
        if (isDuplicate) {
          console.log(`[Stream] Skipped duplicate stream: ID: ${episodeId || 'N/A'}, URL: ${details.url}`);
          return;
        }

        tryGetTitle((finalTitle) => {
          const stream = { id: episodeId || Date.now().toString(), url: details.url, title: finalTitle, timestamp: Date.now() };
          streams.push(stream);
          console.log(`[Stream] ID: ${episodeId || 'N/A'}, Title: ${finalTitle}, URL: ${details.url}, Referrer: ${details.referrer || 'N/A'}, Query ID: ${queryMatch || 'N/A'}, Track ID: ${urlTrackMatch ? urlTrackMatch[1] : 'N/A'}`);
          chrome.storage.local.set({ streams }, () => {
            console.log(`[Stream] Saved stream: ${finalTitle}`);
            chrome.action.setBadgeText({ text: streams.length.toString() });
            chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
            // Показать уведомление
            chrome.notifications.create({
              type: 'basic',
              iconUrl: 'icons/icon48.png',
              title: 'Zvuk Downloader',
              message: `Stream: ${finalTitle}`,
              priority: 2,
              contextMessage: finalTitle === 'Unknown' ? 'Title not found' : 'Title detected'
            }, (notificationId) => {
              setTimeout(() => {
                chrome.notifications.clear(notificationId);
              }, 3000);
            });
          });
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
        chrome.storage.local.set({ streams }, () => {
          console.log(`[DOM] Updated stream title: ${title}`); // Для отладки
        });
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