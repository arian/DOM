
define(['Slick/Parser'], function(Slick){

return {

	// http://www.w3.org/TR/CSS2/cascade.html#specificity
	// http://www.w3.org/TR/css3-selectors/#specificity
	specificity: function(selector){
		var parsed = Slick.parse(selector);
		var expressions = parsed.expressions;
		var specificity = -1;
		for (var j = 0; j < expressions.length; j++){
			var b = 0, c = 0, d = 0, s = 0, nots = [];
			for (var i = 0; i < expressions[j].length; i++){
				var expression = expressions[j][i], pseudos = expression.pseudos;
				if (expression.id) b++;
				if (expression.attributes) c += expression.attributes.length;
				if (expression.classes) c += expression.classes.length;
				if (expression.tag && expression.tag != '*') d++;
				if (pseudos){
					d += pseudos.length;
					for (var p = 0; p < pseudos.length; p++) if (pseudos[p].key == 'not'){
						nots.push(pseudos[p].value);
						d--;
					}
				}
			}
			s = b * 1e9 + c * 1e6 + d * 1e3;
			for (var ii = nots.length; ii--;) s += this.specificity(nots[ii]);
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
