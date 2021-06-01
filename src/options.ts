/**
 * Router options
 */
export const DEFAULT_OPTIONS= {
	/** Do ignore trailing slash */
	trailingSlash: true,
	/** Ignore path static parts case */
	ignoreCase: true
};

export type Options= Readonly<typeof DEFAULT_OPTIONS>