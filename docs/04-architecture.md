# 4. Architecture Document

## System Overview

FastLoop is a layered Adobe extension system with four major boundaries:

1. CEP panel UI for user interaction and visualization
2. host adapters for Adobe-specific actions
3. local engine for audio analysis and export planning
4. shared contract layer for typed requests, scores, presets, and cached results

## Layers

### Panel

Responsibilities:

- library management
- waveform and candidate visualization
- user actions and queue management
- invoking host actions through typed bridge calls
- invoking engine jobs through a local service contract

### Host Adapters

Responsibilities:

- marker placement in Premiere sequences and After Effects comps
- current timeline or comp timing queries
- application capability discovery
- future host-specific metadata application

### Engine

Responsibilities:

- audio decoding and normalization
- feature extraction
- segmentation and candidate generation
- deterministic scoring
- optional AI reranking
- cache persistence
- export plan construction

### Shared

Responsibilities:

- message schema
- analysis model
- candidate and score model
- presets
- capability contracts

## Runtime Modes

### CEP Mode

The panel runs inside Adobe CEP and talks to:

- ExtendScript host bridge through `CSInterface.evalScript`
- local engine process through an IPC transport or command bridge

### Mock Mode

The same panel contract runs against:

- mock host adapter
- mock engine responses

This preserves development velocity without pretending to be Adobe internally.

## Data Flow

1. User imports one or more tracks.
2. Panel registers library entries and queues analysis.
3. Engine decodes audio and computes analysis artifacts.
4. Engine returns waveform summary, structure map, and ranked candidates.
5. Panel renders overlays, inspector metrics, and queue state.
6. User previews or selects a candidate.
7. User requests export plan or timeline marker placement.
8. Panel routes host-specific work to the current adapter.

## Persistence

- track-level cache file for normalized metadata and candidate sets
- waveform summary cache for quick redraw
- preset library stored separately from per-track analysis

## Future Migration Path

Premiere UXP samples influence the boundary design by keeping host-specific functionality isolated so the CEP shell can later be replaced without rebuilding the engine or scoring logic.

## Reference Influence

- Adobe CEP Samples and CEP Resources: extension structure, packaging, host communication
- UXP Premiere samples: future-proofing via adapter isolation
- PyMusicLooper: export framing and loop asset semantics
- Remixatron and Loopatron: similarity exploration and alternate-jump concepts
