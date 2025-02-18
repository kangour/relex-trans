// 加载已保存的设置
chrome.storage.sync.get(['translator', 'deepseekApiKey', 'kimiApiKey', 'chatgptApiKey', 'zhipuApiKey'], (result) => {
  if (result.translator) {
    document.getElementById('translator').value = result.translator;
  }
  const translator = result.translator || 'microsoft';
  if (translator === 'deepseek' && result.deepseekApiKey) {
    document.getElementById('apiKey').value = result.deepseekApiKey;
  } else if (translator === 'kimi' && result.kimiApiKey) {
    document.getElementById('apiKey').value = result.kimiApiKey;
  } else if (translator === 'chatgpt' && result.chatgptApiKey) {
    document.getElementById('apiKey').value = result.chatgptApiKey;
  } else if (translator === 'zhipu' && result.zhipuApiKey) {
    document.getElementById('apiKey').value = result.zhipuApiKey;
  }
  // 初始化重置按钮的显示状态
  document.getElementById('clearApiKey').style.display = (translator === 'google' || translator === 'microsoft') ? 'none' : 'block';
  document.getElementById('applyApiKey').style.display = (translator === 'google' || translator === 'microsoft') ? 'none' : 'block';
  document.getElementById('apiKey').disabled = (translator === 'google' || translator === 'microsoft');

  if (translator === 'google' || translator === 'microsoft') {
    document.getElementById('apiKey').value = '';
    document.getElementById('apiKey').document.getElementById('apiKey').placeholder = '谷歌 / 微软翻译无需密钥。';
  } else {
    if (document.getElementById('apiKey').value) {
      document.getElementById('apiKey').disabled = true;
    }
  }
});

// 保存设置
document.getElementById('save').addEventListener('click', () => {
  const translator = document.getElementById('translator').value;
  const apiKey = document.getElementById('apiKey').value;
  const status = document.getElementById('status');

  // 检查是否需要API密钥
  if ((translator !== 'google' && translator !== 'microsoft') && !apiKey) {
    status.textContent = '请输入API密钥';
    status.className = 'status error';
    status.style.display = 'block';
    return;
  }

  // 根据翻译服务保存对应的API密钥
  const settings = { translator };
  if (translator === 'deepseek') {
    settings.deepseekApiKey = apiKey;
  } else if (translator === 'kimi') {
    settings.kimiApiKey = apiKey;
  } else if (translator === 'chatgpt') {
    settings.chatgptApiKey = apiKey;
  } else if (translator === 'zhipu') {
    settings.zhipuApiKey = apiKey;
  }

  // 保存设置
  chrome.storage.sync.set(settings, () => {
    if (chrome.runtime.lastError) {
      status.textContent = '保存失败：' + chrome.runtime.lastError.message;
      status.className = 'status error';
    } else {
      status.textContent = '设置已保存，请刷新页面，使设置生效。';
      status.className = 'status success';
    }
    status.style.display = 'block';
    setTimeout(() => {
      status.style.display = 'none';
    }, 2000);
  });
});

// 监听翻译服务选择变化
document.getElementById('translator').addEventListener('change', (e) => {
  const apiKeyInput = document.getElementById('apiKey');
  const clearApiKeyButton = document.getElementById('clearApiKey');
  const applyApiKeyButton = document.getElementById('applyApiKey');
  const status = document.getElementById('status');
  status.style.display = 'none';

  if (e.target.value === 'google' || e.target.value === 'microsoft') {
    apiKeyInput.value = '';
    apiKeyInput.disabled = true;
    apiKeyInput.placeholder = '谷歌 / 微软翻译无需密钥。';
    clearApiKeyButton.style.display = 'none';
    applyApiKeyButton.style.display = 'none';
  } else {
    apiKeyInput.disabled = false;
    apiKeyInput.placeholder = '请输入密钥';
    clearApiKeyButton.style.display = 'block';
    applyApiKeyButton.style.display = 'block';
    // 加载对应服务的API密钥
    chrome.storage.sync.get([`${e.target.value}ApiKey`], (result) => {
      const key = result[`${e.target.value}ApiKey`];
      if (key) {
        apiKeyInput.value = key;
        apiKeyInput.disabled = true;
      } else {
        apiKeyInput.disabled = false;
        apiKeyInput.value = '';
      }
    });
  }
});

// 监听申请按钮点击事件
document.getElementById('applyApiKey').addEventListener('click', () => {
  const translator = document.getElementById('translator').value;
  const apiUrls = {
    microsoft: 'https://portal.azure.com/#create/Microsoft.CognitiveServicesTextTranslation',
    deepseek: 'https://platform.deepseek.com/account',
    kimi: 'https://platform.moonshot.cn/console/api-keys',
    chatgpt: 'https://platform.openai.com/api-keys',
    zhipu: 'https://open.bigmodel.cn/usercenter/apikeys'
  };

  if (translator !== 'google' && apiUrls[translator]) {
    chrome.tabs.create({ url: apiUrls[translator] });
  }
});

// 监听清空按钮点击事件
document.getElementById('clearApiKey').addEventListener('click', () => {
  const translator = document.getElementById('translator').value;
  const apiKeyInput = document.getElementById('apiKey');
  apiKeyInput.value = '';
  apiKeyInput.disabled = false;

  // 清除当前选中服务的API密钥
  const status = document.getElementById('status');
  status.textContent = 'API密钥已清空';
  status.className = 'status success';
  status.style.display = 'block';
  setTimeout(() => {
    status.style.display = 'none';
  }, 2000);
});
