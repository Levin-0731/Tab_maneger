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

// 优化分组逻辑
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
          title: domain,
          color: getRandomColor()
        });
      } catch (error) {
        console.error(`Error grouping tabs for ${domain}:`, error);
      }
    }
  }
}

// 监听新标签页创建事件
chrome.tabs.onCreated.addListener(async (tab) => {
  try {
    // 等待标签页加载完成
    await new Promise(resolve => setTimeout(resolve, CONFIG.GROUP_DELAY));
    
    // 获取当前窗口的所有标签页
    const tabs = await chrome.tabs.query({ windowId: tab.windowId });
    await groupTabs(tabs);
  } catch (error) {
    console.error('Error in tab creation handler:', error);
  }
}); 