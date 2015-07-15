/*
 References:

 http://www.vexflow.com/docs/tutorial.html
 https://github.com/0xfe/vexflow/wiki/The-VexFlow-FAQ
 https://github.com/0xfe/vexflow/issues/134

 TODO: grand staff
 */

declare var Vex: any; // FIXME: hack until proper 'vexflow.d.ts' is available.

module Sheet {

    export
    const WIDTH = 500, HEIGHT = 500;
    //const WIDTH = window.innerWidth, HEIGHT = window.innerHeight;

    export
    const NUM_BEATS = 8, BEAT_VALUE = 4;

    const formatter = new Vex.Flow.Formatter();

    let ctx: any = null;
    let stave: any = null;

    export function init() {

        const canvas = document.getElementsByTagName('canvas')[0];
        const renderer = new Vex.Flow.Renderer(canvas, Vex.Flow.Renderer.Backends.CANVAS);
        renderer.resize(WIDTH, HEIGHT);

        ctx = renderer.getContext();
        //ctx.scale(2, 2);

        stave = new Vex.Flow.Stave(0, 100, WIDTH-10); // x-padding, y-padding, width
        stave.addClef('treble');
        stave.setContext(ctx);

    };

    export function fadeNote(n: any, i:number, color: string){
        n.tickables[i].setStyle({ strokeStyle: color, fillStyle: color });
    };

    /** Builds a formatted voice for the supplied quarter notes. All styled in black. */
    export function buildNotes(ns : string[]){
        if (ns.length !== NUM_BEATS)
            throw ('Invalid number of notes. Expecting '+NUM_BEATS+' but got '+ns.length+'.');

        const notes : any[] = [];

        for(const note of ns ){
            // only one note, no chords
            const i = new Vex.Flow.StaveNote({ keys: [note], duration: 'q' });
            if (note.indexOf('#') !== -1) {
                i.addAccidental(0, new Vex.Flow.Accidental("#"));
            }
            notes.push(i);
        }

        const voice = new Vex.Flow.Voice({
            num_beats: NUM_BEATS,
            beat_value: BEAT_VALUE,
            resolution: Vex.Flow.RESOLUTION
        });

        voice.addTickables(notes);

        // Format and justify the notes to WIDTH
        formatter.joinVoices([voice]).format([voice], stave.width);

        return voice;
    };

    export function buildNotesList(...ns: string[]) {
        return buildNotes(ns);
    }

    /** Builds formatted voice where only position 'pos' is non-transparent and shows
        'ns' notes with the specified color. */
    export function buildKeyStatus(pos: number, color: string, ns : string[] ){
        if (pos < 0 || pos > NUM_BEATS)
            throw ('Invalid position ' + pos + ' (expecting 0 <= pos < ' + NUM_BEATS+ ').');

        const notes: any[] = new Array(NUM_BEATS);
        // add transparent notes for placing. note that formatted modifies 
        // each note, so we cannot reuse the same note multiple times
        for (let i = 0; i < NUM_BEATS;++i){
            if( i !== pos ){
                const invisible = new Vex.Flow.StaveNote({ keys: ['e/4'], duration: 'q' });
                invisible.setStyle({ strokeStyle: 'rgba(0,0,0,0)', fillStyle: 'rgba(0,0,0,0)' });
                notes[i] = invisible;
            }
        }

        // update 'pos' index in array to mark correct as green, wrong as red.
        const n = new Vex.Flow.StaveNote({ keys: ns, duration: 'q' });
        for (let j = 0; j < ns.length; ++j) {
            if (ns[j].indexOf('#') !== -1) {
                n.addAccidental(j, new Vex.Flow.Accidental("#"));
            }
        }
        n.setStyle({ strokeStyle: color, fillStyle: color });

        notes[pos] = n;

        // build and format voice for notes.
        const voice = new Vex.Flow.Voice({
            num_beats: NUM_BEATS,
            beat_value: BEAT_VALUE,
            resolution: Vex.Flow.RESOLUTION
        });
        voice.addTickables(notes);
        formatter.joinVoices([voice]).format([voice], stave.width);

        return voice;
    };

    export function buildKeyStatusList(pos: number, color: string, ...ns: string[]) {
        return buildKeyStatus(pos, color, ns);
    }

    export function draw(voices : any[]){
        // clean previously drawn canvas
        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        stave.draw();
        
        for (const v of voices) {
            v.draw(ctx, stave);
        }
    };

    export function drawList(...voices:any[]){
        draw(voices);
    }
};




/*
        // Create the notes
        var notes = [
            newQuarterNotes(["c/4"]),
            newQuarterNotes(["d/4"]),
            newQuarterNotes(["b/4"]),
            newQuarterNotes(["c/4", "e/4", "g/4"]),

            newQuarterNotes(["c/3"]),
            newQuarterNotes(["e/4"]),
            newQuarterNotes(["f/4"]), //.addAccidental(0, new Vex.Flow.Accidental("#")),
            newQuarterNotes(["c/4", "e/4", "g/4"])
        ];

        //notes[0].setStyle({strokeStyle: "blue", stemStyle: "blue"});
        notes[0].setStyle({ fillStyle: "green", strokeStyle: "green" });
        notes[1].setStyle({ fillStyle: "red", strokeStyle: "red" });
        //    notes[0].addModifier(0, new Vex.Flow.Annotation('okok').setVerticalJustification(Vex.Flow.Annotation.VerticalJustify.BOTTOM));
    
        /*
        notes[0].addModifier(0, 
            new Vex.Flow.Annotation('d')
                .setJustification(Vex.Flow.Annotation.Justify.CENTER)
            .setVerticalJustification(Vex.Flow.Annotation.VerticalJustify.BOTTOM) );
        */


