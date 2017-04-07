// @flow
'use strict'

function Custom(SuperClass : Object = Object) : WebComponent { //eslint-disable-line
	return class extends WebComponent {}
}

const privates : WeakMap<WebComponent, Object> = new WeakMap()

class WebComponent extends HTMLElement {

	dispatcher : Dispatcher = new Dispatcher()
	stamps : Object = {}

	static get ownerDocument() : typeof document {
		return document.currentScript
			? document.currentScript.ownerDocument
			: document._currentScript.ownerDocument
	}

	constructor() {
		super()
		privates.set(this, {})
		if(this.constructor !== WebComponent) {
			this::defineStaticProperty('template', template)
		}
		this.attachShadow({mode: 'open'})
		this::detectStamps()
		this.constructor.observedProperties.forEach(prop => this::defineObserver(prop))
	}

	connectedCallback() {
		Object.keys(this.stamps).forEach(prop => this::setStamp(prop))
	}

	attachShadow(config : Object) : ShadowRoot {
		if(this.shadowRoot) return this.shadowRoot
		let shadow = super.attachShadow(config)
		shadow.appendChild(this.constructor.template)
		return shadow
	}

	allNodes(nodes : Object = this.shadowRoot.childNodes) : Array<Object> {
		const result : Array<Object> = []

		for(let node of nodes) {
			const childNodes : Object = node.childNodes
			result.push(node)
			if(!childNodes[0]) continue
			result.push(...this.allNodes(childNodes))
		}

		return result
	}

}

function template () : HTMLTemplateElement {
	return window.WebComponent.ownerDocument
		.querySelector('template').content.cloneNode(true)
}

function defineStaticProperty (propName : string, func : Function) {
	Object.defineProperty(this.constructor, propName, {
		get: func
	})
}

function detectStamps () {
	const nodes : Array<Object> = this.allNodes()
	const stampSelector : RegExp = /(\[\[\s*[^\W+\d+\W+]\w*\s*]])/gim
	const stampTest : RegExp = /\[\[\s*([^\W+\d+\W+]\w*)\s*]]/i

	for(let node of nodes) {
		if(!node.data || node.nodeType !== 3) continue

		const chunks : Array<string> = node.data.split(stampSelector)

		if(!chunks.length) continue

		const parentNode : Object = node.parentNode
		const nextNode : Object = node.nextSibling

		node.remove()

		chunks.forEach((chunck : string) => {
			const test : any = chunck.match(stampTest)
			const prop : string = test ? test[1] : void 0
			const data : string = prop ? '' : chunck
			const newNode : Text = document.createTextNode(data)

			if(prop) {
				const stamps : Array<Text> = this.stamps[prop]
				stamps instanceof Array
					? stamps.push(newNode)
					: this.stamps[prop] = [newNode]
				if(this.constructor.observedProperties.includes(prop)) {
					this.dispatcher.on(prop, value => this::setStamp(prop, value))
				}
			}

			parentNode.insertBefore(newNode, nextNode)
		})
	}
}

function setStamp(prop : string, value? : any = this[prop]) {
	let shadow = this.shadowRoot
	this.stamps[prop].forEach((node : Object, index : number) => {
		if(!shadow) return
		shadow.contains(node)
			? node.data = value || ''
			: this.stamps[prop].splice(index, 1)
	})
}

function defineObserver(prop : string) {
	const proto : Object = Object.getPrototypeOf(Object.getPrototypeOf(this))
	Object.defineProperty(proto, prop, {
		enumerable: true,
		get: function () : String {
			return privates.get(this)[prop]
		},
		set: function(value : any) {
			const _privates : Object = privates.get(this)
			if(_privates[prop] === value) return
			_privates[prop] = value
			this.dispatcher.fire(prop, value)
		}
	})
}

class Dispatcher {
	stack : Object

	constructor () {
		this.stack = {}
	}

	on(prop : string, handler : Function) {
		let stack = this.stack[prop]
		stack instanceof Array
			? stack.push
			: stack = [handler]
		this.stack[prop] = stack
	}

	fire(prop : string, data : any) {
		const stack : Array<Function> = this.stack[prop]
		if(!stack || !stack.length) return
		stack.forEach(handler => handler(data))
	}

}