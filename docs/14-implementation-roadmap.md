# 14. Implementation Roadmap

## Phase 1: Foundation

- finalize contracts and manifests
- build panel shell and mock mode
- wire transport between panel and engine
- implement host capability detection

## Phase 2: Deterministic Analysis

- add decode and normalization
- add beat, BPM, bar, and phrase extraction
- implement candidate generation and deterministic scoring
- persist caches and waveform summaries

## Phase 3: Editorial Workflows

- live preview loop seam
- exact-duration bed assembly
- intro/loop/outro export plan generation
- host marker placement

## Phase 4: AI Assistance

- add embedding extraction boundary
- add rerank model provider
- expose AI confidence transparently

## Phase 5: Production Hardening

- test with diverse music genres
- optimize caching and batch throughput
- improve error handling and recovery
- package as CEP ZXP
- begin UXP migration spike for Premiere
