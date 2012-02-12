
define(['./Node', 'Base/Utility/Array'], function(Node, Array){

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

		var listeners = allListeners[type] || (allListeners[type] = {
			listeners: [],
			listener: function(){
				for (var i = 0; i < listeners.listeners.length; i++){
					var fn = listeners.listeners[i];
					fn && fn.apply(self, arguments);
				}
			}
		});

		if (listeners.listeners.length == 0){
			addEventListener(node, type, listeners.listener, !!captures[type]);
		}

		listeners.listeners.push(fn);

		return {
			remove: function(){
				Array.erase(listeners.listeners, fn);
				if (listeners.listeners.length == 0){
					removeEventListener(node, type, listeners.listener, !!captures[type]);
				}
				return this;
			},
			fire: function(){
				fn.call(self);
				return this;
			}
		};

	}

});

return Node;

});
