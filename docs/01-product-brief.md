# 1. Product Brief

## Product

FastLoop is an Adobe panel for Premiere Pro and After Effects that helps editors find, audition, rank, build, and export musically coherent loops and extended music beds from full-length tracks.

## Core Goal

Provide a dense, editor-grade utility that makes loop analysis feel immediate, transparent, and batch-friendly in the same professional workflow spirit as Shutter Encoder, but purpose-built for:

- loop discovery
- exact-duration music bed assembly
- intro/loop/outro export
- timeline marker placement
- batch track preparation for editing workflows

## Primary Users

- video editors cutting shorts, reels, promos, and explainers
- assistant editors preparing music libraries for teams
- motion designers extending tracks under comps and title cards
- content pack creators batch-processing music assets

## Primary Jobs To Be Done

1. Import one or many songs.
2. Analyze rhythmic and structural features quickly.
3. Find seamless or editorially safe loop regions.
4. Compare candidates visually and by score transparency.
5. Build an extended bed to a desired runtime.
6. Export loop assets and place useful timeline markers.

## MVP Scope

- CEP panel shared by Premiere Pro and After Effects
- Python-first local analysis engine
- deterministic loop-candidate pipeline
- lightweight optional AI reranking
- ranked loop list with waveform overlays
- per-track analysis cache
- export planning for intro, loop, outro, and extended mix
- host adapters for marker placement and timing queries
- mock mode for UI development outside Adobe

## Success Criteria

- editors can get to a trustworthy loop candidate in under two minutes
- loop quality is explainable through visible component scores
- the panel feels like a real desktop utility, not a web demo
- batch queue management remains readable and dense

## Reference Influence Summary

- Shutter Encoder: utility density, grouping logic, batch mindset, dark pro-tool UI
- PyMusicLooper: seamless loop/export framing and intro-loop-outro workflow
- Remixatron: similarity-driven structural jumps and musically coherent alternate paths
- Loopatron: user-guided loop discovery layered over similarity analysis
- Adobe CEP repos: production packaging, host communication, extension structure
- Premiere UXP samples: future migration path and modern plugin boundary planning
- YAMNet/musicnn: lightweight embedding-assisted reranking direction
