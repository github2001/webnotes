/**
 * WebNotes - 弹出页面脚本
 */

let allAnnotations = [];
let currentTab = 'all';
let currentUrl = '';

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 获取当前标签页URL
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentUrl = tab?.url || '';
    
    // 加载标注
    await loadAnnotations();
    
    // 标签切换
    document.querySelectorAll('.tab').forEach(tabBtn => {
        tabBtn.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tabBtn.classList.add('active');
            currentTab = tabBtn.dataset.tab;
            renderAnnotations();
        });
    });
    
    // 导出按钮
    document.getElementById('exportBtn').addEventListener('click', exportAnnotations);
    
    // 清空按钮
    document.getElementById('clearBtn').addEventListener('click', clearAnnotations);
});

/**
 * 加载标注
 */
async function loadAnnotations() {
    allAnnotations = await chrome.runtime.sendMessage({ action: 'getAllAnnotations' });
    updateStats();
    renderAnnotations();
}

/**
 * 更新统计
 */
function updateStats() {
    const total = allAnnotations.length;
    const withNote = allAnnotations.filter(a => a.note).length;
    const sites = new Set(allAnnotations.map(a => new URL(a.url).hostname)).size;
    
    document.getElementById('totalCount').textContent = total;
    document.getElementById('noteCount').textContent = withNote;
    document.getElementById('siteCount').textContent = sites;
}

/**
 * 渲染标注列表
 */
function renderAnnotations() {
    const container = document.getElementById('annotationList');
    
    let annotations = allAnnotations;
    if (currentTab === 'current' && currentUrl) {
        annotations = allAnnotations.filter(a => a.url === currentUrl);
    }
    
    // 按时间倒序
    annotations = [...annotations].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    if (annotations.length === 0) {
        container.innerHTML = `
            <div class="empty">
                <div class="empty-icon">📝</div>
                <div>${currentTab === 'current' ? '当前页面暂无标注' : '暂无标注'}</div>
                <div style="font-size:12px;margin-top:8px;">选中文本后右键或按 Ctrl+Shift+H 高亮</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = annotations.map(a => `
        <div class="annotation-item" data-id="${a.id}" data-url="${encodeURIComponent(a.url)}" data-text="${encodeURIComponent(a.text)}">
            <div class="annotation-header">
                <div class="annotation-site" title="${escapeHtml(a.title || a.url)}">
                    ${getHostname(a.url)}
                </div>
                <div class="annotation-actions">
                    <button class="btn-open" title="打开页面">🔗</button>
                    <button class="btn-copy" title="复制文本">📋</button>
                    <button class="btn-delete" title="删除">🗑️</button>
                </div>
            </div>
            <div class="annotation-text" style="background:${getHighlightColor(a.color)}">
                ${escapeHtml(a.text)}
            </div>
            ${a.note ? `<div class="annotation-note">${escapeHtml(a.note)}</div>` : ''}
            <div class="annotation-time">${formatTime(a.createdAt)}</div>
        </div>
    `).join('');
    
    // 事件委托处理按钮点击
    container.querySelectorAll('.btn-open').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const item = e.target.closest('.annotation-item');
            const url = decodeURIComponent(item.dataset.url);
            chrome.tabs.create({ url });
        });
    });
    
    container.querySelectorAll('.btn-copy').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const item = e.target.closest('.annotation-item');
            const text = decodeURIComponent(item.dataset.text);
            navigator.clipboard.writeText(text).then(() => {
                showToast('已复制');
            });
        });
    });
    
    container.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (!confirm('确定删除此标注？')) return;
            const item = e.target.closest('.annotation-item');
            const id = item.dataset.id;
            await chrome.runtime.sendMessage({ action: 'deleteAnnotation', id });
            allAnnotations = allAnnotations.filter(a => a.id !== id);
            updateStats();
            renderAnnotations();
            showToast('已删除');
        });
    });
}

/**
 * 获取主机名
 */
function getHostname(url) {
    try {
        return new URL(url).hostname;
    } catch {
        return url;
    }
}

/**
 * 获取高亮颜色
 */
function getHighlightColor(color) {
    const colors = {
        yellow: '#fff9c4',
        green: '#c8e6c9',
        blue: '#bbdefb',
        pink: '#f8bbd9',
        orange: '#ffe0b2'
    };
    return colors[color] || colors.yellow;
}

/**
 * 格式化时间
 */
function formatTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
    
    return date.toLocaleDateString('zh-CN');
}

/**
 * 打开页面
 */
function openPage(url) {
    chrome.tabs.create({ url });
}

/**
 * 复制文本
 */
function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('已复制');
    });
}

/**
 * 删除标注
 */
async function deleteAnnotation(id) {
    if (!confirm('确定删除此标注？')) return;
    
    await chrome.runtime.sendMessage({ action: 'deleteAnnotation', id });
    allAnnotations = allAnnotations.filter(a => a.id !== id);
    updateStats();
    renderAnnotations();
    showToast('已删除');
}

/**
 * 导出标注
 */
function exportAnnotations() {
    if (allAnnotations.length === 0) {
        showToast('暂无标注可导出');
        return;
    }
    
    // 生成Markdown
    let md = '# WebNotes 导出\n\n';
    md += `导出时间: ${new Date().toLocaleString('zh-CN')}\n`;
    md += `共 ${allAnnotations.length} 条标注\n\n---\n\n`;
    
    // 按网站分组
    const grouped = {};
    allAnnotations.forEach(a => {
        const host = getHostname(a.url);
        if (!grouped[host]) grouped[host] = [];
        grouped[host].push(a);
    });
    
    Object.entries(grouped).forEach(([host, items]) => {
        md += `## ${host}\n\n`;
        items.forEach(a => {
            md += `> ${a.text}\n\n`;
            if (a.note) md += `**笔记:** ${a.note}\n\n`;
            md += `_${formatTime(a.createdAt)} - [原文链接](${a.url})_\n\n---\n\n`;
        });
    });
    
    // 下载文件
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `webnotes-${new Date().toISOString().slice(0,10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('已导出');
}

/**
 * 清空标注
 */
async function clearAnnotations() {
    if (allAnnotations.length === 0) {
        showToast('暂无标注');
        return;
    }
    
    if (!confirm(`确定清空所有 ${allAnnotations.length} 条标注？此操作不可恢复！`)) return;
    
    await chrome.storage.local.set({ annotations: [] });
    allAnnotations = [];
    updateStats();
    renderAnnotations();
    showToast('已清空');
}

/**
 * 显示提示
 */
function showToast(message) {
    // 简单提示
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:60px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:8px 16px;border-radius:4px;font-size:13px;z-index:9999;';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1500);
}

/**
 * HTML转义
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * JS字符串转义
 */
function escapeJs(text) {
    return text.replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

