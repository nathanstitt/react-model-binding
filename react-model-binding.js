var Events     = require('ampersand-events');
var clone      = require('lodash/clone');
var result     = require('lodash/result');
var isEmpty    = require('lodash/isEmpty');
var mapValues  = require('lodash/mapValues');
var isFunction = require('lodash/isFunction');

var warn = global.console ? global.console.warn : function(){};
var DEFAULT_PROP_BINDINGS = ['model', 'collection'];

function ReactEventBinding(component, bindings){
    this.component = component;
    this.attrs = {};
    this.rebind(clone(bindings), {silent: true});
}

ReactEventBinding.prototype.componentName = function() {
    return this.component.constructor.displayName;
};

ReactEventBinding.prototype.rebind = function(bindings, options){
    if (options == null) { options = {}; }
    var customEvents = result(this.component, 'bindEvents', {});
    for (var name in bindings) {
        var state = bindings[name];
        if (state !== false) {
            this.rebindAttr(name, state, customEvents[name], options);
        }
    }
};



ReactEventBinding.prototype.rebindAttr = function(name, attr, events, options) {
    if (!attr) {
        warn(name + " is not set on " + (this.componentName()));
        return;
    }
    var prevAttr = this.attrs[name];
    if (prevAttr === attr) { return; }

    if (!events){
        events = (name === 'collection' || attr.isCollection) ? 'add remove reset' : 'change';
    }
    if (prevAttr){
        this.stopListening(prevAttr);
    }
    this.attrs[name] = attr;

    this.listenTo(attr, events, this.setComponentState);
    if (!options.silent) {
        this.setComponentState(attr);
    }
    if (isFunction(this.component.onAttributeBind)){
        this.component.onAttributeBind(this, name, prevAttr);
    }
};


ReactEventBinding.prototype.destroy = function() {
    this.stopListening();
};

ReactEventBinding.prototype.setComponentState = function() {
    if (!this.component.isMounted()) {
        return;
    }
    if (isFunction(this.component.setDataState)) {
        this.component.setDataState.apply(this.component, arguments);
    } else {
        this.component.forceUpdate();
    }
};


Events.createEmitter(ReactEventBinding.prototype);


// create a defined property unless property name already exists
function configureGetter(comp, name){
    if (!(name in comp.constructor.prototype)){
        Object.defineProperty(comp.constructor.prototype, name, {
            configurable: true, enumerable: true,
            get: function(){
                return this._dataBindings.attrs[name];
            }
        });
    }
}

// binds any "model" or "collection" props, combined with any that
// are specified by the components "dataBindings" property
function readBindings(comp, newProps) {
    var bindings = clone(comp.dataBindings) || {};
    DEFAULT_PROP_BINDINGS.forEach(function(prop){
        if (comp.props[prop]){
            bindings[prop] = (bindings[prop] || 'props');
        }
    });
    return mapValues(bindings, function(value, name) {
        configureGetter(comp, name);
        if (isFunction(value)){
            return value.call(comp);
        } else if (value === 'props'){
            return newProps[name] || comp.props[name];
        } else {
            return value;
        }
    });
}

var ReactEventBindingMixin = {

    getInitialState: function(){
        var bindings = readBindings(this, this.props);
        if (!isEmpty(bindings)){
            this._dataBindings = new ReactEventBinding(this, bindings);
        }
        return {};
    },

    componentWillReceiveProps: function(nextProps){
        var newBindings = readBindings(this, nextProps);
        if (!isEmpty(newBindings)){
            if (this._dataBindings){
                this._dataBindings.rebind(newBindings);
            } else {
                this._dataBindings = new ReactEventBinding(this, newBindings);
            }
        }
    },

    componentWillUnmount: function(){
        if (this._dataBindings){
            this._dataBindings.destroy();
            delete this._dataBindings;
        }
    }
};


module.exports = ReactEventBindingMixin;
