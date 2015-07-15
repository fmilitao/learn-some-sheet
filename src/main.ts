
module Game {

    const WRONG_COLOR = 'red';
    const CORRECT_COLOR = 'lime';
    const NORMAL_COLOR = 'black';
    const DONE_COLOR = 'lightgray';

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

        while (r.length < n) {
            const note = randomNote();
            const octave = randomOctave(1,5);
            r.push(note+"/"+octave);
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
        
        private assist: boolean;
        private count: number;

        /** 
         * @param {assist:boolean} enable note labels
         * @param {count:number} number of notes to generate
         */
        constructor(assist : boolean, count: number){
            this.assist = assist;
            this.count = count;
            
            this.i = 0;
            this.wrong = [];
            this.generateSheet();
        }

        generateSheet(){
            this.notes = Game.makeRandomNotes(this.count);
            this.voice = Sheet.buildNotes(this.assist, this.notes);
        }

        update(down: boolean, [note,octave]: [string,number] ) {
            const str = note + '/' + octave;
            const isCorrect = str === this.notes[this.i];

            if (down) { // key is down
                if ( isCorrect ) {
                    Sheet.fadeNote(this.voice, this.i, CORRECT_COLOR);
                } else {
                    condPush(this.wrong, str);
                }
            } else {

                condRemove(this.wrong, str);

                if( isCorrect ){
                    if( this.wrong.length === 0 ){
                        // correct note was last note to be released
                        Sheet.fadeNote(this.voice, this.i, DONE_COLOR);
                        ++this.i;
                        if (this.i === this.count) {
                            this.i = 0;
                            this.generateSheet();
                        }
                    }else{
                        // correct note, but there are still wrong notes down
                        Sheet.fadeNote(this.voice, this.i, NORMAL_COLOR);
                    }
                }
            }
        }

        getVoices(){
            const vs = [this.voice];
            if (this.wrong.length > 0)
                vs.push(Sheet.buildKeyStatus(this.i, WRONG_COLOR, this.wrong));
            return vs;
        }

    };

};


window.onload = function(){

    function onMIDIFailure() {
        const msg = document.getElementById('message');
        msg.innerHTML = ('<b>Error:</b> No access to MIDI devices. '+
            'You may need to restart your browser to allow access to your MIDI device. '+
            'Or your browser does not support the WebMIDI API.');
        msg.className += 'error';
        msg.style.display = 'block';
    };

    // note that access does not work if accessing local file.
    MIDIListener.init(onMIDIFailure, onKey);

    Sheet.init();

    const state = new Game.GameState(false,Sheet.NUM_BEATS);
    
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
