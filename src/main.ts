/// <reference path="../lib/webmidi.d.ts" />

/*
    reading list / useful references

    https://news.ycombinator.com/item?id=9844219
    http://subsynth.sourceforge.net/midinote2freq.html
    http://www.keithmcmillen.com/blog/making-music-in-the-browser-web-midi-api/
    http://newt.phys.unsw.edu.au/jw/notes.html
*/

module MIDIListener {

    /** @returns false if incompatible browser. */
    export function init(
            // on failure to find any MIDI device
            onMIDIFailure: (e: Event) => void,
            // event handler for a note press/release
            onKey: (down: boolean, note: number) => void
        ) : boolean
        {
        // request MIDI access
        if (navigator.requestMIDIAccess) {
            navigator.requestMIDIAccess({ sysex: false }).then(onMIDISuccess, onMIDIFailure);
        } else {
            return false; // alert("No MIDI support in your browser.");
        }

        // midi functions
        function onMIDISuccess(midiAccess: WebMidi.MIDIAccess) {
            // when we get a succesful response, run this code
            let midi: WebMidi.MIDIAccess = midiAccess; // this is our raw MIDI data, inputs, outputs, and sysex status

            let inputs = midi.inputs.values();
            // loop over all available inputs and listen for any MIDI input
            for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
                // each time there is a midi message call the onMIDIMessage function
                input.value.onmidimessage = onMIDIMessage;
            }
        };

        function onMIDIMessage(message: WebMidi.MIDIMessageEvent) {
            let data: Uint8Array = message.data; // this gives us our [command/channel, note, velocity] data.
            let [channel,note,velocity] = <Array<number>><any>data; //FIXME: typescript bug?
            console.log('MIDI data', data); // MIDI data [144, 63, 73]

            // FIXME: key press?
            // noteOn == 144
            // noteOff == 128
            // else ignore?
            onKey(true,note);
        };

        // function onMIDIFailure(e: Event) {
        //     // when we get a failed response, run this code
        //     console.log("No access to MIDI devices or your browser doesn't support WebMIDI API. Please use WebMIDIAPIShim " + e);
        // };

        return true;
    };

    const NOTES = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];

    /**
     * @pre code ranges between 0..127
     * @returns [note : string, octave : number]
     */
    export function convertMIDIcodeToNote(code : number): [string,number]{
        /*
            See:
            http://stackoverflow.com/questions/712679/convert-midi-note-numbers-to-name-and-octave
            https://itp.nyu.edu/archive/physcomp-spring2014/Tutorials/MusicalArduino
            https://itp.nyu.edu/archive/physcomp-spring2014/uploads/midi/midi_screen5.png (MIDI code table)
            ( no pretty way to do this convertion )
        */

        // returns [code, octave]
        // note that octave starts at -1.
        return [NOTES[code % NOTES.length], (code / NOTES.length) - 1];
    };

};
