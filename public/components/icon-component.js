const iconTemplate = document.createElement('template');
iconTemplate.innerHTML = `
  <style>
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
    }
    .icon-container {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
    }
    svg {
      width: 100%;
      height: 100%;
    }
    svg path {
      /* Default stroke for primary parts of the icon */
      stroke: var(--club-green);
      transition: stroke 0.3s ease;
    }
    svg path[opacity="0.5"] {
      /* Secondary color for duotone effect */
      stroke: var(--club-yellow);
    }
    :host(:hover) svg path {
      /* Hover color for all parts of the icon */
      stroke: var(--club-alternate);
    }
  </style>
  <div class="icon-container"></div>
`;

class IconComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(iconTemplate.content.cloneNode(true));
  }

  async connectedCallback() {
    const iconName = this.getAttribute('name');
    if (iconName) {
      const iconContainer = this.shadowRoot.querySelector('.icon-container');
      try {
        const response = await fetch(`assets/${iconName}.svg`);
        if (!response.ok) {
          throw new Error(`Failed to load icon: ${response.statusText}`);
        }
        const svgText = await response.text();
        // The fetched SVG is inserted into the container
        iconContainer.innerHTML = svgText;
      } catch (error) {
        console.error('Error loading SVG:', error);
        // Fallback content in case of an error
        iconContainer.innerHTML = '⚠️';
      }
    }
  }
}

customElements.define('icon-component', IconComponent);
