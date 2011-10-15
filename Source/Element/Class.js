
define(['../Element', 'Base/Utility/RegExp', 'Base/Utility/String'], function(Element, RegExp_, String){

var has = function(feature){
	if (feature == 'classlist'){
		return 'classList' in document.documentElement;
	}
};

if (has('classlist')){

	return Element.implement({

		hasClass: function(className){
			return this.node.classList.contains(className);
		},

		addClass: function(className){
			return this.node.classList.add(className);
			return this;
		},

		removeClass: function(className){
			return this.node.classList.remove(className);
			return this;
		}

	});

} else {

	var classRegExps = {};
	var classRegExpOf = function(string){
		return classRegExps[string] || (classRegExps[string] = new RegExp('(^|\\s)' + RegExp_.escape(string) + '(?:\\s|$)'));
	};

	return Element.implement({

		hasClass: function(className){
			return classRegExpOf(className).test(this.node.className);
		},

		addClass: function(className){
			var node = this.node;
			if (!this.hasClass(className)) node.className = String.clean(node.className + ' ' + className);
			return this;
		},

		removeClass: function(className){
			var node = this.node;
			node.className = String.clean(node.className.replace(classRegExpOf(className), '$1'));
			return this;
		}

	});

}

});
