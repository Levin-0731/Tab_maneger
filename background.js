// 扩展配置对象
const CONFIG = {
  MIN_TABS_TO_GROUP: 2,
  GROUP_DELAY: 100,
  COLORS: ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan']
};

// 扩展网站类型配置
const SITE_PATTERNS = {
  SEARCH: {
    pattern: /^(www\.)?(google|bing|baidu)\.com$/i,
    emoji: '🔍',
    color: 'blue',
    prefix: 'Search'
  },
  VIDEO: {
    pattern: /^(www\.)?(youtube|bilibili|netflix)\.com$/i,
    emoji: '📺',
    color: 'red',
    prefix: 'Video'
  },
  DOCS: {
    pattern: /^(developer\.mozilla|devdocs|docs\.).*$/i,
    emoji: '📚',
    color: 'purple',
    prefix: 'Docs'
  },
  DEV: {
    pattern: /^(github|gitlab|stackoverflow|leetcode)\.com$/i,
    emoji: '💻',
    color: 'green',
    prefix: 'Dev'
  },
  SOCIAL: {
    pattern: /^(twitter|facebook|linkedin|instagram)\.com$/i,
    emoji: '💬',
    color: 'cyan',
    prefix: 'Social'
  },
  NEWS: {
    pattern: /^(news\.|\.news\.|medium).*$/i,
    emoji: '📰',
    color: 'yellow',
    prefix: 'News'
  },
  SHOPPING: {
    pattern: /^(amazon|taobao|jd|tmall)\.com$/i,
    emoji: '🛒',
    color: 'pink',
    prefix: 'Shopping'
  },
  MAIL: {
    pattern: /^(mail\.|outlook).*$/i,
    emoji: '📧',
    color: 'blue',
    prefix: 'Mail'
  },
  CLOUD: {
    pattern: /^(drive|dropbox|onedrive).*$/i,
    emoji: '☁️',
    color: 'grey',
    prefix: 'Cloud'
  }
};

// 获取网站类型
function getSiteType(domain) {
  for (const [type, config] of Object.entries(SITE_PATTERNS)) {
    if (config.pattern.test(domain)) {
      return { type, ...config };
    }
  }
  return null;
}

// 获取主域名
function getMainDomain(domain) {
  // 提取主域名，例如 sub.github.com -> github.com
  const parts = domain.split('.');
  if (parts.length > 2) {
    return parts.slice(-2).join('.');
  }
  return domain;
}

// 优化分组标题生成
function generateGroupTitle(domain, tabs, siteType) {
  const count = tabs.length;
  
  // 如果是特定类型的网站
  if (siteType) {
    // 尝试提取共同关键词
    const commonKeywords = extractCommonKeywords(tabs.map(tab => tab.title));
    if (commonKeywords) {
      return `${siteType.emoji} ${siteType.prefix} - ${commonKeywords} (${count})`;
    }
    return `${siteType.emoji} ${siteType.prefix} - ${domain} (${count})`;
  }

  // 检查是否为子路径分组
  const pathPattern = extractCommonPath(tabs.map(tab => new URL(tab.url).pathname));
  if (pathPattern) {
    return `🔗 ${domain}/${pathPattern} (${count})`;
  }

  // 默认分组名称
  return `🌐 ${domain} (${count})`;
}

// 提取标题中的共同关键词
function extractCommonKeywords(titles) {
  // 移除常见的无意义词
  const stopWords = ['|', '-', '–', 'the', 'a', 'an', 'and', 'or', 'but'];
  
  // 处理标题
  const words = titles.map(title => 
    title.toLowerCase()
      .split(/[\s\-\|]+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
  );

  // 找出共同词
  const common = words.reduce((acc, curr) => 
    acc.filter(word => curr.includes(word))
  );

  return common.length > 0 ? common[0] : null;
}

// 提取共同路径
function extractCommonPath(paths) {
  if (paths.length < 2) return null;
  
  const parts = paths.map(path => path.split('/').filter(p => p));
  const minLength = Math.min(...parts.map(p => p.length));
  
  let commonPath = [];
  for (let i = 0; i < minLength; i++) {
    const part = parts[0][i];
    if (parts.every(p => p[i] === part)) {
      commonPath.push(part);
    } else {
      break;
    }
  }

  return commonPath.length > 0 ? commonPath.join('/') : null;
}

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

// 添加延迟函数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
      
      // 对标签进行分类
      tabs.forEach(tab => {
        if (!tab.url.startsWith('chrome://')) {
          const domain = getDomainFromUrl(tab.url);
          const mainDomain = getMainDomain(domain);
          
          if (request.domains.includes(domain)) {
            if (!groups[mainDomain]) {
              groups[mainDomain] = {
                tabs: [],
                type: getSiteType(mainDomain)
              };
            }
            groups[mainDomain].tabs.push(tab);
          }
        }
      });

      // 创建分组
      for (const [domain, data] of Object.entries(groups)) {
        if (data.tabs.length >= CONFIG.MIN_TABS_TO_GROUP) {
          try {
            const tabIds = data.tabs.map(tab => tab.id);
            const group = await chrome.tabs.group({ tabIds });
            
            await chrome.tabGroups.update(group, {
              title: generateGroupTitle(domain, data.tabs, data.type),
              color: data.type ? data.type.color : getRandomColor(),
              collapsed: true
            });
            
            await delay(CONFIG.GROUP_DELAY);
          } catch (error) {
            console.error(`Error grouping tabs for ${domain}:`, error);
          }
        }
      }
      
      sendResponse({ success: true });
    });
    return true;
  } else if (request.action === 'unGroupTabs') {
    (async () => {
      try {
        const groups = await chrome.tabGroups.query({ 
          windowId: chrome.windows.WINDOW_ID_CURRENT 
        });
        
        // 按顺序取消分组
        for (const group of groups) {
          const tabs = await chrome.tabs.query({ 
            groupId: group.id 
          });
          
          if (tabs.length > 0) {
            await chrome.tabs.ungroup(tabs.map(tab => tab.id));
            // 每个分组取消后添加小延迟
            await delay(100);
          }
        }
        
        sendResponse({ success: true });
      } catch (error) {
        console.error('Error in unGroupTabs:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
}); 