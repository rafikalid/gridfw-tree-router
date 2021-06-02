import GridfwRouter from ".";
import type { Options } from "./options";


/**
 * Tree node
 */

export class Node<Controller>{
	/** @Private Options */
	_options: Options;
	// path: [Node];
	/** Map static kies to nodes */
	nodes: Map<string, Node<Controller>>=  new Map();
	/** Map parametred nodes */
	nodeParams: Node<Controller>[]= [];
	/** Map wild card params to node */
	nodeWildcards: Node<Controller>[]= [];
	/** Generic wild card node */
	nodeWildcard?: Node<Controller>;
	/** Wrappers */
	wrappers: WrapperFx[]= [];
	/** Map HTTP methods to controllers */
	methods: Map<string, Controller>= new Map<string, Controller>();
	/** Parameter of current node (case of parametred node) */
	param?: ParamInterface

	/** @private used only to create root node */
	constructor(options: Options, param?: ParamInterface){
		this._options= options;
		this.param= param;
	}
}

/** Param */
export interface ParamInterface{
	name:	string
	isStatic:boolean
}
export interface DynamicParamInterface extends ParamInterface{
	isStatic: false
	regex:	RegExp
}
export interface StaticParamInterface extends ParamInterface{
	isStatic: true
	parts: string[]
}

/** Wrappers */
export type WrapperFx= (req: any, resp: any, next: WrapperNextFx)=> any
type WrapperNextFx= ()=> Promise<any>;

/** Controller method */
export type ControllerMethod= (request: any, response: any)=> any

/** Controller arg */
export type Handler<Controller>= Controller | Controller[]


/** Create route */
export function createRoute<T>(rootNodes: Node<T>[], route: string|string[]): Node<T>[]{
	var result: Node<T>[]= [];
	//TODO create node
	return result;
}

/** Create route method */
export function addRoute<T>(app: GridfwRouter<T>, currentNodes: Node<T>[], routes: string | string[]){
	// Convert routes into array
	if(typeof routes === 'string') routes= [routes]
	var i=0, len= routes.length, route, j, k;
	var paramsMap= app._params;
	for(; i<len; i++){
		// Prepare route
		route= routes[i].trim();
		var parts= route.split('/');
		var partsLen= parts.length;
		var nextNodes: Node<T>[];
		var node;
		// Go through route
		for(j=0; j<partsLen; j++){
			var part= parts[j];
			// Go trough nodes
			var nodesLen= currentNodes.length;
			nextNodes= [];
			for(k=0; k<nodesLen; k++){
				var currentNode= currentNodes[k];
				//* Flags
				var options= currentNode._options;
				var ignoreCase= options.ignoreCase;
				var ignoreTrailingSlash= !options.trailingSlash
				//* Swith part type
				switch(part[0]){
					case ':':
						//* param
						var param= paramsMap.get(part.substr(1));
						if(!param) throw new Error(`Undefined parameter: ${part.substr(1)}`);
						var l, ref, lLen;
						if(param.isStatic===true){
							//* Static param
							ref= (param as StaticParamInterface).parts;
							lLen= ref.length;
							for(l=0; l<lLen; l++){
								var part2= ref[l];
								if(ignoreCase) part2= part2.toLowerCase();
								if(node= currentNode.nodes.get(part2)){
									if(node.param){
										if(node.param !== param) throw new Error(`Node [:${param.name}] has already param [:${node.param.name}]`);
									} else {
										node.param= param;
									}
								} else {
									node= new Node<T>(options, param);
									currentNode.nodes.set(part2, node);
								}
								nextNodes.push(node);
							}
						} else {
							//* Dynamic param
							// Check if node already set
							ref= currentNode.nodeParams;
							lLen= ref.length;
							node= null;
							for(l=0; l<lLen; ++l){
								if(ref[l].param === param){
									node= ref[l];
									break;
								}
							}
							// Create new node if not already exists
							if(!node){
								node= new Node<T>(options, param);
								ref.push(node);
							}
							// add to next
							nextNodes.push(node);
						}
						break;
					case '*':
						// Check wildcard is the last element in the path
						if(j != partsLen+1)
							throw new Error(`Expected wildcard to be the last part in the route: ${route}`);
						if(part === '*'){
							// Generic wildcard  ( "??=" is supported starting from nodejs15)
							node= currentNode.nodeWildcard
							if(node==null)
								node= currentNode.nodeWildcard = new Node<T>(options);
							nextNodes.push(node);
						} else {
							// parametred wildcard
							var param= paramsMap.get(part.substr(1));
							if(!param) throw new Error(`Undefined parameter: ${part.substr(1)}`);
							// Check if node already set
							ref= currentNode.nodeWildcards;
							lLen= ref.length;
							node= null;
							for(l=0; l<lLen; ++l){
								if(ref[l].param === param){
									node= ref[l];
									break;
								}
							}
							// Create new node if not already exists
							if(!node){
								node= new Node<T>(options, param);
								ref.push(node);
							}
							nextNodes.push(node);
						}
						//* wild card
						break;
					// @ts-ignore
					case '?':
						//* Part ignore char
						part= part.substr(1)
					default:
						//* static part
						if(ignoreCase) part= part.toLowerCase();
						node= currentNode.nodes.get(part);
						if(!node){
							node= new Node<T>(options);
							currentNode.nodes.set(part, node);
						}
						nextNodes.push(node);
				}
			}
			currentNodes= nextNodes;
		}
	}
	return currentNodes;
}

/** Add http method and handler */
export function addMethod<T>(app: GridfwRouter<T>, method: string, currentNodes: Node<T>[], routes: string | string[], handler: Handler<T>){
	var nodes= addRoute(app, currentNodes, routes);
	var i, len= nodes.length;
	for(i=0; i<len; ++i){
		_addMethod(nodes[i], method, handler);
	}
}

/** @private add method */
function _addMethod<T>(node: Node<T>, method: string, handler: Handler<T> ){
	if(Array.isArray(handler)){
		// Flatten handler
		var i, len= handler.length;
		for(i=0; i<len; ++i){
			_addMethod(node, method, handler[i])
		}
	} else {
		// Add handler
		node.methods.set(method, handler);
	}
}

/** Add wrapper */
export function addWrapper<T>(app: GridfwRouter<T>, currentNodes: Node<T>[], routes: string | string[], wrapper: WrapperFx) {
	var nodes= addRoute(app, currentNodes, routes);
	var i, len= nodes.length;
	for(i=0; i<len; ++i){
		nodes[i].wrappers.push(wrapper);
	}
}

/** Mount subrouter */
export function mountSubRouter<T>(app: GridfwRouter<T>, currentNodes: Node<T>[], routes: string|string[], subRouter: GridfwRouter<T>){
	var nodes= addRoute(app, currentNodes, routes);
	var i, len= nodes.length;
	var mergeNodesQueue: Node<T>[]= [];
	for(i=0; i<len; ++i)
		mergeNodesQueue.push(nodes[i], subRouter._root);
	_deepMergeNodes(mergeNodesQueue);
}

/** @private merge nodes */
function _deepMergeNodes<T>(queue: Node<T>[]){
	var i= 0, len= queue.length;
	while(i<len){
		var targetNode= queue[i++];
		var srcNode=	queue[i++];
		// merge Methods
		var targetNodeMethod= targetNode.methods;
		srcNode.methods.forEach(function(v: T, k: string){
			if(targetNodeMethod.has(k))
				throw new Error(`Mount failed: target node has already method: ${k}`);
			targetNodeMethod.set(k, v);
		});
		// merge nodes
		var targetNodeNodes= targetNode.nodes;
		srcNode.nodes.forEach(function(v: Node<T>, k: string){
			if(targetNodeNodes.has(k)) {
				queue.push(targetNodeNodes.get(k)!, v);
				len+= 2;
			} else
				targetNodeNodes.set(k, v);
		});
		// merge parametred nodes
		var targetNodeParams= targetNode.nodeParams;
		var srcNodeParams= srcNode.nodeParams;
		var j, jLen= srcNodeParams.length;
		for(j=0; j<jLen; ++j)
			targetNodeParams.push(srcNodeParams[j]);
		// merge whildcard params
		targetNodeParams= targetNode.nodeWildcards;
		srcNodeParams= srcNode.nodeWildcards;
		jLen= srcNodeParams.length;
		for(j=0; j<jLen; ++j)
			targetNodeParams.push(srcNodeParams[j]);
		// add target generic wildcard
		if(targetNode.nodeWildcard){
			if(srcNode.nodeWildcard)
				throw new Error(`Mount faild>> src and target nodes have both generic wildcard!`);
		} else {
			targetNode.nodeWildcard= srcNode.nodeWildcard;
		}
		// merge wrappers
		targetNode.wrappers.push(...srcNode.wrappers);
		// merge param
		if(targetNode.param){
			if(srcNode.param)
				throw new Error(`Mount faild>> Both src and target node have param!`);
		} else {
			targetNode.param= srcNode.param;
		}
	}
}