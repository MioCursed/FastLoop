# 13. Mock Mode Scaffold

## Purpose

Enable UI and contract development when Adobe hosts are unavailable.

## Constraints

- reuse the real panel state model
- do not spoof Adobe internals in production code
- clearly identify mock mode in the UI

## Files

- `mock/src/index.ts`
- `mock/src/mockData.ts`

## Behavior

- returns synthetic host capabilities
- returns realistic analysis result payloads
- exercises waveform, candidate table, inspector, and queue flows
