declare var Vex: any; // FIXME: hack...

window.onload = function(){

    function onMIDIFailure(e: Event) {
        console.log('No access to MIDI devices or your browser does not support WebMIDI API.');
    };

    function onKey(down: boolean, note: number) {
        console.log('Key: ' + note + ' ' + down);
        console.log(MIDIListener.convertMIDIcodeToNote(note));
    };

    if (!MIDIListener.init(onMIDIFailure, onKey)) {
        alert('No MIDI support in your browser.');
    }

    console.log('ready');

//
// FIXME: sketch code, will move out later.
//

    /*
     References:
   
     http://www.vexflow.com/docs/tutorial.html
     https://github.com/0xfe/vexflow/wiki/The-VexFlow-FAQ
     https://github.com/0xfe/vexflow/issues/134
   
     TODO: grand staff
     */

     var canvas = document.getElementsByTagName('canvas')[0];

     var renderer = new Vex.Flow.Renderer(canvas, Vex.Flow.Renderer.Backends.CANVAS);
     var ctx = renderer.getContext();
    var stave = new Vex.Flow.Stave(10, 100, 500); // x-padding, y-padding, width
    stave.addClef('treble');
    stave.setContext(ctx).draw();


    function newQuarterNotes(notes : any) {
        return new Vex.Flow.StaveNote({ keys: notes, duration: 'q' });
    };

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

    // Create a voice in 4/4
    var voice = new Vex.Flow.Voice({
        num_beats: 8,
        beat_value: 4,
        resolution: Vex.Flow.RESOLUTION
    });

    // Add notes to voice
    voice.addTickables(notes);

    // Format and justify the notes to 500 pixels
    var formatter = new Vex.Flow.Formatter();
    formatter.joinVoices([voice]).format([voice], 500);

    // Render voice
    voice.draw(ctx, stave);



    // ---

    // Create the notes
    var notes2 = [
    newQuarterNotes(["c/3"]),
    newQuarterNotes(["c/3"]),
    newQuarterNotes(["c/3"]),
    newQuarterNotes(["c/3"]),
    newQuarterNotes(["c/3"]),
    newQuarterNotes(["c/3"]),
    newQuarterNotes(["c/3"]),
    newQuarterNotes(["c/3"])
    ];

    for (var x of notes2) {
        x.setStyle({ fillStyle: "blue", strokeStyle: "blue" });
    }

    // Create a voice in 4/4
    var voice2 = new Vex.Flow.Voice({
        num_beats: 8,
        beat_value: 4,
        resolution: Vex.Flow.RESOLUTION
    });

    // Add notes to voice
    voice2.addTickables(notes2);

    // Format and justify the notes to 500 pixels
    var formatter = new Vex.Flow.Formatter();
    formatter.joinVoices([voice2]).format([voice2], 500);

    // Render voice
    voice2.draw(ctx, stave);



};
