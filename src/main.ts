/// <reference path="../lib/webmidi.d.ts" />

/*
    References:

    [1] https://news.ycombinator.com/item?id=9844219
    [2] http://subsynth.sourceforge.net/midinote2freq.html
    [3] http://www.keithmcmillen.com/blog/making-music-in-the-browser-web-midi-api/
    [4] http://newt.phys.unsw.edu.au/jw/notes.html
    [5] http://stackoverflow.com/questions/712679/convert-midi-note-numbers-to-name-and-octave
    [6] https://itp.nyu.edu/archive/physcomp-spring2014/Tutorials/MusicalArduino
    [7] https://itp.nyu.edu/archive/physcomp-spring2014/uploads/midi/midi_screen5.png (MIDI code table)
*/

module MIDIListener {

    /** @returns false if incompatible browser. */
    export function init(
            // on failure to find any MIDI device
            onMIDIFailure: (e: Event) => void,
            // event handler for a note press/release
            onKey: (down: boolean, note: number) => void
        ) : boolean {
        
        // request MIDI access
        if (navigator.requestMIDIAccess) {
            navigator.requestMIDIAccess({ sysex: true }).then(onMIDISuccess, onMIDIFailure);
        } else {
            return false;
        }

        // midi functions
        function onMIDISuccess(midiAccess: WebMidi.MIDIAccess) {
            // when we get a succesful response, run this code
            const midi: WebMidi.MIDIAccess = midiAccess; // this is our raw MIDI data, inputs, outputs, and sysex status

            const inputs = midi.inputs.values();
            // loop over all available inputs and listen for any MIDI input
            for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
                // each time there is a midi message call the onMIDIMessage function
                input.value.onmidimessage = onMIDIMessage;
            }
        };

        function onMIDIMessage(message: WebMidi.MIDIMessageEvent) {
            const data: Uint8Array = message.data; // this gives us our [command/channel, note, velocity] data.
            const [command,note,velocity] = <Array<number>><any>data; //FIXME: typescript bug?
            
            console.log('MIDI data', data); // MIDI data [144, 63, 73]

            // channel agnostic command type see [3]
            switch( command & 0xf0 ){
                case 144: // note on
                    onKey(true, note);
                    break;
                case 128: // note off
                    onKey(false, note);
                    break;
                // default ignores event
            }
        };

        return true;
    };

    const NOTES = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];

    /**
     * @pre code ranges between 0..127
     * @returns [note : string, octave : number]
     */
    export function convertMIDIcodeToNote(code : number): [string,number]{
        // See [5,7]. Mo pretty way to do this convertion.
        // returns [code, octave] where octave starts at -1.
        return [NOTES[code % NOTES.length], (code / NOTES.length) - 1];
    };

};

//
//
//

window.onload = function(){

    function onMIDIFailure(e: Event) {
        console.log('No access to MIDI devices or your browser does not support WebMIDI API.');
    };

    function onKey(down: boolean, note: number) {
        console.log('Key: ' + note + ' ' + down);
        console.log(MIDIListener.convertMIDIcodeToNote(note));
    };

    if (!MIDIListener.init(onMIDIFailure, onKey)) {
        alert('No MIDI support in your browser.');
    }

    console.log('ready');

};
