let theme = "DARK"

const elOfbtn = document.getElementById("Modes")
function updateClock() {
      const now = new Date();
      document.getElementById('clock').textContent = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    }

    function gotoLink(url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }

    function getSavedLinks() {
      try {
        const links = JSON.parse(localStorage.getItem('customLinks') || '[]');
        return Array.isArray(links) ? links : [];
      } catch (error) {
        console.error('Could not read saved links:', error);
        return [];
      }
    }

    function deleteLink(name) {
      let links = getSavedLinks();
      links = links.filter(link => link.name !== name);
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
      linksContainer.querySelectorAll('[data-custom-link]').forEach((button) => button.remove());

      getSavedLinks().forEach(({ name, url }) => {
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
        button.dataset.customLink = '';
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
      deleteList.innerHTML = '';

      const links = getSavedLinks();
      if (links.length === 0) {
        deleteList.innerHTML = '<p style="color: #999;">No custom links to delete</p>';
        return;
      }

      links.forEach(({ name, url }) => {
        if (typeof name !== 'string' || typeof url !== 'string') return;

        let parsedUrl;
        try {
          parsedUrl = new URL(url);
        } catch (error) {
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
          deleteLink(name);
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
      links.push({ name, url: url.href });
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
        window.open(searchUrl.href, '_blank', 'noopener,noreferrer');
      }
    }

function changeTheme() {
    // Toggle the theme value
    if (theme === "DARK") {
        theme = "LIGHT";
    } else {
        theme = "DARK";
    }

   
    if (theme === "DARK") {
        elOfbtn.innerText = "Set to White mode?";

    } else {
        elOfbtn.innerText = "Set to Dark Mode?";

    }
    //actully make changes depending on the theme

    if (theme === "LIGHT") {
      document.documentElement.style.filter = "invert(1)";

    }
    
}



    

    renderSavedLinks();
    setInterval(updateClock, 1000);
    updateClock();
