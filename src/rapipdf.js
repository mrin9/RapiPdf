import createPdf from '@/utils/pdf-gen';

let tmpl = document.createElement('template');
tmpl.innerHTML = `
  <style></style> 
  <button><slot></slot></button>
`;

export default customElements.define('rapi-pdf', class RapiPdf extends HTMLElement {
  constructor() {
    super(); // always call super() first in the constructor.
    let shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.appendChild(tmpl.content.cloneNode(true));
    this.addEventListener('click', e => createPdf(this.getAttribute('spec-url'))  );
  }

  get specUrl() {
    return this.getAttribute('spec-url');
  }
  
  set specUrl(newSpecUrl) {
    this.setAttribute('spec-url', newSpecUrl);
  }

  loadSpec(specUrl) {
    let me = this;
    if (!specUrl){
      return;
    }

    ProcessSpec(specUrl, this.resolveCircularRefs).then(function(spec){
      me.loading = false;
      if (spec===undefined || spec === null){
        console.error('Unable to resolve the API spec. ');
      }
      console.log(spec);
    })
    .catch(function(err) {
      me.loading=false;
      console.error('Unable to resolve the API spec.. ' + err.message);
    });
  }

});
