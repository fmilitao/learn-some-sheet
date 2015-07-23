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

        public generateSheet: () => void;

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
                this.i = 0;
                this.pending = 0;
                this.wrong = [];
                this.rightT = newArray(this.sheet.notesTreble[this.i].length,false);
                this.rightB = newArray(this.sheet.notesBass[this.i].length,false);
            };

            this.generateSheet();
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
                    if (this.i === (this.sheet.stavesTreble.length-1)) {
                        // sheet completed, generate new one
                        return true;
                    }
                    ++this.i;
                    this.rightT = newArray(this.sheet.notesTreble[this.i].length, false);
                    this.rightB = newArray(this.sheet.notesBass[this.i].length, false);
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

            document.getElementById('correct-notes').innerHTML = this.n_correct+'';
            document.getElementById('wrong-notes').innerHTML = this.n_wrong + '';
            document.getElementById('total-notes').innerHTML = (this.n_correct + this.n_wrong) + '';
            

            document.getElementById('current-time').innerHTML = -1 + '';
            document.getElementById('last-time').innerHTML = -1 + '';
            document.getElementById('average-time').innerHTML = -1 + '';

            // this.score.innerHTML =
            //     'score: '+this.n_correct+'/'+(this.n_correct+this.n_wrong)+
            //     ' [sheet='+Math.floor(this.i/this.sheet.notesTreble.length*100)+'%,'+
            //     ' accuracy='+Math.floor(this.n_correct/(this.n_correct+this.n_wrong)*100)+'%]';
        }

    };

};

module Effects {

    let g: d3.Selection<any> = null;
    // let g_x = 0;

    let cursor: d3.Selection<any> = null;
    let cursor_t: d3.Transition<any> = null;
    let svg: d3.Selection<SVGElement> = null;
    
    let W: number;
    const BOX = 30;

    export function init(width: number, height: number) {
        if (svg !== null)
            throw 'resize svg code not ready';

        svg = d3.select("#d3-layer");
        svg.attr("width", width);
        svg.attr("height", height);
        svg.style("left", Math.floor((window.innerWidth-width)/2) );

        W = width;

        addAssist(width);
    };

    function addAssist( width : number ){
        g = svg.append("g").attr("opacity", 1);
        const str = ['G', 'B', 'D', 'F', 'A', 'C', 'E'];

//FIXME this is hacky and ungly code with lots of magic numbers...
        function add(w: number, yMin: number, yMax: number, i_start : number) {
            let y = yMax;
            for (let i = i_start; y > yMin;) {

                g.append("text")
                    .attr('x', w)
                    .attr('y', y)
                    .attr("font-family", "monospace")
                    .attr("font-size", "10px")
                    .attr("font-weight", "bold")
                    .attr("fill", "blue")
                    .attr("opacity", 1)
                    .text(str[i]);

                y = y - 10;
                i = (i + 1) % str.length;
            }

            y = yMax + 5;

            for (let i = i_start+3; y > yMin;) {

                g.append("text")
                    .attr('x', w + 14)
                    .attr('y', y)
                    .attr("font-family", "monospace")
                    .attr("font-size", "10px")
                    .attr("font-weight", "bold")
                    .attr("fill", "blue")
                    .attr("opacity", 1)
                    .text(str[i]);

                y = y - 10;
                i = (i + 1) % str.length;

            }
        };

        add(width - 60, 100 + 50, 188 + 50, 2);
        add(width - 60, 215 + 50, 188 + 80 + 50, 3);

        // g_x = width - 60;
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
        cursor.transition()
            .duration(250)
            .attr('x', x );
        
        // g.transition()
        //     .duration(250)
        //     .attr("transform", "translateX(" + (g_x-x) + ")");
        // g_x = x;
    };

    export function curtain(onDown: () => void, onUp: () => void) {
        cursor.transition()
            .attr('width', W)
            .attr('opacity', 1)
            .duration(500)
            .attr("x", 0)
            .each('end',onDown)
            .transition()
            .delay(500)
            .duration(500)
            .attr('opacity', 0.3)
            .attr("width", BOX)
            .each('end', onUp);
    };

};

// FIXME: lots of missing types!
module Stats {

    let line: any = null;
    let newBar: any = null;
    let MAX: number = 0;
    let rs: any[] = [];
    let arcTween: any = null;
    let foreground: any = null;
    const width = 100,
        height = 50,
        tau = 2 * Math.PI;

    export function init(){
        //
        // PIE
        //

        // from: // http://bl.ocks.org/mbostock/5100636
        let svg = d3.select("#note-stat");

        const arc : any = d3.svg.arc()
            .innerRadius(15)
            .outerRadius(40)
            .startAngle(0);

        svg = svg.append("g")
                .attr("transform", "translate(" + width / 2 + "," + (15 + (height / 2)) + ")")

        const background = svg.append("path")
            .datum({ endAngle: tau })
            .style("fill", "#DA3E52")
            .attr('opacity', 0.5)
            .attr("d", arc);

        // Add the foreground arc in orange, currently showing 12.7%.
        foreground = svg.append("path")
            .datum({ endAngle: .0 * tau })
            .style("fill", "#2ECC40")
            .style("stroke", "#8FD5A6")
            .style("stroke-width", 4)
            .attr("d", arc);


        arcTween = function(transition: any, newAngle: number) {
            transition.attrTween("d", function(d: any) {
                const interpolate = d3.interpolate(d.endAngle, newAngle);

                return function(t: any) {
                    d.endAngle = interpolate(t);
                    return arc(d);
                };
            });
        };

        //
        // BARS
        //

        const data = [30, 29, 28, 25, 10, 0, 0, 0, 0, 0];
        MAX = data.length;

        const tmp = d3.select("#time-stat");
        const layer1 = tmp.append('g');
        const layer2 = tmp.append('g');
        const layer3 = tmp.append('g');

        rs = [];

        newBar = function(val: any) {
            return layer1.append("rect")
            //.style("fill","#a3c3a3")
                .attr("class", val > 40 ? 'bad' : val > 20 ? 'ok' : 'good')
                .attr("width", 20);
        };

        // init
        function init() {
            for (let i = 0; i < data.length; ++i) {
                rs.push(newBar(50 - data[i])
                    .attr('opacity', 1)
                    .attr("x", 10 + (i * 20))
                    .attr("y", (50 + 10) - (50 - data[i]))
                    .attr("height", 50 - data[i]));
            }
        };


        line = layer2.append("line")          // attach a line
            .style("stroke", "black")  // colour the line
            .style("stroke-width", 1)
            .attr("x1", 10 - 2)     // x position of the first end of the line
            .attr("y1", 50 + 10)      // y position of the first end of the line
            .attr("x2", 20 * (data.length) + 10 + 2)     // x position of the second end of the line
            .attr("y2", 50 + 10);

        const bar = layer2.append("line")          // attach a line
            .style("stroke", "blue")  // colour the line
            .style("stroke-width", 1)
            .attr("x1", 10 - 2)     // x position of the first end of the line
            .attr("y1", 20)      // y position of the first end of the line
            .attr("x2", 20 * (data.length) + 10 + 2)     // x position of the second end of the line
            .attr("y2", 20); 

        init();
    };

    export function update(){
        // pie update
        const p = Math.random() * tau;
        foreground.transition()
            .duration(1000)
            .ease('bounce')
            .call(arcTween, p);

        // bar update
        // push new value
        function add(value : any) {
            for (var i = 0; i < MAX; ++i) {
                if (i === 0) {
                    rs[i].transition()
                    //.duration(1000)
                        .attr("x", 10 + ((i - 1) * 20))
                        .attr('opacity', 0)
                        .remove();
                } else {
                    rs[i].transition()
                    //.duration(200)
                        .attr("x", 10 + ((i - 1) * 20));
                }
            }

            rs = rs.splice(1, rs.length);

            var tmp = 50 - value;
            var n = newBar(tmp)
                .attr("x", 10 + ((rs.length + 1) * 20))
                .attr("y", (50 + 10) - tmp)
                .attr('opacity', 0)
                .attr("height", tmp);

            n.transition()
                .attr('opacity', 1)
                .attr("x", 10 + ((rs.length) * 20));

            rs.push(n);
        };

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
    // FIXME bounds sanity on min/max MIDI and Chords.


    function onMIDIFailure() {
        // show small pop-up warning then remove it.
        const m = d3.select("body")
            .append("div")
            .style("left", "0")
            //.style("right", "10%")
            .style("top", "-200px")
            .style("display", "block")
            .style("opacity", 1)
            .attr("class", 'error')
            .html( '<b>Error:</b> No access to MIDI devices. ' +
                'You may need to restart your browser to allow access. ' +
                'Or your browser does not support the WebMIDI API.' );

        m.transition()
            .duration(1000)
            .style("top", "0px")
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
        state.draw()

        if( newSheet ){
            state.generateSheet();
            Effects.curtain(
                () => state.draw(),
                () => Effects.moveCursor(state.currentX())
                );
        }else{
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
        const beats = 8; //TODO: dynamic beat number is messy: Sheet.calcBeats(window.innerWidth);
        const H = 500; // this is really the maximum height needed for a MIDI sheet
        const W = 700; // reasonable enough for 8 beats
        Sheet.init(W, H,beats);
        Effects.init(W, H);
        Stats.init();

        state = new Game.GameState(
            help,
            beats, 
            minChord, maxChord,
            minMIDI, maxMIDI
            );
        
        // initial draw
        state.draw();
        Effects.initCursor(H, state.currentX());
    }

    window.onresize(null);

};
