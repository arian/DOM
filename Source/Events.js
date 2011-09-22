
define([
	'Base/Core/Accessor',
	'Base/Utility/typeOf',
	'./Node',
	'./Event',
	'Slick/Finder'
], function(Accessor, typeOf, Node, DOMEvent, Slick){

// Not rely directly on Slick?
var _match = Slick.match,

	select = Node.select,
	html = document.documentElement, // real DOM elements
	_html = select(html), // wrapped element, prefixed with a _

	hasEventListener = !!html.addEventListener,
	hasMousewheel = 'onmousewheel' in html,

	// we need to find a way for this.
	// need to find a definite format for this, maybe has('dev')
	// http://requirejs.org/docs/optimization.html#hasjs
	has = function(feature){
		switch (feature){
			case 'dev': return true;
			case 'eventlistener': return hasEventListener;
			case 'mousewheel': return hasMousewheel;
		}
		return false;
	},

	addEventListener = has('eventlistener') ? function(node, type, fn, useCapture){
		node.addEventListener(type, fn, !!useCapture);
	} : function(node, type, fn){
		node.attachEvent('on' + type, fn);
	},

	removeEventListener = has('eventlistener') ? function(node, type, fn, useCapture){
		node.removeEventListener(type, fn, !!useCapture);
	} : function(node, type, fn){
		node.detachEvent('on' + type, fn);
	},

	simpleSelectorMatch = /^(\.|#)?(\w+)$/i;

Node.implement({

	addEventListener: function(type, fn, useCapture){
		addEventListener(this.node, type, fn, useCapture);
		return this;
	},

	removeEventListener: function(type, fn, useCapture){
		removeEventListener(this.node, type, fn, useCapture);
		return this;
	},

	addEvent: function(type, matcher, fn){
		/* {
			click: [{
				fns: [],		// the passed function
				matchers: [],	// the matcher function
				conditions: [], // conditions for firing the event
				fire: fn		// the one passed into addEventListener wich fires the events
			}, {...}],
			submit: [...]
		} */
		var events = this.retrieve('_events', {}),
			_event = events[type],
			_self = this;

		if (!fn){
			fn = matcher;
			matcher = true;
		}

		if (has('dev')){
			if (typeof fn != 'function') throw new Error('The function argument must be a function');
		}

		var custom = Events.lookup(type);
		if (custom && custom.base) type = custom.base;

		if (!_event){
			// first time for this type of event: so add a listener
			_event = events[type] = {matchers: [], conditions: [], fns: [], removes: []};
			var fire = _event.fire = function(event){
				// maybe: if (!event) event = document.createEvent(...); stuff?
				if (!(event instanceof DOMEvent)) event = new DOMEvent(event);
				var _target = event.target = (event.target || _self), path;

				for (var i = 0, l = _event.fns.length; i < l; i++){
					// all listeners added to this element
					var fn = _event.fns[i], matcher = _event.matchers[i], condition = _event.conditions[i];
					if (matcher === true){
						// traditional event
						if (!condition || condition(_self, event)) fn.call(_self, event);
					} else {
						// delegation: match elements between: _target -> _node
						if (!path){
							path = [];
							for (var node = _target.valueOf(); node; node = node.parentNode){
								var _node = select(node);
								path.push(_node);
								if (_node == _self || _node == _html) break;
							}
						}
						for (var ii = 0, ll = path.length; ii < ll; ii++){
							if (matcher(path[ii], event) && (!condition || condition(path[ii], event))){
								fn.call(path[ii], event, _self);
							}
						}
					}
				}
				return this;
			};
			this.addEventListener(type, fire, custom && custom.capture);
		}

		// supported matchers: selector string, (wrapped) node or (native) element
		var _matcher = matcher;
		if (typeof matcher == 'string'){
			// Some matcher optimalization for simple selectors (tagname, class, id)
			var selectorMatch = matcher.match(simpleSelectorMatch);
			if (selectorMatch){
				if (!selectorMatch[1]){
					var tag = selectorMatch[2].toLowerCase();
					matcher = function(element){
						return element.get('tag') == tag;
					};
				} else if (selectorMatch[1] == '.'){
					var className = selectorMatch[2];
					matcher = function(element){
						return element.hasClass(className);
					};
				} else if (selectorMatch[1] == '#'){
					var id = selectorMatch[2];
					matcher = function(element){
						return element.get('id') == id;
					};
				}
			} else {
				// more complex selectors
				matcher = function(element){
					_match(element, _matcher);
				};
			}
		} else if (matcher instanceof Node){
			matcher = function(element){
				return element == _matcher;
			};
		} else if (matcher instanceof Node.Elements){
			matcher = function(element){
				return _matcher.contains(element);
			};
		} else if (typeOf(matcher) == 'element'){
			var _element = select(matcher);
			matcher = function(element){
				return element == _element;
			};
		}

		if (custom && custom.onAdd) custom.onAdd(this, fn);

		var index = _event.matchers.push(matcher) - 1;
		_event.conditions.push(custom && custom.condition);
		_event.fns.push(fn);

		var remove = function(){
			if (custom && custom.onRemove) custom.onRemove(_self, fn);

			_event.matchers.splice(index, 1);
			_event.conditions.splice(index, 1);
			_event.fns.splice(index, 1);

			if (!_event.fns.length){
				_self.removeEventListener(type, _event.fire, custom && custom.capture);
				delete events[type];
			}

			return this;
		};

		_event.removes.push(remove);

		return {
			remove: remove,
			fire: _event.fire
		};
	},

	removeEvent: function(type){
		var events = this.retrieve('_events'), _event = events && events[type];
		if (_event) for (var l = _event.removes.length; l--;){
			_event.removes[l]();
		}
		return this;
	},

	fireEvent: function(type, event){
		var events = this.retrieve('_events'), _event = events && events[type];
		if (_event) _event.fire(event);
		return this;
	}

});

var Events = {

	addEvent: function(type, matcher, fn){
		return _html.addEvent(type, matcher, fn);
	},

	fireEvent: function(type, event){
		return _html.fireEvent(type, event);
	}

};

// Custom Events and Fixes

var Custom = Accessor();
for (var p in Custom) Events[p] = Custom[p];

if (!has('mousewheel')){
	// better check that DOMMouseScroll exists
	Events.define('mousewheel', {base: 'DOMMouseScroll'});
}

// mouseenter and mouseleave
// with delegation we always have to check and cannot use the IE mouseenter/mouseleave
var doc = select(document); // no easy way to get the Node.Document isntance yet
var check = function(element, event){ // cpojer has a better way?
	var related = event.relatedTarget;
	if (related == null) return true;
	if (!related) return false;
	return (related != element && related.get('prefix') != 'xul' && element != doc && !element.contains(related));
};

Events.defines({
	mouseenter: {
		base: 'mouseover',
		condition: check
	},
	mouseleave: {
		base: 'mouseout',
		condition: check
	}
});

if (!has('eventlistener')){

	// Submit, reset, change and select delegation
	var _listenerstore = '_listenerstore';
	var customFormEvents = function(name){
		var focusin = function(event){
			var target = select(new DOMEvent(event).target);
			if (name == 'submit' || name == 'reset') target = target.getParent('form');
			var listener = target && target.retrieve(_listenerstore);
			if (!listener && target){
				listener = function(event){
					select(target).fireEvent(name, event);
				};
				addEventListener(target.valueOf(), name, listener);
				target.store(_listenerstore, listener);
			}
		};
		var events = 0;
		return {
			onAdd: function(){
				if (++events == 1) addEventListener(html, 'focusin', focusin);
			},
			onRemove: function(){
				if (--events == 0) removeEventListener(html, 'focusin', focusin);
			}
		}
	};

	// todo: implement the onchange fix by csuwldcat
	var fixBubblingEvents = ['submit', 'reset', 'change', 'select'];
	for (var l = fixBubblingEvents.length; l--;) Events.define(fixBubblingEvents[l], customFormEvents(fixBubblingEvents[l]));

}

// Focus / blur delegation
Events.defines({
	focus: {
		base: 'focus' + (has('eventlistener') ? '' : 'in'),
		capture: true
	},
	blur: {
		base: has('eventlistener') ? 'blur' : 'focusout',
		capture: true
	}
});

return Events;

});
