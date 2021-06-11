/**
 * Fast & lightweight Tree Router for Node & browser
 */
import LRU_TTL_CACHE, { UpserResult } from 'lru-ttl-cache';
import { DynamicParamInterface, Node, nodeToString, ParamInterface, PathResolverResult, resolvePath, StaticParamInterface } from "./node";
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

export default class GridfwRouter<Controller> extends RouteBuilder<Controller>{
	/** Tree route */
	readonly _root: Node<Controller>;
	/** Router cache: Cache results for fast access */
	protected readonly _routerCache: LRU_TTL_CACHE<string, PathResolverResult<Controller>>;

	/** Path & query params */
	_params: Map<string, ParamInterface>= new Map();

	constructor(options?: Options){
		super(options);
		// Root Node
		this._root= this._rootNodes[0];
		// Cache
		var cache= this._routerCache= new LRU_TTL_CACHE(options?.routerCache);
		var r;
		cache.upsertCb= (key:string, args?: string[])=>{
			var r= resolvePath<Controller>(this, args![0], args![1]);
			return {
				value: r,
				bytes: 0,
				isPermanent: !r.isStatic
			};
		};
	}

	/** Add static parts param */
	param(paramName: string, parts: string[]): this
	/** Add dynamic params, if resolver has only one param, resolved value will be cached. */
	param(paramName: string, regex?:RegExp|paramTestCb|{test:paramTestCb}, resolver?: paramResolverHandler): this
	/** Param implementation */
	param(paramName: string, regex?:any, resolver?: any){
		var paramMap= this._params;
		if(typeof paramName !== 'string')
			throw new Error('Expected param name as string');
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
				resolver: resolver,
				// Enable caching resolved value if resolver do not receive "req" and "resp"
				enableResolverCache: !(resolver && resolver.length > 2)
			} as DynamicParamInterface);
		}
		return this
	}
	/** List param */
	paramEntries(){ return this._params.entries() }
	paramCount(){ return this._params.size }
	hasParam(paramName: string){ return this._params.has(paramName); }

	/** Resolve Path */
	resolvePath(method: string, path: string){
		return this._routerCache.get(`${method} ${path}`, true, [method, path]);
	}

	/** router to string */
	toString(): string{
		return nodeToString(this._root);
	}
}

export type paramResolverHandler= (value: any, type: paramType, request?: any, response?: any)=> any
export type paramTestCb= (value: any)=> boolean