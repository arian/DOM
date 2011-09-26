
define(['./Node', 'Slick/Finder', './specificity'], function(Node, Slick, specificity){

var wrappers = {}, matchers = [];

Node.defineMutator('Matches', function(match){
	matchers.push({
		match: match,
		construct: this,
		type: typeof match
	});
});

var select = function(node){
	if (node != null){
		if (typeof node == 'string') return select(Slick.find(document, node));
		if (node instanceof Node) return node;
		var uid = node.uniqueNumber || Slick.uidOf(node), wrapper = wrappers[uid];
		if (wrapper) return wrapper;
		var matchedSelectors = [], matchedConstructors = {};
		var matcher, type, match, construct;
		for (var l = matchers.length; l--;){
			matcher = matchers[l];
			type = matcher.type;
			match = matcher.match;
			construct = matcher.construct;
			var matched = type == 'string' ? Slick.match(node, match) : match(node);
			if (matched){
				if (type != 'string') return (wrappers[uid] = new construct(node));
				matchedConstructors[match] = construct;
				matchedSelectors.push(match);
			}
		}
		if (matchedSelectors.length){
			construct = matchedConstructors[specificity.max(matchedSelectors)];
			if (construct) return (wrappers[uid] = new construct(node));
		}
	}
	return null;
};

return select;

});
