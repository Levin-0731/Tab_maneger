// 添加配置对象
const CONFIG = {
  MIN_TABS_TO_GROUP: 2,
  GROUP_DELAY: 1000,
  COLORS: ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan']
};

// 添加域名对应的 Emoji 配置
const DOMAIN_EMOJIS = {
  'github.com': '💻',
  'google.com': '🔍',
  'youtube.com': '📺',
  'bilibili.com': '📺',
  'zhihu.com': '❓',
  'juejin.cn': '📚',
  'feishu.cn': '📝',
  'notion.so': '📔',
  default: '🌐'
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

// 获取域名对应的 Emoji
function getEmojiForDomain(domain) {
  // 遍历配置查找最匹配的域名
  for (const [key, emoji] of Object.entries(DOMAIN_EMOJIS)) {
    if (domain.includes(key)) {
      return emoji;
    }
  }
  return DOMAIN_EMOJIS.default;
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

// 修改消息监听器
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'groupTabs') {
    chrome.tabs.query({ currentWindow: true }, async (tabs) => {
      const groups = {};
      
      // 只处理选中的域名
      tabs.forEach(tab => {
        if (!tab.url.startsWith('chrome://')) {
          const domain = getDomainFromUrl(tab.url);
          if (domain && request.domains.includes(domain)) {
            if (!groups[domain]) {
              groups[domain] = [];
            }
            groups[domain].push(tab.id);
          }
        }
      });

      // 创建选中的分组
      for (const [domain, tabIds] of Object.entries(groups)) {
        if (tabIds.length >= CONFIG.MIN_TABS_TO_GROUP) {
          try {
            const group = await chrome.tabs.group({ tabIds });
            await chrome.tabGroups.update(group, {
              title: `${getEmojiForDomain(domain)} ${domain} (${tabIds.length})`,
              color: getRandomColor(),
              collapsed: true  // 设置默认折叠状态
            });
          } catch (error) {
            console.error(`Error grouping tabs for ${domain}:`, error);
          }
        }
      }
      
      sendResponse({ success: true });
    });
    return true;
  }
}); 