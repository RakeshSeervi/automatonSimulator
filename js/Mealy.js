function Mealy(useDefaults) {
    "use strict";
    this.transitions = {};
    this.startState = useDefaults ? 'start' : null;
    this.output = {};

    this.processor = {
        input: null,
        inputLength: 0,
        state: null,
        inputIndex: 0,
        status: null,
        output: null
    };
}

$(function () {
    "use strict";

    Mealy.prototype.transition = function (state, character) {
        return (this.transitions[state]) ? this.transitions[state][character] : null
    };

    Mealy.prototype.deserialize = function (json) {
        this.transitions = json.transitions;
        this.startState = json.startState;
        return this;
    };

    Mealy.prototype.serialize = function () {
        return {
            transitions: this.transitions,
            startState: this.startState
        }
    };

    Mealy.prototype.loadFromString = function (JSONdescription) {
        let parsedJSON = JSON.parse(JSONdescription);
        return this.deserialize(parsedJSON);
    };

    Mealy.prototype.saveToString = function () {
        return JSON.stringify(this.serialize());
    };

    Mealy.prototype.addTransition = function (stateA, character, stateB) {
        if (!this.transitions[stateA])
            this.transitions[stateA] = {};
        this.transitions[stateA][character] = stateB;
        return this;
    };

    Mealy.prototype.hasTransition = function (state, character) {
        if (this.transitions[state])
            return !!this.transitions[state][character];
        return false;
    };

    Mealy.prototype.removeTransitions = function (state) {
        delete this.transitions[state];
        let self = this;
        $.each(self.transitions, function (stateA, sTrans) {
            $.each(sTrans, function (char, stateB) {
                if (stateB === state) {
                    self.removeTransition(stateA, char);
                }
            });
        });
        return this;
    };

    Mealy.prototype.removeTransition = function (stateA, character) {
        if (this.transitions[stateA]) delete this.transitions[stateA][character];
        return this;
    };

    Mealy.prototype.setStartState = function (state) {
        this.startState = state;
        return this;
    };

    Mealy.prototype.step = function () {
        let inputChar = this.processor.input.substr(this.processor.inputIndex, 1);
        let prev = this.processor.state;
        if (!(this.processor.state = this.transition(this.processor.state, this.processor.input.substr(this.processor.inputIndex++, 1)))) this.processor.status = 'Reject';
        else if (this.processor.status !== 'Reject' && this.processor.inputIndex === this.processor.inputLength) this.processor.status = 'Completed';
        if (this.processor.state) this.processor.output = this.output[prev][inputChar];
        return this.processor.status;
    };

    Mealy.prototype.status = function () {
        return {
            state: this.processor.state,
            input: this.processor.input,
            inputIndex: this.processor.inputIndex,
            nextChar: this.processor.input.substr(this.processor.inputIndex, 1),
            status: this.processor.status,
            output: this.processor.output
        };
    };

    Mealy.prototype.stepInit = function (input) {
        this.processor.input = input;
        this.processor.inputLength = input.length;
        this.processor.inputIndex = 0;
        this.processor.state = this.startState;
        this.processor.status = (this.processor.inputLength === 0) ? 'Completed' : 'Active';
        return this.processor.status;
    };

    Mealy.prototype.run = function (input) {
        let _status = this.stepInit(input);
        while (_status === 'Active') _status = this.step();
        return this.processor.status === 'Completed' ? this.processor.output : 'Invalid input';
    };

    Mealy.prototype.updateOutput = function (state, character, out = 0, del = false) {
        if (del) {
            if (this.output[state] && this.output[state][character])
                delete this.output[state][character];
        } else {
            if (!this.output[state])
                this.output[state] = {};
            this.output[state][character] = out;
        }
        return this;
    }

    Mealy.prototype.getOutput = function (state) {
        return this.processor.output;
    }

    // TODO: runTests
});
