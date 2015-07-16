/*
TODO:
    - chord code
    - clean up press key code to work with more than one key down
    - zoom?
*/

module Game {

    const WRONG_COLOR = 'red';
    const CORRECT_COLOR = 'lime';
    const NORMAL_COLOR = 'black';
    const DONE_COLOR = 'lightgray';

    /** from 'min' to 'max' inclusive */
    function randomRange(min:number,max:number){
        return min + Math.round(Math.random() * (max-min));
    };

    function makeRandomNotes(
        n:number,
        minChord: number, maxChord: number,
        minMIDI:MIDI.Note,maxMIDI:MIDI.Note
        ) : MIDI.Note[][] {
        const r: MIDI.Note[][] = [];
        while (r.length < n) {
            const c: MIDI.Note[] = [];
            const l = randomRange(minChord, maxChord);
            while( c.length < l ){
                c.push( randomRange(minMIDI, maxMIDI) );
            }
            r.push(c);
        }
        return r;
    };

    // aux functions, warning: THESE MUTATE 'array'
    function condPush<T>(array: T[], value: T) {
        if (array.indexOf(value) === -1)
            array.push(value);
    };

    function condRemove<T>(array: T[], value: T) {
        const j = array.indexOf(value);
        if (j !== -1)
            array.splice(j, 1);
    };

    function newArray<T>(n:number, initial:T){
        const a = new Array<T>(n);
        for (let i = 0; i < a.length; ++i)
            a[i] = initial;
        return a;
    };

    export class GameState {
        private notes: MIDI.Note[][]; // sheet notes
        private voice: Sheet.Sheet; // voice for the sheet notes
        private wrong: MIDI.Note[]; // wrong pressed keys
        private right: boolean[]; //index should match notes[i][*] indexes
        private i: number; // current notes[i] index.

        private generateSheet: () => void;

        // stats
        private n_correct: number;
        private n_wrong: number;
        private score: HTMLElement;

        /** 
         * @param {assist:boolean} enable note labels
         * @param {count:number} number of notes to generate
         */
         constructor(
             assist : boolean,
             count: number,
             minChord: number, maxChord: number,
             minMIDI: MIDI.Note, maxMIDI:MIDI.Note
             ){

            // stats
            this.n_correct = 0;
            this.n_wrong = 0;
            this.score = document.getElementById('score');
            
            this.generateSheet = function() {
                this.notes = makeRandomNotes(count, minChord, maxChord, minMIDI, maxMIDI);
                this.voice = Sheet.buildNotes(assist, this.notes);
            };
            this.generateSheet();

            this.i = 0;
            this.wrong = [];
            this.right = newArray(this.notes[this.i].length,false);
        }

        update(down: boolean, code : MIDI.Note) {
            const isCorrect = code === this.notes[this.i][0];

            if (down) { // key is down
                if ( isCorrect ) {
                    Sheet.colorNote(this.voice.staves[this.i], CORRECT_COLOR);
                    this.n_correct++;
                } else {
                    condPush(this.wrong, code);
                    this.n_wrong++;
                }
            } else {

                condRemove(this.wrong, code);

                if( isCorrect ){
                    if( this.wrong.length === 0 ){
                        // correct note was last note to be released
                        Sheet.colorNote(this.voice.staves[this.i], DONE_COLOR);
                        ++this.i;
                        // sheet completed, generate new one
                        if (this.i === this.notes.length) {
                            this.i = 0;
                            this.generateSheet();
                        }
                    }else{
                        // correct note, but there are still wrong notes down
                        Sheet.colorNote(this.voice.staves[this.i], NORMAL_COLOR);
                    }
                }
            }
        }

        draw(){
            const {treble: t, bass: b} = Sheet.buildKeyStatus(this.i, WRONG_COLOR, this.wrong);
            Sheet.draw( [this.voice.treble,t],  [this.voice.bass,b] );

            this.score.innerHTML =
                'score: '+this.n_correct+'/'+(this.n_correct+this.n_wrong)+
                ' [sheet='+Math.floor(this.i/this.notes.length*100)+'%,'+
                ' accuracy='+Math.floor(this.n_correct/(this.n_correct+this.n_wrong)*100)+'%]';
        }

    };

};


window.onload = function(){

    let help = true;
    let minMIDI : MIDI.Note = 48;
    let maxMIDI : MIDI.Note = 83;
    // EZ-200 MIDI ranges: 36-96 (inclusive)

    // override default canvas size
    let parameters = document.URL.split('?');
    if (parameters.length > 1) {
        parameters = parameters[1].split('&');
        for (let i = 0; i < parameters.length; ++i) {
            const tmp = parameters[i].split('=');
            if (tmp.length > 1) {
                const [option,value] = tmp;
                switch (option) {
                    case 'help':
                        help = (value.toLowerCase() === 'true');
                        break;
                    case 'minMIDI':
                        minMIDI = parseInt(value);
                        break;
                    case 'maxMIDI':
                        maxMIDI = parseInt(value);
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

    function onKey(down: boolean, code: MIDI.Note) {
        console.log('Key: ' + code + ' ' + down + ' >> ' + MIDI.convertMIDIcodeToNote(code));

        state.update(down, code);
        state.draw();
    };

    window.onresize = function(e : UIEvent) {
        Sheet.init();
        state = new Game.GameState(help, Sheet.NUM_BEATS, 
            1, 1, //FIXME: work with chords.
            minMIDI, maxMIDI);
        
        // initial draw
        state.draw();
    }

    window.onresize(null);

};
