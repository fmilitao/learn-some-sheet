# Learn some sheet...

Practice reading (random) music sheet notes. Requires MIDI device and browser support for WebMIDI; or just a keyboard on the simplest game mode. Use d3.js for some animations and effects.

URL parameters:
 * `minMIDI`, `maxMIDI` {number, defaults: 48 and 83} - min and max MIDI code number for generating random sheet notes. This [table](https://itp.nyu.edu/archive/physcomp-spring2014/uploads/midi/midi_screen5.png) may be useful to find the desired bounds that match your MIDI keyboard (the defaults are the bounds of the EZ-200).
 * `minChord`, `maxChord` {number, default: 1 and 1} - min and max number of notes in a beat.
 * `help` {boolean, default: false} - show annotations with notes' names and the respective letter note on the side of the sheet. Note's names only appears if `minChord` and `maxChord` are 1.


Note that keyboard control is only enable if `minChord` and `maxChord` are 1.

Example: `?help=true&minMIDI=60&maxChord=2`

Links:

[(default mode)](http://fmilitao.github.io/learn-some-sheet/) - all default values.

[(easy mode)](http://fmilitao.github.io/learn-some-sheet/?help=true) - default + help mode ON.

[(hard mode)](http://fmilitao.github.io/learn-some-sheet/?maxChord=3) - up to 3 notes per beat.
