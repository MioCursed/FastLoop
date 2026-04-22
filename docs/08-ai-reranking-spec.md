# 8. AI Reranking Spec

## Role of AI

AI assists ranking. It does not replace deterministic candidate generation.

## Inputs

The reranker consumes feature vectors built from candidate pairs and context:

- loop boundary feature deltas
- short-window embeddings around start and end seam
- candidate duration and bar count
- phrase position context
- spectral and energy continuity scores
- editorial target duration

## Candidate Embedding Options

### Option A: YAMNet-Style Lightweight Embeddings

Use compact audio embeddings for general timbral continuity and anomaly hints.

### Option B: musicnn-Style Music-Aware Embeddings

Use music-oriented tagging or embedding features to better capture genre and texture continuity.

### Option C: Tiny Local Ranker

Train a shallow MLP or gradient-boosted ranker on deterministic features plus embeddings.

## Output Dimensions

- seam plausibility
- timbre closeness
- energy continuity
- editorial reuse confidence
- overall AI rerank confidence

## Safety Constraints

- deterministic rank remains visible
- AI cannot hide component scores
- users can disable AI reranking
- AI confidence must never be shown as a single opaque truth metric

## Serving Strategy

- optional local inference only
- pluggable model provider boundary
- cached embeddings per track
- fall back to deterministic-only mode when unavailable

## Reference Influence

- YAMNet reference repo: lightweight pretrained embedding direction
- musicnn: music-aware tagging and embedding direction
