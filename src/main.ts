/// <reference path="../lib/d3.d.ts" />

// constants of key codes from 'a' to 'g'
// these are only valid for key down/up events (not key press)
const A_CODE = 65;
const G_CODE = 71;

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
                const n = randomRange(minMIDI, maxMIDI);
                if (c.indexOf(n) !== -1)
                    continue; // already there
                c.push( n );
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
        private sheet: Sheet.Sheet;
        private wrong: MIDI.Note[]; // wrong pressed keys
        private rightT: boolean[];
        private rightB: boolean[];
        private pending: number;
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
                this.sheet = Sheet.buildNotes(assist,
                    makeRandomNotes(count, minChord, maxChord, minMIDI, maxMIDI)
                    );
            };
            this.generateSheet();

            this.i = 0;
            this.pending = 0;
            this.wrong = [];
            this.rightT = newArray(this.sheet.notesTreble[this.i].length,false);
            this.rightB = newArray(this.sheet.notesBass[this.i].length,false);
        }

        currentX(){
            const note = this.sheet.treble.tickables[this.i].note_heads[0];
            // console.log(note);
            // console.log(note.x + ' ' + note.width);
            return note.x - (note.width / 2); // FIXME: this yield wrong when restarting??
        }

        update(down: boolean, code : MIDI.Note) : boolean {
            const indexT = this.sheet.notesTreble[this.i].indexOf(code);
            const indexB = this.sheet.notesBass[this.i].indexOf(code);
            const isCorrect = (indexT !== -1) || (indexB !== -1);

            if( this.pending === 0 ){
                // Game state: not all correct keys have been pressed.
                // We check for wrong and correct keys. If we only have
                // correct keys left, then we switch to a state where
                // we wait for all keys to be released.

                if( isCorrect ){
                    if (indexT !== -1) {
                        this.rightT[indexT] = down;
                        if (down) {
                            Sheet.colorSingleNote(indexT, this.sheet.stavesTreble[this.i], CORRECT_COLOR);
                        } else {
                            Sheet.colorSingleNote(indexT, this.sheet.stavesTreble[this.i], NORMAL_COLOR);
                        }
                    }else{
                        this.rightB[indexB] = down;
                        if (down) {
                            Sheet.colorSingleNote(indexB, this.sheet.stavesBass[this.i], CORRECT_COLOR);
                        } else {
                            Sheet.colorSingleNote(indexB, this.sheet.stavesBass[this.i], NORMAL_COLOR);
                        }
                    }
                }else{ // wrong key
                    if(down){
                        condPush(this.wrong, code);
                        ++this.n_wrong;
                    }else{
                        condRemove(this.wrong, code);
                    }
                }

                // checks if 'this.right' is true and if there are no wrong keys
                if( this.rightT.reduce( (old, current) => old && current, true ) &&
                    this.rightB.reduce( (old, current) => old && current, true ) &&
                    this.wrong.length === 0 ){
                    // setting 'this.pending' will trigger the wait to all release state.
                    this.pending = this.rightT.length+this.rightB.length;
                }

            }else{
                // pending state. We already got the correct keys but we must wait
                // for all keys to be released before switching to next set of notes
                if( down ){
                    // new key press
                    ++this.pending;
                    if( isCorrect ){
                        if( indexT !== -1 ){
                            Sheet.colorSingleNote(indexT, this.sheet.stavesTreble[this.i], CORRECT_COLOR);
                        } else {
                            Sheet.colorSingleNote(indexB, this.sheet.stavesBass[this.i], CORRECT_COLOR);
                        }
                    } else{
                        condPush(this.wrong, code);
                        ++this.n_wrong;
                    }
                }else{
                    --this.pending;
                    if( isCorrect ){
                        // grays out correct key
                        if (indexT !== -1) {
                            Sheet.colorSingleNote(indexT, this.sheet.stavesTreble[this.i], DONE_COLOR);
                        }else{
                            Sheet.colorSingleNote(indexB, this.sheet.stavesBass[this.i], DONE_COLOR );
                        }
                    }else{
                        condRemove(this.wrong, code);
                    }
                }

                if( this.pending === 0 ){
                    // all pending keys were released.
                    // gray out the full set (to include annotation if available)

                    // careful for we do not want to show invisible notes
                    // (that are there just for padding, not for showing)
                    if (this.sheet.notesTreble[this.i].length > 0){
                        Sheet.colorNote(this.sheet.stavesTreble[this.i], DONE_COLOR);
                    }
                    if( this.sheet.notesBass[this.i].length > 0){
                        Sheet.colorNote(this.sheet.stavesBass[this.i], DONE_COLOR);
                    }
                    
                    this.n_correct += this.rightT.length+this.rightB.length;
                    ++this.i;
                    const newSheet = (this.i === this.sheet.stavesTreble.length);
                    if (newSheet) {
                        // sheet completed, generate new one
                        this.i = 0;
                        this.generateSheet();
                    }
                    this.rightT = newArray(this.sheet.notesTreble[this.i].length, false);
                    this.rightB = newArray(this.sheet.notesBass[this.i].length, false);
                    return newSheet;
                }
            }
            return false;
        }

        keyPressToCode( charCode : number ) : MIDI.Note{
            const treble = this.sheet.notesTreble[this.i].length;
            const bass = this.sheet.notesBass[this.i].length;
            
            if (( treble + bass ) > 1)
                throw 'This function only work when there is only one note to play...'

            const note = treble === 1 ? this.sheet.notesTreble[this.i][0] : this.sheet.notesBass[this.i][0];
            
            const [letter,_] = MIDI.convertMIDIcodeToNote(note);
            const key = String.fromCharCode(charCode).toLowerCase();

            //console.log(' ' + letter + ' ' + key);

            if ( letter.indexOf(key) === 0)
                return note;

            // translates any key from 'a' to 'g' into a MIDI note on octave 4
            if( charCode >= A_CODE && charCode <= G_CODE ){
                return MIDI.convertNoteToMIDIcode(key,4);
            }

            return -1; // invalid key, ignore me.
        }

        draw(){
            const {treble: t, bass: b} = Sheet.buildKeyStatus(this.i, WRONG_COLOR, this.wrong);
            Sheet.draw( [this.sheet.treble,t],  [this.sheet.bass,b] );

            this.score.innerHTML =
                'score: '+this.n_correct+'/'+(this.n_correct+this.n_wrong)+
                ' [sheet='+Math.floor(this.i/this.sheet.notesTreble.length*100)+'%,'+
                ' accuracy='+Math.floor(this.n_correct/(this.n_correct+this.n_wrong)*100)+'%]';
        }

    };

};

module Effects {

    let cursor: d3.Selection<any> = null;
    let cursor_t: d3.Transition<any> = null;
    let svg: d3.Selection<SVGElement> = null;
    
    let W: number;
    const BOX = 30;

    export function init(width: number, height: number) {
        if (svg !== null)
            throw 'resize svg code not ready';

        svg = d3.select("svg");
        svg.attr("width", width);
        svg.attr("height", height);

        W = width;
    };

    export function initCursor(height : number, x : number){
        cursor = svg.append("rect")
            .style("fill", "#a3a3a3")
        // .style("stroke","black")
        //   .attr("stroke-width", 2)
            .attr("x", 0)
            .attr("y", 0)
            .attr("rx", 2)
            .attr("ry", 2)
            .attr('opacity', 0.3)
            .attr("width", BOX)
            .attr("height", height);

        //cursor_t = 
        cursor.transition()
            .attr('x', x);
    };

    export function moveCursor(x : number){
        d3.selectAll('rect').transition()
            .duration(500)
            .attr('x', x );
    };

    export function curtain(onDown: () => void, onUp: () => void) {
        cursor.transition()
            .attr('width', W)
            .attr('opacity', 1)
            .duration(1000)
            .attr("x", 0)
            .each('end',onDown)
            .transition()
            .delay(1000)
            .duration(500)
            .attr('opacity', 0.3)
            .attr("width", BOX)
            .each('end', onUp);
    };

};


window.onload = function(){

    let help = false;
    let minMIDI : MIDI.Note = 48;
    let maxMIDI : MIDI.Note = 83;
    let minChord = 1;
    let maxChord = 1; //3;
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
                    case 'minChord':
                        minChord = Math.max(parseInt(value),1);
                        break;
                    case 'maxChord':
                        maxChord = parseInt(value);
                        break;
                    default: // no other options
                        break;
                }
            }
        }
    }


    function onMIDIFailure() {
        // show small pop-up warning then remove it.
        const m = d3.select("body")
            .append("div")
            .style("left", "10%")
            .style("right", "10%")
            .style("bottom", "-200px")
            .style("display", "block")
            .style("opacity", 1)
            .attr("class", 'error')
            .html( '<b>Error:</b> No access to MIDI devices. ' +
                'You may need to restart your browser to allow access. ' +
                'Or your browser does not support the WebMIDI API.' );

        m.transition()
            .duration(1000)
            .style("bottom", "0px")
            .transition()
            .delay(11000)
            .style("opacity", 0)
            .remove();

    };

    // note that access does not work if accessing local file.
    MIDI.init(onMIDIFailure, onKey);
    
    let state : Game.GameState = null;

    function onKey(down: boolean, code: MIDI.Note) {
        console.log('Key: ' + code + ' ' + down + ' >> ' + MIDI.convertMIDIcodeToNote(code));

        const oldX = state.currentX();
        const newSheet = state.update(down, code);

        if( newSheet ){
            Effects.curtain(
                () => state.draw(),
                () => Effects.moveCursor(state.currentX())
                );
        }else{
            state.draw();
            const newX = state.currentX();
            if (oldX === newX)
                return; // cursor unchanged

            if (newX > oldX ) {
                // move cursor to new position
                Effects.moveCursor(newX);
            }
        }

    };

    // add keyboard mode
    if (minChord === 1 && maxChord === 1) {
        // auxiliary state is necessary to avoid repeating keydown events.
        let keysDown = new Array(G_CODE-A_CODE);
        for (let i = 0; i < keysDown.length;++i){
            keysDown[i] = false;
        }

        function onKeyboard(down: boolean, charCode: number) {
            if( charCode >= A_CODE && charCode <= G_CODE ){
                const i = charCode - A_CODE;
                if( down && keysDown[i] ){
                    // key is down and was down
                    return;
                }
                keysDown[i] = down;
            }

            const fakeNote = state.keyPressToCode(charCode);
            if (fakeNote !== -1) {
                onKey(down, fakeNote);
            }
        };

        window.onkeydown = (e: KeyboardEvent) => onKeyboard(true, e.keyCode);
        window.onkeyup = (e: KeyboardEvent) => onKeyboard(false, e.keyCode);

        const m = d3.select("body")
            .append("div")
            .style("right", "0px")
            .style("top", "-200px")
            .style("display", "block")
            .style("opacity", 1)
            .attr("class", 'warn')
            .html('<b>Info:</b> Keyboard control available.');

        m.transition()
            .delay(500)
            .duration(1000)
            .style("top", "0px")
            .transition()
            .delay(5000)
            .style("opacity", 0)
            .remove();
    }

    window.onresize = function(e : UIEvent) {
        const beats = 2; //8; //TODO: dynamic beat number is messy: Sheet.calcBeats(window.innerWidth);

        Sheet.init(window.innerWidth,window.innerHeight,beats);
        Effects.init(window.innerWidth, window.innerHeight);

        state = new Game.GameState(
            help,
            beats, 
            minChord, maxChord,
            minMIDI, maxMIDI
            );
        
        // initial draw
        state.draw();
        Effects.initCursor(window.innerHeight, state.currentX());
    }

    window.onresize(null);

};
