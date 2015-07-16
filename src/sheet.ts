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

// one: staveNote.setKeyStyle( INDEX, {shadowColor: "yellow", shadowBlur: 3});
// all: staveNote.setStyle({strokeStyle: "blue", stemStyle: "blue"});

module Sheet {

    //
    // TYPES
    //
    export type Sheet = {
        staves: StaveNote[],
        treble: Voice,
        bass: Voice
    };

    //
    // CONSTANTS
    //

    // these are defaults to be overwritten by init()
    export let WIDTH = 500, HEIGHT = 500;
    export let NUM_BEATS = 8;
    const BEAT_VALUE = 4;

    const formatter = new Vex.Flow.Formatter();
    const isBassCode = (code: MIDI.Note) => code < 60;

    const TRANSPARENT_COLOR = 'rgba(0,0,0,0)';

    let ctx: any = null;
    let staveTreble: any = null;
    let staveBass: any = null;
    let brace: any = null;

    export function init() {
        WIDTH = window.innerWidth;
        HEIGHT = window.innerHeight;

        const canvas = document.getElementsByTagName('canvas')[0];
        const renderer = new Vex.Flow.Renderer(canvas, Vex.Flow.Renderer.Backends.CANVAS);
        renderer.resize(WIDTH, HEIGHT);

        ctx = renderer.getContext();
        //ctx.scale(2, 2);

        const START = 50;
        const TOP = 100;
        const STAVE_PADDING = 80; //TODO: not quite right?

        NUM_BEATS = Math.floor((WIDTH - START*4) / 40);
        NUM_BEATS = Math.min(NUM_BEATS, 10); //TODO: one note is off screen if more than 10?
        NUM_BEATS = Math.max(NUM_BEATS, 1);

        staveTreble = new Vex.Flow.Stave(START, TOP, WIDTH - START*2);
        staveTreble.addClef('treble');
        staveTreble.setContext(ctx);

        staveBass = new Vex.Flow.Stave(START, TOP+STAVE_PADDING, WIDTH - START*2);
        staveBass.addClef('bass');
        staveBass.setContext(ctx);

        brace = new Vex.Flow.StaveConnector(staveTreble, staveBass);
        brace.setType(Vex.Flow.StaveConnector.type.BRACE);
        brace.setContext(ctx);
    };

    export function colorNote(staveNote: any, color: string){
        staveNote.setStyle({ strokeStyle: color, fillStyle: color });
    };

    /**
     * Builds a formatted voice for the supplied quarter notes. All styled in black.
     * @return {notes: {note: string, letter: string, voicePts: notePtr },treble: voice, bass: voice}
     */
     export function buildNotes(assist: boolean, cs : MIDI.Note[]) : Sheet.Sheet {
         if (cs.length !== NUM_BEATS)
             throw ('Invalid number of notes. Expecting '+NUM_BEATS+' but got '+cs.length+'.');

         const notesTreble : any[] = [];
         const notesBass: any[] = [];
         const sheetNotes: StaveNote[] = [];

         for(const code of cs ){
             const staveNote = makeSheetNote(code, assist);
             if( !isBassCode(code) ){
                 notesTreble.push(staveNote);
                 notesBass.push( makeInvisibleNote() );
             }
             else{
                 notesBass.push(staveNote);
                 notesTreble.push( makeInvisibleNote() );
             }
             sheetNotes.push( staveNote );
         }

         const voiceTreble = makeVoice();
         const voiceBass = makeVoice();

         voiceTreble.addTickables(notesTreble);
         voiceBass.addTickables(notesBass);

         const max = Math.max(staveBass.width, staveTreble.width);
         formatter.format([voiceTreble,voiceBass], max);

         return { staves: sheetNotes, treble: voiceTreble, bass: voiceBass };
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
        const map = (v: MIDI.Note[]) => v.map( (x: MIDI.Note) => Sheet.codeToNote(x) );
        const ts : string[] = map(ns.filter( note => !isBassCode(note) ));
        const bs: string[] = map(ns.filter( note => isBassCode(note) ));

        if( ts.length > 0 ){
            const n = new Vex.Flow.StaveNote({ keys: ts, duration: 'q' });
            for (let j = 0; j < ts.length; ++j) {
                if (ts[j].indexOf('#') !== -1) {
                    n.addAccidental(j, new Vex.Flow.Accidental('#'));
                }
            }
            n.setStyle({ strokeStyle: color, fillStyle: color });
            notesTreble[pos] = n;
        }else{
            // filler if no treble notes exist
            notesTreble[pos] = makeInvisibleNote();
        }

        if (bs.length > 0) {
            const n = new Vex.Flow.StaveNote({ keys: bs, duration: 'q', clef: 'bass' });
            for (let j = 0; j < bs.length; ++j) {
                if (bs[j].indexOf('#') !== -1) {
                    n.addAccidental(j, new Vex.Flow.Accidental('#'));
                }
            }
            n.setStyle({ strokeStyle: color, fillStyle: color });
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
        // clean previously drawn canvas
        ctx.clearRect(0, 0, WIDTH, HEIGHT);

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
    };

    function makeSheetNote( code: MIDI.Note, annotation: boolean) {
        const [letter, octave] = MIDI.convertMIDIcodeToNote(code);
        const note = Sheet.toNote(letter,octave);
        const i = new Vex.Flow.StaveNote({ keys: [note], duration: 'q', clef: ( isBassCode(code) ? 'bass' : 'treble') });
        if (letter.indexOf('#') !== -1) {
            i.addAccidental(0, new Vex.Flow.Accidental("#"));
        }
        if (annotation) {
            const a = new Vex.Flow.Annotation(note).setVerticalJustification(Vex.Flow.Annotation.VerticalJustify.BOTTOM);
            //a.font.size = '10pt';
            i.addModifier(0, a);
        }
        return i;
    };

    function makeVoice() {
        return new Vex.Flow.Voice({ num_beats: NUM_BEATS, beat_value: BEAT_VALUE, resolution: Vex.Flow.RESOLUTION });
    };

};
