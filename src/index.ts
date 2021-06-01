/**
 * Fast & lightweight Tree Router for Node & browser
 */

import { Node, ParamInterface } from "./node";
import { Options } from "./options";
import { RouteBuilder } from "./route-builder";

export default class GridfwRouter<Controller> extends RouteBuilder<Controller>{
	/** Tree route */
	readonly _root: Node<Controller>;

	/** Path & query params */
	_params: Map<string, ParamInterface>= new Map();

	constructor(options: Options){
		super(options);
		// Root Node
		this._root= this._rootNodes[0];
	}



	/** @private  */
}