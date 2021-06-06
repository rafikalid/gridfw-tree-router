import GridfwRouter from '../src'
import Assert from 'assert'
import { resolvePath } from '../src/node';

// Test 1
describe('Test routes', function(){
	var app= new GridfwRouter();
	it('Should add static routes', function(){
		app.get('/', function(req: any, res: any){ return 'Root controller' });
		app.get('/path', function(req: any, res: any){ return 2 });
		app.get('/path/to/hello', function(req: any, res: any){ return 3 });
	});

	it('Shood add params', function(){
		app.param('var1')
			.param('var2')
			.param('var3')
	});
	
	it('Should add dynamic routes', function(){
		app.get('/:var1', function(req: any, res: any){ return 'var1' });
		app.get('/:var2/var3/hello', function(req: any, res: any){ return 'var 2' });
		app.get('/test/:var1', function(req: any, res: any){ return 'var3' });
	});
	
	it('Should add wildcard routes', function(){
		app.get('/*var1', function(req: any, res: any){ return 'w1' });
		app.get('/test/*var2', function(req: any, res: any){ return 'w2' });
		app.get('/*', function(req: any, res: any){ return 'w3' });
	});

	it('should fail', function(){
		Assert.throws(()=>{
			app.get('/*var1/hello', function(){})
		})
	});

	 it('should resolve static paths', function(){
		var resp= resolvePath(app, 'GET', '/');
		console.log('---', resp);
		console.log('***', app._root);

		// print router tree
		console.log("[APP]\n", app.toString());
	 })
});