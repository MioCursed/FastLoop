# 9. CEP Scaffold

## MVP Packaging

FastLoop ships first as a CEP extension so one panel can support both Premiere Pro and After Effects with shared UI.

## Scaffold Components

- `panel/CSXS/manifest.xml`: CEP manifest with Premiere and After Effects targets
- `panel/index.html`: panel shell
- `panel/src/main.ts`: bootstraps the panel
- `panel/src/adobe.ts`: `CSInterface` boundary and host detection
- `panel/src/app.ts`: state-driven rendering shell
- `panel/src/panel.css`: dense desktop utility styling

## Design Decisions

- no fake Adobe API implementation in production code
- host bridge is capability-checked at runtime
- same panel shell can run in mock mode with a different adapter

## Reference Influence

- Adobe CEP Samples: extension layout and host communication examples
- Adobe CEP Resources: CEP packaging, manifest, and `CSInterface` usage
