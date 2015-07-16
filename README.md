# learn-some-sheet

Practice reading music sheet. Requires MIDI device and browser support for WebMIDI.

URL parameters:

 * `minMIDI`, `maxMIDI` {number} - min and max MIDI code number for generating random sheet notes. This [table](https://itp.nyu.edu/archive/physcomp-spring2014/uploads/midi/midi_screen5.png) may be useful to finding desired bounds.
 * `minChord`, `maxChord` {number} - min and max number of notes in a chord.
 * `help` {boolean} - show notes annotations (when chord>1 this is way too cluttered)


Example: `?help=true&minMIDI=60&maxChord=2`

[LINK](http://fmilitao.github.io/learn-some-sheet/)
