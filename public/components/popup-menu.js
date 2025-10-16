const popupMenuTemplate = document.createElement('template');
popupMenuTemplate.innerHTML = `
  <style>
    :host {
      display: inline-flex; /* Align with other flex items like tabs */
      align-items: center; /* Vertically center the icon */
      position: relative;
    }

    .popup-trigger {
      cursor: pointer;
      background-color: transparent;
      border: none;
      padding: 0 0.5rem; /* Provide some clickable space */
      display: flex;
      align-items: center;
      height: 44.19px; /* Match tab height */
    }

    .popup-trigger img {
      width: 24px;
      height: 24px;
    }
    
    #label {
      display: none; /* Hide the text label as requested */
    }

    .popup-content {
      display: none;
      position: absolute;
      top: 100%;
      right: 0;
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
    <img id="icon" src="" alt="Menu Icon">
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

  connectedCallback() {
    const iconEl = this.shadowRoot.querySelector('#icon');
    const labelEl = this.shadowRoot.querySelector('#label');
    const trigger = this.shadowRoot.querySelector('.popup-trigger');
    const content = this.shadowRoot.querySelector('.popup-content');

    const icon = this.getAttribute('icon');
    const label = this.getAttribute('label');

    if (icon) {
        iconEl.src = `/assets/${icon}.svg`;
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
