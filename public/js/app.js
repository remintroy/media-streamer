import { fetchDirectory, fetchStats } from './api.js';
import { renderGrid, renderBreadcrumb } from './ui.js';
import { formatSize, copyToClipboard } from './utils.js';

// State
let currentPath = '';
let currentItems = { folders: [], files: [] };

// DOM Elements
const grid = document.getElementById('grid');
const search = document.getElementById('search');
const breadcrumb = document.getElementById('breadcrumb');
const videoCount = document.getElementById('videoCount');
const totalSize = document.getElementById('totalSize');
const downloadPlaylist = document.getElementById('downloadPlaylist');

async function navigate(path) {
  currentPath = path;
  search.value = ''; // Reset search

  // Update playlist download link
  downloadPlaylist.href = path
    ? `/playlist.m3u?path=${encodeURIComponent(path)}`
    : '/playlist.m3u';

  grid.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading...</p></div>';

  try {
    const data = await fetchDirectory(path);
    currentItems = { folders: data.folders, files: data.files };

    renderBreadcrumb(data.pathParts || [], breadcrumb);
    renderGrid(currentItems, grid, currentPath);
  } catch (error) {
    console.error('Error:', error);
    grid.innerHTML = '<div class="empty">Failed to load directory</div>';
  }
}

function filterItems(query) {
  const q = query.toLowerCase().trim();
  if (!q) {
    renderGrid(currentItems, grid, currentPath);
    return;
  }

  const filtered = {
    folders: currentItems.folders.filter((f) =>
      f.name.toLowerCase().includes(q)
    ),
    files: currentItems.files.filter((f) => f.name.toLowerCase().includes(q)),
  };

  renderGrid(filtered, grid, currentPath);
}

// Event Listeners

// Navigation (folders)
grid.addEventListener('click', (e) => {
    const folderCard = e.target.closest('[data-type="folder"]');
    if (folderCard) {
        const path = folderCard.dataset.path;
        navigate(path);
    }
});

// Copy button
grid.addEventListener('click', (e) => {
    const copyBtn = e.target.closest('[data-action="copy"]');
    if (copyBtn) {
        const text = copyBtn.dataset.text;
        copyToClipboard(text, copyBtn);
    }
});

// Breadcrumb navigation
breadcrumb.addEventListener('click', (e) => {
    e.preventDefault();
    const item = e.target.closest('.breadcrumb-item');
    if (item) {
        const path = item.dataset.path;
        // Check if path is not null/undefined (empty string is valid for Home)
        if (typeof path === 'string') {
            navigate(path);
        }
    }
});

// Search
search.addEventListener('input', (e) => {
  filterItems(e.target.value);
});

async function init() {
    // Initial Load
    navigate('');
    
    // Stats
    try {
        const files = await fetchStats();
        const count = files.length;
        const size = files.reduce((sum, v) => sum + v.size, 0);

        videoCount.textContent = `${count} video${count !== 1 ? 's' : ''}`;
        totalSize.textContent = formatSize(size);
    } catch (e) {
        console.error("Stats load failed", e);
    }
}

init();
