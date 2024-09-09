# Canvas LMS integration enhancement scripts

This repo contains Javascript for enhacing Canvas integration.
The code is written in [Typescript].

[typescript]: https://www.typescriptlang.org/

## Getting Started


The script is served from Anntoo CDN at: https://cdn.annoto.net/canvas-js/latest/annoto-bootstrap.js

Specific versions are available as well, for example: https://cdn.annoto.net/canvas-js/1.0.0/annoto-bootstrap.js

The library is exported as UMD under name of `AnnotoCanvas`

### Installing

Clone and run npm to install dependencies:

```sh
git clone https://github.com/Annoto/canvas-js.git
cd canvas-js
npm install
```

### Building

To build for production run:

```sh
npm run build
```

### Developing

To start developing run:

```sh
npm run dev
```

The bootstrap is served at  http://localhost:9003/annoto-bootstrap.js

To start Proxy development run:

```sh
npm run dev:proxy
```

The bootstrap is served at https://canvas-js-annoto.eu.ngrok.io/annoto-bootstrap.js

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [releases on this repository](https://github.com/Annoto/canvas-js/releases).

## License

This project is licensed under the Apache 2.0 License License - see the [LICENSE](LICENSE) file for details.
