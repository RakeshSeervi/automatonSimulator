const moore_delegate = (function () {
    let self = null;
    let moore = null;
    let container = null;
    let dialogDiv = null;
    let dialogActiveConnection = null;

    let statusConnector = null;

    let makeDialog = function () {
        dialogDiv = $('<div></div>', {style: 'text-align:center;'});
        $('<div></div>', {style: 'font-size:small;'}).html('Empty transitions not allowed for moore state machine <br/>Read from Input').appendTo(dialogDiv);
        $('<span></span>', {id: 'moore_dialog_stateA', 'class': 'tranStart'}).appendTo(dialogDiv);
        $('<input/>', {
            id: 'moore_dialog_readCharTxt',
            type: 'text',
            maxLength: 1,
            style: 'width:30px; text-align:center;'
        })
            .val('0')
            .keypress(function (event) {
                if (event.which === $.ui.keyCode.ENTER) {
                    dialogDiv.parent().find('div.ui-dialog-buttonset button').eq(-1).click()
                }
            })
            .appendTo(dialogDiv);
        $('<span></span>', {id: 'moore_dialog_stateB', 'class': 'tranEnd'}).appendTo(dialogDiv);
        $('body').append(dialogDiv);

        dialogDiv.dialog({
            dialogClass: "no-close",
            autoOpen: false,
            title: 'Set transition character',
            height: 220,
            width: 350,
            modal: true,
            open: function () {
                dialogDiv.find('input').focus().select();
            }
        });
    };

    let dialogSave = function (update) {
        let inputChar = $('#moore_dialog_readCharTxt').val();
        if (inputChar.length > 1) inputChar = inputChar[0];
        if (inputChar.length === 0) {
            alert("Moore state machine cannot have empty-string transition.");
            return;
        }

        if (update) {
            moore.removeTransition(dialogActiveConnection.sourceId, dialogActiveConnection.getLabel(), dialogActiveConnection.targetId);
        } else if (moore.hasTransition(dialogActiveConnection.sourceId, inputChar)) {
            alert(dialogActiveConnection.sourceId + " already has a transition for " + inputChar);
            return;
        }

        dialogActiveConnection.setLabel(inputChar);
        moore.addTransition(dialogActiveConnection.sourceId, inputChar, dialogActiveConnection.targetId);
        dialogDiv.dialog("close");
    };

    let dialogCancel = function (update) {
        if (!update)
            fsm.removeConnection(dialogActiveConnection);
        dialogDiv.dialog("close");
    };

    let dialogDelete = function () {
        moore.removeTransition(dialogActiveConnection.sourceId, dialogActiveConnection.getLabel(), dialogActiveConnection.targetId);
        fsm.removeConnection(dialogActiveConnection);
        dialogDiv.dialog("close");
    };

    let dialogClose = function () {
        dialogActiveConnection = null;
    }

    let updateUIForDebug = function () {
        let status = moore.status();

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
            moore = new Moore();
            makeDialog();
            return self;
        },

        type: function () {
            return 'moore';
        },

        setContainer: function (newContainer) {
            container = newContainer;
            return self;
        },

        reset: function () {
            moore = new Moore();
            return self;
        },

        fsm: function () {
            return moore;
        },

        connectionAdded: function (info) {
            dialogActiveConnection = info.connection;
            $('#moore_dialog_stateA').html(dialogActiveConnection.sourceId + '&nbsp;');
            $('#moore_dialog_stateB').html('&nbsp;' + dialogActiveConnection.targetId);
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
            $('#moore_dialog_stateA').html(dialogActiveConnection.sourceId + '&nbsp;');
            $('#moore_dialog_stateB').html('&nbsp;' + dialogActiveConnection.targetId);
            $('#moore_dialog_readCharTxt').val(dialogActiveConnection.getLabel());
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
