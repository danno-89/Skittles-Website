const pageHeaderTemplate = document.createElement('template');
pageHeaderTemplate.innerHTML = `
  <style>
    :host {
      display: block;
    }
    .page-header {
      padding-block-end: 10px;
      border-block-end: 4px solid var(--club-yellow);
      margin-block-end: 0;
    }
    h1 {
        color: var(--club-green);
        margin-top: 0;
        border: none;
        padding: 0;
        margin: 0;
    }
    .tab-bar {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        border-bottom: 2px solid var(--club-green);
        margin-top: var(--spacing-md);
    }
  </style>
  <div class="page-header">
    <h1><slot name="title"></slot></h1>
  </div>
  <div class="tab-bar">
    <slot name="tabs"></slot>
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
