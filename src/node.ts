import type { GridfwRouter } from ".";
import type { Options } from "./options";
import { DynamicParamInterface, ParamInterface } from "./params";


/**
 * Tree node
 */

export class Node<Controller>{
	/** @Private Options */
	_options: Options;
	// path: [Node];
	/** Map static keys to nodes */
	nodes: Map<string, Node<Controller>> = new Map();
	/** Map parametrized nodes */
	nodeParams: Node<Controller>[] = [];
	/** Map wild card params to node */
	nodeWildcards: Node<Controller>[] = [];
	/** Generic wild card node */
	nodeWildcard: Node<Controller> | undefined = undefined;
	/** Wrappers */
	wrappers: WrapperFx[] = [];
	/** Map HTTP methods to controllers */
	methods: Map<string, Controller> = new Map<string, Controller>();
	/** Parameter of current node (case of parametrized node) */
	param: ParamInterface | undefined;
	/** If this node is accessed by a static route */
	readonly isStatic: boolean

	/** @private used only to create root node */
	constructor(options: Options, isStatic: boolean, param?: ParamInterface) {
		this._options = options;
		this.param = param;
		this.isStatic = isStatic;
		// If ignore trailing slashes
		if (options.ignoreTrailingSlash) this.nodes.set('', this);
	}

	/** Convert node to string */
	toString(): string {
		return nodeToString(this);
	}
}

/** Wrappers */
export type WrapperFx = (req: any, resp: any, next: WrapperNextFx) => any
type WrapperNextFx = () => Promise<any>;

/** Controller method */
export type ControllerMethod = (request: any, response: any) => any

/** Controller arg */
export type Handler<Controller> = Controller | Controller[]

/** Create route method */
// TODO correct this shit!
export function addRoute<T>(app: GridfwRouter<T>, rootNodes: Node<T>[], routes: string | string[]) {
	// Convert routes into array
	if (typeof routes === 'string') routes = [routes]
	const results: Set<Node<T>> = new Set();
	const paramsMap = app.params;
	for (let i = 0, len = routes.length; i < len; ++i) {
		let route = routes[i].trim();
		//* Add route notes if from route
		if (route === '/' || route === '') {
			for (let j = 0, jLen = rootNodes.length; j < jLen; ++j) results.add(rootNodes[j]);
			continue;
		}
		//* Parse route
		if (route.startsWith('/')) route = route.substr(1);
		let parts = route.split('/');
		let currentNodes = rootNodes;
		let isStaticRoute = true; // set if this route has no params
		for (let j = 0, partsLen = parts.length; j < partsLen; ++j) {
			let part = parts[j];
			let nextNodes: Node<T>[] = [];
			for (let k = 0, nodesLen = currentNodes.length; k < nodesLen; ++k) {
				let currentNode = currentNodes[k];
				//* Flags
				let options = currentNode._options;
				let ignoreCase = options.ignoreCase;
				//* Switch part type
				switch (part[0]) {
					case ':':
						//* param
						isStaticRoute = false;
						let param = paramsMap.get(part.substr(1));
						if (!param) throw new Error(`Undefined Path Parameter: "${part.substr(1)}" at route: ${route}`);
						if (param.isStatic === true) {
							//* Static param
							let ref = param.parts;
							for (let l = 0, lLen = ref.length; l < lLen; l++) {
								let part2 = ref[l];
								if (ignoreCase) part2 = part2.toLowerCase();
								let node: Node<T> | undefined;
								if (node = currentNode.nodes.get(part2)) {
									if (node.param) {
										if (node.param !== param) throw new Error(`Node [:${param.name}] has already param [:${node.param.name}]`);
									} else {
										node.param = param;
									}
								} else {
									node = new Node<T>(options, isStaticRoute, param);
									currentNode.nodes.set(part2, node);
								}
								nextNodes.push(node);
							}
						} else {
							//* Dynamic param
							// Check if node already set
							let ref = currentNode.nodeParams;
							let node: Node<T> | undefined;
							for (let l = 0, lLen = ref.length; l < lLen; ++l) {
								if (ref[l].param === param) {
									node = ref[l];
									break;
								}
							}
							// Create new node if not already exists
							if (node == null) {
								node = new Node<T>(options, isStaticRoute, param);
								ref.push(node);
							}
							// add to next
							nextNodes.push(node);
						}
						break;
					case '*':
						isStaticRoute = false;
						// Check wildcard is the last element in the path
						if (j != partsLen - 1)
							throw new Error(`Expected wildcard to be the last part in the route: ${route}`);
						if (part === '*') {
							let node = currentNode.nodeWildcard ??= new Node<T>(options, isStaticRoute);
							nextNodes.push(node);
						} else {
							// parametrized wildcard
							let param = paramsMap.get(part.substr(1));
							if (!param) throw new Error(`Undefined parameter: ${part.substr(1)}`);
							// Check if node already set
							let ref = currentNode.nodeWildcards;
							let node: Node<T> | undefined;
							for (let l = 0, lLen = ref.length; l < lLen; ++l) {
								if (ref[l].param === param) {
									node = ref[l];
									break;
								}
							}
							// Create new node if not already exists
							if (node == null) {
								node = new Node<T>(options, isStaticRoute, param);
								ref.push(node);
							}
							nextNodes.push(node);
						}
						//* wild card
						break;
					case '?':
						//* Part ignore char
						part = part.substr(1)
					default:
						//* static part
						if (ignoreCase) part = part.toLowerCase();
						let node = currentNode.nodes.get(part);
						if (node == null) {
							node = new Node<T>(options, isStaticRoute);
							currentNode.nodes.set(part, node);
						}
						nextNodes.push(node);
				}
			}
			currentNodes = nextNodes;
		}
		//* Add found nodes
		for (let k = 0, nodesLen = currentNodes.length; k < nodesLen; ++k) {
			results.add(currentNodes[k]);
		}
	}
	return results;
}

/** Add http method and handler */
export function addMethod<T>(app: GridfwRouter<T>, method: string, currentNodes: Node<T>[], routes: string | string[], handler: Handler<T>) {
	var nodes = addRoute(app, currentNodes, routes);
	nodes.forEach(function (node) {
		if (node._options.methodIgnoreCase)
			method = method.toUpperCase();
		_addMethod(node, method, handler);
	});
}

/** @private add method */
function _addMethod<T>(node: Node<T>, method: string, handler: Handler<T>) {
	if (Array.isArray(handler)) {
		// Flatten handler
		var i, len = handler.length;
		for (i = 0; i < len; ++i) {
			_addMethod(node, method, handler[i])
		}
	} else {
		// Add handler
		node.methods.set(method, handler);
	}
}

/** Add wrapper */
export function addWrapper<T>(app: GridfwRouter<T>, currentNodes: Node<T>[], routes: string | string[], wrapper: WrapperFx) {
	var nodes = addRoute(app, currentNodes, routes);
	nodes.forEach(function (node) {
		node.wrappers.push(wrapper);
	});
}

/** Mount subrouter */
export function mountSubRouter<T>(app: GridfwRouter<T>, currentNodes: Node<T>[], routes: string | string[], subRouter: GridfwRouter<T>) {
	var nodes = addRoute(app, currentNodes, routes);
	var mergeNodesQueue: Node<T>[] = [];
	nodes.forEach(function (node) {
		mergeNodesQueue.push(node, subRouter._root);
	});
	_deepMergeNodes(mergeNodesQueue);
}

/** @private merge nodes */
function _deepMergeNodes<T>(queue: Node<T>[]) {
	var i = 0, len = queue.length;
	while (i < len) {
		var targetNode = queue[i++];
		var srcNode = queue[i++];
		// merge Methods
		var targetNodeMethod = targetNode.methods;
		srcNode.methods.forEach(function (v: T, k: string) {
			if (targetNodeMethod.has(k))
				throw new Error(`Mount failed: target node has already method: ${k}`);
			targetNodeMethod.set(k, v);
		});
		// merge nodes
		var targetNodeNodes = targetNode.nodes;
		srcNode.nodes.forEach(function (v: Node<T>, k: string) {
			if (targetNodeNodes.has(k)) {
				queue.push(targetNodeNodes.get(k)!, v);
				len += 2;
			} else
				targetNodeNodes.set(k, v);
		});
		// merge parametrized nodes
		var targetNodeParams = targetNode.nodeParams;
		var srcNodeParams = srcNode.nodeParams;
		var j, jLen = srcNodeParams.length;
		for (j = 0; j < jLen; ++j)
			targetNodeParams.push(srcNodeParams[j]);
		// merge wildcard params
		targetNodeParams = targetNode.nodeWildcards;
		srcNodeParams = srcNode.nodeWildcards;
		jLen = srcNodeParams.length;
		for (j = 0; j < jLen; ++j)
			targetNodeParams.push(srcNodeParams[j]);
		// add target generic wildcard
		if (targetNode.nodeWildcard) {
			if (srcNode.nodeWildcard)
				throw new Error(`Mount failed>> src and target nodes have both generic wildcard!`);
		} else {
			targetNode.nodeWildcard = srcNode.nodeWildcard;
		}
		// merge wrappers
		targetNode.wrappers.push(...srcNode.wrappers);
		// merge param
		if (targetNode.param) {
			if (srcNode.param)
				throw new Error(`Mount failed>> Both src and target node have param!`);
		} else {
			targetNode.param = srcNode.param;
		}
	}
}

/** HTTP Status */
export enum HTTPStatus {
	OK = 200,
	NOT_FOUND = 404,
	INTERNAL_ERROR = 500
}

/** Error descriptor */
export interface RouteError {
	code: HTTPStatus
	causedBy: any
}
/** Path resolver result */
export type PathResolverResult<T> = PathResolverSuccess<T> | PathResolverError;
export interface PathResolverSuccess<T> {
	status: HTTPStatus.OK,
	controller: T,
	wrappers: WrapperFx[],
	params: string[],
	paramResolvers: ParamInterface[],
	parts: string[] // splitted path parts
	/** Do resolved route is static route */
	isStatic: boolean
}
export interface PathResolverError {
	status: HTTPStatus.INTERNAL_ERROR | HTTPStatus.NOT_FOUND,
	error: RouteError,
}

/** Node verification step */
enum NodeCheckStep {
	STATIC,
	PARAM,
	WILD_CARD_PARAM,
	WILD_CARD
}

/** resolve path */
export function resolvePath<T>(app: GridfwRouter<T>, method: string, path: string): PathResolverResult<T> {
	var currentNode = app._root;
	// var options= currentNode._options;
	var result: PathResolverResult<T>;
	try {
		var parts = path.slice(1).split('/');
		var part: string;
		var partsLen = parts.length;
		var partI = 0; // part index
		var queue: Node<T>[] = [currentNode];
		var queueStep: NodeCheckStep[] = [NodeCheckStep.STATIC]; // [NodeCheckStep, ...]
		var queueIndex: number[] = [0];
		var node: Node<T> | undefined;
		var index: number, len: number;
		rootwhile: while (true) {
			currentNode = queue[partI];
			if (partI === partsLen) {
				// found
				if (currentNode.methods.has(method))
					break rootwhile;
				--partI; // Go back
			} else {
				swtch: switch (queueStep[partI]) {
					case NodeCheckStep.STATIC:
						part = parts[partI];
						queueStep[partI] = NodeCheckStep.PARAM // check params next time
						if (currentNode._options.ignoreCase) part = part.toLowerCase();
						if (node = currentNode.nodes.get(part)) {
							// Go to next node
							++partI;
							queue[partI] = node;
							queueIndex[partI] = 0;
							queueStep[partI] = NodeCheckStep.STATIC
						}
						break;
					case NodeCheckStep.PARAM:
						part = parts[partI];
						var nodeParams = currentNode.nodeParams;
						len = nodeParams.length;
						index = queueIndex[partI];
						while (index < len) {
							node = nodeParams[index++];
							let regx = (node.param as DynamicParamInterface).regex
							if (regx == null || regx.test(part)) {
								// save next index
								queueIndex[partI] = index;
								// Go to next
								++partI;
								queue[partI] = node;
								queueStep[partI] = NodeCheckStep.STATIC;
								queueIndex[partI] = 0;
								break swtch;
							}
						}
						// Check wildCard param instead
						queueStep[partI] = NodeCheckStep.WILD_CARD_PARAM;
						queueIndex[partI] = 0;
						break;
					case NodeCheckStep.WILD_CARD_PARAM:
						var nodeParams = currentNode.nodeWildcards;
						len = nodeParams.length;
						index = queueIndex[partI];
						if (len > 0) {
							part = parts.slice(partI).join('/');
							let rgx: RegExp | undefined;
							while (index < len) {
								node = nodeParams[index++];
								if (node.methods.has(method) && ((rgx = (node.param as DynamicParamInterface).regex) == null || rgx.test(part))) {
									parts[partI] = part; // keep this value
									break rootwhile;
								}
							}
						}
						// Check wildCard instead
						queueStep[partI] = NodeCheckStep.WILD_CARD;
						break;
					case NodeCheckStep.WILD_CARD:
						if (node = currentNode.nodeWildcard) {
							part = parts.slice(partI).join('/');
							let rgx: RegExp | undefined;
							if (node.methods.has(method) && ((rgx = (node.param as DynamicParamInterface).regex) == null || rgx.test(part))) {
								parts[partI] = part; // keep this value
								break rootwhile;
							}
						}
						// Go back to previous node
						--partI;
						if (partI < 0) {
							// Not found
							throw HTTPStatus.NOT_FOUND;
						}
						break
					default:
						throw new Error(`Illegal step: ${queueStep[partI]}`);
				}
			}
		}
		// Collect params and wrappers
		var wrappers: WrapperFx[] = [];
		var params: string[] = [];
		var paramResolvers: ParamInterface[] = [];
		var i;
		var paramNode: ParamInterface | undefined;
		for (i = 0; i <= partI; i++) {
			node = queue[i];
			if (node.wrappers.length)
				wrappers.push(...node.wrappers);
			if (paramNode = node.param) {
				params.push(parts[i - 1])
				paramResolvers.push(paramNode);
			}
		}
		//Found
		node = queue[partI];
		result = {
			status: HTTPStatus.OK,
			controller: node.methods.get(method)!,
			wrappers,
			params,
			paramResolvers,
			parts: partsLen === partI ? parts : parts.slice(0, partI), // save parts
			isStatic: node.isStatic
		}
	} catch (error) {
		let code = error === HTTPStatus.NOT_FOUND ? HTTPStatus.NOT_FOUND : HTTPStatus.INTERNAL_ERROR
		result = {
			status: code,
			error: { code, causedBy: error }
		};
	}
	return result;
}

/** Convert router tree to string */
export function nodeToString<T>(rootNode: Node<T>) {
	var queue = [rootNode];
	var queueStep = [NodeCheckStep.STATIC];
	var queueStaticKies: string[][] = [];
	var queueIndex = [0];
	var queuePrefix = ['']; // prefix for node lines
	var dept = 0;
	var lines: string[] = [''];
	var k: string;
	var nextNode: Node<T>;
	var staticArr: string[];
	var isLastNode: boolean;
	var circular = new Set<Node<T>>(); // prevent circular
	var mx = 100;
	var cNodeName: string;
	rootLoop: while (dept >= 0) {
		if (mx-- < 0) break;
		var node = queue[dept];
		var index = queueIndex[dept];
		var prefix = queuePrefix[dept];
		// print
		switch (queueStep[dept]) {
			case NodeCheckStep.STATIC:
				if (index === 0) {
					// prevent circular
					if (circular.has(node)) {
						if (node !== queue[dept - 1]) {
							lines.push(`${prefix}?????? <circular>`);
						}
						--dept;
						continue rootLoop;
					}
					circular.add(node);
					staticArr = queueStaticKies[dept] = Array.from(node.nodes.keys());
				} else
					staticArr = queueStaticKies[dept];
				k = staticArr[index]
				if (k != null) {
					nextNode = node.nodes.get(k)!;
					if (nextNode === node && k === '') {
						// Do not show "/" as same node
						++queueIndex[dept];
						continue rootLoop;
					} else {
						isLastNode = !node.nodeWildcard && node.nodeWildcards.length === 0 && node.nodeParams.length === 0 && (index === staticArr.length - 1);
						cNodeName = `/${k}`;
					}
				} else {
					// check params next
					queueStep[dept] = NodeCheckStep.PARAM;
					queueIndex[dept] = 0;
					continue rootLoop;
				}
				break;
			case NodeCheckStep.PARAM:
				if (nextNode = node.nodeParams[index]) {
					isLastNode = !node.nodeWildcard && node.nodeWildcards.length === 0 && index === (node.nodeParams.length - 1)
					cNodeName = `:${nextNode.param!.name}`;
				} else {
					// go next
					queueStep[dept] = NodeCheckStep.WILD_CARD_PARAM;
					queueIndex[dept] = 0;
					continue rootLoop;
				}
				break;
			case NodeCheckStep.WILD_CARD_PARAM:
				if (nextNode = node.nodeWildcards[index]) {
					isLastNode = !node.nodeWildcard && index === node.nodeWildcards.length - 1
					cNodeName = `*${nextNode.param!.name}`;
				} else {
					// go next
					queueStep[dept] = NodeCheckStep.WILD_CARD;
					queueIndex[dept] = 0;
					continue rootLoop;
				}
				break;
			case NodeCheckStep.WILD_CARD:
				if (index === 0 && node.nodeWildcard) {
					nextNode = node.nodeWildcard;
					isLastNode = true;
					cNodeName = '*';
				} else {
					--dept // back
					continue rootLoop;
				}
				break
			default:
				throw new Error(`Enexpected step: ${queueStep[dept]}`);
		}
		lines.push(`${prefix}${isLastNode ? '??????' : '??????'} ${cNodeName} ${nextNode.methods.size ? JSON.stringify(Array.from(nextNode.methods.keys())) : ''}`);
		++queueIndex[dept] // next index for current dept
		++dept // go to next dept
		// next dept
		queue[dept] = nextNode
		queueIndex[dept] = 0
		queueStep[dept] = NodeCheckStep.STATIC
		queuePrefix[dept] = `${prefix}${isLastNode ? "    " : "???   "}`;
	}
	return lines.join("\n");
}