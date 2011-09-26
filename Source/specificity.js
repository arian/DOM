
define(['Slick/Parser'], function(Slick){

return {

	// http://www.w3.org/TR/CSS2/cascade.html#specificity
	specificity: function(selector){
		var parsed = Slick.parse(selector);
		var expressions = parsed.expressions;
		var specificity = -1;
		for (var j = 0; j < expressions.length; j++){
			var b = 0, c = 0, d = 0, s = 0;
			for (var i = 0; i < expressions[j].length; i++){
				var expression = expressions[j][i];
				if (expression.id) b++;
				if (expression.attributes) c += expression.attributes.length;
				if (expression.tag && expression.tag != '*') d++;
				if (expression.pseudos) d += expression.pseudos.length;
			}
			s = b * 1e9 + c * 1e6 + d * 1e3;
			if (s > specificity) specificity = s;
		}
		return specificity;
	},

	sort: function(selectors){
		var specificities = {};
		for (var i = 0; i < selectors.length; i++){
			specificities[selectors[i]] = this.specificity(selectors[i]);
		}
		return selectors.sort(function(a, b){
			return specificities[a] - specificities[b];
		});
	},

	max: function(selectors){
		var max = '', specificity = -1;
		for (var i = 0; i < selectors.length; i++){
			var s = this.specificity(selectors[i]);
			if (s > specificity){
				specificity = s;
				max = selectors[i];
			}
		}
		return max;
	}

};

});
