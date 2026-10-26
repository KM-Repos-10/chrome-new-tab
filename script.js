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
        const data = await res.json();
        if (data.current_weather) {
          const temp = Math.round(data.current_weather.temperature);
          const code = data.current_weather.weathercode;
          tempEl.textContent = `${temp}°C`;
          
          // Weather Code Interpretations
          if (code === 0) { iconEl.textContent = '☀️'; descEl.textContent = 'Clear sky'; }
          else if (code <= 3) { iconEl.textContent = 'Partly cloudy'; descEl.textContent = 'Partly cloudy'; }
          else if (code <= 67) { iconEl.textContent = '🌧️'; descEl.textContent = 'Rain'; }
          else if (code <= 77) { iconEl.textContent = '❄️'; descEl.textContent = 'Snow'; }
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

    return validLinks
      .filter((link) => link && typeof link === 'object')
      .map((link) => ({
        ...link,
        id: typeof link.id === 'string' && link.id ? link.id : createLinkId(),
        name: typeof link.name === 'string' ? link.name : '',
        url: typeof link.url === 'string' ? link.url : ''
      }))
      .filter((link) => link.name && link.url);
  } catch (error) {
    console.error('Could not read saved links:', error);
    return [];
  }
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

function searching(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    const query = event.currentTarget.value.trim();
    if (!query) return;

    const searchUrl = new URL('https://www.google.com/search');
    searchUrl.searchParams.set('q', query);
    window.location.href = searchUrl.href;
  }
}

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
