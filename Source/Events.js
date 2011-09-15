
define([
	'Base/Core/Accessor',
	'Base/Utility/typeOf',
	'./Node',
	'Slick/Finder'
], function(Accessor, typeOf, Node, Slick){

// TODO: cpojer: make a nice DOMEvent (based on Class?)
var DOMEvent = function(event){
	this.event = event;
	this.capture = false;
	if (event){
		var type = this.type = event.type;

		var target = event.target || event.srcElement;
		while (target && target.nodeType == 3) target = target.parentNode;
		this.target = Node.select(target);

		if (type == 'mouseover' || type == 'mouseout'){
			var related = event.relatedTarget || event[(type == 'mouseover' ? 'from' : 'to') + 'Element'];
			while (related && related.nodeType == 3) related = related.parentNode;
			this.relatedTarget = Node.select(related);
		}
	}
};

DOMEvent.prototype.stop = function(){
	this.stopped = true;
	return this;
};

DOMEvent.prototype.prevent = function(){
	if (this.event.preventDefault) this.event.preventDefault();
	else this.event.returnValue = false;
	return this;
};

DOMEvent.prototype.kill = function(){
	return this.stop().prevent();
};

// Not rely directly on Slick?
var _match = Slick.match;

var root = document.body,
	rootParent = root.parentNode;

// feature detections
var hasEventListener = !!root.addEventListener,
	hasMousewheel = 'onmousewheel' in root;

// add / remove listeners
var addEventListener = hasEventListener ? function(element, type, fn, useCapture){
	element.addEventListener(type, fn, useCapture);
} : function(element, type, fn){
	element.attachEvent('on' + type, fn);
};

var removeEventListener = hasEventListener ? function(element, type, fn, useCapture){
	element.removeEventListener(type, fn, useCapture);
} : function(element, type, fn){
	element.detachEvent('on' + type, fn);
};

// fake bubbling
var bubble = function(fn, matcher, event){
	// getting the bubbling path
	var path = [];
	for (var target = event.target.valueOf(); target && target != rootParent; target = target.parentNode){
		var _target = Node.select(target);
		if (matcher(_target, event)) path.push(_target);
	}
	// using the path
	var capture = false, // make it an argument or something?
		l = path.length, i = 0;
	if (capture){
		_event.capture = true;
		for (i = l; i-- && !event.stopped;) fn.call(path[i], event);
	} else {
		for (; i < l && !event.stopped; i++) fn.call(path[i], event);
	}
};

/*
var events = {
	click: [{
		fns: [],		// the passed function
		matchers: [],	// the matcher function
		_matchers: [],	// the passed matcher (fn, element, node)
		listener: fn	// the one passed into addEventListener
	}]
}
*/
var events = {};

// find the matcher and/or function
var indexOf = function(event, matcher, fn){
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
};

var simpleSelectorMatch = /^(\.|#)?(\w+)$/i;

var add = function(type, matcher, fn){
	var _event = events[type];

	var custom = Events.lookupCustom(type);
	if (custom && custom.base) type = custom.base;

	if (_event){
		// prevent functions to be added twice
		var index = indexOf(_event, matcher, fn);
		if (index != -1) return this;
	} else {
		// first time for this type of event: so add a listener
		_event = events[type] = {matchers: [], _matchers: [], fns: []};
		var listener = _event.listener = function(event){
			var fns = _event.fns, matchers = _event.matchers;
			for (var i = 0, l = fns.length; i < l; i++) bubble(fns[i], matchers[i], new DOMEvent(event));
		};
		addEventListener(root, type, listener, !!(custom && custom.capture));
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
	} else if (typeOf(matcher) == 'element'){
		var _element = Node.select(matcher);
		matcher = function(element){
			return element == _element;
		};
	}

	if (custom && custom.condition){
		var __matcher = matcher;
		matcher = function(element, event){
			return __matcher(element) && custom.condition(element, event);
		}
	}

	if (custom && custom.onAdd) custom.onAdd();

	_event.matchers.push(matcher);
	_event._matchers.push(_matcher)
	_event.fns.push(fn);

	return this;
};

var remove = function(type, matcher, fn){
	var custom = Events.lookupCustom(type);
	if (custom && custom.base) type = custom.base;

	var _event = events[type];
	var i = _event ? indexOf(_event, matcher, fn) : -1;
	if (i != -1){

		if (custom && custom.onRemove) custom.onRemove();

		_event.matchers.splice(i, 1);
		_event._matchers.splice(i, 1);
		_event.fns.splice(i, 1);
	}
	if (!_event.fns.length){
		removeEventListener(root, type, _event.listener, !!(custom && custom.capture));
		delete events[type];
	}
	return this;
};

// Fire the element on a certain target
var fire = function(type, event, target){
	var _event = events[type];
	if (_event){
		var domevent = new DOMEvent();
		// maybe: if (!event) event = document.createEvent(...); stuff?
		if (event) for (var p in event) domevent[p] = event[p];
		domevent.target = Node.select(target || root);
		var fns = _event.fns, matchers = _event.matchers;
		for (var i = 0; i < fns.length; i++) bubble(fns[i], matchers[i], domevent);
	}
	return this;
};

var Events = {
	addEvent: add,
	removeEvent: remove,
	fireEvent: fire
};

// Custom Events and Fixes

var Custom = Accessor('Custom');
for (var p in Custom) Events[p] = Custom[p];

if (!hasMousewheel){
	// better check that DOMMouseScroll exists
	Events.defineCustom('mousewheel', {base: 'DOMMouseScroll'});
}

// mouseenter and mouseleave
// with delegation we always have to check and cannot use the IE mouseenter/mouseleave
var doc = Node.select(document); // no easy way to get the Node.Document isntance yet
var check = function(element, event){ // cpojer has a better way?
	var related = event.relatedTarget;
	if (related == null) return true;
	if (!related) return false;
	return (related != element && related.get('prefix') != 'xul' && element != doc && !element.contains(related));
};

Events.defineCustom('mouseenter', {
	base: 'mouseover',
	condition: check
}).defineCustom('mouseleave', {
	base: 'mouseout',
	condition: check
});

if (!hasEventListener){

	// Submit, reset, change and select delegation
	var _listenerstore = '_listenerstore';
	var customFormEvents = function(name){
		var focusin = function(event){
			var target = Node.select(new DOMEvent(event).target);
			if (name == 'submit' || name == 'reset') target = target.getParent('form');
			var listener = target && target.retrieve(_listenerstore);
			if (!listener && target){
				listener = function(event){
					fire(name, new DOMEvent(event), target);
				};
				addEventListener(target.valueOf(), name, listener);
				target.store(_listenerstore, listener);
			}
		};
		var events = 0;
		return {
			onAdd: function(){
				if (++events == 1) addEventListener(root, 'focusin', focusin);
			},
			onRemove: function(){
				if (--events == 0) removeEventListener(root, 'focusin', focusin);
			}
		}
	};

	var fixBubblingEvents = ['submit', 'reset', 'change', 'select'];
	for (var l = fixBubblingEvents.length; l--;) Events.defineCustom(fixBubblingEvents[l], customFormEvents(fixBubblingEvents[l]));

}

// Focus / blur delegation
Events.defineCustom('focus', {
	base: 'focus' + (hasEventListener ? '' : 'in'),
	capture: true
}).defineCustom('blur', {
	base: hasEventListener ? 'blur' : 'focusout',
	capture: true
});

return Events;

});
