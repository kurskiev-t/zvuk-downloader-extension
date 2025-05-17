document.addEventListener('DOMContentLoaded', () => {
  const clearStreams = document.getElementById('clear-streams');
  const tableBody = document.getElementById('streams-body');
  const selectAll = document.getElementById('select-all');
  const downloadSelected = document.getElementById('download-selected');
  const downloadAll = document.getElementById('download-all');
  const notOnZvuk = document.getElementById('not-on-zvuk');
  const streamsContainer = document.getElementById('streams-container');

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0].url;
    if (!url.includes('zvuk.com')) {
      notOnZvuk.style.display = 'block';
      streamsContainer.style.display = 'none';
      return;
    }
    notOnZvuk.style.display = 'none';
    streamsContainer.style.display = 'block';

    chrome.storage.local.get(['streams'], (result) => {
      const streams = result.streams || [];
      chrome.action.setBadgeText({ text: streams.length.toString() }, () => {
        console.log(`[Popup] Badge set to ${streams.length}`);
      });
      tableBody.innerHTML = '';
      streams.forEach((stream, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td><input type="checkbox" class="select-stream" data-index="${index}"></td>
          <td><input type="text" value="${stream.title}" class="title-input" data-index="${index}"></td>
          <td><button class="download-btn" data-index="${index}">Download</button></td>
        `;
        tableBody.appendChild(row);
      });

      document.querySelectorAll('.download-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const index = btn.dataset.index;
          const title = document.querySelector(`.title-input[data-index="${index}"]`).value;
          chrome.runtime.sendMessage({ type: 'download', url: streams[index].url, title });
        });
      });

      document.querySelectorAll('.title-input').forEach((input) => {
        input.addEventListener('change', () => {
          const index = input.dataset.index;
          streams[index].title = input.value;
          chrome.storage.local.set({ streams });
        });
      });
    });
  });

  selectAll.addEventListener('change', () => {
    document.querySelectorAll('.select-stream').forEach((checkbox) => {
      checkbox.checked = selectAll.checked;
    });
  });

  downloadSelected.addEventListener('click', () => {
    chrome.storage.local.get(['streams'], (result) => {
      const streams = result.streams || [];
      document.querySelectorAll('.select-stream:checked').forEach((checkbox) => {
        const index = checkbox.dataset.index;
        const title = document.querySelector(`.title-input[data-index="${index}"]`).value;
        chrome.runtime.sendMessage({ type: 'download', url: streams[index].url, title });
      });
    });
  });

  downloadAll.addEventListener('click', () => {
    chrome.storage.local.get(['streams'], (result) => {
      const streams = result.streams || [];
      streams.forEach((stream) => {
        chrome.runtime.sendMessage({ type: 'download', url: stream.url, title: stream.title });
      });
    });
  });

  clearStreams.addEventListener('click', () => {
    chrome.storage.local.set({ streams: [] }, () => {
      console.log('[Popup] Streams cleared');
      tableBody.innerHTML = '';
      chrome.action.setBadgeText({ text: '0' }, () => {
        console.log('[Popup] Badge reset to 0');
      });
    });
  });
});