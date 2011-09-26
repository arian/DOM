
define(['DOM/specificity'], function(specificity){

	describe('specificity', function(){

		// see http://www.w3.org/TR/css3-selectors/#specificity
		var selectors = {
			'*': 0,                  /* a=0 b=0 c=0 -> specificity =   0 */
			'LI': 1,                 /* a=0 b=0 c=1 -> specificity =   1 */
			'li:first-line': 2,      /* a=0 b=0 c=2 -> specificity =   2 */
			'UL LI': 2,              /* a=0 b=0 c=2 -> specificity =   2 */
			'UL OL+LI': 3,           /* a=0 b=0 c=3 -> specificity =   3 */
			'H1 + *[REL=up]': 1001,  /* a=0 b=1 c=1 -> specificity =  11 */
			'UL OL LI.red': 1003,    /* a=0 b=1 c=3 -> specificity =  13 */
			'LI.red.level': 2001,    /* a=0 b=2 c=1 -> specificity =  21 */
			'#x34y': 1000000,        /* a=1 b=0 c=0 -> specificity = 100 */
			'#s12:not(FOO)': 1000001 /* a=1 b=0 c=1 -> specificity = 101 */
		};

		var selectorsArray = [];
		for (var selector in selectors) selectorsArray.push(selector);

		describe('specificity', function(){

			for (var selector in selectors){
				it('should calculate the specificity of "' + selector + '"', function(){
					expect(specificity.specificity(selector)).toEqual(selectors[selector]);
				});
			}

		});

		describe('sort', function(){
			it('should sort a array of selectors in the right order', function(){
				expect(specificity.sort(selectorsArray.reverse())).toEqual(selectorsArray);
			});
		});

		describe('max', function(){
			it('should get the most specific selector from an array', function(){
				expect(specificity.max(selectorsArray.reverse())).toEqual('#s12:not(FOO)');
			});
		});

	});

});


