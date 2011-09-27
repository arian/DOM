
define(['./Node', 'Slick/Finder', './specificity'], function(Node, Slick, specificity){

var wrappers = {}, matchers = [];

Node.defineMutator('Matches', function(match){
	matchers.push({
		match: match,
		construct: this,
		specificity: (typeof match == 'string') ? specificity.specificity(match) : -1
	});
});

var select = function(node){
	if (node == null) return null;
	if (typeof node == 'string') return select(Slick.find(document, node));
	if (node instanceof Node) return node;
	var uid = node.uniqueNumber || Slick.uidOf(node), wrapper = wrappers[uid];
	if (wrapper) return wrapper;
	var construct, specific = 0;
	for (var l = matchers.length; l--;){
		var match = matchers[l].match, s = matchers[l].specificity;
		var matched = s != -1 ? Slick.match(node, match) : match(node);
		if (matched && (s == -1 || s >= specific)){
			construct = matchers[l].construct;
			if (s == -1) break;
		}
	}
	if (construct) return (wrappers[uid] = new construct(node));
	return null;
};

return select;

});
