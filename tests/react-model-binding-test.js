/*global jest beforeEach describe it expect */

var TestUtils = require('react-addons-test-utils');
var React     = require('react');
var ReactDOM  = require('react-dom');
var Person    = require('../fixtures/person-model');
var TestComp  = require('../fixtures/test-component');
var defer     = require('lodash/defer');

var deferedRender = function(expectations){
    var promise = new Promise( (resolve) => {
        defer( expectations );
        resolve();
    });
    jest.runAllTimers();
    return promise;
};

describe('ReactModelBinding', function() {

    beforeEach( function() {
        this.person = new Person({firstName: 'Bob', lastName: 'Smith'});
        var component = TestUtils.renderIntoDocument(
            React.createElement(TestComp, {person: this.person})
        );
        this.parent = component;
        this.component = component.refs.child;
        Object.defineProperty(this, 'dom', {
            get: function(){ return ReactDOM.findDOMNode(this.parent); }
        });
    });

    it('creates defined property getter', function() {
        expect(this.component.person).toBe(this.person);
        expect(this.dom.textContent).toContain('Bob Smith');
    });

    it('re-renders when events occur', function() {
        this.person.firstName = 'Tom';
        expect(this.dom.textContent).toContain('Tom Smith');
    });

    it('listens for custom events if given', function(){
        this.component.bindEvents.person = 'change:fullName'; // no listening for signedIn changes
        var person = new Person({firstName: 'John', lastName: 'Smith'});
        this.parent.setState({ person: person });
        expect(person.signedIn).toBe(false);
        person.signedIn = true;
        return deferedRender( () => {
            expect(this.dom.textContent).toContain('logged out');
        });
    });

    it('rebinds when model is changed', function(){
        this.component.onModelBind = jest.fn();
        this.parent.setState({ person: new Person({firstName: 'John', lastName: 'Smith'}) });
        return deferedRender( () => {
            expect(this.component).toBe( this.parent.refs.child );
            expect(this.component.onModelBind).toBeDefined();
            expect(this.dom.textContent).toContain('John Smith');
            expect(this.component.onModelBind).toBeCalled();
            // test that the component isn't still listening to the old model
            this.person.firstName = 'Tom';
            expect(this.dom.textContent).not.toContain('Tom');
        });
    });

    it('calls setModelState', function(){
        this.component.setModelState = jest.fn();
        expect(this.dom.textContent).not.toContain('John');
        this.person.firstName = 'John';
        return deferedRender( () => {
            expect(this.component.setModelState).toBeCalled();
            expect(this.dom.textContent).not.toContain('John');
        });
    });

    it('can rebind to new objects', function(){
        this.component.onModelBind = jest.fn();
        this.component.modelBindings.reset({
            person: new Person({firstName: 'Dianne', lastName: 'Smith'})
        });
        return deferedRender( () => {
            expect(this.component.onModelBind).toBeCalled();
            expect(this.dom.textContent).toContain('Dianne Smith');

        });

    });
});
