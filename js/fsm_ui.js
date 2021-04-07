let fsm = (function () {
	let self = null;
	let delegate = null;
	let container = null;
	let stateCounter = 0;
	let saveLoadDialog = null;

	let localStorageAvailable = function () {
		return (typeof Storage !== "undefined" && typeof localStorage !== "undefined");
	};

	let refreshLocalStorageInfo = function () {
		if (localStorageAvailable()) {
			$('#storedMachines').empty();
			var keys = [];
			for (var i = 0; i < localStorage.length; ++i) {
				keys.push(localStorage.key(i));
			}
			keys.sort();
			$.each(keys, function (idx, key) {
				$('<li></li>', {'class': 'machineName'})
					.append($('<span></span>').html(key))
					.append('<div class="delete" style="display:none;" title="Delete"><img class="delete" src="images/empty.png" /></div>')
					.appendTo('#storedMachines');
			});
		}
	};

	let makeSaveLoadDialog = function () {
		saveLoadDialog = $('#saveLoadDialog');
		$('#saveLoadTabs').tabs();
		$('#saveLoadTabs textarea').height(275);
		if (!localStorageAvailable()) {
			$('#saveLoadTabs')
				.tabs('option', 'active', 1)
				.tabs('option', 'disabled', [0])
				.find('ul li').eq(0).attr('title', 'Browser Storage not supported in this browser');
		}
		saveLoadDialog.dialog({
			autoOpen: false,
			dialogClass: 'loadSave no-close',
			width: 500,
			height: 450,
			open: function() {
				// Focus on either the machineName entry box or the textarea depending on what panel is active
				saveLoadDialog.find("div.ui-tabs-panel:not(.ui-tabs-hide)").find('input, textarea').focus();
			}
		});

		// Event Handlers for the LocalStorage widget
		$('#machineName').focus(function() {if ($(this).val() === $(this).attr('title')) {$(this).val('');}})
			.blur(function() {if($(this).val() === '') {$(this).val($(this).attr('title'));}})
			.keyup(function(event) {
				if (event.which === $.ui.keyCode.ENTER) {
					saveLoadDialog.parent().find('.ui-dialog-buttonpane button').eq(-1).trigger('click');
			}});

		$('#storedMachines').on('mouseover', 'li.machineName', function (event) {
			$(this).find('div.delete').show();
		}).on('mouseout', 'li.machineName', function (event) {
			$(this).find('div.delete').hide();
		}).on('click', 'li.machineName div.delete', function (event) {
			event.stopPropagation();
			localStorage.removeItem($(this).closest('li.machineName').find('span').html());
			refreshLocalStorageInfo();
		}).on('click', 'li.machineName', function (event) { // select the machineName
			$('#machineName').val($(this).find('span').html()).focus();
		}).on('dblclick', 'li.machineName', function (event) {	// immediately load the machineName
			$('#machineName').val($(this).find('span').html());
			saveLoadDialog.parent().find('.ui-dialog-buttonpane button').eq(-1).trigger('click');
		});
	};

	let initJsPlumb = function () {
		jsPlumb.importDefaults({
			Anchors: ["Continuous", "Continuous"],
			ConnectorZIndex: 5,
			ConnectionsDetachable: false,
			Endpoint: ["Dot", {radius: 2}],
			HoverPaintStyle: {strokeStyle: "#d44", lineWidth: 2},
			ConnectionOverlays: [
				["Arrow", {
					location: 1,
					length: 14,
					foldback: 0.8
				}],
				["Label", {location: 0.5}]
			],
			Connector: ["StateMachine", {curviness: 20}],
			PaintStyle: {strokeStyle: '#0dd', lineWidth: 2}
		});

		jsPlumb.bind("click", connectionClicked);
	};

	let initStateEvents = function () {
		// Setup handling the 'delete' divs on states
		container.on('mouseover', 'div.state', function (event) {
			$(this).find('div.delete').show();
			$(this).find('div.plumbSource').css('display', 'inline-block');
		}).on('mouseout', 'div.state', function (event) {
			$(this).find('div.delete').hide();
			$(this).find('div.plumbSource').css('display', 'none');
		});
		container.on('click', 'img.delete', function (event) {
			self.removeState($(this).closest('div.state'));
		});
		container.on('click', 'div.stateName', function (event) {
			self.renameState($(this).closest('div.state'));
		});
		container.on('click', 'div.output', function (event) {
			self.switchOutput($(this).closest('div.state'));
		});
		// Setup handling for accept state changes
		// container.on('change', 'input[type="checkbox"].isAccept', function(event) {
		// 	var cBox = $(this);
		// 	var stateId = cBox.closest('div.state').attr('id');
		// 	if (cBox.prop('checked')) {
		// 		delegate.fsm().addAcceptState(stateId);
		// 	} else {
		// 		delegate.fsm().removeAcceptState(stateId);
		// 	}
		// });
	};

	let initFSMSelectors = function () {
		// Setup the Automaton type listeners:
		$('.delegate').on('click', function () {
			let newDelegate = null;
			switch ($(this).html()) {
				case 'Moore Machine':
					newDelegate = moore_delegate;
					break;
				case 'Mealy Machine':
					newDelegate = dfa_delegate;
					break;
			}
			if (newDelegate !== delegate) {
				self.setDelegate(newDelegate);
				$('button.delegate').prop('disabled', false);
				$(this).prop('disabled', true);
			}
		});

		self.setDelegate(moore_delegate);
		$('button.delegate:nth-child(1)').prop('disabled', true);
	};

	let loadSerializedFSM = function (serializedFSM) {
		var model = serializedFSM;
		if (typeof serializedFSM === 'string') {
			model = JSON.parse(serializedFSM);
		}

		// Load the delegate && reset everything
		self.reset();
		$('button.delegate').each(function () {
			if ($(this).html() === model.type) {
				$(this).click();
			}
		});

		// Load Bulk Tests
		$('#acceptStrings').val(model.bulkTests.accept);
		$('#rejectStrings').val(model.bulkTests.reject);

		// Create states
		$.each(model.states, function(stateId, data) {
			var state = null;
			if (stateId !== 'start') {
				state = makeState(stateId, data.displayId)
					.css('left', data.left + 'px')
					.css('top', data.top + 'px')
					.appendTo(container);
				jsPlumb.draggable(state, {containment: "parent"});
				makeStatePlumbing(state);
			} else {
				state = $('#start');
			}
			if (data.isAccept) {
				state.find('input.isAccept').prop('checked', true);
			}
		});

		// Create Transitions
		jsPlumb.unbind("jsPlumbConnection"); // unbind listener to prevent transition prompts
		$.each(model.transitions, function (index, transition) {
			jsPlumb.connect({source: transition.stateA, target: transition.stateB}).setLabel(transition.label);
		});
		jsPlumb.bind("jsPlumbConnection", delegate.connectionAdded);

		// Deserialize to the fsm
		delegate.deserialize(model);
	};

	let updateStatusUI = function (status) {
		$('#fsmDebugInputStatus span.consumedInput').html(status.input.substring(0, status.inputIndex));
		if (status.nextChar === '') {
			$('#fsmDebugInputStatus span.currentInput').html(delegate.getEmptyLabel());
			$('#fsmDebugInputStatus span.futureInput').html(status.input.substring(status.inputIndex));
		} else if (status.nextChar === null) {
			$('#fsmDebugInputStatus span.currentInput').html('[End of Input]');
			$('#fsmDebugInputStatus span.futureInput').html('');
		} else {
			$('#fsmDebugInputStatus span.currentInput').html(status.input.substr(status.inputIndex, 1));
			$('#fsmDebugInputStatus span.futureInput').html(status.input.substring(status.inputIndex + 1));
		}

	};

	let connectionClicked = function (connection) {
		delegate.connectionClicked(connection);
	};

	let checkHashForModel = function () {
		let hash = window.location.hash;
		hash = hash.replace('#', '');
		hash = decodeURIComponent(hash);
		if (hash) {
			loadSerializedFSM(hash);
		}
	};

	let domReadyInit = function () {
		self.setGraphContainer($('#machineGraph'));

		$(window).resize(function () {
			container.height($(window).height() - $('#mainHolder h1').outerHeight() - $('#footer').outerHeight() - $('#bulkResultHeader').outerHeight() - $('#resultConsole').outerHeight() - 30 + 'px');
			jsPlumb.repaintEverything();
		});
		$(window).resize();

		// Setup handling 'enter' in test string box
		$('#testString').keyup(function (event) {
			if (event.which === $.ui.keyCode.ENTER) {
				$('#testBtn').trigger('click');
			}
		});

		container.dblclick(function (event) {
			self.addState({top: event.offsetY, left: event.offsetX});
		});

		initJsPlumb();
		initStateEvents();
		initFSMSelectors();
		makeSaveLoadDialog();

		// TODO
		let exampleBox = $('#examples').on('change', function () {
			if ($(this).val() !== '') {
				loadSerializedFSM(fsm_examples[$(this).val()]);
				$(this).val('');
			}
		});
		$.each(fsm_examples, function (key, serializedFSM) {
			$('<option></option>', {value: key}).html(key).appendTo(exampleBox);
		});

		checkHashForModel();
	};

	let makeStartState = function () {
		let startState = makeState('start');
		startState.find('div.delete').remove(); // Can't delete start state
		container.append($('<div></div>'));
		container.append(startState);
		makeStatePlumbing(startState);
	};

	/**
	 * Create a new state.
	 * @param {string} stateId Internal ID of the new state.
	 * @param {string} [displayId] Displayed ID of the state, by default the internal ID.
	 */
	let makeState = function (stateId, displayId) {
		displayId = displayId || stateId;
		delegate.fsm().updateOutput(stateId, 0);
		return $('<div id="' + stateId + '" class="state" data-displayid="' + displayId + '" data-output="0"></div>')
			.append('<div class="stateData"> <div class="stateName">' + displayId + '</div> <hr> <div class="output">0</div> </div>')
			.append('<div class="plumbSource" title="Drag from here to create new transition" id="jsPlumb_1_3">&nbsp;</div>')
			.append('<div class="delete" style="display:none;"><img class="delete" src="images/empty.png" title="Delete"/></div>');
	};

	let makeStatePlumbing = function (state) {
		let source = state.find('.plumbSource');
		jsPlumb.makeSource(source, {
			parent: state,
			maxConnections: 10,
			onMaxConnections: function (info, e) {
				alert("Maximum connections (" + info.maxConnections + ") reached");
			},
		});

		jsPlumb.makeTarget(state, {
			dropOptions: {hoverClass: 'dragHover'}
		});
		return state;
	};

	return {
		init: function() {
			self = this;
			$(domReadyInit);
			return self;
		},

		setDelegate: function(newDelegate) {
			delegate = newDelegate;
			delegate.setContainer(container);
			delegate.reset().fsm().setStartState('start');
			jsPlumb.unbind("jsPlumbConnection");
			jsPlumb.reset();
			container.empty();
			initJsPlumb();
			jsPlumb.bind("jsPlumbConnection", delegate.connectionAdded);
			stateCounter = 0;
			makeStartState();
			return self;
		},

		setGraphContainer: function(newContainer) {
			container = newContainer;
			jsPlumb.Defaults.Container = container;
			return self;
		},

		addState: function(location) {
			while ($('#s' + stateCounter).length > 0) {
				++stateCounter;
			} // Prevent duplicate states after loading
			let state = makeState('s' + stateCounter);
			if (location && location.left && location.top) {
				state.css('left', location.left + 'px')
					.css('top', location.top + 'px');
			}
			container.append(state);
			jsPlumb.draggable(state, {containment: "parent"});
			makeStatePlumbing(state);
			// Do nothing to model
			return self;
		},

		/**
		 * Change the displayed name of a state. The start state cannot
		 * be renamed, it’s a no-op if the given state is the start state.
		 * @param {jQuery} state The state to rename.
		 */
		renameState: function (state) {
			if (state.attr('id') !== 'start') {
				let newname = window.prompt('New name', state.data('displayid'));
				if (newname) {
					state.data('displayid', newname);
					state.find('.stateName').text(newname);
				}
			}
		},

		switchOutput: function (state) {
			let out = parseInt(state.data('output')) ^ 1;
			delegate.fsm().updateOutput(state.attr('id'), out);
			state.data('output', out);
			state.find('.output').text(state.data('output'));
		},

		removeState: function (state) {
			let stateId = state.attr('id');
			delegate.fsm().updateOutput(stateId, 0, true);
			jsPlumb.select({source: stateId}).detach(); // Remove all connections from UI
			jsPlumb.select({target: stateId}).detach();
			state.remove(); // Remove state from UI
			delegate.fsm().removeTransitions(stateId); // Remove all transitions from model touching this state
			// delegate.fsm().removeAcceptState(stateId); // Assure no trace is left
			return self;
		},

		removeConnection: function (connection) {
			jsPlumb.detach(connection);
		},

		test: function(input) {
			if ($.type(input) === 'string') {
				$('#testResult').html('Testing...')
				let output = delegate.fsm().run(input);
				$('#testResult').html('Output: ' + output).effect('highlight', {color: output !== 'Invalid input' ? '#bfb' : '#fbb'}, 1000);
			} else {
				$('#resultConsole').empty();
				let makePendingEntry = function (input) {
					return $('<div></div>', {
						'class': 'pending',
						title: 'Pending'
					}).append((input === '' ? '[Empty String]' : input)).appendTo('#resultConsole');
				};
				let updateEntry = function (result, entry) {
					entry.removeClass('pending').addClass(result).attr('title', result).append(' -- ' + result);
				};
				$.each(input, function (index, string) {
					updateEntry((delegate.fsm().run(string)), makePendingEntry(string));
				});
				// $.each(input.reject, function(index, string) {
				// 	updateEntry((delegate.fsm().run(string) ? 'Fail' : 'Pass'), makePendingEntry(string, 'Reject'));
				// });
				$('#bulkResultHeader').effect('highlight', {color: '#add'}, 1000);
			}
			return self;
		},

		debug: function(input) {
			if ($('#stopBtn').prop('disabled')) {
				$('#testResult').html('&nbsp;');
				$('#stopBtn').prop('disabled', false);
				$('#loadBtn, #testBtn, #bulkTestBtn, #testString, #resetBtn').prop('disabled', true);
				$('button.delegate').prop('disabled', true);
				$('#fsmDebugInputStatus').show();
				delegate.debugStart();
				delegate.fsm().stepInit(input);
			} else {
				delegate.fsm().step();
			}
			let status = delegate.fsm().status();
			updateStatusUI(status);
			delegate.updateUI();
			if (status.status !== 'Active') {
				$('#testResult').html('Output: ' + (status.status === 'Completed' ? delegate.fsm().getOutput(status.state) : 'Invalid input')).effect('highlight', {color: status.status === 'Completed' ? '#bfb' : '#fbb'}, 1000);
				$('#debugBtn').prop('disabled', true);
			}
			return self;
		},

		debugStop: function() {
			$('#fsmDebugInputStatus').hide();
			$('#stopBtn').prop('disabled', true);
			$('#loadBtn, #testBtn, #bulkTestBtn, #debugBtn, #testString, #resetBtn').prop('disabled', false);
			$('button.delegate').prop('disabled', false).each(function() {
				switch ($(this).html()) {
					case 'DFA': if (delegate === dfa_delegate) {$(this).prop('disabled', true);} break;
					case 'NFA': if (delegate === nfa_delegate) {$(this).prop('disabled', true);} break;
					case 'PDA': if (delegate === pda_delegate) {$(this).prop('disabled', true);} break;
				}
			});
			delegate.debugStop();
			return self;
		},

		reset: function() {
			self.setDelegate(delegate);
			$('#testString').val('');
			$('#testResult').html('&nbsp;');
			$('#acceptStrings').val('');
			$('#rejectStrings').val('');
			$('#resultConsole').empty();
			return self;
		},

		load: function() {
			var finishLoading = function() {
				var serializedModel = null;
				if ($('#saveLoadTabs').tabs('option', 'active') === 0) {
					var storageKey = $('#machineName').val();
					if (localStorageAvailable()) {
						serializedModel = localStorage.getItem(storageKey);
						if (!serializedModel) {
							alert('Failed to Retrieve Machine with Name "'+storageKey+'"');
							return false;
						}
					} else {
						alert("Can't load machine from Browser Storage, this browser doesn't support it.");
						return false;
					}
				} else {
					serializedModel = saveLoadDialog.find('textarea').val();
				}
				loadSerializedFSM(serializedModel);
				return true;
			};

			saveLoadDialog.dialog('option', {
				title: 'Load Automaton',
				buttons: {
					Cancel: function(){saveLoadDialog.dialog('close');},
					Load: function(){if (finishLoading()) {saveLoadDialog.dialog('close');}}
				}
			});
			$('#saveLoadTabs').off('tabsactivate');

			refreshLocalStorageInfo();
			$('#plaintext textarea').empty();
			saveLoadDialog.dialog('open');
		},

		save: function() {
			var model = delegate.serialize();
			container.find('div.state').each(function() {
				var id = $(this).attr('id');
				if (id !== 'start') {
					$.extend(model.states[id], $(this).position());
					$.extend(model.states[id], {displayId: $(this).data('displayid')});
				}
			});
			model.bulkTests = {
				accept: $('#acceptStrings').val(),
				reject: $('#rejectStrings').val()
			};
			var serializedModel = JSON.stringify(model);

			var finishSaving = function() {
				var storageKey = $('#machineName').val();
				if (!storageKey) {alert("Please Provide a Name"); return false;}
				if (localStorageAvailable()) {
					localStorage.setItem(storageKey, serializedModel);
				} else {
					alert("Can't save machine to Browser Storage, this browser doesn't support it.");
					return false;
				}
				return true;
			};

			var buttonUpdater = function(event, ui) {
				if (ui.newPanel.attr('id') === 'browserStorage') {
					saveLoadDialog.dialog('option', 'buttons', {
						Cancel: function(){saveLoadDialog.dialog('close');},
						Save: function(){if (finishSaving()) {saveLoadDialog.dialog('close');}}
					});
				} else if (ui.newPanel.attr('id') === 'plaintext' || ui.newPanel.attr('id') === 'shareableURL') {
					ui.newPanel.find('textarea').select();
					saveLoadDialog.dialog('option', 'buttons', {
						Copy: function(){ui.newPanel.find('textarea').select();document.execCommand('copy')},
						Close: function(){saveLoadDialog.dialog('close');}
					});
				}
			};

			saveLoadDialog.dialog('option', 'title', 'Save Automaton');
			$('#saveLoadTabs').on('tabsactivate', buttonUpdater);
			buttonUpdater(null, {newPanel: $('#saveLoadTabs div').eq($('#saveLoadTabs').tabs('option', 'active'))});

			refreshLocalStorageInfo();
			$('#plaintext textarea').val(serializedModel);
			$('#shareableURL textarea').val(window.location.href.split("#")[0] + '#' + encodeURIComponent(serializedModel));
			saveLoadDialog.dialog('open');
		}
	};
})().init();
