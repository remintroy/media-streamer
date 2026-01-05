// State
let videos = [];

// DOM Elements
const grid = document.getElementById("grid");
const search = document.getElementById("search");
const videoCount = document.getElementById("videoCount");
const totalSize = document.getElementById("totalSize");

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

// Create video card
function createCard(video) {
  return `
    <div class="card" data-title="${escapeHtml(video.title.toLowerCase())}">
      <div class="card-title">${escapeHtml(video.title)}</div>
      <div class="card-meta">${formatSize(video.size)}</div>
      <div class="card-actions">
        <a href="${video.url}" target="_blank" class="btn btn-primary">Play</a>
        <a href="/single.m3u?file=${encodeURIComponent(
          video.path
        )}" download class="btn btn-secondary">M3U</a>
      </div>
    </div>
  `;
}

// Render videos
function render(items) {
  if (items.length === 0) {
    grid.innerHTML = '<div class="empty">No videos found</div>';
    return;
  }
  grid.innerHTML = items.map(createCard).join("");
}

// Update stats
function updateStats(items) {
  const count = items.length;
  const size = items.reduce((sum, v) => sum + v.size, 0);
  videoCount.textContent = `${count} video${count !== 1 ? "s" : ""}`;
  totalSize.textContent = formatSize(size);
}

// Filter videos by search query
function filterVideos(query) {
  const q = query.toLowerCase().trim();
  if (!q) return videos;
  return videos.filter((v) => v.title.toLowerCase().includes(q));
}

// Handle search input
search.addEventListener("input", (e) => {
  const filtered = filterVideos(e.target.value);
  render(filtered);
});

// Load videos from API
async function loadVideos() {
  try {
    const response = await fetch("/api/files");
    if (!response.ok) throw new Error("Failed to load");

    videos = await response.json();
    updateStats(videos);
    render(videos);
  } catch (error) {
    console.error("Error:", error);
    grid.innerHTML = '<div class="empty">Failed to load videos</div>';
  }
}

// Initialize
loadVideos();
