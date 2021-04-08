const mealy_delegate = (function () {
    let self = null;
    let mealy = null;
    let container = null;
    let dialogDiv = null;
    let dialogActiveConnection = null;

    let statusConnector = null;

    let makeDialog = function () {
        dialogDiv = $('<div></div>', {style: 'text-align:center;'});
        $('<div></div>', {style: 'font-size:small;'}).html('Empty transitions not allowed for mealy state machine <br/>Read from Input / Output').appendTo(dialogDiv);
        $('<span></span>', {id: 'mealy_dialog_stateA', 'class': 'tranStart'}).appendTo(dialogDiv);
        $('<input/>', {
            id: 'mealy_dialog_readCharTxt',
            type: 'text',
            maxLength: 1,
            style: 'width:30px; text-align:center;'
        })
            .val('0')
            .appendTo(dialogDiv);
        $('<span> / </span>').appendTo(dialogDiv);
        $('<input/>', {
            id: 'mealy_dialog_readOutputTxt',
            type: 'text',
            maxLength: 1,
            style: 'width:30px; text-align:center;'
        })
            .val('0')
            .appendTo(dialogDiv);
        $('<span></span>', {id: 'mealy_dialog_stateB', 'class': 'tranEnd'}).appendTo(dialogDiv);
        $('body').append(dialogDiv);

        dialogDiv.dialog({
            dialogClass: "no-close",
            autoOpen: false,
            title: 'Set transition character',
            height: 220,
            width: 350,
            modal: true,
            open: function () {
                dialogDiv.find('input')[0].focus().select();
            }
        });
    };

    let dialogSave = function (update) {
        let inputChar = $('#mealy_dialog_readCharTxt').val();
        let outputChar = $('#mealy_dialog_readOutputTxt').val();
        if (inputChar.length > 1) inputChar = inputChar[0];
        if (inputChar.length === 0 || outputChar.length === 0) {
            alert("Mealy state machine cannot have empty-string transition and/or no output.");
            return;
        }
        if (update) {
            let prev = dialogActiveConnection.getLabel().split(' / ');
            mealy.removeTransition(dialogActiveConnection.sourceId, prev[0], dialogActiveConnection.targetId);
            mealy.updateOutput(dialogActiveConnection.sourceId, prev[0], 0, true)
        } else if (mealy.hasTransition(dialogActiveConnection.sourceId, inputChar)) {
            alert(dialogActiveConnection.sourceId + " already has a transition for " + inputChar);
            return;
        }

        dialogActiveConnection.setLabel(inputChar + ' / ' + outputChar);
        mealy.addTransition(dialogActiveConnection.sourceId, inputChar, dialogActiveConnection.targetId);
        mealy.updateOutput(dialogActiveConnection.sourceId, inputChar, outputChar);
        dialogDiv.dialog("close");
    };

    let dialogCancel = function (update) {
        if (!update)
            fsm.removeConnection(dialogActiveConnection);
        dialogDiv.dialog("close");
    };

    let dialogDelete = function () {
        let inputChar = dialogActiveConnection.getLabel().split(' / ')[0];
        mealy.removeTransition(dialogActiveConnection.sourceId, inputChar, dialogActiveConnection.targetId);
        mealy.updateOutput(dialogActiveConnection.sourceId, inputChar, 0, true);
        fsm.removeConnection(dialogActiveConnection);
        dialogDiv.dialog("close");
    };

    let dialogClose = function () {
        dialogActiveConnection = null;
    }

    let updateUIForDebug = function () {
        let status = mealy.status();

        $('.current').removeClass('current');
        if (statusConnector) statusConnector.setPaintStyle(jsPlumb.Defaults.PaintStyle);

        $('#' + status.state).addClass('current');
        jsPlumb.select({source: status.state}).each(function (connection) {
            if (connection.getLabel() === status.nextChar) {
                statusConnector = connection;
                connection.setPaintStyle({strokeStyle: '#0a0'});
            }
        });
        return self;
    };

    return {
        init: function () {
            self = this;
            mealy = new Mealy();
            makeDialog();
            return self;
        },

        type: function () {
            return 'mealy';
        },

        setContainer: function (newContainer) {
            container = newContainer;
            return self;
        },

        reset: function () {
            mealy = new Mealy();
            return self;
        },

        fsm: function () {
            return mealy;
        },

        connectionAdded: function (info) {
            dialogActiveConnection = info.connection;
            $('#mealy_dialog_stateA').html(dialogActiveConnection.sourceId + '&nbsp;');
            $('#mealy_dialog_stateB').html('&nbsp;' + dialogActiveConnection.targetId);
            dialogDiv.dialog('option', 'buttons', {
                Cancel: function () {
                    dialogCancel(false);
                },
                Save: function () {
                    dialogSave(false);
                }
            }).dialog('open');
        },

        connectionClicked: function (connection) {
            dialogActiveConnection = connection;
            let cur = dialogActiveConnection.getLabel().split(' / ');
            $('#mealy_dialog_readCharTxt').val(cur[0]);
            $('#mealy_dialog_readOutputTxt').val(cur[1]);
            dialogDiv.dialog('option', 'buttons', {
                Cancel: function () {
                    dialogCancel(true);
                },
                Delete: dialogDelete,
                Save: function () {
                    dialogSave(true);
                }
            }).dialog("open");
        },

        updateUI: updateUIForDebug,

        debugStart: function () {
            return self;
        },

        debugStop: function () {
            $('.current').removeClass('current');
            return self;
        },

        getEmptyLabel: function () {
            return null;
        }

        // TODO: serialize and deserialize
    };
}()).init();
