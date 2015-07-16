
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

    function makeRandomNotes(n:number,minOctave:number,maxOctave:number){
        const r: Sheet.SheetNote[] = [];

        while (r.length < n) {
            const letter = randomLetter();
            const octave = randomOctave(minOctave,maxOctave);
            r.push({
                letter: letter,
                octave: octave,
                note: Sheet.toNote(letter,octave)
            });
        }

        return r;
    };

    // aux functions, warning: THESE MUTATE 'array'
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
        
        private count: number;
        private generateSheet: () => void;

        private n_correct: number;
        private n_wrong: number;
        private score: HTMLElement;

        /** 
         * @param {assist:boolean} enable note labels
         * @param {count:number} number of notes to generate
         */
        constructor(assist : boolean, count: number, minOctave: number, maxOctave:number){
            this.count = count;
            
            this.i = 0;
            this.wrong = [];

            this.n_correct = 0;
            this.n_wrong = 0;
            this.score = document.getElementById('score');
            
            this.generateSheet = function() {
                this.notes = makeRandomNotes(count, minOctave, maxOctave);
                this.voice = Sheet.buildNotes(assist, this.notes);
            };
            this.generateSheet();
        }

        update(down: boolean, [letter,octave]: [string,number] ) {
            const note = Sheet.toNote(letter,octave);
            const isCorrect = note === this.notes[this.i].note;

            if (down) { // key is down
                if ( isCorrect ) {
                    Sheet.colorNote(this.voice.notes[this.i].ptr, CORRECT_COLOR);
                    this.n_correct++;
                } else {
                    condPush(this.wrong, note);
                    this.n_wrong++;
                }
            } else {

                condRemove(this.wrong, note);

                if( isCorrect ){
                    if( this.wrong.length === 0 ){
                        // correct note was last note to be released
                        Sheet.colorNote(this.voice.notes[this.i].ptr, DONE_COLOR);
                        ++this.i;
                        // sheet completed, generate new one
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

            this.score.innerHTML =
                'score: '+this.n_correct+'/'+(this.n_correct+this.n_wrong)+
                ' [sheet='+Math.floor(this.i/this.count*100)+'%,'+
                ' accuracy='+Math.floor(this.n_correct/(this.n_correct+this.n_wrong)*100)+'%]';
        }

    };

};


window.onload = function(){

    let help = true;
    let minOctave = 3; //EZ-200 min: 2
    let maxOctave = 5; //EZ-200 max: 6

    // override default canvas size
    let parameters = document.URL.split('?');
    if (parameters.length > 1) {
        parameters = parameters[1].split('&');
        for (let i = 0; i < parameters.length; ++i) {
            let tmp = parameters[i].split('=');
            if (tmp.length > 1) {
                let option = tmp[0];
                let value = tmp[1];
                switch (option) {
                    case 'help':
                        help = (value.toLowerCase() === 'true');
                        break;
                    case 'minOctave':
                        minOctave = parseInt(value);
                        break;
                    case 'maxOctave':
                        maxOctave = parseInt(value);
                        break;
                    // case 'd':
                    // case 'debug':
                    //     debug = (value.toLowerCase() === 'true');
                    default: // no other options
                        break;
                }
            }
        }
    }


    function onMIDIFailure() {
        const msg = document.getElementById('message');
        msg.innerHTML = ('<b>Error:</b> No access to MIDI devices. '+
            'You may need to restart your browser to allow access. '+
            'Or your browser does not support the WebMIDI API.');
        msg.className += 'error';
        msg.style.display = 'block';
    };

    // note that access does not work if accessing local file.
    MIDI.init(onMIDIFailure, onKey);
    
    let state : Game.GameState = null;

    function onKey(down: boolean, code: number) {
        const n = MIDI.convertMIDIcodeToNote(code);

        console.log('Key: ' + code + ' ' + down + ' >> ' + n);

        state.update(down, n);
        state.draw();
    };

    window.onresize = function(e : UIEvent) {
        Sheet.init();
        state = new Game.GameState(help, Sheet.NUM_BEATS, minOctave, maxOctave);
        
        // initial draw
        state.draw();
    }

    window.onresize(null);

};
