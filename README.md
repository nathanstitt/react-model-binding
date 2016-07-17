# react-model-binding

A mixin for React classes that allows them to easily integrate with "model" and "collection" type objects. It's primary use is integrating with Backbone/Ampersand models and collections, but will also work with any object that supports listening to events via `on` and stopping via `off`.

## What does it do?

It reads objects from `props` and will automatically bind to any props named `model` or `collection`.  Additional objects can be given by implementing a `modelBindings` property on the Component.

A derived property getter is created for each object to facilitate access to objects.

## Example

```javascript
var React  = require('react');
var Person = require('models/person');
var Food   = require('models/food');
var ModelBinding = require('react-model-binding');

// Pairing uses the ModelBinding mixin to access objects and update when they emit events
// It has two objects, food is passed in via props, and person is created when the mixin is initialized
var Pairing = React.createClass({
    mixins: [ModelBinding],
    propTypes: {
        personName: React.PropTypes.string.isRequired
    },
    modelBindings: {
        food: 'props',
        person: function(){
            return new Person({name: this.props.personName, food: this.props.food});
        }
    },
    bindEvents: {
        food: 'change:name' // specify that we only care about the change:name event
                            // person will default to listening for 'change'
    },
    render: function () {
        // the `dataBindings` definition above allow access to `food` and `person` from `this`
        return (
            <div>{this.person.name} eats {this.food.name} with a {this.person.utensil}</div>
        );
    }
});

// Menu is a plain React class (no mixin).
var Menu = React.createClass({
    getInitialState: function(){
        return { food: new Food({name: RandomFood()}) };
    },
    updateFood: function(){
        this.food.name = RandomFood(); // will emit a 'change:food' event
        // The "Pairing" component is listening and will re-render
    },
    render: function() {
        return (
            <div>
                <button onClick={this.updateFood}>Update</button>
                <Pairing food={this.state.food} personName={'Joan'} />
            </div>
        );
    }
});
```


## API

#### modelBindings

Specifies objects to be bound. A derived properties will be set for each property name, and the value will be set to either the object from 'props' or by the results of a function.

If not given, modelBindings will be created for any props named "model" or "collection"

**Example:**
```javascript
    modelBindings: {
        foo: 'props',  // will use whatever value comes from props
        bar: function(){ new Model(); }
    }
```

#### bindEvents

Events to listen for.  By default objects will listen for the `change` event, and 'collections' will listen for `add`, `remove`, and `reset`.  Since ReactModelBinding attempts to be tool agnostic, objects are assumed to be a collection if they are named "collection or have an `isCollection` property.

**Example:**
```javascript
    modelBindings: {
        foo: 'props',
        collection: function(){ new Collection(); },
        bar: function(){ new Model(); }
    },
    bindEvents: {
        foo: 'change:name change:title loading',  // will ONLY listen for changes to name & title, and the "loading" event
        // bar is not mentioned so it will listen to 'change'
        // collection is not mentioned but it's named "collection", hence it will listen to `add remove reset`
    }
```

#### onModelBind(model, name)

Will be called whenever an object is bound, either when it's initially configured or when changed.

`name` is the property name of the object, as given in `modelBindings`

#### onModelUnbind(model, name)

Will be called whenever an object has it's listeners removed, either because it's being replaced by another object (which onModelBind will be called with), or when the component is the process of being removed.

`name` is the property name of the object, as given in `modelBindings`

**Note:** There is no need to unbind events that may have been established during `onModelBind`, the mixin will unbind all event listeners that have the component as the target automatically.

**Example:**
```javascript
    modelBindings: {
        food: function(){ new Food(); }
    },
    onModelBind: function(model, name) {
        if ('food' === name){
            this.modelBindings.listenTo(model, 'change:food', this.onFoodUpdate);
        }
        GlobalModelListners.add(model);
    },
    onModelUnbind: function(model, name) {
        // since the onFoodUpdate listener is part of "this" component we don't need to unbind it
        GlobalModelListners.remove(model);
    },
    onFoodUpdate: function(){
        if( this.food.isEdible ){ this.forceUpdate(); }
    }
```

#### setModelState

If given, a method that will be called whenever an event fires.  If this is implemented, it is responsible for triggering the change on the component via `setState` or `forceUpdate`.  If `setModelState` is not present, `forceUpdate` will be called on the component whenever a listened to event occurs.

 **Note:**  Using this method isn't very "Reacty". Ideally you should allow events to fire and deal with the state as it is during render.   The only really valid use-case for `setModelState` is to prevent a possibly expensive computation from occurring during render.  And even that is fairly weak, ideally you could just prevent the model from firing the event in the first place.


**Example:**
```javascript
    propTypes: {
        isObservingUpdates: React.PropTypes.bool
    },
    modelBindings: {
        person: 'props'
    },
    setModelState: function(){
        if ( @props.isObservingUpdates ) {  this.forceUpdate();  }
    },
    render: function(){
        // somewhat contrived, but imagine that calculating
        // climateChangeImpact can only be done on-the-fly and is an expensive computation
        return (
            <div>{this.person.name} has {this.person.climateChangeImpact()} impact</div>
        );
    }
```
