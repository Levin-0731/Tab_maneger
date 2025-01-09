// 添加预览和分组功能
document.addEventListener('DOMContentLoaded', async () => {
  await updatePreview();
  initializeSearch();
  initializeGroupSwitch();
});

async function updatePreview() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const groups = {};
  
  // 对标签进行分类预览
  tabs.forEach(tab => {
    if (tab.url.startsWith('http')) {
      const domain = new URL(tab.url).hostname;
      if (!groups[domain]) {
        groups[domain] = [];
      }
      groups[domain].push({
        id: tab.id,
        title: tab.title,
        favicon: tab.favIconUrl || 'chrome://favicon/size/16@2x'
      });
    }
  });

  // 直接渲染预览，不需要动画
  const previewContainer = document.getElementById('preview-container');
  previewContainer.innerHTML = '';

  Object.entries(groups).forEach(([domain, tabs]) => {
    if (tabs.length >= 2) {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'group-preview';
      
      const groupHeader = document.createElement('div');
      groupHeader.className = 'group-header';
      
      const toggle = document.createElement('input');
      toggle.type = 'checkbox';
      toggle.checked = true;
      toggle.className = 'group-toggle';
      toggle.dataset.domain = domain;
      
      // 获取域名对应的 Emoji
      const emoji = getEmojiForDomain(domain);
      
      groupHeader.innerHTML = `
        <span class="domain-name">${emoji} ${domain} (${tabs.length})</span>
      `;
      groupHeader.prepend(toggle);
      
      const tabList = document.createElement('div');
      tabList.className = 'tab-list';
      
      tabs.forEach(tab => {
        const tabItem = document.createElement('div');
        tabItem.className = 'tab-item';
        tabItem.addEventListener('click', () => {
          chrome.tabs.update(tab.id, { active: true });
          chrome.windows.update(tab.windowId, { focused: true });
        });
        
        tabItem.innerHTML = `
          <img class="tab-favicon" src="${tab.favicon}" alt="">
          <span class="tab-title">${tab.title}</span>
        `;
        tabList.appendChild(tabItem);
      });
      
      groupDiv.appendChild(groupHeader);
      groupDiv.appendChild(tabList);
      previewContainer.appendChild(groupDiv);
    }
  });
}

function initializeSearch() {
  const searchBox = document.querySelector('.search-box');
  searchBox.addEventListener('input', (e) => {
    const searchText = e.target.value.toLowerCase();
    const groups = document.querySelectorAll('.group-preview');
    
    groups.forEach(group => {
      const tabs = group.querySelectorAll('.tab-item');
      let hasMatch = false;
      
      tabs.forEach(tab => {
        const title = tab.querySelector('.tab-title').textContent.toLowerCase();
        const matches = title.includes(searchText);
        tab.style.display = matches ? 'flex' : 'none';
        if (matches) hasMatch = true;
      });
      
      group.style.display = hasMatch ? 'block' : 'none';
    });
  });
}

// 添加开关初始化和处理函数
function initializeGroupSwitch() {
  const groupSwitch = document.getElementById('groupSwitch');
  
  // 检查当前窗口是否有分组，并设置开关状态
  chrome.tabs.query({ currentWindow: true }, async (tabs) => {
    const hasGroups = await checkForGroups();
    groupSwitch.checked = hasGroups;
  });

  // 监听开关变化
  groupSwitch.addEventListener('change', async (e) => {
    try {
      if (e.target.checked) {
        // 开启分组
        const selectedDomains = Array.from(document.querySelectorAll('.group-toggle:checked'))
          .map(toggle => toggle.dataset.domain);
        
        if (selectedDomains.length === 0) {
          alert('请至少选择一个分组');
          e.target.checked = false;
          return;
        }

        await chrome.runtime.sendMessage({ 
          action: 'groupTabs',
          domains: selectedDomains
        });
      } else {
        // 取消所有分组
        await unGroupAllTabs();
      }
    } catch (error) {
      console.error('Error in switch handler:', error);
      // 发生错误时恢复开关状态
      e.target.checked = !e.target.checked;
    }
  });
}

// 检查是否存在分组
async function checkForGroups() {
  const groups = await chrome.tabGroups.query({ windowId: chrome.windows.WINDOW_ID_CURRENT });
  return groups.length > 0;
}

// 修改取消分组函数
async function unGroupAllTabs() {
  try {
    // 先添加移除动画
    await updatePreview(true);
    
    const response = await chrome.runtime.sendMessage({ 
      action: 'unGroupTabs'
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to ungroup tabs');
    }
    
    // 重新检查分组状态并更新预览
    const hasGroups = await checkForGroups();
    if (!hasGroups) {
      await updatePreview();
    } else {
      throw new Error('Failed to ungroup all tabs');
    }
  } catch (error) {
    console.error('Error ungrouping tabs:', error);
    const groupSwitch = document.getElementById('groupSwitch');
    groupSwitch.checked = true;
  }
}

// 修改原有的分组按钮相关代码
document.getElementById('groupTabs')?.remove(); // 移除原有的按钮

// 添加 getEmojiForDomain 函数
function getEmojiForDomain(domain) {
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