
define(['DOM/Node'], function(Node){

	describe('Node.select', function(){

		it('should return a Node.Document instance for document', function(){
			expect(Node.select(document) instanceof Node.Document).toBe(true);
		});

		it('should return a Node.Window instance for window', function(){
			expect(Node.select(window) instanceof Node.Window).toBe(true);
		});

	});

});
