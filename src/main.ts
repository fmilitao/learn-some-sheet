
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

    // aux functions
    function condPush(array: string[], value: string) {
        if (array.indexOf(value) === -1)
            array.push(value);
    };

    function condRemove(array: string[], value: string) {
        const j = array.indexOf(value);
        if (j !== -1)
            array.splice(j, 1);
    };

    export class GameState {
        public i: number;
        public notes: string[];
        public voice: any[];
        public wrong: string[];
        public right: string[];

        constructor(){
            this.i = 0;
            this.wrong = []; //['c#/4', 'f/4', 'd/3', 'e/4'];
            this.right = []; //['c/4'];
            this.generateSheet();
        }

        generateSheet(){
            this.notes = Game.makeRandomNotes(8); // TODO: enable more than just one note?
            this.voice = Sheet.buildNotes(this.notes); //"c/4", "d/4", "b/4", "c/4", "e/4", "g/4", "f/3", "e/4"
        }

        update(down: boolean, [note,octave]: [string,number] ) {
            const str = note + '/' + octave;

            if (down) {
                // note down
                if (str === this.notes[this.i]) {
                    condPush(this.right, str);
                } else {
                    condPush(this.wrong, str);
                }
            } else {
                const wasRight = this.right.length > 0;
                // note up
                condRemove(this.wrong, str);
                condRemove(this.right, str);
                // move to next;
                if (this.wrong.length === 0 && this.right.length === 0 && wasRight) {
                    Sheet.fadeNote(this.voice,this.i,'gray');
                    ++this.i;
                    if( this.i === Sheet.NUM_BEATS ){
                        this.i = 0;
                        this.generateSheet();
                    }
                }
            }
        }

        getVoices(){
            const vs = [this.voice];
            if (this.right.length > 0)
                vs.push(Sheet.buildKeyStatus(this.i, 'green', this.right));
            if (this.wrong.length > 0)
                vs.push(Sheet.buildKeyStatus(this.i, 'red', this.wrong));
            return vs;
        }

    };

};


window.onload = function(){

    function onMIDIFailure(e: Event) {
        console.error('No access to MIDI devices. '+
            'You may need to restart your browser to allow access to your MIDI device. '+
            'Or your browser does not support the WebMIDI API.');
    };

    // note that access does not work if accessing local file.
    if (!MIDIListener.init(onMIDIFailure, onKey)) {
        console.error('No WebMIDI support in your browser.');
    }

    Sheet.init();

    const state = new Game.GameState();
    
    function onKey(down: boolean, note: number) {
        const n = MIDIListener.convertMIDIcodeToNote(note);
        
        console.log('Key: ' + note + ' ' + down+' >> '+n);

        state.update(down, n);
        redraw();
    };

    function redraw(){
        Sheet.draw(state.getVoices());
    };

    // initial draw
    redraw();

};
