document.getElementById('groupTabs').addEventListener('click', async () => {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  
  // 触发手动分组
  const groups = {};
  tabs.forEach(tab => {
    if (tab.url.startsWith('http')) {
      const url = new URL(tab.url);
      const domain = url.hostname;
      if (!groups[domain]) {
        groups[domain] = [];
      }
      groups[domain].push(tab.id);
    }
  });

  for (const [domain, tabIds] of Object.entries(groups)) {
    if (tabIds.length >= 2) {
      const group = await chrome.tabs.group({ tabIds });
      await chrome.tabGroups.update(group, {
        title: domain,
        color: getRandomColor()
      });
    }
  }
});

function getRandomColor() {
  const colors = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan'];
  return colors[Math.floor(Math.random() * colors.length)];
} 