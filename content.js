let translationPopup = null;
let isCommandPressed = false;
let lastTranslationTime = 0;
let lastTranslatedText = '';
let isManualSelection = false;
let lastMouseX = 0;
let lastMouseY = 0;
let debounceTimer = null;
let translationMode = 'sentence'; // 'sentence' or 'word'
let modeSwitchButton = null;
let isCombinationKey = false;

// 创建场景切换按钮
function createModeSwitchButton() {
    const button = document.createElement('div');
    button.className = 'mode-switch-button';
    button.textContent = `当前：${translationMode === 'sentence' ? '句子' : '单词'}翻译场景`;
    button.addEventListener('click', toggleTranslationMode);
    button.style.display = 'none'; // 初始状态隐藏
    document.body.appendChild(button);
    return button;
}

// 切换翻译场景
function toggleTranslationMode() {
    if (isCommandPressed) {
        translationMode = translationMode === 'sentence' ? 'word' : 'sentence';
    } else {
        isCommandPressed = true;
    }
    isManualSelection = false;
    showSwitchButton();
    // hidePopup();
}

// // 开启翻译场景
// function startTranslationMode() {
//     isCommandPressed = true;
//     isManualSelection = false;
//     if (modeSwitchButton) {
//         modeSwitchButton.style.display = 'block'; // 显示按钮
//         if (translationMode === 'sentence') {
//             modeSwitchButton.textContent = `当前：句子翻译场景`;
//             showModeHint("✅ 启动自动翻译，移动鼠标，翻译句子(ESC 退出)");
//         }
//         else if (translationMode === 'word') {
//             modeSwitchButton.textContent = `当前：单词翻译场景`;
//             showModeHint("✅ 启动自动翻译，移动鼠标，翻译单词 (ESC 退出)");
//         }
//     }
//     // hidePopup();
// }


// 切换为句子翻译场景
function switchToSentenceTranslationMode() {
    translationMode = 'sentence';
    showSwitchButton();
    if (modeSwitchButton) {
        modeSwitchButton.textContent = `当前：句子翻译场景`;
    }
    // hidePopup();
}

// 切换为单词翻译场景
function switchToWordTranslationMode() {
    translationMode = 'word';
    showSwitchButton();
    if (modeSwitchButton) {
        modeSwitchButton.textContent = `当前：单词翻译场景`;
    }
    // hidePopup();
}

// 初始化场景切换按钮
modeSwitchButton = createModeSwitchButton();

// 创建翻译结果浮窗
function createPopup() {
    const popup = document.createElement('div');
    popup.className = 'relax-translator-popup';
    popup.style.display = 'none';
    document.body.appendChild(popup);
    return popup;
}


// 防抖函数，用于处理翻译请求
function debounceTranslation(text, x, y) {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
        showTranslation(text, x, y);
    }, 500);
}

let translationCache = new Map();

// 显示翻译结果
function showTranslation(text, x, y) {
    if (!translationPopup) {
        translationPopup = createPopup();
    }

    // 检查文本长度限制
    const lines = text.split('\n');
    const words = text.split(/\s+/);
    if (lines.length > 10 || words.length > 100) {
        translationPopup.textContent = '文本过长，请选择较短的内容翻译';
        translationPopup.style.display = 'block';
        translationPopup.style.left = `${x}px`;
        translationPopup.style.top = `${y + 20}px`;
        return;
    }

    // 如果是相同的文本，直接显示上次的翻译结果
    if (text === lastTranslatedText) {
        translationPopup.style.display = 'block';
        translationPopup.style.left = `${x}px`;
        translationPopup.style.top = `${y + 20}px`;
        return;
    }

    // 检查缓存中是否存在翻译结果
    if (translationCache.has(text)) {
        console.log("使用缓存：", text)
        translationPopup.textContent = translationCache.get(text);
        translationPopup.style.display = 'block';
        translationPopup.style.left = `${x}px`;
        translationPopup.style.top = `${y + 20}px`;
        lastTranslatedText = text;
        return;
    }

    // 保存本次翻译的文本
    lastTranslatedText = text;

    console.log("开始翻译：", text)

    translationPopup.textContent = '翻译中...';
    translationPopup.style.display = 'block';
    translationPopup.style.left = `${x}px`;
    translationPopup.style.top = `${y + 20}px`;

    // 发送消息给background script进行翻译
    chrome.runtime.sendMessage(
        { type: 'translate', text: text },
        response => {
            if (response && response.translation) {
                translationPopup.textContent = response.translation;
                // 将翻译结果存入缓存
                translationCache.set(text, response.translation);
            } else if (response && response.error) {
                translationPopup.textContent = response.error;
            } else {
                translationPopup.textContent = '翻译失败';
            }
        }
    );

    // 获取当前翻译服务名称
    chrome.storage.sync.get(['translator'], (result) => {
        const translatorNames = {
            'google': '谷歌',
            'microsoft': '微软',
            'deepseek': '深度',
            'kimi': 'Kimi',
            'chatgpt': 'GPT',
            'zhipu': '智谱AI',
            'other': ''
        };
        const currentTranslator = result.translator || 'other';
        translationPopup.textContent = `${translatorNames[currentTranslator]}翻译中...`;
    });
}

// 在页面卸载时清空缓存
window.addEventListener('unload', () => {
    translationCache.clear();
});

function hidePopup() {
    isCommandPressed = false;
    isManualSelection = false;
    if (translationPopup) {
        if (translationPopup.style.display == "block") {
            console.log("隐藏浮窗")
            translationPopup.style.display = 'none';
            translationPopup.textContent = '';
            clearTimeout(debounceTimer);
            lastTranslatedText = "";
        }
    }
    hideSwitchButton();
}


// 获取选中的文本
function getSelectedText() {
    const selection = window.getSelection();
    return selection.toString().trim();
}

// 获取鼠标指向的单词
function getWordAtPoint(elem, x, y) {
    // 如果是文本节点，直接处理
    if (elem.nodeType === Node.TEXT_NODE) {
        const range = document.createRange();
        range.selectNodeContents(elem);
        const rects = range.getClientRects();
        for (let i = 0; i < rects.length; i++) {
            if (x >= rects[i].left && x <= rects[i].right &&
                y >= rects[i].top && y <= rects[i].bottom) {
                const text = elem.textContent;
                // 使用更通用的单词分割正则表达式
                const words = text.split(/[\s,.!?;:"'()\[\]{}\\/<>]+/);
                let currentPos = 0;
                let lastWordEnd = 0;

                for (let word of words) {
                    if (!word) continue; // 跳过空字符串

                    // 找到当前单词在原文本中的实际位置
                    const wordStart = text.indexOf(word, lastWordEnd);
                    if (wordStart === -1) continue;

                    const wordEnd = wordStart + word.length;
                    lastWordEnd = wordEnd;

                    // 为当前单词创建一个范围
                    const wordRange = document.createRange();
                    wordRange.setStart(elem, wordStart);
                    wordRange.setEnd(elem, wordEnd);

                    // 获取单词的边界矩形
                    const wordRect = wordRange.getBoundingClientRect();

                    // 检查鼠标是否在当前单词的边界内
                    if (x >= wordRect.left && x <= wordRect.right &&
                        y >= wordRect.top && y <= wordRect.bottom) {
                        // 选中当前单词
                        const selection = window.getSelection();
                        selection.removeAllRanges();
                        selection.addRange(wordRange);
                        return word;
                    }
                }
            }
        }
    }

    // 如果是元素节点，递归检查其子节点
    if (elem.nodeType === Node.ELEMENT_NODE) {
        const rect = elem.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
            for (let child of elem.childNodes) {
                const word = getWordAtPoint(child, x, y);
                if (word) return word;
            }
        }
    }

    return null;
}

function showModeHint(message) {
    const hint = document.createElement('div');
    hint.className = 'mode-hint';
    hint.textContent = message;
    document.body.appendChild(hint);

    // 3秒后淡出并移除提示
    setTimeout(() => {
        hint.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(hint);
        }, 500);
    }, 2000);
}

// 监听来自 background.js 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'switchMode') {
        if (request.mode === 'word') {
            switchToWordTranslationMode();
            isCommandPressed = true;
            isManualSelection = false;
        } else if (request.mode === 'sentence') {
            switchToSentenceTranslationMode();
            isCommandPressed = true;
            isManualSelection = false;
        }
    }
});


function hideSwitchButton() {
    if (modeSwitchButton) {
        if (modeSwitchButton.style.display == "block") {
            modeSwitchButton.style.display = 'none'; // 隐藏按钮
        }
    }
}

function showSwitchButton() {
    if (modeSwitchButton) {
        modeSwitchButton.style.display = 'block'; // 显示按钮
        if (translationMode === 'sentence') {
            modeSwitchButton.textContent = `当前：句子翻译场景`;
            showModeHint("句子翻译，🖱️ 鼠标移到句子上 (ESC 退出)");
        }
        else if (translationMode === 'word') {
            modeSwitchButton.textContent = `当前：单词翻译场景`;
            showModeHint("单词翻译，🖱️ 鼠标移到单词上 (ESC 退出)");
        }
    }
}

// 监听键盘事件
document.addEventListener('keydown', (e) => {
    // console.log("keydown", e.key);
    // console.log("metaKey", e.metaKey);
    // console.log("altKey", e.altKey);
    // console.log("ctrlKey", e.ctrlKey);
    // 按下 ESC 键时隐藏翻译浮窗
    if (e.key === 'Escape') {
        if (isCommandPressed) {
            showModeHint("🤪 结束翻译，感谢使用");
        }
        hidePopup();
        hideSwitchButton();
        return;
    }

    // 如果是功能性组合键，则忽略
    if ((e.metaKey || e.altKey || e.ctrlKey) && (e.key !== 'Meta' && e.key !== 'Alt' && e.key !== 'Control')) {
        // showModeHint(`🙅 按下组合键，不翻译：${e.metaKey ? '⌘' : ''}${e.altKey ? '⌥' : ''}${e.ctrlKey ? '⌃' : ''}${e.key}`)
        // console.log("功能组合键，不翻译")
        isCombinationKey = true
        hidePopup();
        return;
    }
    // // 选词翻译
    // if (e.key === 'Meta' || e.key === 'Alt' || e.key === 'Control') {
    // }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'Meta' || e.key === 'Alt' || e.key === 'Control') {
        if (isCombinationKey) {
            // showModeHint("❌ 松开组合键，不触发")
            isCombinationKey = false;
            hidePopup();
            return;
        }

        const selectedText = getSelectedText();
        if (selectedText) {
            debounceTranslation(selectedText, lastMouseX, lastMouseY);
        } else {
        }
        // if (isManualSelection) {
        //     // showModeHint("🙅 人工选择，不触发")
        //     isManualSelection = false;
        //     return;
        // }
        // // 切换翻译场景
        // if (e.key === 'Control') {
        //     // isCommandPressed = true;
        //     // isManualSelection = false;
        // }
        // 开始翻译 / 切换翻译场景
        // startTranslationMode();
        toggleTranslationMode();
    }
});

// 监听鼠标抬起事件，如果此时有选中的文本，保持 isManualSelection 为 true
document.addEventListener('mouseup', () => {
    const selectedText = getSelectedText();
    if (!selectedText) {
        isManualSelection = false;
        console.log("鼠标抬起，无翻译内容",)
    } else {
        console.log("鼠标抬起，存在翻译内容", selectedText)
        // setTimeout(() => {
        //     isManualSelection = true;
        // }, 100);
        isManualSelection = true;
    }
});

// 监听鼠标移动事件
document.addEventListener('mousemove', (e) => {
    // console.log("mousemove isManualSelection", isManualSelection)

    lastMouseX = e.clientX;
    lastMouseY = e.clientY;

    if (translationPopup) {
        if (translationPopup.style.display == "block") {
            translationPopup.style.left = `${lastMouseX}px`;
            translationPopup.style.top = `${lastMouseY + 20}px`;
        }
    }

    // const currentTime = Date.now();
    // // 限制翻译频率，至少间隔500毫秒
    // if (currentTime - lastTranslationTime < 1000) {
    //     return;
    // }
    // lastTranslationTime = currentTime;

    if (!isCommandPressed) {
        // console.log("没触发")
        return;
    }

    // 检查是否有手动选中的文本
    const selectedText = getSelectedText();

    if (selectedText) {
        if (isManualSelection) {
            console.log("翻译手动选中的文本", selectedText)
            isManualSelection = false;
            debounceTranslation(selectedText, lastMouseX, lastMouseY);
            return;
        } else {
            // console.log("有文本，不是人工选择", selectedText)
        }
    } else {
        // console.log("没有文本，自动选择")
    }

    // 如果没有手动选中的文本，则清除选中并执行自动选中逻辑
    window.getSelection().removeAllRanges();

    const elem = document.elementFromPoint(lastMouseX, lastMouseY);
    if (!elem) {
        console.log("没有元素")
        return;
    }

    if (translationMode === 'word') {
        // 单词翻译场景
        const word = getWordAtPoint(elem, lastMouseX, lastMouseY);
        if (word) {
            debounceTranslation(word, lastMouseX, lastMouseY);
            return;
        }
    } else if (translationMode === 'sentence') {
        // Command键按下时翻译句子
        // 获取所有文本节点
        const textNodes = [];
        const walker = document.createTreeWalker(elem, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        // 遍历所有文本节点找到鼠标位置对应的句子
        for (let textNode of textNodes) {
            const text = textNode.textContent;
            if (!text || text.trim().length === 0 || text.length >= 1000) continue;

            const range = document.createRange();
            range.selectNodeContents(textNode);
            const rects = range.getClientRects();

            // 检查鼠标是否在当前文本节点的区域内
            let isInNode = false;
            for (let rect of rects) {
                if (lastMouseX >= rect.left && lastMouseX <= rect.right && lastMouseY >= rect.top && lastMouseY <= rect.bottom) {
                    isInNode = true;
                    break;
                }
            }
            if (!isInNode) continue;

            // 将文本按标点符号分割成句子
            const sentences = text.split(/(?<=[.。!！?？;；(（）)\n])/g).filter(s => s.trim());
            let currentPos = 0;

            for (let sentence of sentences) {
                const sentenceEnd = currentPos + sentence.length;
                // 检查鼠标是否在当前句子的区域内
                const sentenceRange = document.createRange();
                sentenceRange.setStart(textNode, currentPos);
                sentenceRange.setEnd(textNode, Math.min(sentenceEnd, text.length));
                const sentenceRects = sentenceRange.getClientRects();

                for (let rect of sentenceRects) {
                    if (lastMouseX >= rect.left && lastMouseX <= rect.right && lastMouseY >= rect.top && lastMouseY <= rect.bottom) {
                        const selectedSentence = sentence.trim();
                        if (selectedSentence) {
                            // 创建选中效果
                            const selection = window.getSelection();
                            selection.removeAllRanges();
                            selection.addRange(sentenceRange);
                            // console.log("command 选中的句子", selectedSentence);
                            debounceTranslation(selectedSentence, lastMouseX, lastMouseY);
                            return;
                        }
                    }
                }
                currentPos = sentenceEnd + 1;
            }
        }
    } else {
        console.log("未知的翻译场景", translationMode)
    }
});

// 监听页面失焦事件，关闭翻译浮窗
window.addEventListener('blur', () => {
    hidePopup();
    // showModeHint("🙅 关闭翻译，感谢使用");
});
// 点击页面其他地方时隐藏翻译浮窗
document.addEventListener('mousedown', (e) => {
    if (isCommandPressed || translationPopup && translationPopup.style.display == "block" || modeSwitchButton && modeSwitchButton.style.display == "block") {
        if (e.target !== modeSwitchButton) {
            hidePopup();
            showModeHint("🤪 结束翻译，感谢使用");
        }
    }
});