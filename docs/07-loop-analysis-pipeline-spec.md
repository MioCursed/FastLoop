# 7. Loop Analysis Pipeline Spec

## Goal

Generate ranked loop candidates that are structurally coherent, rhythmically aligned, low-risk at the seam, and useful for editorial duration targets.

## Stage 1: Input Normalization

1. Decode source audio to PCM WAV.
2. Normalize sample rate to a configurable working rate.
3. Convert to mono analysis stream while retaining stereo reference for export.
4. Compute basic metadata: duration, peak, integrated loudness estimate.

## Stage 2: Core Feature Extraction

- onset envelope
- tempo estimate
- beat positions
- downbeat or bar grouping estimate
- chroma or harmonic profile
- MFCC or mel summaries
- RMS / short-term energy
- spectral centroid, rolloff, and flux
- zero-crossing rate for click sensitivity

## Stage 3: Structure Estimation

- section boundary proposal from novelty curves
- phrase grouping from beat and section stability
- cadence-aware phrase length estimation
- low-variance segment detection for safer loop regions

## Stage 4: Candidate Generation

Generate windows constrained by:

- beat-aligned starts and ends
- bar-aligned starts and ends
- phrase-multiple lengths
- target duration hints
- minimum and maximum loop span

## Stage 5: Deterministic Scoring

Each candidate gets weighted component scores:

- beat alignment
- bar alignment
- phrase alignment
- spectral continuity
- timbre continuity
- energy continuity
- loudness continuity
- click-risk penalty
- target-duration usefulness
- editorial usability

## Stage 6: Similar Segment Search

For each strong candidate:

- search neighboring or distant sections with matching timbral and energy signatures
- identify alternate jump points for variation beds
- flag safe chorus, verse, and low-energy alternates

## Stage 7: Ranking Modes

- transparent scoring mode
- smart scoring mode
- duration-priority scoring mode
- musical-similarity scoring mode

## Stage 8: Preview and Export Planning

- build seamless preview buffer
- estimate crossfade suggestion only when necessary
- generate intro/loop/outro recipe
- generate exact-duration bed assembly plan
- emit metadata JSON for host marker placement

## Reference Influence

- PyMusicLooper: seamless loop and intro-loop-outro framing
- Remixatron: similarity-based alternate traversal concepts
- Loopatron: user-guided review over analysis results
