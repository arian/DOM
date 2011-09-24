
define([
	'Base/Core/Accessor',
	'Base/Utility/typeOf',
	'./Node',
	'./Event',
	'Slick/Finder'
], function(Accessor, typeOf, Node, DOMEvent, Slick){

var html = document.documentElement, // real DOM elements
	_html = Node.select(html), // wrapped element, prefixed with a _

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

	// Mediator mediates Listeners for one Element and Event type.
	Mediator = function(element, type){
		var listeners = [],
			custom = Events.lookup(type),
			condition = custom && custom.condition;
			capture = custom && custom.capture,
			mediator = this;

		this.length = 0;
		this.custom = custom;
		this.element = element;

		var fire = this.fire = function(event, index){
			// maybe: if (!event) event = document.createEvent(...); stuff?
			if (!(event instanceof DOMEvent)) event = new DOMEvent(event);
			var _target = event.target = (event.target || element),
				path, i = 0, l = listeners.length;
			// index, if only one listener should be fired.
			if (index != null){
				i = index;
				l = i + 1;
			}
			// a fix when the listeners was removed within the called function
			// this defers the removal after the firing of events
			var remove = mediator.remove, removed = [];
			mediator.remove = function(index){
				removed.push(index);
			};
			for (; i < l; i++){
				// all listeners added to this element
				var fn = listeners[i].fn, matcher = listeners[i].matcher;
				if (matcher === true){
					// traditional event
					if (!condition || condition(element, event)) fn.call(element, event);
				} else {
					// delegation: match elements between: _target -> element
					if (!path){
						path = [];
						for (var node = _target.valueOf(); node; node = node.parentNode){
							var _node = Node.select(node);
							path.push(_node);
							if (_node == element || _node == _html) break;
						}
					}
					for (var ii = 0, ll = path.length; ii < ll; ii++){
						if (matcher(path[ii], event) && (!condition || condition(path[ii], event))){
							fn.call(path[ii], event, element);
						}
					}
				}
			}
			for (var j = removed.length; j--;) remove.call(mediator, removed[j]);
			mediator.remove = remove;
		};

		if (custom && custom.base) type = custom.base

		this.add = function(listener){
			listeners.push(listener);
			if (this.length == 0) element.addEventListener(type, fire, capture);
			return ++this.length;
		};

		this.remove = function(index){
			listeners = listeners.splice(index, 1);
			if (!this.length--) element.removeEventListener(type, fire, capture);
		};
	},

	mediatorsOf = function(element){
		return element.retrieve('_mediators', {});
	},

	simpleSelectorMatch = /^(\.|#)?(\w+)$/i,
	// Should rely on API, not implementation (Slick)
	_match = Slick.match,

	// supported matchers: selector string, (wrapped) node or (native) element
	normalizeMatcher = function(matcher){
		var type = typeof matcher;
		if (type == 'function' || type == 'boolean'){
			return matcher;
		}
		if (type == 'string'){
			// Some matcher optimalization for simple selectors (tagname, class, id)
			var selectorMatch = matcher.match(simpleSelectorMatch);
			if (selectorMatch){
				if (!selectorMatch[1]){
					var tag = selectorMatch[2].toLowerCase();
					return function(element){
						return element.get('tag') == tag;
					};
				}
				if (selectorMatch[1] == '.'){
					var className = selectorMatch[2];
					return function(element){
						return element.hasClass(className);
					};
				}
				if (selectorMatch[1] == '#'){
					var id = selectorMatch[2];
					return function(element){
						return element.get('id') == id;
					};
				}
			}
			// more complex selectors
			return function(element){
				_match(element, matcher);
			};
		}
		if (matcher instanceof Node){
			return function(element){
				return element == matcher;
			};
		}
		if (matcher instanceof Node.Elements){
			return function(element){
				return matcher.contains(element);
			};
		}
		if (typeOf(matcher) == 'element'){
			var _element = Node.select(matcher);
			return function(element){
				return element == _element;
			};
		}
		if (has('dev')){
			throw new Error('The given matcher is not valid. It should be a function, element or CSS selector');
		}
	},

	Listener = function(mediator, matcher, fn){
		if (!fn){
			fn = matcher;
			matcher = true;
		}
		if (has('dev')){
			if (typeof fn != 'function') throw new Error('The function argument must be a function');
		}
		matcher = normalizeMatcher(matcher);

		this.mediator = mediator;
		this.matcher = matcher;
		this.fn = fn;

		var custom = mediator.custom,
			index;

		this.add = function(){
			if (index != null){
				if (has('dev')) throw new Error('The listeners is already listening');
				return this;
			}
			index = mediator.add(this);
			if (custom && custom.onAdd) custom.onAdd(this);
			return this;
		};

		this.remove = function(){
			if (index == null){
				if (has('dev')) throw new Error('The listener is not listening yet');
				return this;
			}
			mediator.remove(index);
			index = null;
			if (custom && custom.onRemove) custom.onRemove(this);
			return this;
		};

		this.fire = function(event){
			if (index != null) mediator.fire(event, index);
			return this;
		};
	};

// Examples what you could do with listeners and why it's cool
Listener.prototype.once = function(){
	var fn = this.fn, listener = this;
	this.fn = function(){
		listener.remove();
		fn.apply(this, arguments);
	};
	return this.add();
};

Listener.prototype.throttle = function(value){
	var fn = this.fn, throttled;
	if (!value) value = 250;
	this.fn = function(){
		if (!throttled){
			fn.apply(this, arguments);
			throttled = setTimeout(function(){
				throttled = null;
			}, value);
		}
	};
	return this;
};

Node.implement({

	addEventListener: function(type, fn, useCapture){
		addEventListener(this.node, type, fn, useCapture);
		return this;
	},

	removeEventListener: function(type, fn, useCapture){
		removeEventListener(this.node, type, fn, useCapture);
		return this;
	},

	createListener: function(type, matcher, fn){
		var mediators = mediatorsOf(this), mediator = mediators[type];
		if (!mediator) mediator = mediators[type] = new Mediator(this, type);
		return new Listener(mediator, matcher, fn);
	},

	addListener: function(type, matcher, fn){
		return this.createListener(type, matcher, fn).add();
	},

	// probably shouldn't really be used I think
	removeListeners: function(type){
		var mediator = mediatorsOf(this)[type];
		if (mediator) for (var i = 0; i < mediator.length; i++) mediator.remove(i);
		return this;
	},

	fireEvent: function(type, event){
		var mediator = mediatorsOf(this)[type];
		if (mediator) mediator.fire(event);
		return this;
	}

});

var Events = {

	create: function(type, matcher, fn){
		return _html.createListener(type, matcher, fn);
	},

	add: function(type, matcher, fn){
		return this.create(type, matcher, fn).add();
	},

	once: function(type, matcher, fn){
		return this.create(type, matcher, fn).once();
	},

	fire: function(type, event){
		return _html.fireEvent(type, event);
	},

	// make public, might be useful to add some methods 'n jazz
	Listener: Listener

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
var doc = Node.select(document); // no easy way to get the Node.Document isntance yet
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
			var target = Node.select(new DOMEvent(event).target);
			if (name == 'submit' || name == 'reset') target = target.getParent('form');
			var listener = target && target.retrieve(_listenerstore);
			if (!listener && target){
				listener = function(event){
					Node.select(target).fireEvent(name, event);
				};
				addEventListener(target.valueOf(), name, listener);
				target.store(_listenerstore, listener);
			}
		};
		var listeners = 0;
		return {
			onAdd: function(){
				if (++listeners == 1) addEventListener(html, 'focusin', focusin);
			},
			onRemove: function(){
				if (--listeners == 0) removeEventListener(html, 'focusin', focusin);
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
