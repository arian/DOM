
define(['./Node'], function(Node){

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

return DOMEvent;

});
