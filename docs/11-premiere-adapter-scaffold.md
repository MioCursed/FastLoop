# 11. Premiere Adapter Scaffold

## Responsibilities

- place sequence markers for loop in, loop out, and alternates
- query current sequence timing
- return sequence/frame context for duration planning
- attach metadata comments to markers where possible

## Files

- `host-premiere/jsx/fastloop_premiere.jsx`

## Notes

The Premiere bridge only contains host-specific actions. Business logic remains in shared contracts and the engine.
