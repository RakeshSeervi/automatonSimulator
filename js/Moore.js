function Moore(useDefaults) {
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
    };
}

$(function () {
    "use strict";

    Moore.prototype.transition = function (state, character) {
        return (this.transitions[state]) ? this.transitions[state][character] : null
    };

    Moore.prototype.deserialize = function (json) {
        this.transitions = json.transitions;
        this.startState = json.startState;
        return this;
    };

    Moore.prototype.serialize = function () {
        return {
            transitions: this.transitions,
            startState: this.startState
        }
    };

    Moore.prototype.loadFromString = function (JSONdescription) {
        let parsedJSON = JSON.parse(JSONdescription);
        return this.deserialize(parsedJSON);
    };

    Moore.prototype.saveToString = function () {
        return JSON.stringify(this.serialize());
    };

    Moore.prototype.addTransition = function (stateA, character, stateB) {
        if (!this.transitions[stateA])
            this.transitions[stateA] = {};
        this.transitions[stateA][character] = stateB;
        return this;
    };

    Moore.prototype.hasTransition = function (state, character) {
        if (this.transitions[state])
            return !!this.transitions[state][character];
        return false;
    };

    Moore.prototype.removeTransitions = function (state) {
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

    Moore.prototype.removeTransition = function (stateA, character) {
        if (this.transitions[stateA]) delete this.transitions[stateA][character];
        return this;
    };

    Moore.prototype.setStartState = function (state) {
        this.startState = state;
        return this;
    };

    Moore.prototype.step = function () {
        if (!(this.processor.state = this.transition(this.processor.state, this.processor.input.substr(this.processor.inputIndex++, 1)))) this.processor.status = 'Reject';
        if (this.processor.status !== 'Reject' && this.processor.inputIndex === this.processor.inputLength) this.processor.status = 'Completed';
        return this.processor.status;
    };

    Moore.prototype.status = function () {
        return {
            state: this.processor.state,
            input: this.processor.input,
            inputIndex: this.processor.inputIndex,
            nextChar: this.processor.input.substr(this.processor.inputIndex, 1),
            status: this.processor.status
        };
    };

    Moore.prototype.stepInit = function (input) {
        this.processor.input = input;
        this.processor.inputLength = input.length;
        this.processor.inputIndex = 0;
        this.processor.state = this.startState;
        this.processor.status = (this.processor.inputLength === 0) ? 'Completed' : 'Active';
        return this.processor.status;
    };

    Moore.prototype.run = function (input) {
        let _status = this.stepInit(input);
        while (_status === 'Active') _status = this.step();
        return this.processor.state ? this.output[this.processor.state] : 'Invalid input';
    };

    Moore.prototype.updateOutput = function (state, out, del = false) {
        if (del) {
            if (this.output[state])
                delete this.output[state]
        } else
            this.output[state] = out;
        return this;
    }

    Moore.prototype.getOutput = function (state) {
        return this.output[state];
    }

    // TODO: runTests
});
