/*
 References:

 [1] http://www.vexflow.com/docs/tutorial.html
 [2] https://github.com/0xfe/vexflow/wiki/The-VexFlow-FAQ
 [3] https://github.com/0xfe/vexflow/issues/134
 [4] https://groups.google.com/forum/#!topic/vexflow/kTZYDpzcskg
 */

declare var Vex: any; // FIXME: hack until proper 'vexflow.d.ts' is available.

module Sheet {

    export type SheetNote = { letter: string, octave: number, note: string };
    export type SheetNotePtr = { letter: string, octave: number, note: string, ptr: any };
    export type SheetVoice = { notes: SheetNotePtr[], treble: any, bass: any };

    //const WIDTH = 500, HEIGHT = 500;
    export const WIDTH = window.innerWidth, HEIGHT = window.innerHeight;
    export const NUM_BEATS = 8; //FIXME: Math.floor((WIDTH - 50) / 40); // one note is off screen!?
    const BEAT_VALUE = 4;

    const formatter = new Vex.Flow.Formatter();
    const isBass = (octave: number) => octave < 4;

    const TRANSPARENT_COLOR = 'rgba(0,0,0,0)';

    let ctx: any = null;
    let staveTreble: any = null;
    let staveBass: any = null;
    let brace: any = null;

    export function init() {
        const canvas = document.getElementsByTagName('canvas')[0];
        const renderer = new Vex.Flow.Renderer(canvas, Vex.Flow.Renderer.Backends.CANVAS);
        renderer.resize(WIDTH, HEIGHT);

        ctx = renderer.getContext();
        //ctx.scale(2, 2);

        // FIXME: define constants.
        staveTreble = new Vex.Flow.Stave(50, 100, WIDTH - 100); // x-padding, y-padding, width
        staveTreble.addClef('treble');
        staveTreble.setContext(ctx);

        staveBass = new Vex.Flow.Stave(50, 180, WIDTH - 100);
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
     export function buildNotes(assist: boolean, ns : SheetNote[]) : SheetVoice {
         if (ns.length !== NUM_BEATS)
             throw ('Invalid number of notes. Expecting '+NUM_BEATS+' but got '+ns.length+'.');

         const notesTreble : any[] = [];
         const notesBass: any[] = [];
         const sheetNotes: SheetNotePtr[] = [];

         for(const note of ns ){
             const ptr = makeSheetNote(note, assist);
             if( !isBass(note.octave) ){
                 notesTreble.push( ptr );
                 notesBass.push( makeInvisibleNote() );
             }
             else{
                 notesBass.push( ptr );
                 notesTreble.push( makeInvisibleNote() );
             }
             sheetNotes.push({
                 letter : note.letter,
                 octave : note.octave,
                 note : note.note,
                 ptr : ptr
             });
         }

         const voiceTreble = makeVoice();
         const voiceBass = makeVoice();

         voiceTreble.addTickables(notesTreble);
         voiceBass.addTickables(notesBass);

         const max = Math.max(staveBass.width, staveTreble.width);
         formatter.format([voiceTreble,voiceBass], max);

         return { notes: sheetNotes, treble: voiceTreble, bass: voiceBass };
     };


    /** Builds formatted voice where only position 'pos' is non-transparent and shows
    'ns' notes with the specified color. */
    export function buildKeyStatus(pos: number, color: string, ns : string[] ){
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
        const ts : string[] = ns.filter( note => !isBass(toLetterOctave(note)[1]) );
        const bs: string[] = ns.filter(note => isBass(toLetterOctave(note)[1]) );

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

    export function draw(treble : any[], bass: any[]){
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

    export function toLetterOctave(note: string) : [string,number]{
        const [letter, o] = note.split('/');
        return [letter, parseInt(o)];
    };

    function makeInvisibleNote() {
        const invisible = new Vex.Flow.StaveNote({ keys: ['e/4'], duration: 'q' });
        invisible.setStyle({ strokeStyle: TRANSPARENT_COLOR, fillStyle: TRANSPARENT_COLOR });
        return invisible;
    };

    function makeSheetNote({note:note, octave:octave,letter:letter}: SheetNote, annotation: boolean) {
        const i = new Vex.Flow.StaveNote({ keys: [note], duration: 'q', clef: ( isBass(octave) ? 'bass' : 'treble') });
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
