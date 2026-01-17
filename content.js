/**
 * WebNotes - 内容脚本
 * 在网页中实现高亮和笔记功能
 */

(function() {
    'use strict';
    
    // 高亮颜色配置
    const HIGHLIGHT_COLORS = {
        yellow: '#ffeb3b',
        green: '#4caf50',
        blue: '#2196f3',
        pink: '#e91e63',
        orange: '#ff9800'
    };
    
    let currentColor = 'yellow';
    let notePopup = null;
    
    // 初始化
    init();
    
    function init() {
        // 监听来自background的消息
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            switch (message.action) {
                case 'highlight':
                    currentColor = message.color || 'yellow';
                    highlightSelection();
                    break;
                case 'addNote':
                    showNotePopup();
                    break;
            }
        });
        
        // 加载已有的高亮
        loadExistingHighlights();
        
        // 快捷键支持
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+H 高亮
            if (e.ctrlKey && e.shiftKey && e.key === 'H') {
                e.preventDefault();
                highlightSelection();
            }
            // Ctrl+Shift+N 添加笔记
            if (e.ctrlKey && e.shiftKey && e.key === 'N') {
                e.preventDefault();
                showNotePopup();
            }
        });
    }
    
    /**
     * 高亮选中文本
     */
    function highlightSelection() {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
            return;
        }
        
        const selectedText = selection.toString().trim();
        if (!selectedText) {
            return;
        }
        
        const range = selection.getRangeAt(0);
        
        // 传统方法：处理跨节点选择
        try {
            // 先尝试简单方法
            const span = document.createElement('span');
            span.className = 'webnotes-highlight';
            span.style.backgroundColor = HIGHLIGHT_COLORS[currentColor];
            span.dataset.webnotes = 'true';
            span.dataset.color = currentColor;
            range.surroundContents(span);
            saveHighlight(selectedText, currentColor, getXPath(span));
            showToast('已高亮');
        } catch (e) {
            console.log('[WebNotes] 简单高亮失败，尝试跨节点处理');
            try {
                highlightRange(range, selectedText);
            } catch (e2) {
                console.error('[WebNotes] 高亮失败:', e2);
                // 最后的降级：只保存不高亮
                saveHighlight(selectedText, currentColor, null);
                showToast('已保存（无法高亮显示）');
            }
        }
        
        selection.removeAllRanges();
    }
    
    /**
     * 高亮Range（支持跨节点）
     */
    function highlightRange(range, text) {
        // 获取所有文本节点
        const textNodes = getTextNodesInRange(range);
        
        if (textNodes.length === 0) {
            saveHighlight(text, currentColor, null);
            showToast('已保存');
            return;
        }
        
        let firstSpan = null;
        
        textNodes.forEach((nodeInfo, index) => {
            const { node, start, end } = nodeInfo;
            const textContent = node.textContent;
            
            // 创建高亮span
            const span = document.createElement('span');
            span.className = 'webnotes-highlight';
            span.style.backgroundColor = HIGHLIGHT_COLORS[currentColor];
            span.dataset.webnotes = 'true';
            span.dataset.color = currentColor;
            
            // 分割文本节点
            const before = textContent.substring(0, start);
            const highlight = textContent.substring(start, end);
            const after = textContent.substring(end);
            
            span.textContent = highlight;
            
            // 替换原节点
            const parent = node.parentNode;
            const fragment = document.createDocumentFragment();
            
            if (before) fragment.appendChild(document.createTextNode(before));
            fragment.appendChild(span);
            if (after) fragment.appendChild(document.createTextNode(after));
            
            parent.replaceChild(fragment, node);
            
            if (index === 0) firstSpan = span;
        });
        
        // 保存到存储
        saveHighlight(text, currentColor, firstSpan ? getXPath(firstSpan) : null);
        showToast('已高亮');
    }
    
    /**
     * 获取Range内的所有文本节点
     */
    function getTextNodesInRange(range) {
        const result = [];
        const startContainer = range.startContainer;
        const endContainer = range.endContainer;
        
        // 简单情况：同一个文本节点
        if (startContainer === endContainer && startContainer.nodeType === Node.TEXT_NODE) {
            result.push({
                node: startContainer,
                start: range.startOffset,
                end: range.endOffset
            });
            return result;
        }
        
        // 复杂情况：遍历节点
        const walker = document.createTreeWalker(
            range.commonAncestorContainer,
            NodeFilter.SHOW_TEXT,
            null
        );
        
        let node;
        let inRange = false;
        
        while (node = walker.nextNode()) {
            if (node === startContainer) {
                inRange = true;
                result.push({
                    node: node,
                    start: range.startOffset,
                    end: node.textContent.length
                });
            } else if (node === endContainer) {
                result.push({
                    node: node,
                    start: 0,
                    end: range.endOffset
                });
                break;
            } else if (inRange) {
                result.push({
                    node: node,
                    start: 0,
                    end: node.textContent.length
                });
            }
        }
        
        return result;
    }
    
    /**
     * 使用CSS Highlight API高亮（实验性）
     */
    function highlightWithCSSHighlight(range, text) {
        const highlight = new Highlight(range);
        CSS.highlights.set('webnotes-' + Date.now(), highlight);
        saveHighlight(text, currentColor, null);
        showToast('已高亮');
    }
    
    /**
     * 显示笔记弹窗
     */
    function showNotePopup() {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
            showToast('请先选择文本');
            return;
        }
        
        const selectedText = selection.toString().trim();
        if (!selectedText) {
            return;
        }
        
        // 移除已有弹窗
        if (notePopup) {
            notePopup.remove();
        }
        
        // 获取选择位置
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // 创建弹窗
        notePopup = document.createElement('div');
        notePopup.className = 'webnotes-popup';
        notePopup.innerHTML = `
            <div class="webnotes-popup-header">
                <span>添加笔记</span>
                <button class="webnotes-popup-close">&times;</button>
            </div>
            <div class="webnotes-popup-content">
                <div class="webnotes-selected-text">${escapeHtml(selectedText.substring(0, 100))}${selectedText.length > 100 ? '...' : ''}</div>
                <textarea class="webnotes-note-input" placeholder="输入笔记..."></textarea>
                <div class="webnotes-color-picker">
                    ${Object.entries(HIGHLIGHT_COLORS).map(([name, color]) => 
                        `<span class="webnotes-color-btn ${name === currentColor ? 'active' : ''}" 
                              data-color="${name}" 
                              style="background:${color}"></span>`
                    ).join('')}
                </div>
            </div>
            <div class="webnotes-popup-footer">
                <button class="webnotes-btn webnotes-btn-cancel">取消</button>
                <button class="webnotes-btn webnotes-btn-save">保存</button>
            </div>
        `;
        
        // 定位弹窗
        notePopup.style.top = `${window.scrollY + rect.bottom + 10}px`;
        notePopup.style.left = `${window.scrollX + rect.left}px`;
        
        document.body.appendChild(notePopup);
        
        // 聚焦输入框
        const textarea = notePopup.querySelector('.webnotes-note-input');
        textarea.focus();
        
        // 事件绑定
        notePopup.querySelector('.webnotes-popup-close').onclick = () => notePopup.remove();
        notePopup.querySelector('.webnotes-btn-cancel').onclick = () => notePopup.remove();
        notePopup.querySelector('.webnotes-btn-save').onclick = () => {
            const note = textarea.value.trim();
            highlightSelection();
            if (note) {
                saveNote(selectedText, note, currentColor);
            }
            notePopup.remove();
            showToast('已保存');
        };
        
        // 颜色选择
        notePopup.querySelectorAll('.webnotes-color-btn').forEach(btn => {
            btn.onclick = () => {
                notePopup.querySelectorAll('.webnotes-color-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentColor = btn.dataset.color;
            };
        });
        
        // ESC关闭
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                notePopup.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }
    
    /**
     * 保存高亮
     */
    function saveHighlight(text, color, xpath) {
        chrome.runtime.sendMessage({
            action: 'saveAnnotation',
            data: {
                type: 'highlight',
                text: text,
                color: color,
                xpath: xpath,
                url: window.location.href,
                title: document.title
            }
        });
    }
    
    /**
     * 保存笔记
     */
    function saveNote(text, note, color) {
        chrome.runtime.sendMessage({
            action: 'saveAnnotation',
            data: {
                type: 'note',
                text: text,
                note: note,
                color: color,
                url: window.location.href,
                title: document.title
            }
        });
    }
    
    /**
     * 加载已有高亮
     */
    async function loadExistingHighlights() {
        const annotations = await chrome.runtime.sendMessage({
            action: 'getAnnotations',
            url: window.location.href
        });
        
        if (!annotations || annotations.length === 0) {
            return;
        }
        
        console.log('[WebNotes] 加载已有标注:', annotations.length);
        // TODO: 根据xpath恢复高亮显示
    }
    
    /**
     * 获取元素的XPath
     */
    function getXPath(element) {
        if (!element) return null;
        
        const parts = [];
        while (element && element.nodeType === Node.ELEMENT_NODE) {
            let index = 1;
            let sibling = element.previousSibling;
            while (sibling) {
                if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === element.tagName) {
                    index++;
                }
                sibling = sibling.previousSibling;
            }
            parts.unshift(`${element.tagName.toLowerCase()}[${index}]`);
            element = element.parentNode;
        }
        return '/' + parts.join('/');
    }
    
    /**
     * 显示提示
     */
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'webnotes-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
    
    /**
     * HTML转义
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
})();
