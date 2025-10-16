const popupMenuTemplate = document.createElement('template');
popupMenuTemplate.innerHTML = `
  <style>
    :host {
      display: inline-block;
      position: relative;
    }

    .popup-trigger {
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      background-color: var(--pure-white);
      border: 2px solid var(--club-green);
      border-top: none;
      border-bottom-left-radius: var(--border-radius);
      border-bottom-right-radius: var(--border-radius);
      padding: 0 1rem;
      font-family: 'Outfit', sans-serif;
      font-size: 1.1rem;
      font-weight: bold;
      color: var(--club-green);
      height: 44.19px;
      box-sizing: border-box;
      min-width: 150px;
      margin-right: 0.5rem;
    }

    .popup-trigger img {
      width: 24px;
      height: 24px;
      margin-right: 8px;
    }

    .popup-content {
      display: none;
      position: absolute;
      top: 100%;
      left: 0;
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
    <img id="icon" src="" alt="">
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

    iconEl.src = `/assets/${icon}.svg`;
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
