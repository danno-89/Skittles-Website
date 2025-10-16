const popupMenuTemplate = document.createElement('template');
popupMenuTemplate.innerHTML = `
  <style>
    :host {
      display: inline-flex;
      align-items: center;
      position: relative;
    }

    .popup-trigger {
      cursor: pointer;
      background-color: transparent;
      border: none;
      padding: 0 0.5rem;
      display: flex;
      align-items: center;
      height: 44.19px;
    }

    .icon-container svg {
      width: 24px;
      height: 24px;
    }

    /* Style the duotone SVG paths */
    .icon-container svg path:nth-of-type(1) {
      fill: var(--club-green);
    }
    .icon-container svg path:nth-of-type(2) {
      fill: var(--club-yellow);
    }
    
    #label {
      display: none;
    }

    .popup-content {
      display: none;
      position: absolute;
      top: 100%;
      left: 0; /* Align popup to the left of the icon */
      background-color: var(--pure-white);
      border: 2px solid var(--club-green);
      border-radius: var(--border-radius);
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      z-index: 10;
      padding: var(--spacing-md);
    }

    .popup-content.visible {
      display: block;
    }
  </style>
  <div class="popup-trigger">
    <div class="icon-container"></div>
    <span id="label"></span>
  </div>
  <div class="popup-content">
    <slot></slot>
  </div>
`;

class PopupMenu extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(popupMenuTemplate.content.cloneNode(true));
  }

  async connectedCallback() {
    const iconContainer = this.shadowRoot.querySelector('.icon-container');
    const labelEl = this.shadowRoot.querySelector('#label');
    const trigger = this.shadowRoot.querySelector('.popup-trigger');
    const content = this.shadowRoot.querySelector('.popup-content');

    const icon = this.getAttribute('icon');
    const label = this.getAttribute('label');

    if (icon) {
        try {
            const response = await fetch(`assets/${icon}.svg`);
            if (!response.ok) {
                throw new Error(`Failed to load icon: ${response.statusText}`);
            }
            const svgText = await response.text();
            iconContainer.innerHTML = svgText;
        } catch (error) {
            console.error('Error loading SVG:', error);
            iconContainer.innerHTML = '⚠️'; // Show an error icon
        }
    }
    labelEl.textContent = label;

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      content.classList.toggle('visible');
    });

    document.addEventListener('click', (e) => {
      if (!this.contains(e.target)) {
        content.classList.remove('visible');
      }
    });
  }
}

customElements.define('popup-menu', PopupMenu);
