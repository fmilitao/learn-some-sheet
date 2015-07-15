/*
 References:

 http://www.vexflow.com/docs/tutorial.html
 https://github.com/0xfe/vexflow/wiki/The-VexFlow-FAQ
 https://github.com/0xfe/vexflow/issues/134

 TODO: grand staff
 */

declare var Vex: any; // FIXME: hack until proper 'vexflow.d.ts' is available.

module Sheet {

    const WIDTH = 500, HEIGHT = 700;
    const NUM_BEATS = 8, BEAT_VALUE = 4;
    const formatter = new Vex.Flow.Formatter();

    let ctx: any = null;
    let stave: any = null;

    export function init() {

        const canvas = document.getElementsByTagName('canvas')[0];
        const renderer = new Vex.Flow.Renderer(canvas, Vex.Flow.Renderer.Backends.CANVAS);
        renderer.resize(HEIGHT, WIDTH);

        ctx = renderer.getContext();
        //ctx.scale(2, 2);

        stave = new Vex.Flow.Stave(10, 100, WIDTH); // x-padding, y-padding, width
        stave.addClef('treble');
        stave.setContext(ctx);

    };

    export function buildFormattedVoiceForQuarterNotes(...ns : string[]){
        if (ns.length !== NUM_BEATS)
            throw ('Invalid number of notes. Expecting '+NUM_BEATS+' but got '+ns.length+'.');

        const notes : any[] = [];

        for(const note of ns ){
            // only one note, no chords
            notes.push(new Vex.Flow.StaveNote({ keys: [note], duration: 'q' }))
        }

        const voice = new Vex.Flow.Voice({
            num_beats: NUM_BEATS,
            beat_value: BEAT_VALUE,
            resolution: Vex.Flow.RESOLUTION
        });

        voice.addTickables(notes);

        // Format and justify the notes to WIDTH
        formatter.joinVoices([voice]).format([voice], WIDTH);

        return voice;
    };

    export function draw(...voices : any[]){
        // TODO: clean canvas
        stave.draw();
        
        for (const v of voices) {
            v.draw(ctx, stave);
        }
    };
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


