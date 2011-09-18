
define(['./Node', './Events'], function(Node, Events){

var ready,
	loaded,
	checks = [],
	shouldPoll,
	timer,
	testElement = document.createElement('div'),
	select = Node.select,
	doc = select(document),
	win = select(window);

var domready = function(){
	clearTimeout(timer);
	if (ready) return;
	ready = true;
	doc.removeEventListener('DOMContentLoaded', domready).removeEventListener('readystatechange', check);

	doc.fireEvent('domready');
	win.fireEvent('domready');
};

var check = function(){
	for (var i = checks.length; i--;) if (checks[i]()){
		domready();
		return true;
	}
	return false;
};

var poll = function(){
	clearTimeout(timer);
	if (!check()) timer = setTimeout(poll, 10);
};

doc.addEventListener('DOMContentLoaded', domready);

/*<ltIE8>*/
// doScroll technique by Diego Perini http://javascript.nwbox.com/IEContentLoaded/
// testElement.doScroll() throws when the DOM is not ready, only in the top window
var doScrollWorks = function(){
	try {
		testElement.doScroll();
		return true;
	} catch (e){}
	return false;
};
// If doScroll works already, it can't be used to determine domready
//   e.g. in an iframe
if (testElement.doScroll && !doScrollWorks()){
	checks.push(doScrollWorks);
	shouldPoll = true;
}
/*</ltIE8>*/

if (document.readyState) checks.push(function(){
	var state = document.readyState;
	return (state == 'loaded' || state == 'complete');
});

if ('onreadystatechange' in document) doc.addEventListener('readystatechange', check);
else shouldPoll = true;

if (shouldPoll) poll();

Events.define({
	domready: {
		onAdd: function(element, fn){
			if (ready) fn.call(element);
		}
	},
	load: {
		// Make sure that domready fires before load
		base: 'load',
		onAdd: function(element, fn){
			if (loaded && element == window) fn.call(this);
		},
		condition: function(element){
			if (element == win){
				domready();
				Events.define('load', null);
			}
			return true;
		}
	}
});


// This is based on the custom load event
win.addEvent('load', function(){
	loaded = true;
});

});
