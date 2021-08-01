import { GridfwRouter } from ".";

/**
 * Router params
 */
export class RouterParams extends Map<string, ParamInterface>{
	private _router: GridfwRouter<any>;

	constructor(router: GridfwRouter<any>){
		super();
		this._router= router;
	}

	/** Add static parts param */
	//@ts-ignore
	set(paramName: string, parts: string[]): this
	/** Add dynamic params, if resolver has only one param, resolved value will be cached. */
	//@ts-ignore
	set(paramName: string, regex?:RegExp|paramTestCb|{test:paramTestCb}, resolver?: paramResolverHandler): this
	/** Param implementation */
	//@ts-ignore
	set(paramName: string, regex?:any, resolver?: any){
		if(typeof paramName !== 'string')
			throw new Error('Expected param name as string');
		if(this.has(paramName))
			throw new Error(`Param already defined: ${paramName}`);
		if(Array.isArray(regex)){
			//* Static param
			super.set(paramName, {
				name: paramName,
				isStatic: true,
				parts: regex
			});
		} else {
			//* Dynamic param
			if(typeof regex === 'function') regex= {test: regex};
			else if(regex!=null && typeof regex.test !== 'function')
				throw new Error('Illegal regex format (second argument)');
			// add
			super.set(paramName, {
				name: paramName,
				isStatic: false,
				regex: regex,
				resolver: resolver,
				// Enable caching resolved value if resolver do not receive "req" and "resp"
				enableResolverCache: !(resolver && resolver.length > 2)
			});
		}
		return this
	}
}

/** Param Type */
export enum paramType{
	/** Path param */
	PATH_PARAM,
	/** Wildcard param */
	WILD_CARD_PARAM,
	/** Query param */
	QUERY_PARAM
};

export type paramResolverHandler= (value: any, type: paramType, request?: any, response?: any)=> any
export type paramTestCb= (value: any)=> boolean


export type ParamInterface= DynamicParamInterface | StaticParamInterface;

export interface ParamBInterface{
	name:	string
	isStatic:boolean
}
export interface DynamicParamInterface extends ParamBInterface{
	isStatic: false
	regex:	RegExp
	resolver: paramResolverHandler
	/** Enable caching value if resolver do not receive req and resp */
	enableResolverCache: boolean
}

export interface StaticParamInterface extends ParamBInterface{
	isStatic: true
	parts: string[]
}