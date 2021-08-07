/**
 * Router options
 */

export interface Options{
	/** Do ignore trailing slash */
	ignoreTrailingSlash: boolean,
	/** Ignore path static parts case */
	ignoreCase: boolean,

	/** Ignore method's name case */
	methodIgnoreCase: boolean,

	/** Router Cache */
	routerCache: {
		/** Max entries @default Infinity */
		max?:		number,
		/** Max bytes @default Infinity */
		maxBytes?:	number|string,
		/** Time to live @default Infinity */
		ttl?:    	number|string,
		/** TTL check interval. @default 60s */
		ttlInterval?:    number|string
	}
}

export const DEFAULT_OPTIONS: Options= {
	/** Do ignore trailing slash */
	ignoreTrailingSlash: true,
	/** Ignore path static parts case */
	ignoreCase: true,

	/** Ignore method's name case */
	methodIgnoreCase: true,

	/** Router Cache */
	routerCache: {
		/** Max entries @default Infinity */
		max:		Infinity,
		/** Max bytes @default Infinity */
		maxBytes:	Infinity,
		/** Time to live @default Infinity */
		ttl:    	Infinity,
		/** TTL check interval. @default 60s */
		ttlInterval:    60000
	}
};