/**
 * Router options
 */
export const DEFAULT_OPTIONS= {
	/** Do ignore trailing slash */
	ignoreTrailingSlash: true,
	/** Ignore path static parts case */
	ignoreCase: true,

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

export type Options= Readonly<typeof DEFAULT_OPTIONS>