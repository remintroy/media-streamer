export async function fetchDirectory(path) {
  const response = await fetch(`/api/browse?path=${encodeURIComponent(path)}`);
  if (!response.ok) throw new Error('Failed to load');
  return await response.json();
}

export async function fetchStats() {
  const response = await fetch('/api/files');
  if (!response.ok) throw new Error('Failed to load stats');
  return await response.json();
}
