# 6. UI Wireframes

## Primary Shell

```text
+--------------------------------------------------------------------------------------------------+
| FastLoop | Host: Premiere Pro | Import Audio | Analyze Track | Preview | Place Markers | Export |
+----------------------+----------------------------------------------------------------+----------+
| Library              | Waveform / Structure / Candidate Overlay                         | Inspector|
| ------------------- | ---------------------------------------------------------------- | -------- |
| Search               | [ waveform with beat ticks / bar blocks / phrase bands ]         | BPM      |
| Imported Tracks      | [ loop in ]----------------[ selected loop span ]----[ out ]      | Bars     |
| - Neon Drive.wav     | [ confidence heatmap underlay ]                                   | Phrase   |
| - Dust Loop.aif      | [ candidate overlay stripes ]                                     | Score    |
| - Hollow Intro.mp3   |                                                                A/B| Duration |
|                      | Candidate Table                                                   | Click    |
| Analyze              | Rank  Start  End  Bars  Fit  Continuity  Energy  Timbre  Use     | Export   |
| Candidates           | 1     00:08  00:24  4     98   96          91      88      94     | Preset   |
| Build Bed            | 2     00:32  00:48  4     93   94          89      90      89     |          |
| Export               | 3     00:48  01:04  4     91   88          92      85      90     |          |
| Queue                |                                                                ...|          |
| Presets              |                                                                    |          |
| Settings             |                                                                    |          |
+----------------------+----------------------------------------------------------------+----------+
| Queue: Track | Status | Cache | Target | Candidates | Export State | Host Action Pending?        |
+--------------------------------------------------------------------------------------------------+
```

## Analyze View

```text
Sidebar: Library selected, Analyze highlighted
Center: waveform zoom toolbar, beat/bar/phrase toggles, Analyze Track button row
Inspector: BPM, meter confidence, section count, candidate count, analysis cache status
```

## Candidate View

```text
Center top: waveform with selected candidate span
Center bottom: ranked candidate list with sortable columns
Inspector: transition quality, timbre similarity, energy match, click risk, target duration fit
Action row: Preview Candidate | Compare Candidates | Commit Candidate | Similar Loop Search
```

## Build Bed View

```text
Left: target duration preset buttons
Center: intro + repeating loop + outro timeline assembly strip
Right: runtime fit, phrase lock, crossfade suggestion, export profile
Bottom: queued bed builds
```

## Export View

```text
Options: export intro / loop / outro / extended mix / metadata JSON
Formats: WAV, AIFF, MP3 proxy, JSON metadata
Host actions: place timeline markers, send notes, cache export recipe
```
