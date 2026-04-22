# 3. Legal-Safe Implementation Note

## Clean-Room Position

FastLoop uses Shutter Encoder and the listed repositories only as product, workflow, and architectural references. It does not copy their source code, icons, branding, layouts verbatim, or product-specific terminology unrelated to loop analysis.

## What Is Safe To Reuse

- high-level workflow lessons
- public repository architecture patterns
- open documentation guidance
- general ideas such as batch queues, loop detection stages, host messaging boundaries, and score transparency

## What Must Not Be Reused

- Shutter Encoder branding, icons, or screenshot-derived assets
- exact button copy where it is product-specific and unrelated to loop workflows
- copied code blocks from any reference repository
- copied panel chrome, asset files, or exact visual compositions

## Implementation Policy

- build original UI structure and styles
- keep all contracts and type models original
- re-derive DSP and ranking pipeline from domain requirements
- clearly document which references influenced which subsystem
- isolate any third-party dependency use to licensed packages brought in explicitly later

## Reference Influence Record

Each architecture and feature document in this repo states how the references informed the system at the idea level so later implementation remains transparent and legally safe.
