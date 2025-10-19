const pageHeaderTemplate = document.createElement('template');
pageHeaderTemplate.innerHTML = `
  <style>
    :host {
      display: block;
      --icon-size: 2rem; /* Default icon size, matches h1 */
    }
    .page-header {
      padding-block-end: 10px;
      border-block-end: 4px solid var(--club-yellow);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    h1 {
        color: var(--club-green);
        margin: 0;
        padding: 0;
        font-size: 2rem;
    }
    ::slotted(popup-menu) {
        font-size: var(--icon-size);
    }
  </style>
  <div class="page-header">
    <h1><slot name="title"></slot></h1>
    <slot name="icon"></slot>
  </div>
`;

class PageHeader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(pageHeaderTemplate.content.cloneNode(true));
  }
}

customElements.define('page-header', PageHeader);
