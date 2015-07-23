/// <reference path="../lib/d3.d.ts" />
var A_CODE = 65;
var G_CODE = 71;
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
                this.i = 0;
                this.pending = 0;
                this.wrong = [];
                this.rightT = newArray(this.sheet.notesTreble[this.i].length, false);
                this.rightB = newArray(this.sheet.notesBass[this.i].length, false);
                this.timer = new Date().getTime();
            };
            this.generateSheet();
        }
        GameState.prototype.currentX = function () {
            var note = this.sheet.treble.tickables[this.i].note_heads[0];
            return note.x - (note.width / 2);
        };
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
                    var diff = new Date().getTime() - this.timer;
                    Stats.updateBar(diff);
                    if (this.i === (this.sheet.stavesTreble.length - 1)) {
                        return true;
                    }
                    ++this.i;
                    this.timer = new Date().getTime();
                    this.rightT = newArray(this.sheet.notesTreble[this.i].length, false);
                    this.rightB = newArray(this.sheet.notesBass[this.i].length, false);
                }
            }
            return false;
        };
        GameState.prototype.keyPressToCode = function (charCode) {
            var treble = this.sheet.notesTreble[this.i].length;
            var bass = this.sheet.notesBass[this.i].length;
            if ((treble + bass) > 1)
                throw 'This function only work when there is only one note to play...';
            var note = treble === 1 ? this.sheet.notesTreble[this.i][0] : this.sheet.notesBass[this.i][0];
            var _a = MIDI.convertMIDIcodeToNote(note), letter = _a[0], _ = _a[1];
            var key = String.fromCharCode(charCode).toLowerCase();
            if (letter.indexOf(key) === 0)
                return note;
            if (charCode >= A_CODE && charCode <= G_CODE) {
                return MIDI.convertNoteToMIDIcode(key, 4);
            }
            return -1;
        };
        GameState.prototype.draw = function () {
            var _a = Sheet.buildKeyStatus(this.i, WRONG_COLOR, this.wrong), t = _a.treble, b = _a.bass;
            Sheet.draw([this.sheet.treble, t], [this.sheet.bass, b]);
            Stats.setNotes(this.n_correct, this.n_wrong);
            var p = this.n_correct / (this.n_correct + this.n_wrong);
            if (p >= 0 && p <= 1) {
                Stats.updatePie(this.n_correct / (this.n_correct + this.n_wrong));
            }
        };
        GameState.prototype.getStartTime = function () {
            return this.timer;
        };
        GameState.prototype.resetStartTime = function () {
            this.timer = new Date().getTime();
        };
        return GameState;
    })();
    Game.GameState = GameState;
    ;
})(Game || (Game = {}));
;
var Effects;
(function (Effects) {
    var g = null;
    var cursor = null;
    var cursor_t = null;
    var svg = null;
    var W;
    var BOX = 30;
    function init(width, height, help) {
        if (svg === null) {
            svg = d3.select("#d3-layer");
        }
        svg.attr("width", width);
        svg.attr("height", height);
        svg.style("left", Math.floor((window.innerWidth - width) / 2));
        W = width;
        if (help) {
            addAssist(width);
        }
    }
    Effects.init = init;
    ;
    function addAssist(width) {
        if (g !== null) {
            g.remove();
        }
        g = svg.append("g").attr("opacity", 1);
        var str = ['G', 'B', 'D', 'F', 'A', 'C', 'E'];
        function add(w, yMin, yMax, i_start) {
            var y = yMax;
            for (var i = i_start; y > yMin;) {
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
            for (var i = i_start + 3; y > yMin;) {
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
        }
        ;
        add(width - 60, 100 + 50, 188 + 50, 2);
        add(width - 60, 215 + 50, 188 + 80 + 50, 3);
    }
    ;
    function initCursor(height, x) {
        if (cursor === null) {
            cursor = svg.append("rect");
        }
        cursor.style("fill", "#a3a3a3")
            .attr("x", 0)
            .attr("y", 0)
            .attr("rx", 2)
            .attr("ry", 2)
            .attr('opacity', 0.3)
            .attr("width", BOX)
            .attr("height", height);
        cursor.transition()
            .attr('x', x);
    }
    Effects.initCursor = initCursor;
    ;
    function moveCursor(x) {
        cursor.transition()
            .duration(250)
            .attr('x', x);
    }
    Effects.moveCursor = moveCursor;
    ;
    function curtain(onDown, onUp) {
        cursor.transition()
            .attr('width', W)
            .attr('opacity', 1)
            .duration(500)
            .attr("x", 0)
            .each('end', onDown)
            .transition()
            .delay(500)
            .duration(500)
            .attr('opacity', 0.3)
            .attr("width", BOX)
            .each('end', onUp);
    }
    Effects.curtain = curtain;
    ;
})(Effects || (Effects = {}));
;
var Stats;
(function (Stats) {
    var width = 100;
    var height = 50;
    var tau = 2 * Math.PI;
    var foreground = null;
    var arcTween = null;
    var bar = null;
    var newBar = null;
    var MAX = 0;
    var rs = [];
    var correct_notes = null;
    var wrong_notes = null;
    var total_notes = null;
    var current_time = null;
    var last_time = null;
    var average_time = null;
    var count = 0;
    var n_count = 0;
    function init() {
        if (bar !== null) {
            return;
        }
        var svg = d3.select("#note-stat");
        var arc = d3.svg.arc()
            .innerRadius(15)
            .outerRadius(40)
            .startAngle(0);
        svg = svg.append("g")
            .attr("transform", "translate(" + width / 2 + "," + (15 + (height / 2)) + ")");
        var background = svg.append("path")
            .datum({ endAngle: tau })
            .style("fill", "#DA3E52")
            .attr('opacity', 0.7)
            .attr("d", arc);
        foreground = svg.append("path")
            .datum({ endAngle: .0 * tau })
            .style("fill", "#2ECC40")
            .style("stroke", "#8FD5A6")
            .style("stroke-width", 4)
            .attr("d", arc);
        arcTween = function (transition, newAngle) {
            transition.attrTween("d", function (d) {
                var interpolate = d3.interpolate(d.endAngle, newAngle);
                return function (t) {
                    d.endAngle = interpolate(t);
                    return arc(d);
                };
            });
        };
        var data = new Array(10);
        for (var i = 0; i < data.length; ++i) {
            data[i] = 50;
        }
        MAX = data.length;
        var tmp = d3.select("#time-stat");
        var layer1 = tmp.append('g');
        var layer2 = tmp.append('g');
        var layer3 = tmp.append('g');
        rs = [];
        newBar = function (val) {
            return layer1.append("rect")
                .attr("class", val > 40 ? 'bad' : val > 20 ? 'ok' : 'good')
                .attr("width", 20);
        };
        for (var i = 0; i < data.length; ++i) {
            rs.push(newBar(50 - data[i])
                .attr('opacity', 1)
                .attr("x", 10 + (i * 20))
                .attr("y", (50 + 10) - (50 - data[i]))
                .attr("height", 50 - data[i]));
        }
        var line = layer2.append("line")
            .style("stroke", "black")
            .style("stroke-width", 1)
            .attr("x1", 10 - 2)
            .attr("y1", 50 + 10)
            .attr("x2", 20 * (data.length) + 10 + 2)
            .attr("y2", 50 + 10);
        bar = layer2.append("line")
            .style("stroke", "blue")
            .style("stroke-width", 1)
            .attr("x1", 10 - 2)
            .attr("y1", 20)
            .attr("x2", 20 * (data.length) + 10 + 2)
            .attr("y2", 20);
        correct_notes = document.getElementById('correct-notes');
        wrong_notes = document.getElementById('wrong-notes');
        total_notes = document.getElementById('total-notes');
        current_time = document.getElementById('current-time');
        last_time = document.getElementById('last-time');
        average_time = document.getElementById('average-time');
        count = 0;
        n_count = 0;
    }
    Stats.init = init;
    ;
    function setNotes(correct, wrong) {
        correct_notes.innerHTML = correct + '';
        wrong_notes.innerHTML = wrong + '';
        total_notes.innerHTML = (correct + wrong) + '';
    }
    Stats.setNotes = setNotes;
    ;
    function updatePie(perc) {
        foreground.transition()
            .duration(1000)
            .ease('bounce')
            .call(arcTween, perc * tau);
    }
    Stats.updatePie = updatePie;
    ;
    function setCurrentTime(time) {
        current_time.innerHTML = (time / 1000).toFixed(1) + '';
    }
    Stats.setCurrentTime = setCurrentTime;
    ;
    function updateBar(ms) {
        var s = ms / 1000;
        var value = 50 - Math.min(Math.floor(s * 10), 50);
        count += s;
        n_count += 1;
        var avg = (count / n_count);
        last_time.innerHTML = s.toFixed(1) + '';
        average_time.innerHTML = avg.toFixed(1) + '';
        avg = Math.min(Math.floor(avg * 10), 50);
        bar.transition()
            .attr('y1', (50 + 10) - avg)
            .attr("y2", (50 + 10) - avg);
        for (var i = 0; i < MAX; ++i) {
            if (i === 0) {
                rs[i].transition()
                    .attr("x", 10 + ((i - 1) * 20))
                    .attr('opacity', 0)
                    .remove();
            }
            else {
                rs[i].transition()
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
    }
    Stats.updateBar = updateBar;
    ;
})(Stats || (Stats = {}));
;
window.onload = function () {
    var help = false;
    var minMIDI = 48;
    var maxMIDI = 83;
    var minChord = 1;
    var maxChord = 1;
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
    var min = Math.min(minMIDI, maxMIDI);
    var max = Math.max(minMIDI, maxMIDI);
    minMIDI = Math.max(min, 0);
    maxMIDI = Math.min(max, 127);
    min = Math.min(minChord, maxChord);
    max = Math.max(minChord, maxChord);
    minChord = Math.max(min, 1);
    maxChord = Math.min(max, 10);
    function onMIDIFailure() {
        var m = d3.select("body")
            .append("div")
            .style("left", "0")
            .style("top", "-200px")
            .style("display", "block")
            .style("opacity", 1)
            .attr("class", 'error')
            .html('<b>Error:</b> No access to MIDI devices. ' +
            'You may need to restart your browser to allow access. ' +
            'Or your browser does not support the WebMIDI API.');
        m.transition()
            .duration(1000)
            .style("top", "0px")
            .transition()
            .delay(11000)
            .style("opacity", 0)
            .remove();
    }
    ;
    MIDI.init(onMIDIFailure, onKey);
    var state = null;
    function onKey(down, code) {
        //console.log('Key: ' + code + ' ' + down + ' >> ' + MIDI.convertMIDIcodeToNote(code));
        var oldX = state.currentX();
        var newSheet = state.update(down, code);
        state.draw();
        if (newSheet) {
            state.generateSheet();
            Effects.curtain(function () { return state.draw(); }, function () { state.resetStartTime(); Effects.moveCursor(state.currentX()); });
        }
        else {
            var newX = state.currentX();
            if (oldX === newX)
                return;
            if (newX > oldX) {
                Effects.moveCursor(newX);
            }
        }
    }
    ;
    if (minChord === 1 && maxChord === 1) {
        var keysDown = new Array(G_CODE - A_CODE);
        for (var i = 0; i < keysDown.length; ++i) {
            keysDown[i] = false;
        }
        function onKeyboard(down, charCode) {
            if (charCode >= A_CODE && charCode <= G_CODE) {
                var i = charCode - A_CODE;
                if (down && keysDown[i]) {
                    return;
                }
                keysDown[i] = down;
            }
            var fakeNote = state.keyPressToCode(charCode);
            if (fakeNote !== -1) {
                onKey(down, fakeNote);
            }
        }
        ;
        window.onkeydown = function (e) { return onKeyboard(true, e.keyCode); };
        window.onkeyup = function (e) { return onKeyboard(false, e.keyCode); };
        var m = d3.select("body")
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
    var oldTimer = null;
    window.onresize = function (e) {
        var beats = 8;
        var H = 500;
        var W = 700;
        Sheet.init(W, H, beats);
        Effects.init(W, H, help);
        Stats.init();
        state = new Game.GameState(help && minChord === 1 && maxChord === 1, beats, minChord, maxChord, minMIDI, maxMIDI);
        state.draw();
        Effects.initCursor(H, state.currentX());
        if (oldTimer !== null) {
            clearInterval(oldTimer);
        }
        oldTimer = setInterval(function () { return Stats.setCurrentTime(new Date().getTime() - state.getStartTime()); }, 100);
    };
    window.onresize(null);
};
//# sourceMappingURL=main.js.map