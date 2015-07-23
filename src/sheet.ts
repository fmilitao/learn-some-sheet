/*
 References:

 [1] http://www.vexflow.com/docs/tutorial.html
 [2] https://github.com/0xfe/vexflow/wiki/The-VexFlow-FAQ
 [3] https://github.com/0xfe/vexflow/issues/134
 [4] https://groups.google.com/forum/#!topic/vexflow/kTZYDpzcskg
 */

declare var Vex: any; // FIXME: hack until proper 'vexflow.d.ts' is available.
declare type Voice = any;
declare type StaveNote = any;

module Sheet {

    //
    // TYPES
    //
    export type Sheet = {
        // notes
        notesTreble: MIDI.Note[][],
        notesBass: MIDI.Note[][],
        // StaveNote pointers
        stavesTreble: StaveNote[],
        stavesBass: StaveNote[],
        // voices (which include the StaveNotes)
        treble: Voice,
        bass: Voice
    };

    //
    // CONSTANTS
    //

    const TRANSPARENT_COLOR = 'rgba(0,0,0,0)';
    const BEAT_VALUE = 4;

    let NUM_BEATS = 8;
    let clean : () => void = null;

    const formatter = new Vex.Flow.Formatter();

    const isBassCode = (code: MIDI.Note) => code < 60;
    const codesToNotes = (v: MIDI.Note[]) => v.map((x: MIDI.Note) => Sheet.codeToNote(x));

    let ctx: any = null;
    let staveTreble: any = null;
    let staveBass: any = null;
    let brace: any = null;

    const START = 50;
    const TOP = 150;
    const STAVE_PADDING = 80; //TODO: not quite right?

    // this doesn't work well...
    export function calcBeats(width : number ){
        let tmp = Math.floor((width - START * 4) / 40);
        tmp = Math.min(tmp, 10); //TODO: one note is off screen if more than 10?
        return Math.max(tmp, 1);
    };

    export function init(width : number, height : number, beats : number) {
        NUM_BEATS = beats;

        const canvas = document.getElementsByTagName('canvas')[0];
        canvas.style.left = Math.floor((window.innerWidth - width) / 2)+'px';
        const renderer = new Vex.Flow.Renderer(canvas, Vex.Flow.Renderer.Backends.CANVAS);
        renderer.resize(width, height);

        ctx = renderer.getContext();
        //ctx.scale(2, 2);

        clean = function(){
            // clean previously drawn canvas
            ctx.clearRect(0, 0, width, height);
        };

        staveTreble = new Vex.Flow.Stave(START, TOP, width - START * 2);
        staveTreble.addClef('treble');
        staveTreble.setContext(ctx);

        staveBass = new Vex.Flow.Stave(START, TOP + STAVE_PADDING, width - START * 2);
        staveBass.addClef('bass');
        staveBass.setContext(ctx);

        brace = new Vex.Flow.StaveConnector(staveTreble, staveBass);
        brace.setType(Vex.Flow.StaveConnector.type.BRACE);
        brace.setContext(ctx);
    };

    export function colorNote(staveNote: any, color: string){
        staveNote.setStyle({ /* stemStyle: color,*/ strokeStyle: color, fillStyle: color });
    };

    export function colorSingleNote(index: number, staveNote: any, color: string) {
        staveNote.setKeyStyle(index, { /* stemStyle : color, */ strokeStyle: color, fillStyle: color });
    };

    /**
     * Builds a formatted voice for the supplied quarter notes. All styled in black.
     * @return {notes: {note: string, letter: string, voicePts: notePtr },treble: voice, bass: voice}
     */
     export function buildNotes(assist: boolean, cs : MIDI.Note[][]) : Sheet.Sheet {
         if (cs.length !== NUM_BEATS)
             throw ('Invalid number of notes. Expecting '+NUM_BEATS+' but got '+cs.length+'.');

         const ts: MIDI.Note[][] = [];
         const bs: MIDI.Note[][] = [];

         const notesT : any[] = [];
         const notesB: any[] = [];
         
         const stavesT: StaveNote[] = [];
         const stavesB: StaveNote[] = [];

         for(const codes of cs ){
             const tsc: MIDI.Note[] = codes.filter(note => !isBassCode(note)).sort();
             const bsc: MIDI.Note[] = codes.filter(note => isBassCode(note)).sort();

             const t = tsc.length === 0 ? makeInvisibleNote() : makeSheetNote(tsc, assist, false);
             const b = bsc.length === 0 ? makeInvisibleNote() : makeSheetNote(bsc, assist, true);

             stavesT.push(t);
             stavesB.push(b);

             // sort to match note order
             ts.push(tsc);
             bs.push(bsc);
         }

         const voiceTreble = makeVoice();
         const voiceBass = makeVoice();

         voiceTreble.addTickables(stavesT);
         voiceBass.addTickables(stavesB);

         const max = Math.max(staveBass.width, staveTreble.width);
         formatter.format([voiceTreble,voiceBass], max);

         return {
             // split notes
             notesTreble : ts,
             notesBass : bs,
             // staves
             stavesTreble: stavesT,
             stavesBass: stavesB,
             // voices
             treble: voiceTreble,
             bass: voiceBass
         };
     };


    /** Builds formatted voice where only position 'pos' is non-transparent and shows
    'ns' notes with the specified color. */
    export function buildKeyStatus(pos: number, color: string, ns : MIDI.Note[] ){
        if (pos < 0 || pos > NUM_BEATS)
            throw ('Invalid position ' + pos + ' (expecting 0 <= pos < ' + NUM_BEATS+ ').');

        const notesTreble: any[] = new Array(NUM_BEATS);
        const notesBass: any[] = new Array(NUM_BEATS);

        // add transparent notes for filling required number of notes. Formatter modifies 
        // each note, so we CANNOT reuse the same note multiple times.
        for (let i = 0; i < NUM_BEATS;++i){
            if( i !== pos ){
                notesTreble[i] = makeInvisibleNote();
                notesBass[i] = makeInvisibleNote();
            }
        }

        // build visible colors at position 'pos' using 'color'
        // all notes will have same color

        // split 'ns' into treble and bass sets
        const ts : MIDI.Note[] = ns.filter( note => !isBassCode(note) ).sort();
        const bs : MIDI.Note[] = ns.filter( note => isBassCode(note) ).sort();

        if( ts.length > 0 ){
            const n = makeSheetNote(ts, false, false);
            colorNote(n, color);
            notesTreble[pos] = n;
        }else{
            // filler if no treble notes exist
            notesTreble[pos] = makeInvisibleNote();
        }

        if (bs.length > 0) {
            const n = makeSheetNote(bs, false, true);
            colorNote(n, color);
            notesBass[pos] = n;
        } else {
            // filler if no bass notes exist
            notesBass[pos] = makeInvisibleNote();
        }

        const voiceTreble = makeVoice();
        const voiceBass = makeVoice();

        voiceTreble.addTickables(notesTreble);
        voiceBass.addTickables(notesBass);

        const max = Math.max(staveBass.width, staveTreble.width);
        formatter.format([voiceTreble, voiceBass], max);

        return { treble: voiceTreble, bass: voiceBass };
    };

    export function draw(treble : Voice[], bass: Voice[]){
        clean();

        staveBass.draw();
        staveTreble.draw();
        brace.draw();
        
        for (const t of treble) {
            t.draw(ctx, staveTreble);
        }

        for (const b of bass) {
            b.draw(ctx, staveBass);
        }
    };

    //
    // utils
    //

    export function toNote(letter: string, octave: number){
        return letter + '/' + octave;
    };

    export function codeToNote(code: MIDI.Note) {
        const [letter, octave] = MIDI.convertMIDIcodeToNote(code);
        return toNote(letter,octave);
    };

    export function toLetterOctave(note: string) : [string,number]{
        const [letter, o] = note.split('/');
        return [letter, parseInt(o)];
    };

    function makeInvisibleNote() {
        const invisible = new Vex.Flow.StaveNote({ keys: ['e/4'], duration: 'q' });
        invisible.setStyle({ strokeStyle: TRANSPARENT_COLOR, fillStyle: TRANSPARENT_COLOR });
        return invisible;
        // GhostNote does not align properly, must use transparent note instead.
        //return new Vex.Flow.GhostNote({ duration: 'q' });
    };

    /** pre {codes} is sorted */
    function makeSheetNote(codes: MIDI.Note[], annotation: boolean, isBass : boolean) {
        const bs: string[] = codesToNotes(codes);
        const n = new Vex.Flow.StaveNote({ keys: bs, duration: 'q', clef: (isBass ? 'bass' : 'treble') });
        for (let j = 0; j < bs.length; ++j) {
            if (bs[j].indexOf('#') !== -1) {
                n.addAccidental(j, new Vex.Flow.Accidental('#'));
            }
            if(annotation){
                const a = new Vex.Flow.Annotation(bs.join(','));
                a.setVerticalJustification(Vex.Flow.Annotation.VerticalJustify.BOTTOM);
                //a.font.size = '10pt';
                n.addModifier(j, a);
            }
        }
        return n;
    };

    function makeVoice() {
        return new Vex.Flow.Voice({ num_beats: NUM_BEATS, beat_value: BEAT_VALUE, resolution: Vex.Flow.RESOLUTION });
    };

};
