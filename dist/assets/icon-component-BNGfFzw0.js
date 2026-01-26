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
    svg > path:nth-of-type(1) {
      /* Default fill for primary parts of the icon, matching popup-menu */
      fill: var(--club-green) !important;
      transition: fill 0.3s ease;
      stroke: none; /* Ensure no stroke interferes */
    }
    svg > path:nth-of-type(2) {
      fill: var(--club-yellow) !important;
      stroke: none;
    }
    svg path[opacity="0.5"], svg g[opacity="0.5"] path {
      /* Secondary color for duotone effect */
      fill: var(--club-yellow) !important;
      stroke: none;
    }
    :host(:hover) svg path {
      /* Hover color for all parts of the icon */
      fill: var(--club-alternate) !important;
    }
  </style>
  <div class="icon-container"></div>
`;class r extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"}),this.shadowRoot.appendChild(n.content.cloneNode(!0))}async connectedCallback(){const e=this.getAttribute("name");if(e){const o=this.shadowRoot.querySelector(".icon-container");try{const t=await fetch(`assets/${e}.svg`);if(!t.ok)throw new Error(`Failed to load icon: ${t.statusText}`);const i=await t.text();o.innerHTML=i}catch(t){console.error("Error loading SVG:",t),o.innerHTML="⚠️"}}}}customElements.define("icon-component",r);
