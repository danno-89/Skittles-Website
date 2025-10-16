const pageHeaderTemplate = document.createElement('template');
pageHeaderTemplate.innerHTML = `
  <style>
    :host {
      display: block;
      margin-bottom: var(--spacing-md);
    }
    .page-header {
      padding-block-end: 10px;
      border-block-end: 4px solid var(--club-yellow);
    }
    h1 {
        color: var(--club-green);
        margin: 0;
        padding: 0;
        font-size: 2rem;
    }
  </style>
  <div class="page-header">
    <h1><slot name="title"></slot></h1>
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
