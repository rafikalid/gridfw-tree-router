import {GridfwRouter} from ".";
import { addMethod, addWrapper, createRoute, Handler, Node, WrapperFx, mountSubRouter } from "./node";
import { DEFAULT_OPTIONS, Options } from "./options";


/** Abstract route builder */
export class RouteBuilder<Controller>{
	protected _rootNodes: Node<Controller>[];
	protected _self: GridfwRouter<Controller>;
	/** Constructor used only by GridfwRouter */
	constructor(options?: Partial<Options>);
	constructor(rootNodes: Node<Controller>[], rootRouter: GridfwRouter<Controller>)
	constructor(rootNodes?: any, rootRouter?: any){
		if(arguments.length===2){
			this._self= rootRouter;
			this._rootNodes= rootNodes;
		}
		else{
			if(!(this instanceof GridfwRouter))
				throw new Error('Illegal constructor');
			var options= Object.assign({}, DEFAULT_OPTIONS, rootNodes);
			this._self= this
			this._rootNodes= [new Node<Controller>(options, true)];
		}
	}

	/** GET HTTP Method */
	get(handler: Handler<Controller>):this;
	get(route: string | string[], handler: Handler<Controller>):this;
	get(route: any, handler?: any){
		if(arguments.length === 1)
			[route, handler]= ['/', route]
		addMethod(this._self, 'GET', this._rootNodes, route, handler);
		return this;
	}

	/** HEAD HTTP Method */
	head(handler: Handler<Controller>):this;
	head(route: string | string[], handler: Handler<Controller>):this;
	head(route: any, handler?: any){
		if(arguments.length === 1)
			[route, handler]= ['/', route]
		addMethod(this._self, 'HEAD', this._rootNodes, route, handler);
		return this;
	}

	/** POST HTTP Method */
	post(handler: Handler<Controller>):this;
	post(route: string | string[], handler: Handler<Controller>):this;
	post(route: any, handler?: any){
		if(arguments.length === 1)
			[route, handler]= ['/', route]
		addMethod(this._self, 'POST', this._rootNodes, route, handler);
		return this;
	}
	
	/** Add http method */
	method(methodName: string, handler: Handler<Controller>): this;
	method(methodName: string, route: string | string[], handler: Handler<Controller>): this;
	method(methodName: string, route: any, handler?: any){
		if(arguments.length === 2)
			[route, handler]= ['/', route];
		addMethod(this._self, methodName, this._rootNodes, route, handler);
		return this;
	}

	/** Wrap route */
	wrap(handler: WrapperFx):this;
	wrap(route: string | string[], handler: WrapperFx):this;
	wrap(route: any, handler?: any){
		if(arguments.length === 1)
			[route, handler]= ['/', route]
		addWrapper(this._self, this._rootNodes, route, handler);
		return this
	}

	/** Create subroute */
	route(route: string|string[]){
		var nodes= createRoute<Controller>(this._rootNodes, route);
		return new RouteBuilder(nodes, this._self);
	}

	/** Mount sub router */
	mount(route: string|string[], subRouter: GridfwRouter<Controller>){
		mountSubRouter(this._self, this._rootNodes, route, subRouter);
		return this;
	}
}
