/*
 References:

 [1] http://www.vexflow.com/docs/tutorial.html
 [2] https://github.com/0xfe/vexflow/wiki/The-VexFlow-FAQ
 [3] https://github.com/0xfe/vexflow/issues/134
 [4] https://groups.google.com/forum/#!topic/vexflow/kTZYDpzcskg
 */
var Sheet;
(function (Sheet) {
    Sheet.WIDTH = 500, Sheet.HEIGHT = 500;
    Sheet.NUM_BEATS = 8;
    var BEAT_VALUE = 4;
    var formatter = new Vex.Flow.Formatter();
    var isBassCode = function (code) { return code < 60; };
    var codesToNotes = function (v) { return v.map(function (x) { return Sheet.codeToNote(x); }); };
    var TRANSPARENT_COLOR = 'rgba(0,0,0,0)';
    var ctx = null;
    var staveTreble = null;
    var staveBass = null;
    var brace = null;
    function init() {
        Sheet.WIDTH = window.innerWidth;
        Sheet.HEIGHT = window.innerHeight;
        var canvas = document.getElementsByTagName('canvas')[0];
        var renderer = new Vex.Flow.Renderer(canvas, Vex.Flow.Renderer.Backends.CANVAS);
        renderer.resize(Sheet.WIDTH, Sheet.HEIGHT);
        ctx = renderer.getContext();
        var START = 50;
        var TOP = 100;
        var STAVE_PADDING = 80;
        Sheet.NUM_BEATS = Math.floor((Sheet.WIDTH - START * 4) / 40);
        Sheet.NUM_BEATS = Math.min(Sheet.NUM_BEATS, 10);
        Sheet.NUM_BEATS = Math.max(Sheet.NUM_BEATS, 1);
        staveTreble = new Vex.Flow.Stave(START, TOP, Sheet.WIDTH - START * 2);
        staveTreble.addClef('treble');
        staveTreble.setContext(ctx);
        staveBass = new Vex.Flow.Stave(START, TOP + STAVE_PADDING, Sheet.WIDTH - START * 2);
        staveBass.addClef('bass');
        staveBass.setContext(ctx);
        brace = new Vex.Flow.StaveConnector(staveTreble, staveBass);
        brace.setType(Vex.Flow.StaveConnector.type.BRACE);
        brace.setContext(ctx);
    }
    Sheet.init = init;
    ;
    function colorNote(staveNote, color) {
        staveNote.setStyle({ strokeStyle: color, fillStyle: color });
    }
    Sheet.colorNote = colorNote;
    ;
    function colorSingleNote(index, staveNote, color) {
        staveNote.setKeyStyle(index, { strokeStyle: color, fillStyle: color });
    }
    Sheet.colorSingleNote = colorSingleNote;
    ;
    function buildNotes(assist, cs) {
        if (cs.length !== Sheet.NUM_BEATS)
            throw ('Invalid number of notes. Expecting ' + Sheet.NUM_BEATS + ' but got ' + cs.length + '.');
        var ts = [];
        var bs = [];
        var notesT = [];
        var notesB = [];
        var stavesT = [];
        var stavesB = [];
        for (var _i = 0; _i < cs.length; _i++) {
            var codes = cs[_i];
            var tsc = codes.filter(function (note) { return !isBassCode(note); }).sort();
            var bsc = codes.filter(function (note) { return isBassCode(note); }).sort();
            var t = tsc.length === 0 ? makeInvisibleNote() : makeSheetNote(tsc, assist, false);
            var b = bsc.length === 0 ? makeInvisibleNote() : makeSheetNote(bsc, assist, true);
            stavesT.push(t);
            stavesB.push(b);
            ts.push(tsc);
            bs.push(bsc);
        }
        var voiceTreble = makeVoice();
        var voiceBass = makeVoice();
        voiceTreble.addTickables(stavesT);
        voiceBass.addTickables(stavesB);
        var max = Math.max(staveBass.width, staveTreble.width);
        formatter.format([voiceTreble, voiceBass], max);
        return {
            notesTreble: ts,
            notesBass: bs,
            stavesTreble: stavesT,
            stavesBass: stavesB,
            treble: voiceTreble,
            bass: voiceBass
        };
    }
    Sheet.buildNotes = buildNotes;
    ;
    function buildKeyStatus(pos, color, ns) {
        if (pos < 0 || pos > Sheet.NUM_BEATS)
            throw ('Invalid position ' + pos + ' (expecting 0 <= pos < ' + Sheet.NUM_BEATS + ').');
        var notesTreble = new Array(Sheet.NUM_BEATS);
        var notesBass = new Array(Sheet.NUM_BEATS);
        for (var i = 0; i < Sheet.NUM_BEATS; ++i) {
            if (i !== pos) {
                notesTreble[i] = makeInvisibleNote();
                notesBass[i] = makeInvisibleNote();
            }
        }
        var ts = ns.filter(function (note) { return !isBassCode(note); }).sort();
        var bs = ns.filter(function (note) { return isBassCode(note); }).sort();
        if (ts.length > 0) {
            var n = makeSheetNote(ts, false, false);
            colorNote(n, color);
            notesTreble[pos] = n;
        }
        else {
            notesTreble[pos] = makeInvisibleNote();
        }
        if (bs.length > 0) {
            var n = makeSheetNote(bs, false, true);
            colorNote(n, color);
            notesBass[pos] = n;
        }
        else {
            notesBass[pos] = makeInvisibleNote();
        }
        var voiceTreble = makeVoice();
        var voiceBass = makeVoice();
        voiceTreble.addTickables(notesTreble);
        voiceBass.addTickables(notesBass);
        var max = Math.max(staveBass.width, staveTreble.width);
        formatter.format([voiceTreble, voiceBass], max);
        return { treble: voiceTreble, bass: voiceBass };
    }
    Sheet.buildKeyStatus = buildKeyStatus;
    ;
    function draw(treble, bass) {
        ctx.clearRect(0, 0, Sheet.WIDTH, Sheet.HEIGHT);
        staveBass.draw();
        staveTreble.draw();
        brace.draw();
        for (var _i = 0; _i < treble.length; _i++) {
            var t = treble[_i];
            t.draw(ctx, staveTreble);
        }
        for (var _a = 0; _a < bass.length; _a++) {
            var b = bass[_a];
            b.draw(ctx, staveBass);
        }
    }
    Sheet.draw = draw;
    ;
    function toNote(letter, octave) {
        return letter + '/' + octave;
    }
    Sheet.toNote = toNote;
    ;
    function codeToNote(code) {
        var _a = MIDI.convertMIDIcodeToNote(code), letter = _a[0], octave = _a[1];
        return toNote(letter, octave);
    }
    Sheet.codeToNote = codeToNote;
    ;
    function toLetterOctave(note) {
        var _a = note.split('/'), letter = _a[0], o = _a[1];
        return [letter, parseInt(o)];
    }
    Sheet.toLetterOctave = toLetterOctave;
    ;
    function makeInvisibleNote() {
        var invisible = new Vex.Flow.StaveNote({ keys: ['e/4'], duration: 'q' });
        invisible.setStyle({ strokeStyle: TRANSPARENT_COLOR, fillStyle: TRANSPARENT_COLOR });
        return invisible;
    }
    ;
    function makeSheetNote(codes, annotation, isBass) {
        var bs = codesToNotes(codes);
        var n = new Vex.Flow.StaveNote({ keys: bs, duration: 'q', clef: (isBass ? 'bass' : 'treble') });
        for (var j = 0; j < bs.length; ++j) {
            if (bs[j].indexOf('#') !== -1) {
                n.addAccidental(j, new Vex.Flow.Accidental('#'));
            }
            if (annotation) {
                var a = new Vex.Flow.Annotation(bs.join(','));
                a.setVerticalJustification(Vex.Flow.Annotation.VerticalJustify.BOTTOM);
                n.addModifier(j, a);
            }
        }
        return n;
    }
    ;
    function makeVoice() {
        return new Vex.Flow.Voice({ num_beats: Sheet.NUM_BEATS, beat_value: BEAT_VALUE, resolution: Vex.Flow.RESOLUTION });
    }
    ;
})(Sheet || (Sheet = {}));
;
//# sourceMappingURL=sheet.js.map