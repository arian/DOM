
define([
	'Base/Accessor',
	'Base/Utility/Array',
	'Base/Utility/Object',
	'../Node',
], function(Accessor, Array, Object, Node){

var addEventListener = document.documentElement.addEventListener ? function(node, type, fn, useCapture){
	node.addEventListener(type, fn, useCapture);
} : function(node, type, fn){
	node.attachEvent('on' + type, fn);
};

var removeEventListener = document.documentElement.removeEventListener ? function(node, type, fn, useCapture){
	node.removeEventListener(type, fn, useCapture);
} : function(node, type, fn){
	node.detachEvent('on' + type, fn);
};


var captures = {focus: 1, blur: 1};

Node.implement({

	addListener: function(type, match, listener){

		if (!listener){
			listener = match;
			match = null;
		}

		var self = this;
		var node = this.node;

		var allListeners = this.retrieve('_events', {});

		var wrapper = Node.lookupEventWrapper(type);

		var listeners = allListeners[type] || (allListeners[type] = {
			listeners: [],
			wrapper: wrapper,
			listener: function(){
				var args = Array.slice(arguments);
				if (args[0] && listeners.wrapper) args[0] = new listeners.wrapper(args[0]);
				for (var i = 0; i < listeners.listeners.length; i++){
					var fn = listeners.listeners[i];
					fn && fn.apply(self, args);
				}
			}
		});

		if (listeners.listeners.length == 0){
			addEventListener(node, type, listeners.listener, !!captures[type]);
		}

		listeners.listeners.push(listener);

		return {
			remove: function(){
				Array.erase(listeners.listeners, listener);
				if (listeners.listeners.length == 0){
					removeEventListener(node, type, listeners.listener, !!captures[type]);
				}
				return this;
			},
			fire: function(){
				listener.call(self);
				return this;
			}
		};

	}

});

Object.append(Node, new Accessor('EventWrapper'));

return Node;

});
