
module Game {

    const WRONG_COLOR = 'red';
    const CORRECT_COLOR = 'lime';
    const NORMAL_COLOR = 'black';
    const DONE_COLOR = 'lightgray';

    function randomLetter(){
        // charCode('a') = 97
        // 'a'..'g' 7 numbers
        // Math.floor avoids 'h' (97+7)
        return String.fromCharCode(97 + Math.floor(Math.random() * 7));
    };

    function randomOctave(min:number,max:number){
        return min + Math.round(Math.random() * (max-min));
    };

    function makeRandomNotes(n:number){
        const r: Sheet.SheetNote[] = [];

        while (r.length < n) {
            const letter = randomLetter();
            const octave = randomOctave(1,5);
            r.push({
                letter: letter,
                octave: octave,
                note: Sheet.toNote(letter,octave)
            });
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
        public notes: Sheet.SheetNote[];
        public voice: Sheet.SheetVoice;
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
            this.notes = makeRandomNotes(this.count);
            this.voice = Sheet.buildNotes(this.assist, this.notes);
        }

        update(down: boolean, [letter,octave]: [string,number] ) {
            const note = Sheet.toNote(letter,octave);
            const isCorrect = note === this.notes[this.i].note;

            if (down) { // key is down
                if ( isCorrect ) {
                    Sheet.colorNote(this.voice.notes[this.i].ptr, CORRECT_COLOR);
                } else {
                    condPush(this.wrong, note);
                }
            } else {

                condRemove(this.wrong, note);

                if( isCorrect ){
                    if( this.wrong.length === 0 ){
                        // correct note was last note to be released
                        Sheet.colorNote(this.voice.notes[this.i].ptr, DONE_COLOR);
                        ++this.i;
                        if (this.i === this.count) {
                            this.i = 0;
                            this.generateSheet();
                        }
                    }else{
                        // correct note, but there are still wrong notes down
                        Sheet.colorNote(this.voice.notes[this.i].ptr, NORMAL_COLOR);
                    }
                }
            }
        }

        draw(){
            const {treble: t, bass: b} = Sheet.buildKeyStatus(this.i, WRONG_COLOR, this.wrong);
            Sheet.draw( [this.voice.treble,t],  [this.voice.bass,b] );
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

    const state = new Game.GameState(true,Sheet.NUM_BEATS);
    
    function onKey(down: boolean, code: number) {
        const n = MIDIListener.convertMIDIcodeToNote(code);
        
        console.log('Key: ' + code + ' ' + down+' >> '+n);

        state.update(down, n);
        redraw();
    };

    function redraw(){
        state.draw();
    };

    // initial draw
    redraw();

};
