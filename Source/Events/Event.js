
define(['Base/Class', 'Base/Accessor', 'Base/Utility/Object', './Events'], function(Class, Accessor, Object, Node){

var Event = new Class({

	initialize: function(event){
		this.event = event;
	},

	preventDefault: function(){
		if (this.event.preventDefault) this.event.preventDefault();
		else this.event.returnValue = false;
		return this;
	},

	stopPropagation: function(){
		if (this.event.stopPropagation) this.event.stopPropagation();
		else this.event.cancelBubble = true;
		return this;
	},

	get: function(key){
		var value = Event.loopupGetter(key);
		if (value == null) value = this.event[key];
		return value;
	}

});

Object.append(Event, new Accessor('Getter'));

var typesMutator = function(types){
	if (typeof types == 'string') Node.defineEventWrapper(types, this);
	else for (var i = 0; i < types.length; i++) Node.defineEventWrapper(types[i], this);
	return this;
};

Event.defineMutator('Types', typesMutator);
typesMutator.call(Event, ['click']);

return Event;

});
