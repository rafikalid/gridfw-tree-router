/**
 * Fast & lightweight Tree Router for Node & browser
 */

import { DynamicParamInterface, Node, ParamInterface, StaticParamInterface } from "./node";
import { Options } from "./options";
import { RouteBuilder } from "./route-builder";

/** Param Type */
export enum paramType{
	/** Path param */
	PATH_PARAM,
	/** Wildcard param */
	WILD_CARD_PARAM,
	/** Query param */
	QUERY_PARAM
};

const ReservedParamNameRegex= /^__.+__$/;

export default class GridfwRouter<Controller> extends RouteBuilder<Controller>{
	/** Tree route */
	readonly _root: Node<Controller>;

	/** Path & query params */
	_params: Map<string, ParamInterface>= new Map();

	constructor(options?: Options){
		super(options);
		// Root Node
		this._root= this._rootNodes[0];
	}

	/** Add static parts param */
	param(paramName: string, parts: string[]): this
	/** Add dynamic params */
	param(paramName: string, regex?:RegExp|paramTestCb|{test:paramTestCb}, resolver?: paramResolverHandler): this
	/** Param implementation */
	param(paramName: string, regex?:any, resolver?: any){
		var paramMap= this._params;
		if(typeof paramName !== 'string')
			throw new Error('Expected param name as string');
		if(paramName==='constructor' || ReservedParamNameRegex.test(paramName))
			throw new Error(`${paramName} is a reserved name of has reserved format!`);
		if(paramMap.has(paramName))
			throw new Error(`Param already defined: ${paramName}`);
		if(Array.isArray(regex)){
			//* Static param
			paramMap.set(paramName, {
				name: paramName,
				isStatic: true,
				parts: regex
			} as StaticParamInterface);
		} else {
			//* Dynamic param
			if(typeof regex === 'function') regex= {test: regex};
			else if(regex!=null && typeof regex.test !== 'function')
				throw new Error('Illegal regex format (second argument)');
			// add
			paramMap.set(paramName, {
				name: paramName,
				isStatic: false,
				regex: regex,
				resolver: resolver
			} as DynamicParamInterface);
		}
		return this
	}
	/** List param */
	paramEntries(){ return this._params.entries() }
	paramCount(){ return this._params.size }
	hasParam(paramName: string){ return this._params.has(paramName); }
}

export type paramResolverHandler= (value: any, type: paramType, request: any, response: any)=> any
export type paramTestCb= (value: any)=> boolean