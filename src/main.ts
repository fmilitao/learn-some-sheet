

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
            //console.log(note + "/" + octave);
        }

        return r;
    };

};


window.onload = function(){

    function onMIDIFailure(e: Event) {
        console.log('No access to MIDI devices or your browser does not support WebMIDI API.');
    };

    if (!MIDIListener.init(onMIDIFailure, onKey)) {
        alert('No MIDI support in your browser.');
    }

    Sheet.init();

    const notes = Game.makeRandomNotes(8);
    const voice = Sheet.buildNotes(notes); //"c/4", "d/4", "b/4", "c/4", "e/4", "g/4", "f/3", "e/4"

    let i = 0;
    const wrong : string[] = [];
    const right: string[] = [];

    function condPush(array : string[], value : string){
        if (array.indexOf(value) !== -1)
            array.push(value);
    };
    function condRemove(array : string[], value : string ){
        const i = array.indexOf(value);
        if (i !== -1)
            array.splice(i, 1);
    }

    function onKey(down: boolean, note: number) {
        console.log('Key: ' + note + ' ' + down);
        const n = MIDIListener.convertMIDIcodeToNote(note);
        console.log(n);

        const str = n[0] + '/' + n[1];
        if (down) {
            // note down
            if (str === notes[i] ) {
                condPush(right,str);
            } else {
                condPush(wrong,str);
            }
        }else{
            // note up
            condRemove(wrong, str);
            condRemove(right, str);
        }
    };

    function redraw(){

        Sheet.draw(
            voice,
        
            // test correct notes
            Sheet.buildKeyStatusList(1, "green", "c/3", "e/3"),

            Sheet.buildKeyStatusList(1, "red", "d/3", "f/3")

            );
    };

    redraw();


};
