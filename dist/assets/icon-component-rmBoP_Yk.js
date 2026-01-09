const n=document.createElement("template");n.innerHTML=`
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
`;class s extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"}),this.shadowRoot.appendChild(n.content.cloneNode(!0))}async connectedCallback(){const t=this.getAttribute("name");if(t){const o=this.shadowRoot.querySelector(".icon-container");try{const e=await fetch(`assets/${t}.svg`);if(!e.ok)throw new Error(`Failed to load icon: ${e.statusText}`);const r=await e.text();o.innerHTML=r}catch(e){console.error("Error loading SVG:",e),o.innerHTML="⚠️"}}}}customElements.define("icon-component",s);
