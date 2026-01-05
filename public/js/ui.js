import { formatSize, escapeHtml, copyToClipboard } from './utils.js';

export function createFolderCard(folder, currentPath, navigate) {
    const folderPath = currentPath
    ? `${currentPath}/${folder.name}`
    : folder.name;
    
    // We can't attach onclick directly with modules easily without exposing to window
    // So we return the element string, but we'll handle events via delegation or simple strings with data attributes
    return `
    <div class="card" data-type="folder" data-path="${escapeHtml(folderPath)}">
        <div class="card-content">
        <div class="card-icon folder">📁</div>
        <div class="card-info">
            <div class="card-title">${escapeHtml(folder.name)}</div>
            <div class="card-meta">Folder</div>
        </div>
        </div>
    </div>
    `;
}

export function createFileCard(file, currentPath) {
    const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;
    const streamUrl = `${window.location.origin}/media/${encodeURIComponent(filePath)}`;
    const vlcUrl = `vlc://${streamUrl}`;

    // Note: onclick for copy needs to be handled via event delegation in main app
    return `
    <div class="card file-card" data-name="${escapeHtml(file.name.toLowerCase())}">
        <div class="card-content">
        <div class="card-icon file">🎬</div>
        <div class="card-info">
            <div class="card-title">${escapeHtml(file.name)}</div>
            <div class="card-meta">${formatSize(file.size)}</div>
        </div>
        </div>
        <div class="card-actions">
        <a href="${streamUrl}" target="_blank" class="btn btn-primary">Play</a>
        <a href="${vlcUrl}" class="btn btn-vlc">VLC</a>
        <button data-action="copy" data-text="${streamUrl}" class="btn btn-secondary">🔗 Copy</button>
        <a href="/single.m3u?file=${encodeURIComponent(filePath)}" download class="btn btn-secondary">M3U</a>
        </div>
    </div>
    `;
}

export function renderGrid(items, element, currentPath) {
    const folders = items.folders || [];
    const files = items.files || [];

    if (folders.length === 0 && files.length === 0) {
        element.innerHTML = '<div class="empty">This folder is empty</div>';
        return;
    }

    const html = [
        ...folders.map(f => createFolderCard(f, currentPath)),
        ...files.map(f => createFileCard(f, currentPath)),
    ].join('');

    element.innerHTML = html;
}

export function renderBreadcrumb(pathParts, element) {
    let html = '<a href="#" class="breadcrumb-item" data-path="">Home</a>';

    let accumulated = '';
    for (const part of pathParts) {
        accumulated = accumulated ? `${accumulated}/${part}` : part;
        html += `<span class="breadcrumb-separator">/</span>`;
        html += `<a href="#" class="breadcrumb-item" data-path="${escapeHtml(accumulated)}">${escapeHtml(part)}</a>`;
    }

    element.innerHTML = html;
}
