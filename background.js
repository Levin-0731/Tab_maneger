// 添加配置对象
const CONFIG = {
  MIN_TABS_TO_GROUP: 2,
  GROUP_DELAY: 1000,
  COLORS: ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan']
};

// 优化URL处理函数
function getDomainFromUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    return null;
  }
}

// 优化获取随机颜色的函数
function getRandomColor() {
  return CONFIG.COLORS[Math.floor(Math.random() * CONFIG.COLORS.length)];
}

// 修改分组逻辑
async function groupTabs(tabs) {
  const groups = {};
  
  // 对标签进行分类
  tabs.forEach(tab => {
    if (!tab.url.startsWith('chrome://')) {  // 排除Chrome内部页面
      const domain = getDomainFromUrl(tab.url);
      if (domain) {
        if (!groups[domain]) {
          groups[domain] = [];
        }
        groups[domain].push(tab.id);
      }
    }
  });

  // 创建分组
  for (const [domain, tabIds] of Object.entries(groups)) {
    if (tabIds.length >= CONFIG.MIN_TABS_TO_GROUP) {
      try {
        const group = await chrome.tabs.group({ tabIds });
        await chrome.tabGroups.update(group, {
          title: `${domain} (${tabIds.length})`,
          color: getRandomColor()
        });
      } catch (error) {
        console.error(`Error grouping tabs for ${domain}:`, error);
      }
    }
  }
}

// 添加消息监听器，用于接收来自 popup 的请求
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'groupTabs') {
    chrome.tabs.query({ currentWindow: true }, async (tabs) => {
      await groupTabs(tabs);
      sendResponse({ success: true });
    });
    return true; // 保持消息通道开放以支持异步响应
  }
}); 