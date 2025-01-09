document.getElementById('groupTabs').addEventListener('click', async () => {
  try {
    // 发送消息给 background script 来触发分组
    await chrome.runtime.sendMessage({ action: 'groupTabs' });
    
    // 可以添加一些用户反馈
    const button = document.getElementById('groupTabs');
    const originalText = button.textContent;
    button.textContent = '分组完成！';
    setTimeout(() => {
      button.textContent = originalText;
    }, 2000);
  } catch (error) {
    console.error('Error grouping tabs:', error);
  }
}); 