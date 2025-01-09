// 添加预览和分组功能
document.addEventListener('DOMContentLoaded', async () => {
  await updatePreview();
  initializeSearch();
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

  // 渲染预览
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

// 修改分组按钮点击事件
document.getElementById('groupTabs').addEventListener('click', async () => {
  try {
    const selectedDomains = Array.from(document.querySelectorAll('.group-toggle:checked'))
      .map(toggle => toggle.dataset.domain);
    
    if (selectedDomains.length === 0) {
      alert('请至少选择一个分组');
      return;
    }

    const button = document.getElementById('groupTabs');
    button.disabled = true;
    button.textContent = '正在分组...';

    await chrome.runtime.sendMessage({ 
      action: 'groupTabs',
      domains: selectedDomains
    });

    button.textContent = '分组完成！';
    setTimeout(() => {
      button.disabled = false;
      button.textContent = '开始分组';
    }, 2000);

  } catch (error) {
    console.error('Error grouping tabs:', error);
    button.textContent = '分组失败';
    button.disabled = false;
  }
});

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