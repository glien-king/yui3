(function() {

    var M = function(Y) {

        var P = Y.Plugin;

        // String constants
        var PREFIX = "yui-",
            HIDDEN = PREFIX + "hidden",
            DISABLED = PREFIX + "disabled";

        // Widget node id-to-instance map for now, 1-to-1. 
        // Expand to nodeid-to-arrayofinstances if required.
        var _instances = {};

        /**
         * A base class for widgets, providing:
         * <ul>
         *    <li>The render lifecycle method to the init and destroy lifecycle 
         *        methods provide by Base</li>
         *    <li>Abstract methods to support consistent MVC structure across 
         *        widgets: renderer, initUI, syncUI</li>
         *    <li>Event subscriber support when binding listeners for model, ui 
         *        synchronization: onUI, setUI</li>
         *    <li>Support for common widget attributes, such as id, node, visible, 
         *        disabled, strings</li>
         *    <li>Plugin registration and activation support</li>
         * </ul>
         * 
         * @param config {Object} Object literal specifying widget configuration 
         * properties (may container both attributes and non attribute configuration).
         * 
         * @class YUI.Widget
         * @extends YUI.Base
         */
        function Widget(config) {
            Y.log('constructor called', 'life', 'Widget');

            this._normalizeNodeId(config);

            this.rendered = false;
            this._plugins = {};

            Widget.superclass.constructor.apply(this, arguments);
        }

        /**
         * Static property used to provie a string to identify the class.
         * Currently used to apply class identifiers to the root node
         * and to classify events.
         * 
         * @property YUI.Widget.NAME
         * @type {String}
         * @static
         */
        Widget.NAME = "widget";

        /**
         * Static property used to define default attribute configuration
         * for the Widget.
         * 
         * @property YUI.Widget.ATTRS
         * @type {Object}
         */
        Widget.ATTRS = {
            id: {},

            node: {},

            parent: {}, // TODO, reconcile parent, id, node

            disabled: {
                value: false
            },

            visible: {
                value: false
            },

            strings: {
                // Widget UI strings go here
            }
        };

        /**
         * Getter to obtain Widget instances by id.
         * 
         * @method YUI.Widget.getById
         * @param id {String} Id used to identify the widget uniquely.
         * @return {Widget} Widget instance
         */
        Widget.getById = function(id) {
            return _instances[id];
        };

        var proto = {

            /**
             * Initializer lifecycle implementation for the Widget class.
             * 
             * Base.init will invoke all prototype.initializer methods, for the
             * class hierarchy (starting from Base), after all attributes have 
             * been initialized.
             * 
             * @param  config {Object} Configuration obejct literal for the widget
             */
            initializer: function(config) {
                Y.log('initializer called', 'life', 'Widget');
                
                this._initPlugins(config);
                _instances[this.get('id')] = this;
            },

            /**
             * Descructor lifecycle implementation for the Widget class.
             * 
             * Base.destroy will invoke all prototype.destructor methods, for the
             * class hierarchy (starting from the lowest sub-class).
             * 
             * @param  config {Object} Configuration obejct literal for the widget
             */
            destructor: function() {
                Y.log('destructor called', 'life', 'Widget');

                this._destroyPlugins();
                delete _instances[this.get('id')];
            },

            /**
             * Establishes the initial DOM for the widget. Invoking this
             * method will lead to the creating of all DOM elements for
             * the widget (or the manipulation of existing DOM elements 
             * for the progressive enhancement use case).
             * <p>
             * This method should only be invoked once for an initialized
             * widget.
             * </p>
             * <p>
             * It delegates to the widget specific renderer method to do
             * the actual work.
             * </p>
             * 
             * @method render
             * @public
             * @chain
             * @final 
             */
            render: function() {
                if (this.destroyed) {
                    throw('render failed; widget has been destroyed');
                }

                if (!this._rendered && this.fire("beforeRender") !== false) {

                    if (this.renderer) {
                        this.renderer();
                    }

                    this._initUI();
                    this._syncUI();

                    this.rendered = true;
                    this.fire("render");
                }

                return this;
            },

            /** 
             * Creates DOM (or manipulates DOM for progressive enhancement)
             * This method is invoked by render() and is not chained 
             * automatically for the class hierarchy (like initializer, destructor) 
             * so it should be chained manually for subclasses if required.
             * 
             * @method renderer
             */
            renderer: function() {},

            /**
             * Configures/Setsup listeners to bind Widget State to UI/DOM
             * 
             * This method is not called by framework and is not chained 
             * automatically for the class hierarchy.
             * 
             * @method initUI
             */
            initUI: function(){},

            /**
             * Refreshes the rendered UI, based on Widget State
             * 
             * This method is not called by framework and is not chained
             * automatically for the class hierarchy.
             * 
             * @method syncUI
             */
            syncUI: function(){},

            /**
             * Sets the state of an attribute, based on UI state
             * change. Used to indentify the source of a change as 
             * UI based, so corresponding onUI listeners are not
             * invoked (since the UI state is already in sync)
             * 
             * @method setUI
             * @param name {String} attribute name
             * @param value {Any} attribute value
             * @param eventCfg {Object|boolean} Event configuration for the
             * set - silent, source etc. If boolean, true, the set occurs 
             * silently
             */
            setUI: function() {
                // TODO: Will identify sets with UI sources, once Event 
                // and AttributeProvider support is in place for event 
                // data
                return this.set.apply(this, arguments);
            },

            /**
             * Sets up an event listeners specifically to sync UI with
             * attribute state. These listeners will NOT be invoked if 
             * the setUI method is used to set the attribute (see setUI)
             * 
             * @method onUI
             * @param type {String} type of event
             * @param callback {Function} handler for the event
             */
            onUI: function() {
                // TODO: Will identify listeners for UI sources, once 
                // Event and AttributeProvider support is in place for 
                // event data
                return this.on.apply(this, arguments);
            },

            hide: function() {
                return this.set('visible', false);
            },

            show: function() {
                return this.set('visible', true);
            },

            enable: function() {
                return this.set('enabled', true);
            },

            disable: function() {
                return this.set('disabled', false);
            },

            /**
             * Sets the state of an attribute. Wrapper for
             * AttributeProvider.set, with additional ability 
             * to chain.
             * 
             * @method setUI
             * @chain
             */
            set: function() { // extend to chain set calls
                Y.Attribute.Provider.prototype.set.apply(this, arguments);
                return this;
            },

            // TODO: Reimplement with new Node Facade
            getNodeAttr: function(attr) {
                if (this._node) {
                    return this._node[attr];
                }
                return undefined;
            },

            // TODO: Reimplement with new Node Facade
            setNodeAttr: function(attr, val) {
                if (this._node) {
                    this._node[attr] = val;
                }
                return this;
            },

            /**
             * Register and instantiate a plugin with the Widget.
             * 
             * @param p {String | Object |Array} Accepts the registered 
             * namespace for the Plugin or an object literal with an "ns" property
             * specifying the namespace for the Plugin and a "cfg" property specifying
             * the configuration for the Plugin.
             * <p>
             * Additionally an Array can also be passed in, with either String or 
             * Object literal elements, allowing for multiple plugin registration in 
             * a single call
             * </p>
             * @method plug
             * @chain
             * @public
             */
            plug: function(p) {
                var a = arguments,
                    p = a[0];
                if (Y.lang.isArray(p)) {
                    var ln = p.length;
                    for (var i = 0; i < ln; i++) {
                        this.plug(p[i]);
                    }
                } else if (Y.lang.isString(p)) {
                    this._plug(p);
                } else {
                    this._plug(p.ns, p.cfg);
                }
                return this;
            },

            /**
             * Unregister and destroy a plugin already instantiated with the Widget.
             * 
             * @method unplug
             * @param {String} ns The namespace key for the Plugin
             * @chain
             * @public
             */
            unplug: function(ns) {
                if (ns) {
                    this._unplug(ns);
                } else {
                    for (ns in this._plugins) {
                        this._unplug(ns);
                    }
                }
                return this;
            },

            /**
             * Determines if a plugin has been registered and instantiated 
             * for this widget.
             * 
             * @method hasPlugin
             * @public
             * @return {Boolean} returns true, if the plugin has been applied
             * to this widget.
             */
            hasPlugin : function(ns) {
                return (this._plugins[ns] && this[ns]);
            },

            /**
             * @private
             */
            _initPlugins: function(config) {

                // Class Configuration
                var classes = this._getClasses(), constructor;
                for (var i = 0; i < classes.length; i++) {
                    constructor = classes[i];
                    if (constructor.PLUGINS) {
                        this.plug(constructor.PLUGINS);
                    }
                }

                // User Configuration
                if (config && config.plugins) {
                    this.plug(config.plugins);
                }
            },

            /**
             * For readability, symmetry - wrapper for _unplug
             * // TODO - should be able to just do ??
             * 
             * _destoryPlugins: this._unplug
             * @private
             */
            _destroyPlugins: function() {
                this._unplug();
            },

            /**
             * @private
             */
            _plug: function(ns, config) {
                if (ns) {
                    var PluginClass = P.get(ns);
                    if (PluginClass) {

                        config = config || {};
                        config.owner = this;

                        if (this.hasPlugin(ns)) {
                            // Update config
                            this[ns].setAttributeConfigs(config, false);
                        } else {
                            // Create new instance
                            this[ns] = new PluginClass(config);
                            this._plugins[ns] = PluginClass;
                        }
                    }
                }
            },

            /**
             * @private
             */
            _unplug : function(ns) {
                if (ns) {
                    if (this[ns]) {
                        this[ns].destroy();
                        delete this[ns];
                    }
                    if (this._plugins[ns]) {
                        delete this._plugins[ns];
                    }
                }
            },

            /**
             * @protected
             */
            _initUI: function() {
                this._initRootNode();

                this.onUI('visibleChange', this._onVisibleChange);
                this.onUI('disabledChange', this._onDisabledChange);
            },

            /**
             * Syncs state of the UI with the widget state
             * @protected
             */
            _syncUI: function() {
                this._uiSetVisible(this.get('visible'));
                this._uiSetDisabled(this.get('disabled'));
            },

            /**
             * Sets the state of the visible UI
             * 
             * @protected
             * @param {boolean} val
             */
            _uiSetVisible: function(val) {
                if (val === true) { 
                    Y.Dom.removeClass(this._node, HIDDEN); 
                } else {
                    Y.Dom.addClass(this._node, HIDDEN); 
                }
            },

            /**
             * Sets the state of the disabled/enabled UI
             * 
             * @protected
             * @param {boolean} val
             */
            _uiSetDisabled: function(val) {
                if (val === true) {
                    Y.Dom.addClass(this._node, DISABLED);
                } else {
                    Y.Dom.removeClass(this._node, DISABLED);
                }
            },

            _normalizeNodeId : function(config) {

                if (_instances[config.id]) {
                    throw('unique id required');
                }

                /*
                if (!config.id && !config.node && !config.parent) {
                    throw('You need to specify and id, node or parent to provide a location in the DOM to insert the widget');
                }

                if (config.node && config.node instanceof Y.Node) {
                    if (config.node.id()) {
                        config.id = config.node.id();
                    } else {
                        config.id = Y.Node.generateId();
                        config.node.id(config.id);
                    }
                }

                if (!config.id) {
                    config.id = Y.Dom.generateId();
                }
                */
            },

            _initRootNode: function() {

                // TODO: Node to Id, Id to Node
                this._node = Y.Dom.get(this.get('id'));
                this.set('node', this._node);

                var classes = this._getClasses(), constructor;

                // Starting from 1, because we don't need Base (yui-base) marker
                for (var i = 1; i < classes.length; i++) {
                    constructor = classes[i];
                    if (constructor.NAME) {
                        Y.Dom.addClass(this._node, PREFIX + constructor.NAME.toLowerCase());
                    }
                }
            },

            /**
             * Visible attribute UI handler
             * 
             * @param {Object} evt
             */
            _onVisibleChange: function(evt) {
                this._uiSetVisible(evt.newValue);
            },

            /**
             * Disabled attribute UI handler
             * 
             * @param {Object} evt
             */
            _onDisabledChange: function(evt) {
                this._uiSetDisabled(evt.newValue);
            },

            toString: function() {
                return this.constructor.NAME + "[" + this.get('id') + "]";
            },

            /**
             * Used when dynamically creating the bounding box node for the widget
             */
            ROOT_NODE: "div"
        };

        /**
         * Static registration of default plugins for the class.
         * 
         * @property Y.Widget.PLUGINS
         * @static
         */
        Widget.PLUGINS = [
            // Placeholder for Widget Class Default plugins
            // {ns:P.Mouse.NS, cfg:mousecfg}
        ];

        Y.extend(Widget, Y.Base, proto);
        Y.Widget = Widget;
    };

    YUI.add("widget", M, "3.0.0");
})();