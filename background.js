/**
 * WebNotes - 后台服务脚本
 * 负责数据存储和右键菜单
 */

// 扩展安装时初始化
chrome.runtime.onInstalled.addListener(() => {
    console.log('[WebNotes] 扩展已安装');
    
    // 创建右键菜单
    chrome.contextMenus.create({
        id: 'webnotes-highlight',
        title: '高亮选中文本',
        contexts: ['selection']
    });
    
    chrome.contextMenus.create({
        id: 'webnotes-note',
        title: '添加笔记',
        contexts: ['selection']
    });
});

// 右键菜单点击处理
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'webnotes-highlight') {
        chrome.tabs.sendMessage(tab.id, {
            action: 'highlight',
            color: 'yellow'
        });
    } else if (info.menuItemId === 'webnotes-note') {
        chrome.tabs.sendMessage(tab.id, {
            action: 'addNote'
        });
    }
});

// 消息处理
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case 'saveAnnotation':
            saveAnnotation(message.data).then(sendResponse);
            return true;
            
        case 'getAnnotations':
            getAnnotations(message.url).then(sendResponse);
            return true;
            
        case 'getAllAnnotations':
            getAllAnnotations().then(sendResponse);
            return true;
            
        case 'deleteAnnotation':
            deleteAnnotation(message.id).then(sendResponse);
            return true;
    }
});

/**
 * 保存标注
 */
async function saveAnnotation(annotation) {
    const result = await chrome.storage.local.get({ annotations: [] });
    const annotations = result.annotations;
    
    // 生成唯一ID
    annotation.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    annotation.createdAt = new Date().toISOString();
    
    annotations.push(annotation);
    await chrome.storage.local.set({ annotations });
    
    console.log('[WebNotes] 保存标注:', annotation);
    return { success: true, id: annotation.id };
}

/**
 * 获取指定URL的标注
 */
async function getAnnotations(url) {
    const result = await chrome.storage.local.get({ annotations: [] });
    return result.annotations.filter(a => a.url === url);
}

/**
 * 获取所有标注
 */
async function getAllAnnotations() {
    const result = await chrome.storage.local.get({ annotations: [] });
    return result.annotations;
}

/**
 * 删除标注
 */
async function deleteAnnotation(id) {
    const result = await chrome.storage.local.get({ annotations: [] });
    const annotations = result.annotations.filter(a => a.id !== id);
    await chrome.storage.local.set({ annotations });
    return { success: true };
}
