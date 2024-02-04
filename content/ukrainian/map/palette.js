class Palette {
  constructor(items) {
    this.items = items;
    this.modal = null;
    this.inputField = null;
    this.resultsContainer = null;
  }

  start() {
    this._setupKeyListener();
  }

  _setupKeyListener() {
    document.addEventListener('keydown', (e) => {
      if (e.metaKey && e.key === 'k') { // Cmd+K for Mac, you can add Ctrl+K for Windows
        e.preventDefault();
        this.showPalette();
      } else if (e.key === 'Escape') {
        this._hidePalette();
      }
    });
  }

  showPalette() {
    if (!this.modal) {
      this.modal = this._createModal();
      document.body.appendChild(this.modal);
    }
    this.modal.style.display = 'block';
    this.inputField.focus();
  }

  _hidePalette() {
    if (this.modal) {
      this.modal.style.display = 'none';
    }
  }

  _createModal() {
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.left = '0';
    modal.style.top = '65px';
    modal.style.width = '100%';
    modal.style.height = '100vh';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.justifyItems = 'center';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
    modal.style.borderRadius = '5px';
    modal.style.padding = '20px';
    modal.style.boxSizing = 'border-box';
    modal.style.zIndex = '99999';

    this.inputField = document.createElement('input');
    this.inputField.type = 'text';
    this.inputField.placeholder = 'Шукати...';
    this.inputField.oninput = () => this._onSearchInput();
    this.inputField.style.display = 'block';
    this.inputField.style.width = '60%';
    this.inputField.style.padding = '10px';
    this.inputField.style.margin = '0 auto';
    this.inputField.style.borderRadius = '15px';
    this.inputField.style.outline = 'none';
    this.inputField.style.fontSize = '16px';
    this.inputField.style.boxShadow = '0px 4px 8px rgba(255, 255, 255, 0.8)';
    this.inputField.style.border = '1px solid rgba(255, 255, 255, 0.3)';
    this.inputField.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    this.inputField.style.color = 'black';
    modal.appendChild(this.inputField);

    this.resultsContainer = document.createElement('div');
    this.resultsContainer.style.width = '55%';
    this.resultsContainer.style.margin = '10px auto 0 auto';  // Center horizontally
    this.resultsContainer.style.maxHeight = '50vh';
    this.resultsContainer.style.overflowY = 'auto';
    this.resultsContainer.style.backgroundColor = 'rgba(128, 128, 128, 0.5)';
    this.resultsContainer.style.padding = '10px';
    this.resultsContainer.style.borderRadius = '10px';
    this.resultsContainer.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.5)';
    this.resultsContainer.style.color = 'white';
    this.resultsContainer.style.fontFamily = 'sans-serif';
    modal.appendChild(this.resultsContainer);

    return modal;
  }

  _onSearchInput() {
    const searchQuery = this.inputField.value.toLowerCase();
    const filteredItems = this.items.filter(item => item.name.toLowerCase().includes(searchQuery));

    this._updateResults(filteredItems);
  }

  _updateResults(items) {
    this.resultsContainer.innerHTML = '';
    items.forEach(item => {
      const listItem = document.createElement('div');
      listItem.innerText = item.name;
      listItem.style.padding = '10px';
      listItem.style.marginBottom = '5px';
      listItem.style.cursor = 'pointer';
      listItem.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
      listItem.style.borderRadius = '5px';
      listItem.onclick = () => {
        item.handler();
        this._hidePalette();
      };

      listItem.onmouseover = () => {
        listItem.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
      };

      listItem.onmouseout = () => {
        listItem.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
      };

      this.resultsContainer.appendChild(listItem);
    });
  }
}

export default Palette;

