let theme = "DARK";

const elOfbtn = document.getElementById("Modes");
const autoThemeToggle = document.getElementById("auto-theme-toggle");

// Sync Theme Button text
function syncThemeButton() {
  if (!elOfbtn) return;
  elOfbtn.textContent = theme === "DARK" ? "Set to Light mode?" : "Set to Dark Mode?";
}

// System Auto-Theme handling
function applyAutoTheme(isDark) {
  theme = isDark ? "DARK" : "LIGHT";
  document.documentElement.style.filter = theme === "LIGHT" ? "invert(1)" : "";
  syncThemeButton();
}

if (autoThemeToggle) {
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)");

  autoThemeToggle.addEventListener("change", (e) => {
    if (e.target.checked) {
      applyAutoTheme(systemPrefersDark.matches);
    }
  });

  systemPrefersDark.addEventListener("change", (e) => {
    if (autoThemeToggle.checked) {
      applyAutoTheme(e.matches);
    }
  });
}

// Update Clock & Date
function updateClock() {
  const now = new Date();
  
  // Clock
  document.getElementById('clock').textContent = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  // Date
  const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
  document.getElementById('date-display').textContent = now.toLocaleDateString('en-US', options);
}

// Weather temperature unit (C/F), persisted and toggled by clicking the widget
let tempUnit = 'C';
let lastTempC = null;
try {
  if (localStorage.getItem('tempUnit') === 'F') tempUnit = 'F';
} catch (error) {
  console.error('Could not read temperature unit:', error);
}

function renderTemp() {
  const tempEl = document.getElementById('weather-temp');
  if (!tempEl || lastTempC === null) return;
  const value = tempUnit === 'F' ? lastTempC * 9 / 5 + 32 : lastTempC;
  tempEl.textContent = `${Math.round(value)}°${tempUnit}`;
}

function toggleTempUnit() {
  tempUnit = tempUnit === 'C' ? 'F' : 'C';
  try {
    localStorage.setItem('tempUnit', tempUnit);
  } catch (error) {
    console.error('Could not save temperature unit:', error);
  }
  const tempEl = document.getElementById('weather-temp');
  if (lastTempC === null && tempEl) tempEl.textContent = `--°${tempUnit}`;
  renderTemp();
}

const weatherWidget = document.getElementById('weather-widget');
if (weatherWidget) {
  weatherWidget.title = 'Click to switch °C / °F';
  weatherWidget.addEventListener('click', toggleTempUnit);
}
const initialTempEl = document.getElementById('weather-temp');
if (initialTempEl) initialTempEl.textContent = `--°${tempUnit}`;

// Fetch Weather via Open-Meteo
async function fetchWeather() {
  const iconEl = document.getElementById('weather-icon');
  const tempEl = document.getElementById('weather-temp');
  const descEl = document.getElementById('weather-desc');

  if (!navigator.geolocation) {
    descEl.textContent = 'Geolocation not supported';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        if (!res.ok) throw new Error(`Weather request failed: ${res.status}`);
        const data = await res.json();
        if (data.current_weather) {
          const code = data.current_weather.weathercode;
          lastTempC = data.current_weather.temperature;
          renderTemp();
          
          // Weather Code Interpretations
          if (code === 0) { iconEl.textContent = '☀️'; descEl.textContent = 'Clear sky'; }
          else if (code <= 3) { iconEl.textContent = '⛅'; descEl.textContent = 'Partly cloudy'; }
          else if (code <= 48) { iconEl.textContent = '🌫️'; descEl.textContent = 'Fog'; }
          else if (code <= 67 || (code >= 80 && code <= 82)) { iconEl.textContent = '🌧️'; descEl.textContent = 'Rain'; }
          else if (code <= 77 || code === 85 || code === 86) { iconEl.textContent = '❄️'; descEl.textContent = 'Snow'; }
          else { iconEl.textContent = '⛈️'; descEl.textContent = 'Thunderstorm'; }
        }
      } catch {
        descEl.textContent = 'Weather unavailable';
      }
    },
    () => {
      descEl.textContent = 'Location access denied';
    }
  );
}

// Link Navigation & Management
function gotoLink(url) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

function createLinkId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getSavedLinks() {
  try {
    const links = JSON.parse(localStorage.getItem('customLinks') || '[]');
    const validLinks = Array.isArray(links) ? links : [];

    const normalized = validLinks
      .filter((link) => link && typeof link === 'object')
      .map((link) => ({
        ...link,
        id: typeof link.id === 'string' && link.id ? link.id : createLinkId(),
        name: typeof link.name === 'string' ? link.name : '',
        url: typeof link.url === 'string' ? link.url : ''
      }))
      .filter((link) => link.name && link.url);

    // Persist ids generated for legacy links so they stay stable (needed for delete)
    if (validLinks.some((link) => !link || typeof link.id !== 'string' || !link.id)) {
      try { saveLinks(normalized); } catch (error) { console.error('Could not persist link ids:', error); }
    }
    return normalized;
  } catch (error) {
    console.error('Could not read saved links:', error);
    return [];
  }
}

function saveLinks(links) {
  localStorage.setItem('customLinks', JSON.stringify(links));
}

function deleteLink(id) {
  let links = getSavedLinks();
  links = links.filter(link => link.id !== id);

  try {
    localStorage.setItem('customLinks', JSON.stringify(links));
    renderSavedLinks();
    populateDeleteModal();
  } catch (error) {
    console.error('Could not delete link:', error);
  }
}

function renderSavedLinks() {
  const linksContainer = document.querySelector('.links');
  if (!linksContainer) return;

  linksContainer.querySelectorAll('[data-custom-link]').forEach((button) => button.remove());

  getSavedLinks().forEach(({ id, name, url }) => {
    if (typeof name !== 'string' || typeof url !== 'string') return;

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (error) {
      console.error('Skipping invalid saved link URL:', url, error);
      return;
    }
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') return;

    const button = document.createElement('button');
    button.className = 'link-button';
    button.type = 'button';
    button.dataset.customLink = 'true';
    button.dataset.linkId = id;
    button.addEventListener('click', () => gotoLink(parsedUrl.href));

    const favicon = document.createElement('img');
    favicon.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsedUrl.hostname)}&sz=32`;
    favicon.alt = '';
    button.append(favicon, document.createTextNode(name));
    linksContainer.insertBefore(button, document.getElementById('add-link-button'));
  });
}

function populateDeleteModal() {
  const deleteList = document.getElementById('delete-links-list');
  if (!deleteList) return;

  deleteList.innerHTML = '';

  const links = getSavedLinks();
  if (links.length === 0) {
    deleteList.innerHTML = '<p style="color: #999; font-size:0.85rem;">No custom links to delete</p>';
    return;
  }

  links.forEach(({ id, name, url }) => {
    if (typeof name !== 'string' || typeof url !== 'string') return;

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return;
    }
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') return;

    const item = document.createElement('div');
    item.className = 'delete-link-item';

    const nameSpan = document.createElement('div');
    nameSpan.className = 'delete-link-item-name';

    const favicon = document.createElement('img');
    favicon.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsedUrl.hostname)}&sz=32`;
    favicon.alt = '';

    nameSpan.append(favicon, document.createTextNode(name));

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => {
      deleteLink(id);
    });

    item.append(nameSpan, deleteBtn);
    deleteList.append(item);
  });
}

function addLink(event) {
  event.preventDefault();
  const form = document.getElementById('link-form');
  const name = form.elements.name.value.trim();
  const enteredUrl = form.elements.url.value.trim();
  const errorMessage = document.getElementById('link-error');
  errorMessage.textContent = '';

  let url;
  try {
    url = new URL(enteredUrl.includes('://') ? enteredUrl : `https://${enteredUrl}`);
  } catch {
    errorMessage.textContent = 'Please enter a valid website address.';
    return;
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    errorMessage.textContent = 'Please enter an HTTP or HTTPS website address.';
    return;
  }

  const links = getSavedLinks();
  links.push({
    id: createLinkId(),
    name,
    url: url.href
  });

  try {
    localStorage.setItem('customLinks', JSON.stringify(links));
  } catch (error) {
    console.error('Could not save link:', error);
    errorMessage.textContent = 'The link could not be saved in this browser.';
    return;
  }

  form.reset();
  form.hidden = true;
  document.getElementById('add-link-button').setAttribute('aria-expanded', 'false');
  renderSavedLinks();
}

// Event Listeners Initialization
const linkForm = document.getElementById('link-form');
const addLinkButton = document.getElementById('add-link-button');
const deleteLinksButton = document.getElementById('delete-links-button');
const deleteModeOverlay = document.getElementById('delete-mode-overlay');
const closeDeleteModeButton = document.getElementById('close-delete-mode-button');

addLinkButton.addEventListener('click', () => {
  linkForm.hidden = !linkForm.hidden;
  addLinkButton.setAttribute('aria-expanded', String(!linkForm.hidden));
  if (!linkForm.hidden) linkForm.elements.name.focus();
});

deleteLinksButton.addEventListener('click', () => {
  populateDeleteModal();
  deleteModeOverlay.classList.add('active');
});

closeDeleteModeButton.addEventListener('click', () => {
  deleteModeOverlay.classList.remove('active');
});

deleteModeOverlay.addEventListener('click', (event) => {
  if (event.target === deleteModeOverlay) {
    deleteModeOverlay.classList.remove('active');
  }
});

linkForm.addEventListener('submit', addLink);
document.getElementById('cancel-link-button').addEventListener('click', () => {
  linkForm.reset();
  linkForm.hidden = true;
  addLinkButton.setAttribute('aria-expanded', 'false');
  document.getElementById('link-error').textContent = '';
});

// Image search via Google Lens
const searchContainer = document.querySelector('.search-container');
const searchInput = document.getElementById('search-input');
const imageSearchButton = document.getElementById('image-search-button');
const imageFileInput = document.getElementById('image-file-input');
const searchHint = document.getElementById('search-hint');
let hintTimer;

function showSearchHint(message) {
  searchHint.textContent = message;
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => { searchHint.textContent = ''; }, 6000);
}

function isImageUrl(text) {
  let url;
  try {
    url = new URL(text);
  } catch {
    return false;
  }
  return (url.protocol === 'http:' || url.protocol === 'https:') &&
    /\.(png|jpe?g|gif|webp|bmp|avif|svg)$/i.test(url.pathname);
}

function lensUrlFor(imageUrl) {
  const lens = new URL('https://lens.google.com/uploadbyurl');
  lens.searchParams.set('url', imageUrl);
  return lens.href;
}

// Re-encode as PNG: the async clipboard only reliably accepts image/png
function toPngBlob(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      URL.revokeObjectURL(objectUrl);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode image'))), 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read image'));
    };
    img.src = objectUrl;
  });
}

// Google has no public upload endpoint, so copy the image and open Lens, which accepts a paste
async function searchWithImageFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    showSearchHint('That file is not an image.');
    return;
  }
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
  const pasteKey = isMac ? '⌘V' : 'Ctrl+V';
  try {
    const blob = await toPngBlob(file);
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    showSearchHint(`Image copied. Press ${pasteKey} on the Google Lens page.`);
  } catch (error) {
    console.error('Could not copy image to clipboard:', error);
    showSearchHint('Drop your image onto the Google Lens page.');
  }
  window.open('https://lens.google.com/', '_blank', 'noopener,noreferrer');
}

function searching(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    const query = event.currentTarget.value.trim();
    if (!query) return;

    if (isImageUrl(query)) {
      window.location.href = lensUrlFor(query);
      return;
    }

    const searchUrl = new URL('https://www.google.com/search');
    searchUrl.searchParams.set('q', query);
    window.location.href = searchUrl.href;
  }
}

searchInput.addEventListener('keydown', searching);

imageSearchButton.addEventListener('click', () => {
  const text = searchInput.value.trim();
  if (isImageUrl(text)) {
    window.location.href = lensUrlFor(text);
  } else {
    imageFileInput.click();
  }
});

imageFileInput.addEventListener('change', () => {
  const [file] = imageFileInput.files;
  imageFileInput.value = '';
  searchWithImageFile(file);
});

// Paste: image data goes to Lens, an image URL is searched directly
document.addEventListener('paste', (event) => {
  const items = Array.from(event.clipboardData?.items || []);
  const imageItem = items.find((item) => item.type.startsWith('image/'));
  if (imageItem) {
    event.preventDefault();
    searchWithImageFile(imageItem.getAsFile());
    return;
  }
  const text = (event.clipboardData?.getData('text') || '').trim();
  if (document.activeElement === searchInput && isImageUrl(text)) {
    event.preventDefault();
    window.location.href = lensUrlFor(text);
  }
});

['dragenter', 'dragover'].forEach((type) => {
  document.addEventListener(type, (event) => {
    if (!event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    searchContainer.classList.add('drag-over');
  });
});

['dragleave', 'drop'].forEach((type) => {
  document.addEventListener(type, (event) => {
    if (type === 'dragleave' && event.relatedTarget) return;
    searchContainer.classList.remove('drag-over');
  });
});

document.addEventListener('drop', (event) => {
  const [file] = event.dataTransfer?.files || [];
  if (!file) return;
  event.preventDefault();
  searchWithImageFile(file);
});

function changeTheme() {
  if (theme === 'DARK') {
    theme = 'LIGHT';
  } else {
    theme = 'DARK';
  }

  document.documentElement.style.filter = theme === 'LIGHT' ? 'invert(1)' : '';
  syncThemeButton();
}

// Initial Run
syncThemeButton();
renderSavedLinks();
fetchWeather();
setInterval(updateClock, 1000);
updateClock();
