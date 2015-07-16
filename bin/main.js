var Game;
(function (Game) {
    var WRONG_COLOR = 'red';
    var CORRECT_COLOR = 'lime';
    var NORMAL_COLOR = 'black';
    var DONE_COLOR = 'lightgray';
    function randomRange(min, max) {
        return min + Math.round(Math.random() * (max - min));
    }
    ;
    function makeRandomNotes(n, minChord, maxChord, minMIDI, maxMIDI) {
        var r = [];
        while (r.length < n) {
            var c = [];
            var l = randomRange(minChord, maxChord);
            while (c.length < l) {
                var n_1 = randomRange(minMIDI, maxMIDI);
                if (c.indexOf(n_1) !== -1)
                    continue;
                c.push(n_1);
            }
            r.push(c);
        }
        return r;
    }
    ;
    function condPush(array, value) {
        if (array.indexOf(value) === -1)
            array.push(value);
    }
    ;
    function condRemove(array, value) {
        var j = array.indexOf(value);
        if (j !== -1)
            array.splice(j, 1);
    }
    ;
    function newArray(n, initial) {
        var a = new Array(n);
        for (var i = 0; i < a.length; ++i)
            a[i] = initial;
        return a;
    }
    ;
    var GameState = (function () {
        function GameState(assist, count, minChord, maxChord, minMIDI, maxMIDI) {
            this.n_correct = 0;
            this.n_wrong = 0;
            this.score = document.getElementById('score');
            this.generateSheet = function () {
                this.sheet = Sheet.buildNotes(assist, makeRandomNotes(count, minChord, maxChord, minMIDI, maxMIDI));
            };
            this.generateSheet();
            this.i = 0;
            this.pending = 0;
            this.wrong = [];
            this.rightT = newArray(this.sheet.notesTreble[this.i].length, false);
            this.rightB = newArray(this.sheet.notesBass[this.i].length, false);
        }
        GameState.prototype.update = function (down, code) {
            var indexT = this.sheet.notesTreble[this.i].indexOf(code);
            var indexB = this.sheet.notesBass[this.i].indexOf(code);
            var isCorrect = (indexT !== -1) || (indexB !== -1);
            if (this.pending === 0) {
                if (isCorrect) {
                    if (indexT !== -1) {
                        this.rightT[indexT] = down;
                        if (down) {
                            Sheet.colorSingleNote(indexT, this.sheet.stavesTreble[this.i], CORRECT_COLOR);
                        }
                        else {
                            Sheet.colorSingleNote(indexT, this.sheet.stavesTreble[this.i], NORMAL_COLOR);
                        }
                    }
                    else {
                        this.rightB[indexB] = down;
                        if (down) {
                            Sheet.colorSingleNote(indexB, this.sheet.stavesBass[this.i], CORRECT_COLOR);
                        }
                        else {
                            Sheet.colorSingleNote(indexB, this.sheet.stavesBass[this.i], NORMAL_COLOR);
                        }
                    }
                }
                else {
                    if (down) {
                        condPush(this.wrong, code);
                        ++this.n_wrong;
                    }
                    else {
                        condRemove(this.wrong, code);
                    }
                }
                if (this.rightT.reduce(function (old, current) { return old && current; }, true) &&
                    this.rightB.reduce(function (old, current) { return old && current; }, true) &&
                    this.wrong.length === 0) {
                    this.pending = this.rightT.length + this.rightB.length;
                }
            }
            else {
                if (down) {
                    ++this.pending;
                    if (isCorrect) {
                        if (indexT !== -1) {
                            Sheet.colorSingleNote(indexT, this.sheet.stavesTreble[this.i], CORRECT_COLOR);
                        }
                        else {
                            Sheet.colorSingleNote(indexB, this.sheet.stavesBass[this.i], CORRECT_COLOR);
                        }
                    }
                    else {
                        condPush(this.wrong, code);
                        ++this.n_wrong;
                    }
                }
                else {
                    --this.pending;
                    if (isCorrect) {
                        if (indexT !== -1) {
                            Sheet.colorSingleNote(indexT, this.sheet.stavesTreble[this.i], DONE_COLOR);
                        }
                        else {
                            Sheet.colorSingleNote(indexB, this.sheet.stavesBass[this.i], DONE_COLOR);
                        }
                    }
                    else {
                        condRemove(this.wrong, code);
                    }
                }
                if (this.pending === 0) {
                    if (this.sheet.notesTreble[this.i].length > 0) {
                        Sheet.colorNote(this.sheet.stavesTreble[this.i], DONE_COLOR);
                    }
                    if (this.sheet.notesBass[this.i].length > 0) {
                        Sheet.colorNote(this.sheet.stavesBass[this.i], DONE_COLOR);
                    }
                    this.n_correct += this.rightT.length + this.rightB.length;
                    ++this.i;
                    if (this.i === this.sheet.stavesTreble.length) {
                        this.i = 0;
                        this.generateSheet();
                    }
                    this.rightT = newArray(this.sheet.notesTreble[this.i].length, false);
                    this.rightB = newArray(this.sheet.notesBass[this.i].length, false);
                }
            }
        };
        GameState.prototype.draw = function () {
            var _a = Sheet.buildKeyStatus(this.i, WRONG_COLOR, this.wrong), t = _a.treble, b = _a.bass;
            Sheet.draw([this.sheet.treble, t], [this.sheet.bass, b]);
            this.score.innerHTML =
                'score: ' + this.n_correct + '/' + (this.n_correct + this.n_wrong) +
                    ' [sheet=' + Math.floor(this.i / this.sheet.notesTreble.length * 100) + '%,' +
                    ' accuracy=' + Math.floor(this.n_correct / (this.n_correct + this.n_wrong) * 100) + '%]';
        };
        return GameState;
    })();
    Game.GameState = GameState;
    ;
})(Game || (Game = {}));
;
window.onload = function () {
    var help = false;
    var minMIDI = 48;
    var maxMIDI = 83;
    var minChord = 1;
    var maxChord = 3;
    var parameters = document.URL.split('?');
    if (parameters.length > 1) {
        parameters = parameters[1].split('&');
        for (var i = 0; i < parameters.length; ++i) {
            var tmp = parameters[i].split('=');
            if (tmp.length > 1) {
                var option = tmp[0], value = tmp[1];
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
                        minChord = Math.max(parseInt(value), 1);
                        break;
                    case 'maxChord':
                        maxChord = parseInt(value);
                        break;
                    default:
                        break;
                }
            }
        }
    }
    function onMIDIFailure() {
        var msg = document.getElementById('message');
        msg.innerHTML = ('<b>Error:</b> No access to MIDI devices. ' +
            'You may need to restart your browser to allow access. ' +
            'Or your browser does not support the WebMIDI API.');
        msg.className += 'error';
        msg.style.display = 'block';
    }
    ;
    MIDI.init(onMIDIFailure, onKey);
    var state = null;
    function onKey(down, code) {
        console.log('Key: ' + code + ' ' + down + ' >> ' + MIDI.convertMIDIcodeToNote(code));
        state.update(down, code);
        state.draw();
    }
    ;
    window.onresize = function (e) {
        Sheet.init();
        state = new Game.GameState(help, Sheet.NUM_BEATS, minChord, maxChord, minMIDI, maxMIDI);
        state.draw();
    };
    window.onresize(null);
};
//# sourceMappingURL=main.js.map