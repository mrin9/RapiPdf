<img alt="MrinDoc logo" src="https://github.com/mrin9/RapiPdf/blob/master/logo.png" width="60px" />


<p align="center">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square"/>
    <img src="https://img.shields.io/github/size/mrin9/rapipdf/dist/rapipdf-min.js.svg?colorB=blue&label=minified&style=flat-square">
    <img src="https://img.shields.io/github/size/mrin9/rapipdf/dist/rapipdf-min.js.gz.svg?colorB=blue&label=zip&style=flat-square">
</p>

# RapiPDF
Custom Eelement for Open-API to PDF generation

## Features
- Supports Swagger 2.0 and OpenAPI 3.0
- Generate PDF using Web-Component
- Works with any framework or with no framework
- Plenty of customizing options, including selection of brand colors
- Supported on Chrome, FireFox and Safari. (Not yet tested on Edge)

## Documentation
[Check out the usage and examples](https://mrin9.github.io/RapiPdf/)

## Build Process
We recommend `yarn` over `npm` as we use yarn [resolutions](https://yarnpkg.com/lang/en/docs/selective-version-resolutions/) to keep the bundle size smaller. As of this writing this feature is not supported in npm natively
```bash
# Clone / Download the project then
yarn install

# build will generate rapidoc-min.js, this is the only file you will need.
# use it in the script tag of your html <script type="text/javascript" src="rapidoc-min.js"></script></body>
yarn build

# for developement use yarn serve (this will start an webserver at port 8080, then navigate to localhost:8080)
yarn serve

# alternative to yarn serve: (this will start an webserver at port 8080 listening to all adapters)
yarn serve-everyone
```