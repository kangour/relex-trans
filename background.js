let currentTranslator = 'microsoft';
let microsoftApiKey = '';
let deepseekApiKey = '';
let kimiApiKey = '';
let chatgptApiKey = '';
let zhipuApiKey = '';

// 从storage中加载配置
chrome.storage.sync.get(['translator', 'microsoftApiKey', 'deepseekApiKey', 'kimiApiKey', 'chatgptApiKey', 'zhipuApiKey'], (result) => {
  if (result.translator) {
    currentTranslator = result.translator;
  }
  if (result.microsoftApiKey) {
    microsoftApiKey = result.microsoftApiKey;
  }

  if (result.deepseekApiKey) {
    deepseekApiKey = result.deepseekApiKey;
  }
  if (result.kimiApiKey) {
    kimiApiKey = result.kimiApiKey;
  }
  if (result.chatgptApiKey) {
    chatgptApiKey = result.chatgptApiKey;
  }
  if (result.zhipuApiKey) {
    zhipuApiKey = result.zhipuApiKey;
  }
});

// 监听storage变化
chrome.storage.onChanged.addListener((changes) => {
  if (changes.translator) {
    currentTranslator = changes.translator.newValue;
  }
  if (changes.microsoftApiKey) {
    microsoftApiKey = changes.microsoftApiKey.newValue;
  }

  if (changes.deepseekApiKey) {
    deepseekApiKey = changes.deepseekApiKey.newValue;
  }
  if (changes.kimiApiKey) {
    kimiApiKey = changes.kimiApiKey.newValue;
  }
  if (changes.chatgptApiKey) {
    chatgptApiKey = changes.chatgptApiKey.newValue;
  }
  if (changes.zhipuApiKey) {
    zhipuApiKey = changes.zhipuApiKey.newValue;
  }
});

// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'wordTranslation',
    title: '开始单词翻译',
    contexts: ['all']
  });
  chrome.contextMenus.create({
    id: 'sentenceTranslation',
    title: '开始句子翻译',
    contexts: ['all']
  });
  chrome.contextMenus.create({
    id: 'settings',
    title: 'AI 设置',
    contexts: ['all']
  });
});

// 处理右键菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'wordTranslation') {
    chrome.tabs.sendMessage(tab.id, { type: 'switchMode', mode: 'word' });
  } else if (info.menuItemId === 'sentenceTranslation') {
    chrome.tabs.sendMessage(tab.id, { type: 'switchMode', mode: 'sentence' });
  } else if (info.menuItemId === 'settings') {
    chrome.action.openPopup();
  }
});

// 处理来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'translate') {
    translateText(request.text)
      .then(translation => {
        sendResponse({ translation });
      })
      .catch(error => {
        console.error('Translation error:', error);
        const translatorNames = {
          'google': '谷歌翻译',
          'microsoft': '微软翻译',
          'deepseek': 'DeepSeek翻译',
          'kimi': 'Kimi翻译',
          'chatgpt': 'ChatGPT翻译',
          'zhipu': '智谱AI翻译'
        };
        sendResponse({ error: `【${translatorNames[currentTranslator]}】翻译失败：${error.message}` });
      });
    return true; // 保持消息通道开放
  } else if (request.type === 'ocr') {
    // 处理OCR请求
    performOCR(request.imageData)
      .then(text => {
        sendResponse({ text });
      })
      .catch(error => {
        console.error('OCR error:', error);
        sendResponse({ error: `OCR识别失败：${error.message}` });
      });
    return true; // 保持消息通道开放
  }
});

// 翻译文本
async function translateText(text) {
  switch (currentTranslator) {
    case 'microsoft':
      return await microsoftTranslate(text);

    case 'deepseek':
      return await deepseekTranslate(text);
    case 'kimi':
      return await kimiTranslate(text);
    case 'chatgpt':
      return await chatgptTranslate(text);
    case 'zhipu':
      return await zhipuTranslate(text);
    case 'google':
    default:
      return await googleTranslate(text);
  }
}

// 谷歌翻译
async function googleTranslate(text) {
  const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`);
  console.log("谷歌翻译请求结果：", response)
  const data = await response.json();
  return data[0][0][0];
}

// 微软翻译
async function microsoftTranslate(text) {
  // 获取授权凭证
  const authResponse = await fetch('https://edge.microsoft.com/translate/auth');
  const authToken = await authResponse.text();

  // 调用翻译接口
  const response = await fetch('https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=en&to=zh-Hans&includeSentenceLength=true', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify([{ text }]),
  });

  console.log("微软翻译请求结果：", response)
  const data = await response.json();
  return data[0].translations[0].text;
}

// DeepSeek翻译
async function deepseekTranslate(text) {
  if (!deepseekApiKey) {
    throw new Error('请先设置DeepSeek API密钥');
  }

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${deepseekApiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: '你是一个中英文翻译助手，请翻译用户输入的文本，只需要输出翻译结果，不需要解释。'
        },
        {
          role: 'user',
          content: `请翻译：${text}`
        }
      ]
    })
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message);
  }
  return data.choices[0].message.content;
}

// Kimi翻译
async function kimiTranslate(text) {
  if (!kimiApiKey) {
    throw new Error('请先设置Kimi API密钥');
  }

  const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${kimiApiKey}`,
    },
    body: JSON.stringify({
      model: 'moonshot-v1-8k',
      messages: [
        {
          role: 'system',
          content: '你是一个中英文翻译助手，请翻译用户输入的文本，只需要输出翻译结果，不需要解释。'
        },
        {
          role: 'user',
          content: `请翻译：${text}`
        }
      ]
    })
  });

  console.log("kimi 翻译请求结果：", response)
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message);
  }
  return data.choices[0].message.content;
}

// ChatGPT翻译
async function chatgptTranslate(text) {
  if (!chatgptApiKey) {
    throw new Error('请先设置ChatGPT API密钥');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${chatgptApiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: '你是一个中英文翻译助手，请翻译用户输入的文本，只需要输出翻译结果，不需要解释。'
        },
        {
          role: 'user',
          content: `请翻译：${text}`
        }
      ]
    })
  });

  console.log("chatgpt 翻译请求结果：", response)
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message);
  }
  return data.choices[0].message.content;
}

// 智谱AI翻译
async function zhipuTranslate(text) {
  if (!zhipuApiKey) {
    throw new Error('请先设置智谱AI API密钥');
  }
  console.log("智谱AI翻译请求参数：", text)

  const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${zhipuApiKey}`,
    },
    body: JSON.stringify({
      model: 'glm-4',
      messages: [
        {
          role: 'system',
          content: '你是一个中英文翻译助手，请翻译用户输入的文本，只需要输出翻译结果，不需要解释。'
        },
        {
          role: 'user',
          content: `请翻译：${text}`
        }
      ],
      stream: false
    })
  });

  const data = await response.json();
  console.log("智谱AI翻译请求结果：", data);
  if (data.error) {
    throw new Error(data.error.message || '翻译请求失败');
  }
  return data.choices[0].message.content;
}

// 智谱AI OCR识别
async function performOCR(imageData) {
  if (!zhipuApiKey) {
    throw new Error('请先设置智谱AI API密钥');
  }

  const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${zhipuApiKey}`,
    },
    body: JSON.stringify({
      model: 'glm-4v',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '请识别这张图片中的文字内容，只输出识别到的文字即可。'
            },
            {
              type: 'image_url',
              image_url: {
                url: imageData
              }
            }
          ]
        }
      ],
      stream: false
    })
  });

  const data = await response.json();
  console.log('智谱AI OCR识别结果：', data);
  if (data.error) {
    throw new Error(data.error.message || 'OCR识别请求失败');
  }
  return data.choices[0].message.content;
}