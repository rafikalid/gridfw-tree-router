/**
 * Fast & lightweight Tree Router for Node & browser
 */
import LRU_TTL_CACHE from 'lru-ttl-cache';
import { Node, nodeToString, PathResolverResult, resolvePath } from "./node";
import { DEFAULT_OPTIONS, Options } from "./options";
import { RouterParams } from './params';
import { RouteBuilder } from "./route-builder";

export class GridfwRouter<Controller> extends RouteBuilder<Controller>{
	/** Tree route */
	readonly _root: Node<Controller>;
	/** Router cache: Cache results for fast access */
	protected readonly _routerCache: LRU_TTL_CACHE<string, PathResolverResult<Controller>>;

	/** Path & query params */
	readonly params: RouterParams= new RouterParams(this);
	/** Interface  */

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

	/** Resolve Path */
	resolvePath(method: string, path: string){
		return this._routerCache.get(`${method} ${path}`, true, [method, path]);
	}

	/** router to string */
	toString(): string{
		return nodeToString(this._root);
	}
}
