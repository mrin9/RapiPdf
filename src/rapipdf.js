import createPdf from '@/utils/pdf-gen';

let tmpl = document.createElement('template');
tmpl.innerHTML = `
  <style>
  :host{
    --primary-color:#0078d7;
    --border-radius:2px;
    --input-bg:#fff;
    --fg:#333;
    --primary-text:#fff;
    --font-size:13px;
    display:block;
    width:350px;
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

  .btn-default {
    border-radius: 0 var(--border-radius) var(--border-radius) 0;
    font-size: 85%;
    font-weight: 600;
    display: inline-block;
    padding: 6px 16px;
    outline: none;
    outline-offset: -2px;
    line-height: 1;
    text-align: center;
    white-space: nowrap;
    background-color:var(--primary-color);
    color:var(--primary-text);
    border: 0px solid var(--primary-color);
    transition: background-color 0.2s;
    user-select: none;
    cursor: pointer;
  }
  .btn-default:focus{
    outline: 1px solid var(--primary-text);
  }
  
  </style>
  <div style='display:flex; width:100%; height: 100%;'>
    <input  class="spec-input"  id="spec-url" type="text"  placeholder="Spec URL" value="" tabindex="0">
    <button class="btn-default" type="button" style="margin-left:-1px" tabindex="0">GENERATE PDF</button>
  </div>  
`;

export default customElements.define('rapi-pdf', class RapiPdf extends HTMLElement {
  constructor() {
    super(); // always call super() first in the constructor.
    let shadowRoot = this.attachShadow({mode: 'open'});
    let elFromTemplate = tmpl.content.cloneNode(true);
    this.inputEl = elFromTemplate.querySelector(".spec-input");
    this.btnEl = elFromTemplate.querySelector(".btn-default");
    
    // Initialize attributes if not defined 
    shadowRoot.appendChild(elFromTemplate);
  }

  static get properties() { 
    return { 
      localize: { type: Object }
    };
  }

  connectedCallback() {
    // Add Event Listeners
    this.inputEl.addEventListener('change', e => this.onChangeInput(e) );    
    this.inputEl.addEventListener('keyup',  e => this.onKeyUp(e) );    
    this.btnEl.addEventListener('click',  e => this.generatePdf() );
    let localizeObj = {};
    if (this.children[0]){
      let localizeStr = this.children[0].content.textContent;
      try {
        localizeObj = JSON.parse(localizeStr);
      }
      catch(e) {
        localizeObj = {};
      }
    }
    this.localize = Object.assign({
      'index':'INDEX',
      'api':'API',
      'apiList':'API List',
      'apiReference':'API Reference',
      'apiVersion':'API Version',
      'contact':'CONTACT',
      'name':'NAME',
      'email':'EMAIL',
      'url':'URL',
      'termsOfService':'Terms of service',
      'securityAndAuthentication':'Security and Authentication',
      'securitySchemes':'SECURITY SCHEMES',
      'key':'KEY',
      'type':'TYPE',
      'description':'DESCRIPTION',
      'request':'REQUEST',
      'requestBody':'REQUEST BODY',
      'response':'RESPONSE',
      'responseModel':'RESPONSE MODEL',
      'statusCode':'STATUS CODE',
      'deprecated':'DEPRECATED',
      'allowed':'ALLOWED',
      'enumValues':'ENUM',
      'pattern':'pattern',
      'parameters':'Parameters',
      'noRequestParameters': 'No request parameters',
      'method':'METHOD'
    }, localizeObj)
    
  }

  disconnectedCallback() {
    // Remove Event Listeners
    this.inputEl.removeEventListener('change', this.inputOnChange );    
    this.inputEl.removeEventListener('keyup', this.onKeyUp );    
    this.btnEl.removeEventListener('click', this.generatePdf );
  }

  static get observedAttributes() {
    return ['spec-url', 'button-bg', 'input-bg', 'button-color', 'input-color', 'button-label', 'hide-input'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
    case 'spec-url':
      if (oldValue !== newValue){
        this.inputEl.value = newValue;
        return true;
      }
    case 'button-label':
      if (oldValue !== newValue){
        this.btnEl.innerText = newValue;
        return true;
      }
    case 'hide-input':
      if (oldValue !== newValue){
        if (newValue==='true'){
          this.inputEl.style.display='none';
        }
        else{
          this.inputEl.style.display='block';
        }
        return true;
      }
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
    }
    return true;
  }

  get specUrl() {
    return this.getAttribute('spec-url');
  }

  set specUrl(newSpecUrl){
    this.setAttribute('spec-url', newSpecUrl);
  }

  onChangeInput(e){
    this.specUrl = e.target.value;
  }

  onKeyUp(e){
    if (e.keyCode === 13){
      // In case of input keyup - first change event will fire which will set the new specUrl URL
      this.generatePdf();
    }
  }

  generatePdf(jsonObj){
    let pdfSortTags       = this.getAttribute('pdf-sort-tags')==='false'?false:true;
    let pdfPrimaryColor   = this.getAttribute('pdf-primary-color');
    let pdfAlternateColor = this.getAttribute('pdf-alternate-color');
    let pdfTitle          = this.getAttribute('pdf-title')===null?'API Reference':this.getAttribute('pdf-title');
    let pdfCoverText      = this.getAttribute('pdf-cover-text')?this.getAttribute('pdf-cover-text'):'';
    let pdfSecurityText   = this.getAttribute('pdf-security-text')?this.getAttribute('pdf-security-text'):'';
    let pdfApiText        = this.getAttribute('pdf-api-text')?this.getAttribute('pdf-api-text'):'';
    let pdfFooterText     = this.getAttribute('pdf-footer-text')?this.getAttribute('pdf-footer-text'):'';
    let includeInfo       = this.getAttribute('include-info')==='false'?false:true;
    let includeToc        = this.getAttribute('include-toc')==='false'?false:true;
    let includeSecurity   = this.getAttribute('include-security')==='false'?false:true;
    let includeApiDetails = this.getAttribute('include-api-details')==='false'?false:true;
    let includeApiList    = this.getAttribute('include-api-list')==='true'?true:false;

    let localize = this.localize;
    let options = {
      pdfSortTags,
      pdfPrimaryColor,
      pdfAlternateColor,
      pdfTitle,
      pdfCoverText,
      pdfSecurityText,
      pdfApiText,
      pdfFooterText,
      includeInfo,
      includeToc,
      includeSecurity,
      includeApiDetails,
      includeApiList,
      localize,
    }
    let spec = this.specUrl || jsonObj;
    createPdf(spec, options);
  }

});
