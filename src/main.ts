

module Game {

    function randomNote(){
        // charCode('a') = 97
        // 'a'..'g' 7 numbers
        // Math.floor avoids 'h' (97+7)
        return String.fromCharCode(97 + Math.floor(Math.random() * 7));
    };

    function randomOctave(min:number,max:number){
        return min + Math.round(Math.random() * (max-min));
    };

    export function makeRandomNotes(n:number){

        const r: string[] = [];

        while (r.length < Sheet.NUM_BEATS) {
            const note = randomNote();
            const octave = randomOctave(4,5);
            r.push(note+"/"+octave);

            console.log(note + "/" + octave);
        }

        return r;
    };

};


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


    Sheet.init();

    Sheet.draw(
        Sheet.buildNotes( Game.makeRandomNotes(8) ),
        //Sheet.buildNotes(r), //"c/4", "d/4", "b/4", "c/4", "e/4", "g/4", "f/3", "e/4"),
        
        // test correct notes
        Sheet.buildKeyStatus(1, "green","c/3","e/3"),

        Sheet.buildKeyStatus(1, "red", "d/3", "f/3")


        );
};
