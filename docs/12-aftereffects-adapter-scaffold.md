# 12. After Effects Adapter Scaffold

## Responsibilities

- place comp markers for loop points
- query active comp timing
- return frame rate and duration context
- attach loop metadata text for motion workflows

## Files

- `host-aftereffects/jsx/fastloop_aftereffects.jsx`

## Notes

After Effects support is intentionally parallel to Premiere, but separate, so host-specific behavior does not leak across adapters.
