// State
let currentPath = "";
let currentItems = { folders: [], files: [] };

// DOM Elements
const grid = document.getElementById("grid");
const search = document.getElementById("search");
const breadcrumb = document.getElementById("breadcrumb");
const videoCount = document.getElementById("videoCount");
const totalSize = document.getElementById("totalSize");
const downloadPlaylist = document.getElementById("downloadPlaylist");

// Format bytes to human readable
function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB";
  return (bytes / 1073741824).toFixed(2) + " GB";
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Create folder card
function createFolderCard(folder) {
  const folderPath = currentPath
    ? `${currentPath}/${folder.name}`
    : folder.name;
  return `
    <div class="card" onclick="navigate('${escapeHtml(folderPath)}')">
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

// Get stream URL for a file
function getStreamUrl(filePath) {
  return `${window.location.origin}/media/${encodeURIComponent(filePath)}`;
}
// Copy to clipboard
async function copyToClipboard(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    const originalText = btn.innerHTML;
    btn.innerHTML = "✓ Copied";
    btn.classList.add("btn-success");

    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.classList.remove("btn-success");
    }, 2000);
  } catch (err) {
    console.error("Failed to copy", err);
  }
}

// Create file card
function createFileCard(file) {
  const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;
  const streamUrl = getStreamUrl(filePath);
  const vlcUrl = `vlc://${streamUrl}`;

  return `
    <div class="card file-card" data-name="${escapeHtml(
      file.name.toLowerCase()
    )}">
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
        <button onclick="copyToClipboard('${streamUrl}', this)" class="btn btn-secondary">🔗 Copy</button>
        <a href="/single.m3u?file=${encodeURIComponent(
          filePath
        )}" download class="btn btn-secondary">M3U</a>
      </div>
    </div>
  `;
}

// Render current directory
function render(items) {
  const folders = items.folders || [];
  const files = items.files || [];

  if (folders.length === 0 && files.length === 0) {
    grid.innerHTML = '<div class="empty">This folder is empty</div>';
    return;
  }

  const html = [
    ...folders.map(createFolderCard),
    ...files.map(createFileCard),
  ].join("");

  grid.innerHTML = html;
}

// Render breadcrumb
function renderBreadcrumb(pathParts) {
  let html =
    '<a href="#" class="breadcrumb-item" onclick="navigate(\'\'); return false;">Home</a>';

  let accumulated = "";
  for (const part of pathParts) {
    accumulated = accumulated ? `${accumulated}/${part}` : part;
    html += `<span class="breadcrumb-separator">/</span>`;
    html += `<a href="#" class="breadcrumb-item" onclick="navigate('${escapeHtml(
      accumulated
    )}'); return false;">${escapeHtml(part)}</a>`;
  }

  breadcrumb.innerHTML = html;
}

// Navigate to path
async function navigate(path) {
  currentPath = path;
  search.value = "";

  // Update playlist download link
  downloadPlaylist.href = path
    ? `/playlist.m3u?path=${encodeURIComponent(path)}`
    : "/playlist.m3u";

  grid.innerHTML =
    '<div class="loading"><div class="spinner"></div><p>Loading...</p></div>';

  try {
    const response = await fetch(
      `/api/browse?path=${encodeURIComponent(path)}`
    );
    if (!response.ok) throw new Error("Failed to load");

    const data = await response.json();
    currentItems = { folders: data.folders, files: data.files };

    renderBreadcrumb(data.pathParts || []);
    render(currentItems);
  } catch (error) {
    console.error("Error:", error);
    grid.innerHTML = '<div class="empty">Failed to load directory</div>';
  }
}

// Filter current items
function filterItems(query) {
  const q = query.toLowerCase().trim();
  if (!q) {
    render(currentItems);
    return;
  }

  const filtered = {
    folders: currentItems.folders.filter((f) =>
      f.name.toLowerCase().includes(q)
    ),
    files: currentItems.files.filter((f) => f.name.toLowerCase().includes(q)),
  };

  render(filtered);
}

// Handle search input
search.addEventListener("input", (e) => {
  filterItems(e.target.value);
});

// Load total stats
async function loadStats() {
  try {
    const response = await fetch("/api/files");
    if (!response.ok) return;

    const files = await response.json();
    const count = files.length;
    const size = files.reduce((sum, v) => sum + v.size, 0);

    videoCount.textContent = `${count} video${count !== 1 ? "s" : ""}`;
    totalSize.textContent = formatSize(size);
  } catch (error) {
    console.error("Error loading stats:", error);
  }
}

// Make navigate globally accessible
window.navigate = navigate;

// Initialize
navigate("");
loadStats();
