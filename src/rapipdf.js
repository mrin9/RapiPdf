import createPdf from '@/pdf-gen';

const tmpl = document.createElement('template');
tmpl.innerHTML = `
  <style>
  :host{
    --primary-color:#0078d7;
    --border-radius:2px;
    --input-bg:#fff;
    --fg:#333;
    --primary-text:#fff;
    --font-size: 1rem;
    --font-family: "Open Sans", sans-serif !important;
    display:block;
    width:auto;
  }

  .spec-input {
    border-radius:var(--border-radius);
    border:1px solid var(--primary-color);
    background:var(--input-bg);
    font-size: inherit;
    color:var(--fg);
    transition: border .2s;
    outline: none;
    padding:6px 5px;
    box-sizing: border-box;
    flex:1;
  }
  .spec-input:focus {
    outline: 1px dotted var(--fg);
    outline-offset: -3px;
  }
  .rapi-pdf-btn{
    font-family: var(--font-family);
  }
  </style>
  <div style='display:flex; width:100%; height: 100%;'>
    <input  class="spec-input"  id="spec-url" type="text"  placeholder="Spec URL" value="" tabindex="0">
    <button class="rapi-pdf-btn btn btn-primary" type="button" tabindex="0">GENERATE PDF</button>
  </div>  
`;

export default customElements.define('rapi-pdf', class RapiPdf extends HTMLElement {
  constructor() {
    super(); // always call super() first in the constructor.
    const shadowRoot = this.attachShadow({ mode: 'open' });
    const elFromTemplate = tmpl.content.cloneNode(true);
    this.inputEl = elFromTemplate.querySelector('.spec-input');
    this.btnEl = elFromTemplate.querySelector('.rapi-pdf-btn');
    const fontAwesomeStyle = document.querySelector('link[href*="font-awesome"]');
    const boostrapStyle = document.querySelector('link[href*="bootstrap"]');
    // Initialize attributes if not defined
    shadowRoot.appendChild(elFromTemplate);
    // adding fontawesome style ref
    if (fontAwesomeStyle) {
      this.shadowRoot.appendChild(fontAwesomeStyle.cloneNode());
    }
    // adding boostrap style ref
    if (boostrapStyle) {
      this.shadowRoot.appendChild(boostrapStyle.cloneNode());
    }
  }

  static get properties() {
    return {
      localize: { type: Object },
    };
  }

  connectedCallback() {
    // Add Event Listeners
    this.inputEl.addEventListener('change', (e) => this.onChangeInput(e));
    this.inputEl.addEventListener('keyup', (e) => this.onKeyUp(e));
    this.btnEl.addEventListener('click', () => this.generatePdf());
    let localizeObj = {};
    if (this.children[0]) {
      const localizeStr = this.children[0].content.textContent;
      try {
        localizeObj = JSON.parse(localizeStr);
      } catch (e) {
        localizeObj = {};
      }
    }

    this.localize = {
      index: 'INDEX',
      api: 'API',
      apiList: 'API List',
      apiReference: 'API Reference',
      apiVersion: 'API Version',
      contact: 'CONTACT',
      name: 'NAME',
      email: 'EMAIL',
      url: 'URL',
      termsOfService: 'Terms of service',
      securityAndAuthentication: 'Security and Authentication',
      securitySchemes: 'SECURITY SCHEMES',
      key: 'KEY',
      type: 'TYPE',
      example: 'EXAMPLE',
      description: 'DESCRIPTION',
      request: 'REQUEST',
      requestBody: 'REQUEST BODY',
      response: 'RESPONSE',
      responseModel: 'RESPONSE MODEL',
      statusCode: 'STATUS CODE',
      deprecated: 'DEPRECATED',
      allowed: 'ALLOWED',
      default: 'DEFAULT',
      readOnly: 'READ ONLY',
      writeOnly: 'WRITE ONLY',
      enumValues: 'ENUM',
      pattern: 'PATTERN',
      parameters: 'Parameters',
      noRequestParameters: 'No request parameters',
      method: 'METHOD',
      ...localizeObj,
    };
  }

  disconnectedCallback() {
    // Remove Event Listeners
    this.inputEl.removeEventListener('change', this.inputOnChange);
    this.inputEl.removeEventListener('keyup', this.onKeyUp);
    this.btnEl.removeEventListener('click', this.generatePdf);
  }

  static get observedAttributes() {
    return ['spec-url', 'button-bg', 'input-bg', 'button-color', 'input-color', 'button-label', 'hide-input', 'button-icon', 'button-css-class'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case 'spec-url':
        if (oldValue !== newValue) {
          this.inputEl.value = newValue;
          return true;
        }
        break;
      case 'button-label':
        if (oldValue !== newValue) {
          this.btnEl.innerText = newValue;
          return true;
        }
        break;
      case 'hide-input':
        if (oldValue !== newValue) {
          if (newValue === 'true') {
            this.inputEl.style.display = 'none';
          } else {
            this.inputEl.style.display = 'block';
          }
          return true;
        }
        break;
      case 'button-icon':
        if (oldValue !== newValue && newValue != null) {
          this.btnEl.innerHTML = `<i class="${newValue}"></i> GENERATE PDF`;
          return true;
        }
        break;
      case 'button-css-class':
        if (oldValue !== newValue && newValue != null) {
          this.btnEl.classList.remove('btn-primary');
          this.btnEl.classList.add(newValue);
          return true;
        }
        break;
      case 'button-bg':
        this.btnEl.style.backgroundColor = newValue;
        this.inputEl.style.borderColor = newValue;
        return true;
      case 'button-color':
        this.btnEl.style.color = newValue;
        return true;
      case 'input-bg':
        this.inputEl.style.backgroundColor = newValue;
        return true;
      case 'input-color':
        this.inputEl.style.color = newValue;
        return true;
      default:
        return true;
    }
    return true;
  }

  get specUrl() {
    return this.getAttribute('spec-url');
  }

  set specUrl(newSpecUrl) {
    this.setAttribute('spec-url', newSpecUrl);
  }

  onChangeInput(e) {
    this.specUrl = e.target.value;
  }

  onKeyUp(e) {
    if (e.keyCode === 13) {
      // In case of input keyup - first change event will fire which will set the new specUrl URL
      this.generatePdf();
    }
  }

  generatePdf(jsonObj) {
    const pdfSortTags = this.getAttribute('pdf-sort-tags') !== 'false';
    const pdfPrimaryColor = this.getAttribute('pdf-primary-color');
    const pdfAlternateColor = this.getAttribute('pdf-alternate-color');
    const pdfTitle = this.getAttribute('pdf-title') === null ? 'API Reference' : this.getAttribute('pdf-title');
    const pdfCoverText = this.getAttribute('pdf-cover-text') ? this.getAttribute('pdf-cover-text') : '';
    const pdfSecurityText = this.getAttribute('pdf-security-text') ? this.getAttribute('pdf-security-text') : '';
    const pdfApiText = this.getAttribute('pdf-api-text') ? this.getAttribute('pdf-api-text') : '';
    const pdfSchemaStyle = this.getAttribute('pdf-schema-style') === 'table' ? 'table' : 'object';
    const pdfFooterText = this.getAttribute('pdf-footer-text') ? this.getAttribute('pdf-footer-text') : '';
    const includeInfo = this.getAttribute('include-info') !== 'false';
    const includeToc = this.getAttribute('include-toc') !== 'false';
    const includeSecurity = this.getAttribute('include-security') !== 'false';
    const includeExample = this.getAttribute('include-example') === 'true';
    const includeApiDetails = this.getAttribute('include-api-details') !== 'false';
    const includeApiList = this.getAttribute('include-api-list') === 'true';

    const localize = this.localize;
    const options = {
      pdfSortTags,
      pdfPrimaryColor,
      pdfAlternateColor,
      pdfTitle,
      pdfCoverText,
      pdfSecurityText,
      pdfApiText,
      pdfSchemaStyle,
      pdfFooterText,
      includeInfo,
      includeToc,
      includeSecurity,
      includeExample,
      includeApiDetails,
      includeApiList,
      localize,
    };
    const spec = this.specUrl || jsonObj;
    createPdf(spec, options);
  }
});
