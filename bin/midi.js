/// <reference path="../lib/webmidi.d.ts" />
var MIDI;
(function (MIDI) {
    function init(onMIDIFailure, onKey) {
        if (!navigator.requestMIDIAccess) {
            onMIDIFailure();
            return;
        }
        navigator.requestMIDIAccess({ sysex: true }).then(onMIDISuccess, onMIDIFailure);
        function onMIDISuccess(midiAccess) {
            var midi = midiAccess;
            var inputs = midi.inputs.values();
            for (var input = inputs.next(); input && !input.done; input = inputs.next()) {
                input.value.onmidimessage = onMIDIMessage;
            }
        }
        ;
        function onMIDIMessage(message) {
            var data = message.data;
            var _a = data, command = _a[0], note = _a[1], velocity = _a[2];
            if ((command & 0xf0) === 144) {
                onKey(velocity !== 0, note);
            }
        }
        ;
    }
    MIDI.init = init;
    ;
    var NOTES = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
    function convertMIDIcodeToNote(code) {
        return [NOTES[code % NOTES.length], Math.floor((code / NOTES.length) - 1)];
    }
    MIDI.convertMIDIcodeToNote = convertMIDIcodeToNote;
    ;
    function convertNoteToMIDIcode(letter, octave) {
        return NOTES.indexOf(letter) + ((octave + 1) * NOTES.length);
    }
    MIDI.convertNoteToMIDIcode = convertNoteToMIDIcode;
    ;
})(MIDI || (MIDI = {}));
;
//# sourceMappingURL=midi.js.map