
define([
	'Base/Core/Accessor',
	'Base/Utility/typeOf',
	'./Node',
	'./Event',
	'Slick/Finder'
], function(Accessor, typeOf, Node, DOMEvent, Slick){

// we need to find a way for this.
// need to find a definite format for this, maybe has('dev')
// http://requirejs.org/docs/optimization.html#hasjs
var has = function(feature){
	if (feature == 'dev') return true;
	return false;
};

// Not rely directly on Slick?
var _match = Slick.match,

	select = Node.select,
	html = document.documentElement, // real DOM elements
	_html = select(html), // wrapped element, prefixed with a _

	// feature detections
	hasEventListener = !!html.addEventListener,
	hasMousewheel = 'onmousewheel' in html,

	addEventListener = hasEventListener ? function(node, type, fn, useCapture){
		node.addEventListener(type, fn, !!useCapture);
	} : function(node, type, fn){
		node.attachEvent('on' + type, fn);
	},

	removeEventListener = hasEventListener ? function(node, type, fn, useCapture){
		node.removeEventListener(type, fn, useCapture);
	} : function(node, type, fn){
		node.detachEvent('on' + type, fn);
	},

	// find the matcher and/or function, O(n)?
	// we wouldn't need this if addEvent would return an object: {fire: fn, remove: fn}
	// then we don't have to add this indexOf() check in addEvent to prevent duplicates
	indexOf = function(event, matcher, fn){
		var fns = event.fns, matchers = event._matchers,
			i = 0, l = fns.length;
		if (matcher && fn) for (; i < l; i++){
			if (fn == fns[i] && matcher == matchers[i]) return i;
		} else if (matcher) for (; i < l; i++){
			if (matcher == matchers[i]) return i;
		} else if (fn) for (; i < l; i++){
			if (fn == fns[i]) return i;
		}
		return -1;
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
				_matchers: [],	// the passed matcher (fn, element, node)
				conditions: [], // conditions for firing the event
				listener: fn	// the one passed into addEventListener
			}],
			submit: [...]
		} */
		var events = this.retrieve('_events', {}),
			_event = events[type];

		if (!fn){
			fn = matcher;
			matcher = true;
		}

		if (has('dev')){
			if (typeof fn != 'function') throw new Error('The function argument must be a function');
		}

		var custom = Events.lookup(type);
		if (custom && custom.base) type = custom.base;

		if (_event){
			// prevent functions to be added twice
			var index = indexOf(_event, matcher, fn);
			if (index != -1) return this;
		} else {
			// first time for this type of event: so add a listener
			_event = events[type] = {matchers: [], _matchers: [], conditions: [], fns: []};
			var _self = this;
			var listener = _event.listener = function(event){
				_self.fireEvent(type, event);
			};
			this.addEventListener(type, listener, !!(custom && custom.capture));
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
			var _element = Node.select(matcher);
			matcher = function(element){
				return element == _element;
			};
		}

		if (custom && custom.onAdd) custom.onAdd(this, fn);

		_event.matchers.push(matcher);
		_event._matchers.push(_matcher)
		_event.conditions.push(custom && custom.condition);
		_event.fns.push(fn);

		return this;
	},

	removeEvent: function(type, matcher, fn){
		var events = this.retrieve('_events');
		if (!events) return this;

		var custom = Events.lookup(type);
		if (custom && custom.base) type = custom.base;

		var _event = events[type];

		if (!matcher && !fn){
			var fns = event.fns, matchers = event._matchers;
			for (i = 0, l = fns.length; i < l; i++) this.removeEvent(type, matchers[i], fns[i]);
			return this;
		}

		if (!fn){
			fn = matcher;
			matcher = true;
		}

		var i = _event ? indexOf(_event, matcher, fn) : -1;
		if (i != -1){

			if (custom && custom.onRemove) custom.onRemove(this, fn);

			_event.matchers.splice(i, 1);
			_event._matchers.splice(i, 1);
			_event.fns.splice(i, 1);
		}
		if (has('dev')){
			if (i == -1) throw new Error('The event was not registered before');
		}
		if (!_event.fns.length){
			this.removeEventListener(type, _event.listener, !!(custom && custom.capture));
			delete events[type];
		}
		return this;
	},

	fireEvent: function(type, domevent){
		// maybe: if (!event) event = document.createEvent(...); stuff?
		if (!(domevent instanceof DOMEvent)) domevent = new DOMEvent(domevent);
		var _target = domevent.target = (domevent.target || this),
			events = this.retrieve('_events'), _event = events && events[type],
			path;

		if (_event) for (var i = 0, l = _event.fns.length; i < l; i++){
			// all listeners added to this element
			var fn = _event.fns[i], matcher = _event.matchers[i], condition = _event.conditions[i];
			if (matcher === true){
				// traditional event
				if (!condition || condition(this, domevent)) fn.call(this, domevent);
			} else {
				// delegation: match elements between: _target -> _node
				if (!path){
					path = [];
					for (var node = _target.valueOf(); node; node = node.parentNode){
						var _node = select(node);
						path.push(_node);
						if (_node == this || _node == _html) break;
					}
				}
				for (var ii = 0, ll = path.length; ii < ll; ii++){
					if (matcher(path[ii], domevent) && (!condition || condition(path[ii], domevent))){
						fn.call(path[ii], domevent, this);
					}
				}
			}
		}
		return this;
	}

});

var Events = {

	addEvent: function(type, matcher, fn){
		return _html.addEvent(type, matcher, fn);
	},

	removeEvent: function(type, matcher, fn){
		return _html.removeEvent(type, matcher, fn);
	},

	fireEvent: function(type, event){
		return _html.fireEvent(type, event);
	}

};

// Custom Events and Fixes

var Custom = Accessor();
for (var p in Custom) Events[p] = Custom[p];

if (!hasMousewheel){
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

if (!hasEventListener){

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
		base: 'focus' + (hasEventListener ? '' : 'in'),
		capture: true
	},
	blur: {
		base: hasEventListener ? 'blur' : 'focusout',
		capture: true
	}
});

return Events;

});
