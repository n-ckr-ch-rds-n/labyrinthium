
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop$1() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop$1;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop$1;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    /**
     * Schedules a callback to run immediately before the component is unmounted.
     *
     * Out of `onMount`, `beforeUpdate`, `afterUpdate` and `onDestroy`, this is the
     * only one that runs inside a server-side component.
     *
     * https://svelte.dev/docs#run-time-svelte-ondestroy
     */
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    /**
     * Creates an event dispatcher that can be used to dispatch [component events](/docs#template-syntax-component-directives-on-eventname).
     * Event dispatchers are functions that can take two arguments: `name` and `detail`.
     *
     * Component events created with `createEventDispatcher` create a
     * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
     * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
     * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
     * property and can contain any type of data.
     *
     * https://svelte.dev/docs#run-time-svelte-createeventdispatcher
     */
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail, { cancelable = false } = {}) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail, { cancelable });
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
                return !event.defaultPrevented;
            }
            return true;
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function bind$1(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop$1,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop$1;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop$1;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.53.1' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    var Direction;
    (function (Direction) {
        Direction["North"] = "north";
        Direction["South"] = "south";
        Direction["East"] = "east";
        Direction["West"] = "west";
    })(Direction || (Direction = {}));

    class MovementService {
        constructor() {
            this.newPositionByDirection = {
                [Direction.North]: (currentPosition) => (Object.assign(Object.assign({}, currentPosition), { row: currentPosition.row - 1 })),
                [Direction.South]: (currentPosition) => (Object.assign(Object.assign({}, currentPosition), { row: currentPosition.row + 1 })),
                [Direction.East]: (currentPosition) => (Object.assign(Object.assign({}, currentPosition), { column: currentPosition.column + 1 })),
                [Direction.West]: (currentPosition) => (Object.assign(Object.assign({}, currentPosition), { column: currentPosition.column - 1 }))
            };
        }
        toNewPosition(currentPosition, direction) {
            return this.newPositionByDirection[direction](currentPosition);
        }
    }

    var SquareKind;
    (function (SquareKind) {
        SquareKind["Wall"] = "wall";
        SquareKind["Path"] = "path";
        SquareKind["End"] = "end";
        SquareKind["Start"] = "start";
        SquareKind["Wanderer"] = "wanderer";
    })(SquareKind || (SquareKind = {}));

    class DrawService {
        constructor(gameContext, _squareWidth) {
            this.gameContext = gameContext;
            this._squareWidth = _squareWidth;
            this.colourBySquareKind = {
                [SquareKind.Path]: 'black',
                [SquareKind.Wall]: 'green',
                [SquareKind.End]: 'orange',
                [SquareKind.Start]: 'white',
                [SquareKind.Wanderer]: 'blue'
            };
        }
        get squareWidth() {
            return this._squareWidth;
        }
        drawSquare(square) {
            this.gameContext.fillStyle = this.colourBySquareKind[square.kind];
            this.gameContext.fillRect(square.x, square.y, this.squareWidth, this.squareWidth);
        }
    }

    class Maze {
        constructor(config, movementService, drawService) {
            this.config = config;
            this.movementService = movementService;
            this.drawService = drawService;
        }
        build() {
            const layout = this.generateLayout();
            const layoutWithRoute = this.toLayoutWithRoute(layout);
            this.drawMaze(layoutWithRoute);
            return {
                startPosition: this.startPosition,
                layout: layoutWithRoute,
            };
        }
        drawMaze(layout) {
            for (const row of layout) {
                for (const square of row) {
                    this.drawService.drawSquare(square);
                }
            }
        }
        toLayoutWithRoute(layout) {
            let totalSteps = this.toTotalSteps(layout);
            this.startPosition = this.toRandomPosition(layout);
            let position = this.startPosition;
            while (totalSteps >= 0) {
                const numberOfStepsToTake = this.toRandomNumberInRange(3, 8);
                const direction = this.generateDirection();
                for (let i = 0; i <= numberOfStepsToTake; i++) {
                    const newPosition = this.movementService.toNewPosition(position, direction);
                    if (this.positionValid(newPosition, layout)) {
                        position = newPosition;
                        layout[position.row][position.column].kind = SquareKind.Path;
                        totalSteps--;
                    }
                }
            }
            layout[position.row][position.column].kind = SquareKind.End;
            layout[this.startPosition.row][this.startPosition.column].kind = SquareKind.Start;
            return layout;
        }
        positionValid(position, layout) {
            return !!(layout[position.row] && layout[position.row][position.column]);
        }
        generateDirection() {
            const directions = Object.values(Direction);
            return directions[this.toRandomNumberInRange(0, directions.length - 1)];
        }
        generateLayout() {
            return [...Array(this.config.numberOfRows)].map((a, i) => {
                const y = i * this.drawService.squareWidth;
                return [...Array(this.config.numberOfColumns)].map((a, i) => ({
                    y, x: i * this.drawService.squareWidth,
                    kind: this.toWallOrPath()
                }));
            });
        }
        toWallOrPath() {
            const squareKinds = [SquareKind.Path, SquareKind.Wall, SquareKind.Wall];
            return squareKinds[this.toRandomNumberInRange(0, squareKinds.length - 1)];
        }
        toRandomNumberInRange(min, max) {
            return Math.floor(Math.random() * (max - min + 1) + min);
        }
        toTotalSteps(layout) {
            return Math.floor(layout.length * layout[0].length / 3);
        }
        toRandomPosition(layout) {
            return {
                row: this.toRandomNumberInRange(0, layout.length - 1),
                column: this.toRandomNumberInRange(0, layout[0].length - 1)
            };
        }
    }

    var GameState;
    (function (GameState) {
        GameState["End"] = "End";
    })(GameState || (GameState = {}));

    class Wanderer {
        constructor(maze, movementService, drawService, gameState) {
            this.maze = maze;
            this.movementService = movementService;
            this.drawService = drawService;
            this.gameState = gameState;
            this.location = Object.assign({}, this.maze.startPosition);
            const startSquare = this.maze.layout[this.location.row][this.location.column];
            this.drawWanderer(startSquare.x, startSquare.y);
        }
        moveWanderer(direction) {
            console.log('Moving wanderer');
            const newPosition = this.movementService.toNewPosition(this.location, direction);
            if (this.newPositionValid(newPosition)) {
                this.clearSquare(this.location);
                const newSquare = this.maze.layout[newPosition.row][newPosition.column];
                this.drawWanderer(newSquare.x, newSquare.y);
                this.location = newPosition;
                if (newSquare.kind === SquareKind.End) {
                    this.gameState.next(GameState.End);
                }
            }
        }
        drawWanderer(x, y) {
            this.drawService.drawSquare({ x, y, kind: SquareKind.Wanderer });
        }
        clearSquare(oldPosition) {
            const squareToClear = this.maze.layout[oldPosition.row][oldPosition.column];
            this.drawService.drawSquare(squareToClear);
        }
        newPositionValid(newPosition) {
            return this.maze.layout[newPosition.row]
                && this.maze.layout[newPosition.row][newPosition.column]
                && [SquareKind.Path, SquareKind.Start, SquareKind.End].includes(this.maze.layout[newPosition.row][newPosition.column].kind);
        }
    }

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise */

    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };

    function __extends(d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }

    function __awaiter(thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }

    function __generator(thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (g && (g = 0, op[0] && (_ = 0)), _) try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0: case 1: t = op; break;
                    case 4: _.label++; return { value: op[1], done: false };
                    case 5: _.label++; y = op[1]; op = [0]; continue;
                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                        if (t[2]) _.ops.pop();
                        _.trys.pop(); continue;
                }
                op = body.call(thisArg, _);
            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
        }
    }

    function __values(o) {
        var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
        if (m) return m.call(o);
        if (o && typeof o.length === "number") return {
            next: function () {
                if (o && i >= o.length) o = void 0;
                return { value: o && o[i++], done: !o };
            }
        };
        throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
    }

    function __read(o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m) return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
        }
        catch (error) { e = { error: error }; }
        finally {
            try {
                if (r && !r.done && (m = i["return"])) m.call(i);
            }
            finally { if (e) throw e.error; }
        }
        return ar;
    }

    function __spreadArray(to, from, pack) {
        if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
            if (ar || !(i in from)) {
                if (!ar) ar = Array.prototype.slice.call(from, 0, i);
                ar[i] = from[i];
            }
        }
        return to.concat(ar || Array.prototype.slice.call(from));
    }

    function __await(v) {
        return this instanceof __await ? (this.v = v, this) : new __await(v);
    }

    function __asyncGenerator(thisArg, _arguments, generator) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var g = generator.apply(thisArg, _arguments || []), i, q = [];
        return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
        function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
        function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
        function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
        function fulfill(value) { resume("next", value); }
        function reject(value) { resume("throw", value); }
        function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
    }

    function __asyncValues(o) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var m = o[Symbol.asyncIterator], i;
        return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
        function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
        function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
    }

    function isFunction(value) {
        return typeof value === 'function';
    }

    function createErrorClass(createImpl) {
        var _super = function (instance) {
            Error.call(instance);
            instance.stack = new Error().stack;
        };
        var ctorFunc = createImpl(_super);
        ctorFunc.prototype = Object.create(Error.prototype);
        ctorFunc.prototype.constructor = ctorFunc;
        return ctorFunc;
    }

    var UnsubscriptionError = createErrorClass(function (_super) {
        return function UnsubscriptionErrorImpl(errors) {
            _super(this);
            this.message = errors
                ? errors.length + " errors occurred during unsubscription:\n" + errors.map(function (err, i) { return i + 1 + ") " + err.toString(); }).join('\n  ')
                : '';
            this.name = 'UnsubscriptionError';
            this.errors = errors;
        };
    });

    function arrRemove(arr, item) {
        if (arr) {
            var index = arr.indexOf(item);
            0 <= index && arr.splice(index, 1);
        }
    }

    var Subscription = (function () {
        function Subscription(initialTeardown) {
            this.initialTeardown = initialTeardown;
            this.closed = false;
            this._parentage = null;
            this._finalizers = null;
        }
        Subscription.prototype.unsubscribe = function () {
            var e_1, _a, e_2, _b;
            var errors;
            if (!this.closed) {
                this.closed = true;
                var _parentage = this._parentage;
                if (_parentage) {
                    this._parentage = null;
                    if (Array.isArray(_parentage)) {
                        try {
                            for (var _parentage_1 = __values(_parentage), _parentage_1_1 = _parentage_1.next(); !_parentage_1_1.done; _parentage_1_1 = _parentage_1.next()) {
                                var parent_1 = _parentage_1_1.value;
                                parent_1.remove(this);
                            }
                        }
                        catch (e_1_1) { e_1 = { error: e_1_1 }; }
                        finally {
                            try {
                                if (_parentage_1_1 && !_parentage_1_1.done && (_a = _parentage_1.return)) _a.call(_parentage_1);
                            }
                            finally { if (e_1) throw e_1.error; }
                        }
                    }
                    else {
                        _parentage.remove(this);
                    }
                }
                var initialFinalizer = this.initialTeardown;
                if (isFunction(initialFinalizer)) {
                    try {
                        initialFinalizer();
                    }
                    catch (e) {
                        errors = e instanceof UnsubscriptionError ? e.errors : [e];
                    }
                }
                var _finalizers = this._finalizers;
                if (_finalizers) {
                    this._finalizers = null;
                    try {
                        for (var _finalizers_1 = __values(_finalizers), _finalizers_1_1 = _finalizers_1.next(); !_finalizers_1_1.done; _finalizers_1_1 = _finalizers_1.next()) {
                            var finalizer = _finalizers_1_1.value;
                            try {
                                execFinalizer(finalizer);
                            }
                            catch (err) {
                                errors = errors !== null && errors !== void 0 ? errors : [];
                                if (err instanceof UnsubscriptionError) {
                                    errors = __spreadArray(__spreadArray([], __read(errors)), __read(err.errors));
                                }
                                else {
                                    errors.push(err);
                                }
                            }
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (_finalizers_1_1 && !_finalizers_1_1.done && (_b = _finalizers_1.return)) _b.call(_finalizers_1);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                }
                if (errors) {
                    throw new UnsubscriptionError(errors);
                }
            }
        };
        Subscription.prototype.add = function (teardown) {
            var _a;
            if (teardown && teardown !== this) {
                if (this.closed) {
                    execFinalizer(teardown);
                }
                else {
                    if (teardown instanceof Subscription) {
                        if (teardown.closed || teardown._hasParent(this)) {
                            return;
                        }
                        teardown._addParent(this);
                    }
                    (this._finalizers = (_a = this._finalizers) !== null && _a !== void 0 ? _a : []).push(teardown);
                }
            }
        };
        Subscription.prototype._hasParent = function (parent) {
            var _parentage = this._parentage;
            return _parentage === parent || (Array.isArray(_parentage) && _parentage.includes(parent));
        };
        Subscription.prototype._addParent = function (parent) {
            var _parentage = this._parentage;
            this._parentage = Array.isArray(_parentage) ? (_parentage.push(parent), _parentage) : _parentage ? [_parentage, parent] : parent;
        };
        Subscription.prototype._removeParent = function (parent) {
            var _parentage = this._parentage;
            if (_parentage === parent) {
                this._parentage = null;
            }
            else if (Array.isArray(_parentage)) {
                arrRemove(_parentage, parent);
            }
        };
        Subscription.prototype.remove = function (teardown) {
            var _finalizers = this._finalizers;
            _finalizers && arrRemove(_finalizers, teardown);
            if (teardown instanceof Subscription) {
                teardown._removeParent(this);
            }
        };
        Subscription.EMPTY = (function () {
            var empty = new Subscription();
            empty.closed = true;
            return empty;
        })();
        return Subscription;
    }());
    var EMPTY_SUBSCRIPTION = Subscription.EMPTY;
    function isSubscription(value) {
        return (value instanceof Subscription ||
            (value && 'closed' in value && isFunction(value.remove) && isFunction(value.add) && isFunction(value.unsubscribe)));
    }
    function execFinalizer(finalizer) {
        if (isFunction(finalizer)) {
            finalizer();
        }
        else {
            finalizer.unsubscribe();
        }
    }

    var config = {
        onUnhandledError: null,
        onStoppedNotification: null,
        Promise: undefined,
        useDeprecatedSynchronousErrorHandling: false,
        useDeprecatedNextContext: false,
    };

    var timeoutProvider = {
        setTimeout: function (handler, timeout) {
            var args = [];
            for (var _i = 2; _i < arguments.length; _i++) {
                args[_i - 2] = arguments[_i];
            }
            var delegate = timeoutProvider.delegate;
            if (delegate === null || delegate === void 0 ? void 0 : delegate.setTimeout) {
                return delegate.setTimeout.apply(delegate, __spreadArray([handler, timeout], __read(args)));
            }
            return setTimeout.apply(void 0, __spreadArray([handler, timeout], __read(args)));
        },
        clearTimeout: function (handle) {
            var delegate = timeoutProvider.delegate;
            return ((delegate === null || delegate === void 0 ? void 0 : delegate.clearTimeout) || clearTimeout)(handle);
        },
        delegate: undefined,
    };

    function reportUnhandledError(err) {
        timeoutProvider.setTimeout(function () {
            {
                throw err;
            }
        });
    }

    function noop() { }

    var context = null;
    function errorContext(cb) {
        if (config.useDeprecatedSynchronousErrorHandling) {
            var isRoot = !context;
            if (isRoot) {
                context = { errorThrown: false, error: null };
            }
            cb();
            if (isRoot) {
                var _a = context, errorThrown = _a.errorThrown, error = _a.error;
                context = null;
                if (errorThrown) {
                    throw error;
                }
            }
        }
        else {
            cb();
        }
    }

    var Subscriber = (function (_super) {
        __extends(Subscriber, _super);
        function Subscriber(destination) {
            var _this = _super.call(this) || this;
            _this.isStopped = false;
            if (destination) {
                _this.destination = destination;
                if (isSubscription(destination)) {
                    destination.add(_this);
                }
            }
            else {
                _this.destination = EMPTY_OBSERVER;
            }
            return _this;
        }
        Subscriber.create = function (next, error, complete) {
            return new SafeSubscriber(next, error, complete);
        };
        Subscriber.prototype.next = function (value) {
            if (this.isStopped) ;
            else {
                this._next(value);
            }
        };
        Subscriber.prototype.error = function (err) {
            if (this.isStopped) ;
            else {
                this.isStopped = true;
                this._error(err);
            }
        };
        Subscriber.prototype.complete = function () {
            if (this.isStopped) ;
            else {
                this.isStopped = true;
                this._complete();
            }
        };
        Subscriber.prototype.unsubscribe = function () {
            if (!this.closed) {
                this.isStopped = true;
                _super.prototype.unsubscribe.call(this);
                this.destination = null;
            }
        };
        Subscriber.prototype._next = function (value) {
            this.destination.next(value);
        };
        Subscriber.prototype._error = function (err) {
            try {
                this.destination.error(err);
            }
            finally {
                this.unsubscribe();
            }
        };
        Subscriber.prototype._complete = function () {
            try {
                this.destination.complete();
            }
            finally {
                this.unsubscribe();
            }
        };
        return Subscriber;
    }(Subscription));
    var _bind = Function.prototype.bind;
    function bind(fn, thisArg) {
        return _bind.call(fn, thisArg);
    }
    var ConsumerObserver = (function () {
        function ConsumerObserver(partialObserver) {
            this.partialObserver = partialObserver;
        }
        ConsumerObserver.prototype.next = function (value) {
            var partialObserver = this.partialObserver;
            if (partialObserver.next) {
                try {
                    partialObserver.next(value);
                }
                catch (error) {
                    handleUnhandledError(error);
                }
            }
        };
        ConsumerObserver.prototype.error = function (err) {
            var partialObserver = this.partialObserver;
            if (partialObserver.error) {
                try {
                    partialObserver.error(err);
                }
                catch (error) {
                    handleUnhandledError(error);
                }
            }
            else {
                handleUnhandledError(err);
            }
        };
        ConsumerObserver.prototype.complete = function () {
            var partialObserver = this.partialObserver;
            if (partialObserver.complete) {
                try {
                    partialObserver.complete();
                }
                catch (error) {
                    handleUnhandledError(error);
                }
            }
        };
        return ConsumerObserver;
    }());
    var SafeSubscriber = (function (_super) {
        __extends(SafeSubscriber, _super);
        function SafeSubscriber(observerOrNext, error, complete) {
            var _this = _super.call(this) || this;
            var partialObserver;
            if (isFunction(observerOrNext) || !observerOrNext) {
                partialObserver = {
                    next: (observerOrNext !== null && observerOrNext !== void 0 ? observerOrNext : undefined),
                    error: error !== null && error !== void 0 ? error : undefined,
                    complete: complete !== null && complete !== void 0 ? complete : undefined,
                };
            }
            else {
                var context_1;
                if (_this && config.useDeprecatedNextContext) {
                    context_1 = Object.create(observerOrNext);
                    context_1.unsubscribe = function () { return _this.unsubscribe(); };
                    partialObserver = {
                        next: observerOrNext.next && bind(observerOrNext.next, context_1),
                        error: observerOrNext.error && bind(observerOrNext.error, context_1),
                        complete: observerOrNext.complete && bind(observerOrNext.complete, context_1),
                    };
                }
                else {
                    partialObserver = observerOrNext;
                }
            }
            _this.destination = new ConsumerObserver(partialObserver);
            return _this;
        }
        return SafeSubscriber;
    }(Subscriber));
    function handleUnhandledError(error) {
        {
            reportUnhandledError(error);
        }
    }
    function defaultErrorHandler(err) {
        throw err;
    }
    var EMPTY_OBSERVER = {
        closed: true,
        next: noop,
        error: defaultErrorHandler,
        complete: noop,
    };

    var observable = (function () { return (typeof Symbol === 'function' && Symbol.observable) || '@@observable'; })();

    function identity(x) {
        return x;
    }

    function pipeFromArray(fns) {
        if (fns.length === 0) {
            return identity;
        }
        if (fns.length === 1) {
            return fns[0];
        }
        return function piped(input) {
            return fns.reduce(function (prev, fn) { return fn(prev); }, input);
        };
    }

    var Observable = (function () {
        function Observable(subscribe) {
            if (subscribe) {
                this._subscribe = subscribe;
            }
        }
        Observable.prototype.lift = function (operator) {
            var observable = new Observable();
            observable.source = this;
            observable.operator = operator;
            return observable;
        };
        Observable.prototype.subscribe = function (observerOrNext, error, complete) {
            var _this = this;
            var subscriber = isSubscriber(observerOrNext) ? observerOrNext : new SafeSubscriber(observerOrNext, error, complete);
            errorContext(function () {
                var _a = _this, operator = _a.operator, source = _a.source;
                subscriber.add(operator
                    ?
                        operator.call(subscriber, source)
                    : source
                        ?
                            _this._subscribe(subscriber)
                        :
                            _this._trySubscribe(subscriber));
            });
            return subscriber;
        };
        Observable.prototype._trySubscribe = function (sink) {
            try {
                return this._subscribe(sink);
            }
            catch (err) {
                sink.error(err);
            }
        };
        Observable.prototype.forEach = function (next, promiseCtor) {
            var _this = this;
            promiseCtor = getPromiseCtor(promiseCtor);
            return new promiseCtor(function (resolve, reject) {
                var subscriber = new SafeSubscriber({
                    next: function (value) {
                        try {
                            next(value);
                        }
                        catch (err) {
                            reject(err);
                            subscriber.unsubscribe();
                        }
                    },
                    error: reject,
                    complete: resolve,
                });
                _this.subscribe(subscriber);
            });
        };
        Observable.prototype._subscribe = function (subscriber) {
            var _a;
            return (_a = this.source) === null || _a === void 0 ? void 0 : _a.subscribe(subscriber);
        };
        Observable.prototype[observable] = function () {
            return this;
        };
        Observable.prototype.pipe = function () {
            var operations = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                operations[_i] = arguments[_i];
            }
            return pipeFromArray(operations)(this);
        };
        Observable.prototype.toPromise = function (promiseCtor) {
            var _this = this;
            promiseCtor = getPromiseCtor(promiseCtor);
            return new promiseCtor(function (resolve, reject) {
                var value;
                _this.subscribe(function (x) { return (value = x); }, function (err) { return reject(err); }, function () { return resolve(value); });
            });
        };
        Observable.create = function (subscribe) {
            return new Observable(subscribe);
        };
        return Observable;
    }());
    function getPromiseCtor(promiseCtor) {
        var _a;
        return (_a = promiseCtor !== null && promiseCtor !== void 0 ? promiseCtor : config.Promise) !== null && _a !== void 0 ? _a : Promise;
    }
    function isObserver(value) {
        return value && isFunction(value.next) && isFunction(value.error) && isFunction(value.complete);
    }
    function isSubscriber(value) {
        return (value && value instanceof Subscriber) || (isObserver(value) && isSubscription(value));
    }

    function hasLift(source) {
        return isFunction(source === null || source === void 0 ? void 0 : source.lift);
    }
    function operate(init) {
        return function (source) {
            if (hasLift(source)) {
                return source.lift(function (liftedSource) {
                    try {
                        return init(liftedSource, this);
                    }
                    catch (err) {
                        this.error(err);
                    }
                });
            }
            throw new TypeError('Unable to lift unknown Observable type');
        };
    }

    function createOperatorSubscriber(destination, onNext, onComplete, onError, onFinalize) {
        return new OperatorSubscriber(destination, onNext, onComplete, onError, onFinalize);
    }
    var OperatorSubscriber = (function (_super) {
        __extends(OperatorSubscriber, _super);
        function OperatorSubscriber(destination, onNext, onComplete, onError, onFinalize, shouldUnsubscribe) {
            var _this = _super.call(this, destination) || this;
            _this.onFinalize = onFinalize;
            _this.shouldUnsubscribe = shouldUnsubscribe;
            _this._next = onNext
                ? function (value) {
                    try {
                        onNext(value);
                    }
                    catch (err) {
                        destination.error(err);
                    }
                }
                : _super.prototype._next;
            _this._error = onError
                ? function (err) {
                    try {
                        onError(err);
                    }
                    catch (err) {
                        destination.error(err);
                    }
                    finally {
                        this.unsubscribe();
                    }
                }
                : _super.prototype._error;
            _this._complete = onComplete
                ? function () {
                    try {
                        onComplete();
                    }
                    catch (err) {
                        destination.error(err);
                    }
                    finally {
                        this.unsubscribe();
                    }
                }
                : _super.prototype._complete;
            return _this;
        }
        OperatorSubscriber.prototype.unsubscribe = function () {
            var _a;
            if (!this.shouldUnsubscribe || this.shouldUnsubscribe()) {
                var closed_1 = this.closed;
                _super.prototype.unsubscribe.call(this);
                !closed_1 && ((_a = this.onFinalize) === null || _a === void 0 ? void 0 : _a.call(this));
            }
        };
        return OperatorSubscriber;
    }(Subscriber));

    var ObjectUnsubscribedError = createErrorClass(function (_super) {
        return function ObjectUnsubscribedErrorImpl() {
            _super(this);
            this.name = 'ObjectUnsubscribedError';
            this.message = 'object unsubscribed';
        };
    });

    var Subject = (function (_super) {
        __extends(Subject, _super);
        function Subject() {
            var _this = _super.call(this) || this;
            _this.closed = false;
            _this.currentObservers = null;
            _this.observers = [];
            _this.isStopped = false;
            _this.hasError = false;
            _this.thrownError = null;
            return _this;
        }
        Subject.prototype.lift = function (operator) {
            var subject = new AnonymousSubject(this, this);
            subject.operator = operator;
            return subject;
        };
        Subject.prototype._throwIfClosed = function () {
            if (this.closed) {
                throw new ObjectUnsubscribedError();
            }
        };
        Subject.prototype.next = function (value) {
            var _this = this;
            errorContext(function () {
                var e_1, _a;
                _this._throwIfClosed();
                if (!_this.isStopped) {
                    if (!_this.currentObservers) {
                        _this.currentObservers = Array.from(_this.observers);
                    }
                    try {
                        for (var _b = __values(_this.currentObservers), _c = _b.next(); !_c.done; _c = _b.next()) {
                            var observer = _c.value;
                            observer.next(value);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                }
            });
        };
        Subject.prototype.error = function (err) {
            var _this = this;
            errorContext(function () {
                _this._throwIfClosed();
                if (!_this.isStopped) {
                    _this.hasError = _this.isStopped = true;
                    _this.thrownError = err;
                    var observers = _this.observers;
                    while (observers.length) {
                        observers.shift().error(err);
                    }
                }
            });
        };
        Subject.prototype.complete = function () {
            var _this = this;
            errorContext(function () {
                _this._throwIfClosed();
                if (!_this.isStopped) {
                    _this.isStopped = true;
                    var observers = _this.observers;
                    while (observers.length) {
                        observers.shift().complete();
                    }
                }
            });
        };
        Subject.prototype.unsubscribe = function () {
            this.isStopped = this.closed = true;
            this.observers = this.currentObservers = null;
        };
        Object.defineProperty(Subject.prototype, "observed", {
            get: function () {
                var _a;
                return ((_a = this.observers) === null || _a === void 0 ? void 0 : _a.length) > 0;
            },
            enumerable: false,
            configurable: true
        });
        Subject.prototype._trySubscribe = function (subscriber) {
            this._throwIfClosed();
            return _super.prototype._trySubscribe.call(this, subscriber);
        };
        Subject.prototype._subscribe = function (subscriber) {
            this._throwIfClosed();
            this._checkFinalizedStatuses(subscriber);
            return this._innerSubscribe(subscriber);
        };
        Subject.prototype._innerSubscribe = function (subscriber) {
            var _this = this;
            var _a = this, hasError = _a.hasError, isStopped = _a.isStopped, observers = _a.observers;
            if (hasError || isStopped) {
                return EMPTY_SUBSCRIPTION;
            }
            this.currentObservers = null;
            observers.push(subscriber);
            return new Subscription(function () {
                _this.currentObservers = null;
                arrRemove(observers, subscriber);
            });
        };
        Subject.prototype._checkFinalizedStatuses = function (subscriber) {
            var _a = this, hasError = _a.hasError, thrownError = _a.thrownError, isStopped = _a.isStopped;
            if (hasError) {
                subscriber.error(thrownError);
            }
            else if (isStopped) {
                subscriber.complete();
            }
        };
        Subject.prototype.asObservable = function () {
            var observable = new Observable();
            observable.source = this;
            return observable;
        };
        Subject.create = function (destination, source) {
            return new AnonymousSubject(destination, source);
        };
        return Subject;
    }(Observable));
    var AnonymousSubject = (function (_super) {
        __extends(AnonymousSubject, _super);
        function AnonymousSubject(destination, source) {
            var _this = _super.call(this) || this;
            _this.destination = destination;
            _this.source = source;
            return _this;
        }
        AnonymousSubject.prototype.next = function (value) {
            var _a, _b;
            (_b = (_a = this.destination) === null || _a === void 0 ? void 0 : _a.next) === null || _b === void 0 ? void 0 : _b.call(_a, value);
        };
        AnonymousSubject.prototype.error = function (err) {
            var _a, _b;
            (_b = (_a = this.destination) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.call(_a, err);
        };
        AnonymousSubject.prototype.complete = function () {
            var _a, _b;
            (_b = (_a = this.destination) === null || _a === void 0 ? void 0 : _a.complete) === null || _b === void 0 ? void 0 : _b.call(_a);
        };
        AnonymousSubject.prototype._subscribe = function (subscriber) {
            var _a, _b;
            return (_b = (_a = this.source) === null || _a === void 0 ? void 0 : _a.subscribe(subscriber)) !== null && _b !== void 0 ? _b : EMPTY_SUBSCRIPTION;
        };
        return AnonymousSubject;
    }(Subject));

    var dateTimestampProvider = {
        now: function () {
            return (dateTimestampProvider.delegate || Date).now();
        },
        delegate: undefined,
    };

    var Action = (function (_super) {
        __extends(Action, _super);
        function Action(scheduler, work) {
            return _super.call(this) || this;
        }
        Action.prototype.schedule = function (state, delay) {
            return this;
        };
        return Action;
    }(Subscription));

    var intervalProvider = {
        setInterval: function (handler, timeout) {
            var args = [];
            for (var _i = 2; _i < arguments.length; _i++) {
                args[_i - 2] = arguments[_i];
            }
            var delegate = intervalProvider.delegate;
            if (delegate === null || delegate === void 0 ? void 0 : delegate.setInterval) {
                return delegate.setInterval.apply(delegate, __spreadArray([handler, timeout], __read(args)));
            }
            return setInterval.apply(void 0, __spreadArray([handler, timeout], __read(args)));
        },
        clearInterval: function (handle) {
            var delegate = intervalProvider.delegate;
            return ((delegate === null || delegate === void 0 ? void 0 : delegate.clearInterval) || clearInterval)(handle);
        },
        delegate: undefined,
    };

    var AsyncAction = (function (_super) {
        __extends(AsyncAction, _super);
        function AsyncAction(scheduler, work) {
            var _this = _super.call(this, scheduler, work) || this;
            _this.scheduler = scheduler;
            _this.work = work;
            _this.pending = false;
            return _this;
        }
        AsyncAction.prototype.schedule = function (state, delay) {
            var _a;
            if (delay === void 0) { delay = 0; }
            if (this.closed) {
                return this;
            }
            this.state = state;
            var id = this.id;
            var scheduler = this.scheduler;
            if (id != null) {
                this.id = this.recycleAsyncId(scheduler, id, delay);
            }
            this.pending = true;
            this.delay = delay;
            this.id = (_a = this.id) !== null && _a !== void 0 ? _a : this.requestAsyncId(scheduler, this.id, delay);
            return this;
        };
        AsyncAction.prototype.requestAsyncId = function (scheduler, _id, delay) {
            if (delay === void 0) { delay = 0; }
            return intervalProvider.setInterval(scheduler.flush.bind(scheduler, this), delay);
        };
        AsyncAction.prototype.recycleAsyncId = function (_scheduler, id, delay) {
            if (delay === void 0) { delay = 0; }
            if (delay != null && this.delay === delay && this.pending === false) {
                return id;
            }
            if (id != null) {
                intervalProvider.clearInterval(id);
            }
            return undefined;
        };
        AsyncAction.prototype.execute = function (state, delay) {
            if (this.closed) {
                return new Error('executing a cancelled action');
            }
            this.pending = false;
            var error = this._execute(state, delay);
            if (error) {
                return error;
            }
            else if (this.pending === false && this.id != null) {
                this.id = this.recycleAsyncId(this.scheduler, this.id, null);
            }
        };
        AsyncAction.prototype._execute = function (state, _delay) {
            var errored = false;
            var errorValue;
            try {
                this.work(state);
            }
            catch (e) {
                errored = true;
                errorValue = e ? e : new Error('Scheduled action threw falsy error');
            }
            if (errored) {
                this.unsubscribe();
                return errorValue;
            }
        };
        AsyncAction.prototype.unsubscribe = function () {
            if (!this.closed) {
                var _a = this, id = _a.id, scheduler = _a.scheduler;
                var actions = scheduler.actions;
                this.work = this.state = this.scheduler = null;
                this.pending = false;
                arrRemove(actions, this);
                if (id != null) {
                    this.id = this.recycleAsyncId(scheduler, id, null);
                }
                this.delay = null;
                _super.prototype.unsubscribe.call(this);
            }
        };
        return AsyncAction;
    }(Action));

    var Scheduler = (function () {
        function Scheduler(schedulerActionCtor, now) {
            if (now === void 0) { now = Scheduler.now; }
            this.schedulerActionCtor = schedulerActionCtor;
            this.now = now;
        }
        Scheduler.prototype.schedule = function (work, delay, state) {
            if (delay === void 0) { delay = 0; }
            return new this.schedulerActionCtor(this, work).schedule(state, delay);
        };
        Scheduler.now = dateTimestampProvider.now;
        return Scheduler;
    }());

    var AsyncScheduler = (function (_super) {
        __extends(AsyncScheduler, _super);
        function AsyncScheduler(SchedulerAction, now) {
            if (now === void 0) { now = Scheduler.now; }
            var _this = _super.call(this, SchedulerAction, now) || this;
            _this.actions = [];
            _this._active = false;
            return _this;
        }
        AsyncScheduler.prototype.flush = function (action) {
            var actions = this.actions;
            if (this._active) {
                actions.push(action);
                return;
            }
            var error;
            this._active = true;
            do {
                if ((error = action.execute(action.state, action.delay))) {
                    break;
                }
            } while ((action = actions.shift()));
            this._active = false;
            if (error) {
                while ((action = actions.shift())) {
                    action.unsubscribe();
                }
                throw error;
            }
        };
        return AsyncScheduler;
    }(Scheduler));

    var asyncScheduler = new AsyncScheduler(AsyncAction);
    var async = asyncScheduler;

    function isScheduler(value) {
        return value && isFunction(value.schedule);
    }

    var isArrayLike = (function (x) { return x && typeof x.length === 'number' && typeof x !== 'function'; });

    function isPromise(value) {
        return isFunction(value === null || value === void 0 ? void 0 : value.then);
    }

    function isInteropObservable(input) {
        return isFunction(input[observable]);
    }

    function isAsyncIterable(obj) {
        return Symbol.asyncIterator && isFunction(obj === null || obj === void 0 ? void 0 : obj[Symbol.asyncIterator]);
    }

    function createInvalidObservableTypeError(input) {
        return new TypeError("You provided " + (input !== null && typeof input === 'object' ? 'an invalid object' : "'" + input + "'") + " where a stream was expected. You can provide an Observable, Promise, ReadableStream, Array, AsyncIterable, or Iterable.");
    }

    function getSymbolIterator() {
        if (typeof Symbol !== 'function' || !Symbol.iterator) {
            return '@@iterator';
        }
        return Symbol.iterator;
    }
    var iterator = getSymbolIterator();

    function isIterable(input) {
        return isFunction(input === null || input === void 0 ? void 0 : input[iterator]);
    }

    function readableStreamLikeToAsyncGenerator(readableStream) {
        return __asyncGenerator(this, arguments, function readableStreamLikeToAsyncGenerator_1() {
            var reader, _a, value, done;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        reader = readableStream.getReader();
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, , 9, 10]);
                        _b.label = 2;
                    case 2:
                        return [4, __await(reader.read())];
                    case 3:
                        _a = _b.sent(), value = _a.value, done = _a.done;
                        if (!done) return [3, 5];
                        return [4, __await(void 0)];
                    case 4: return [2, _b.sent()];
                    case 5: return [4, __await(value)];
                    case 6: return [4, _b.sent()];
                    case 7:
                        _b.sent();
                        return [3, 2];
                    case 8: return [3, 10];
                    case 9:
                        reader.releaseLock();
                        return [7];
                    case 10: return [2];
                }
            });
        });
    }
    function isReadableStreamLike(obj) {
        return isFunction(obj === null || obj === void 0 ? void 0 : obj.getReader);
    }

    function innerFrom(input) {
        if (input instanceof Observable) {
            return input;
        }
        if (input != null) {
            if (isInteropObservable(input)) {
                return fromInteropObservable(input);
            }
            if (isArrayLike(input)) {
                return fromArrayLike(input);
            }
            if (isPromise(input)) {
                return fromPromise(input);
            }
            if (isAsyncIterable(input)) {
                return fromAsyncIterable(input);
            }
            if (isIterable(input)) {
                return fromIterable(input);
            }
            if (isReadableStreamLike(input)) {
                return fromReadableStreamLike(input);
            }
        }
        throw createInvalidObservableTypeError(input);
    }
    function fromInteropObservable(obj) {
        return new Observable(function (subscriber) {
            var obs = obj[observable]();
            if (isFunction(obs.subscribe)) {
                return obs.subscribe(subscriber);
            }
            throw new TypeError('Provided object does not correctly implement Symbol.observable');
        });
    }
    function fromArrayLike(array) {
        return new Observable(function (subscriber) {
            for (var i = 0; i < array.length && !subscriber.closed; i++) {
                subscriber.next(array[i]);
            }
            subscriber.complete();
        });
    }
    function fromPromise(promise) {
        return new Observable(function (subscriber) {
            promise
                .then(function (value) {
                if (!subscriber.closed) {
                    subscriber.next(value);
                    subscriber.complete();
                }
            }, function (err) { return subscriber.error(err); })
                .then(null, reportUnhandledError);
        });
    }
    function fromIterable(iterable) {
        return new Observable(function (subscriber) {
            var e_1, _a;
            try {
                for (var iterable_1 = __values(iterable), iterable_1_1 = iterable_1.next(); !iterable_1_1.done; iterable_1_1 = iterable_1.next()) {
                    var value = iterable_1_1.value;
                    subscriber.next(value);
                    if (subscriber.closed) {
                        return;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (iterable_1_1 && !iterable_1_1.done && (_a = iterable_1.return)) _a.call(iterable_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            subscriber.complete();
        });
    }
    function fromAsyncIterable(asyncIterable) {
        return new Observable(function (subscriber) {
            process(asyncIterable, subscriber).catch(function (err) { return subscriber.error(err); });
        });
    }
    function fromReadableStreamLike(readableStream) {
        return fromAsyncIterable(readableStreamLikeToAsyncGenerator(readableStream));
    }
    function process(asyncIterable, subscriber) {
        var asyncIterable_1, asyncIterable_1_1;
        var e_2, _a;
        return __awaiter(this, void 0, void 0, function () {
            var value, e_2_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 5, 6, 11]);
                        asyncIterable_1 = __asyncValues(asyncIterable);
                        _b.label = 1;
                    case 1: return [4, asyncIterable_1.next()];
                    case 2:
                        if (!(asyncIterable_1_1 = _b.sent(), !asyncIterable_1_1.done)) return [3, 4];
                        value = asyncIterable_1_1.value;
                        subscriber.next(value);
                        if (subscriber.closed) {
                            return [2];
                        }
                        _b.label = 3;
                    case 3: return [3, 1];
                    case 4: return [3, 11];
                    case 5:
                        e_2_1 = _b.sent();
                        e_2 = { error: e_2_1 };
                        return [3, 11];
                    case 6:
                        _b.trys.push([6, , 9, 10]);
                        if (!(asyncIterable_1_1 && !asyncIterable_1_1.done && (_a = asyncIterable_1.return))) return [3, 8];
                        return [4, _a.call(asyncIterable_1)];
                    case 7:
                        _b.sent();
                        _b.label = 8;
                    case 8: return [3, 10];
                    case 9:
                        if (e_2) throw e_2.error;
                        return [7];
                    case 10: return [7];
                    case 11:
                        subscriber.complete();
                        return [2];
                }
            });
        });
    }

    function executeSchedule(parentSubscription, scheduler, work, delay, repeat) {
        if (delay === void 0) { delay = 0; }
        if (repeat === void 0) { repeat = false; }
        var scheduleSubscription = scheduler.schedule(function () {
            work();
            if (repeat) {
                parentSubscription.add(this.schedule(null, delay));
            }
            else {
                this.unsubscribe();
            }
        }, delay);
        parentSubscription.add(scheduleSubscription);
        if (!repeat) {
            return scheduleSubscription;
        }
    }

    function isValidDate(value) {
        return value instanceof Date && !isNaN(value);
    }

    function map(project, thisArg) {
        return operate(function (source, subscriber) {
            var index = 0;
            source.subscribe(createOperatorSubscriber(subscriber, function (value) {
                subscriber.next(project.call(thisArg, value, index++));
            }));
        });
    }

    var isArray = Array.isArray;
    function callOrApply(fn, args) {
        return isArray(args) ? fn.apply(void 0, __spreadArray([], __read(args))) : fn(args);
    }
    function mapOneOrManyArgs(fn) {
        return map(function (args) { return callOrApply(fn, args); });
    }

    function mergeInternals(source, subscriber, project, concurrent, onBeforeNext, expand, innerSubScheduler, additionalFinalizer) {
        var buffer = [];
        var active = 0;
        var index = 0;
        var isComplete = false;
        var checkComplete = function () {
            if (isComplete && !buffer.length && !active) {
                subscriber.complete();
            }
        };
        var outerNext = function (value) { return (active < concurrent ? doInnerSub(value) : buffer.push(value)); };
        var doInnerSub = function (value) {
            expand && subscriber.next(value);
            active++;
            var innerComplete = false;
            innerFrom(project(value, index++)).subscribe(createOperatorSubscriber(subscriber, function (innerValue) {
                onBeforeNext === null || onBeforeNext === void 0 ? void 0 : onBeforeNext(innerValue);
                if (expand) {
                    outerNext(innerValue);
                }
                else {
                    subscriber.next(innerValue);
                }
            }, function () {
                innerComplete = true;
            }, undefined, function () {
                if (innerComplete) {
                    try {
                        active--;
                        var _loop_1 = function () {
                            var bufferedValue = buffer.shift();
                            if (innerSubScheduler) {
                                executeSchedule(subscriber, innerSubScheduler, function () { return doInnerSub(bufferedValue); });
                            }
                            else {
                                doInnerSub(bufferedValue);
                            }
                        };
                        while (buffer.length && active < concurrent) {
                            _loop_1();
                        }
                        checkComplete();
                    }
                    catch (err) {
                        subscriber.error(err);
                    }
                }
            }));
        };
        source.subscribe(createOperatorSubscriber(subscriber, outerNext, function () {
            isComplete = true;
            checkComplete();
        }));
        return function () {
            additionalFinalizer === null || additionalFinalizer === void 0 ? void 0 : additionalFinalizer();
        };
    }

    function mergeMap(project, resultSelector, concurrent) {
        if (concurrent === void 0) { concurrent = Infinity; }
        if (isFunction(resultSelector)) {
            return mergeMap(function (a, i) { return map(function (b, ii) { return resultSelector(a, b, i, ii); })(innerFrom(project(a, i))); }, concurrent);
        }
        else if (typeof resultSelector === 'number') {
            concurrent = resultSelector;
        }
        return operate(function (source, subscriber) { return mergeInternals(source, subscriber, project, concurrent); });
    }

    var nodeEventEmitterMethods = ['addListener', 'removeListener'];
    var eventTargetMethods = ['addEventListener', 'removeEventListener'];
    var jqueryMethods = ['on', 'off'];
    function fromEvent(target, eventName, options, resultSelector) {
        if (isFunction(options)) {
            resultSelector = options;
            options = undefined;
        }
        if (resultSelector) {
            return fromEvent(target, eventName, options).pipe(mapOneOrManyArgs(resultSelector));
        }
        var _a = __read(isEventTarget(target)
            ? eventTargetMethods.map(function (methodName) { return function (handler) { return target[methodName](eventName, handler, options); }; })
            :
                isNodeStyleEventEmitter(target)
                    ? nodeEventEmitterMethods.map(toCommonHandlerRegistry(target, eventName))
                    : isJQueryStyleEventEmitter(target)
                        ? jqueryMethods.map(toCommonHandlerRegistry(target, eventName))
                        : [], 2), add = _a[0], remove = _a[1];
        if (!add) {
            if (isArrayLike(target)) {
                return mergeMap(function (subTarget) { return fromEvent(subTarget, eventName, options); })(innerFrom(target));
            }
        }
        if (!add) {
            throw new TypeError('Invalid event target');
        }
        return new Observable(function (subscriber) {
            var handler = function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                return subscriber.next(1 < args.length ? args : args[0]);
            };
            add(handler);
            return function () { return remove(handler); };
        });
    }
    function toCommonHandlerRegistry(target, eventName) {
        return function (methodName) { return function (handler) { return target[methodName](eventName, handler); }; };
    }
    function isNodeStyleEventEmitter(target) {
        return isFunction(target.addListener) && isFunction(target.removeListener);
    }
    function isJQueryStyleEventEmitter(target) {
        return isFunction(target.on) && isFunction(target.off);
    }
    function isEventTarget(target) {
        return isFunction(target.addEventListener) && isFunction(target.removeEventListener);
    }

    function timer(dueTime, intervalOrScheduler, scheduler) {
        if (dueTime === void 0) { dueTime = 0; }
        if (scheduler === void 0) { scheduler = async; }
        var intervalDuration = -1;
        if (intervalOrScheduler != null) {
            if (isScheduler(intervalOrScheduler)) {
                scheduler = intervalOrScheduler;
            }
            else {
                intervalDuration = intervalOrScheduler;
            }
        }
        return new Observable(function (subscriber) {
            var due = isValidDate(dueTime) ? +dueTime - scheduler.now() : dueTime;
            if (due < 0) {
                due = 0;
            }
            var n = 0;
            return scheduler.schedule(function () {
                if (!subscriber.closed) {
                    subscriber.next(n++);
                    if (0 <= intervalDuration) {
                        this.schedule(undefined, intervalDuration);
                    }
                    else {
                        subscriber.complete();
                    }
                }
            }, due);
        });
    }

    function filter(predicate, thisArg) {
        return operate(function (source, subscriber) {
            var index = 0;
            source.subscribe(createOperatorSubscriber(subscriber, function (value) { return predicate.call(thisArg, value, index++) && subscriber.next(value); }));
        });
    }

    var defaultThrottleConfig = {
        leading: true,
        trailing: false,
    };
    function throttle(durationSelector, config) {
        if (config === void 0) { config = defaultThrottleConfig; }
        return operate(function (source, subscriber) {
            var leading = config.leading, trailing = config.trailing;
            var hasValue = false;
            var sendValue = null;
            var throttled = null;
            var isComplete = false;
            var endThrottling = function () {
                throttled === null || throttled === void 0 ? void 0 : throttled.unsubscribe();
                throttled = null;
                if (trailing) {
                    send();
                    isComplete && subscriber.complete();
                }
            };
            var cleanupThrottling = function () {
                throttled = null;
                isComplete && subscriber.complete();
            };
            var startThrottle = function (value) {
                return (throttled = innerFrom(durationSelector(value)).subscribe(createOperatorSubscriber(subscriber, endThrottling, cleanupThrottling)));
            };
            var send = function () {
                if (hasValue) {
                    hasValue = false;
                    var value = sendValue;
                    sendValue = null;
                    subscriber.next(value);
                    !isComplete && startThrottle(value);
                }
            };
            source.subscribe(createOperatorSubscriber(subscriber, function (value) {
                hasValue = true;
                sendValue = value;
                !(throttled && !throttled.closed) && (leading ? send() : startThrottle(value));
            }, function () {
                isComplete = true;
                !(trailing && hasValue && throttled && !throttled.closed) && subscriber.complete();
            }));
        });
    }

    function throttleTime(duration, scheduler, config) {
        if (scheduler === void 0) { scheduler = asyncScheduler; }
        if (config === void 0) { config = defaultThrottleConfig; }
        var duration$ = timer(duration, scheduler);
        return throttle(function () { return duration$; }, config);
    }

    var ControlKey;
    (function (ControlKey) {
        ControlKey["ArrowDown"] = "ArrowDown";
        ControlKey["ArrowUp"] = "ArrowUp";
        ControlKey["ArrowRight"] = "ArrowRight";
        ControlKey["ArrowLeft"] = "ArrowLeft";
    })(ControlKey || (ControlKey = {}));

    class Labyrinthium {
        constructor(gameContext, config) {
            this.gameContext = gameContext;
            this.config = config;
            this.directionByKey = {
                [ControlKey.ArrowDown]: Direction.South,
                [ControlKey.ArrowLeft]: Direction.West,
                [ControlKey.ArrowRight]: Direction.East,
                [ControlKey.ArrowUp]: Direction.North
            };
        }
        init() {
            const movementService = new MovementService();
            const drawService = new DrawService(this.gameContext, this.config.squareWidth);
            const maze = new Maze(this.config, movementService, drawService);
            const mazeData = maze.build();
            const gameState = new Subject();
            const wanderer = new Wanderer(mazeData, movementService, drawService, gameState);
            this.initialiseControls(wanderer);
            return gameState;
        }
        destroy() {
            if (this.controlSubscription) {
                this.controlSubscription.unsubscribe();
            }
        }
        initialiseControls(wanderer) {
            this.keyEventObservable = this.generateObservable();
            this.controlSubscription = this.toKeySubscription(wanderer);
        }
        generateObservable() {
            return this.keyEventObservable || fromEvent(document, 'keydown').pipe(throttleTime(100), filter((e) => Object.values(ControlKey).includes(e.code)), map((e) => e.code));
        }
        toKeySubscription(wanderer) {
            this.destroy();
            return this.keyEventObservable.subscribe((key) => {
                wanderer.moveWanderer(this.directionByKey[key]);
            });
        }
    }

    /* src/Game.svelte generated by Svelte v3.53.1 */
    const file$3 = "src/Game.svelte";

    function create_fragment$3(ctx) {
    	let div;
    	let canvas;
    	let canvas_width_value;
    	let canvas_height_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			canvas = element("canvas");
    			attr_dev(canvas, "id", "game-area");
    			attr_dev(canvas, "width", canvas_width_value = /*config*/ ctx[0].canvasWidth);
    			attr_dev(canvas, "height", canvas_height_value = /*config*/ ctx[0].canvasHeight);
    			attr_dev(canvas, "class", "svelte-x3mgpd");
    			add_location(canvas, file$3, 20, 4, 679);
    			attr_dev(div, "class", "game-container svelte-x3mgpd");
    			add_location(div, file$3, 19, 0, 646);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, canvas);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*config*/ 1 && canvas_width_value !== (canvas_width_value = /*config*/ ctx[0].canvasWidth)) {
    				attr_dev(canvas, "width", canvas_width_value);
    			}

    			if (dirty & /*config*/ 1 && canvas_height_value !== (canvas_height_value = /*config*/ ctx[0].canvasHeight)) {
    				attr_dev(canvas, "height", canvas_height_value);
    			}
    		},
    		i: noop$1,
    		o: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Game', slots, []);
    	let { config } = $$props;
    	let labyrinthium;
    	let gameStateSubscription;
    	const dispatch = createEventDispatcher();

    	onMount(() => {
    		const canvasElement = document.getElementById("game-area");
    		const gameContext = canvasElement.getContext("2d");
    		labyrinthium = new Labyrinthium(gameContext, config);
    		gameStateSubscription = labyrinthium.init().subscribe(() => dispatch('end'));
    	});

    	onDestroy(() => {
    		gameStateSubscription.unsubscribe();
    		labyrinthium.destroy();
    	});

    	$$self.$$.on_mount.push(function () {
    		if (config === undefined && !('config' in $$props || $$self.$$.bound[$$self.$$.props['config']])) {
    			console.warn("<Game> was created without expected prop 'config'");
    		}
    	});

    	const writable_props = ['config'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Game> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('config' in $$props) $$invalidate(0, config = $$props.config);
    	};

    	$$self.$capture_state = () => ({
    		onDestroy,
    		onMount,
    		Labyrinthium,
    		createEventDispatcher,
    		config,
    		labyrinthium,
    		gameStateSubscription,
    		dispatch
    	});

    	$$self.$inject_state = $$props => {
    		if ('config' in $$props) $$invalidate(0, config = $$props.config);
    		if ('labyrinthium' in $$props) labyrinthium = $$props.labyrinthium;
    		if ('gameStateSubscription' in $$props) gameStateSubscription = $$props.gameStateSubscription;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [config];
    }

    class Game extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { config: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Game",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get config() {
    		throw new Error("<Game>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set config(value) {
    		throw new Error("<Game>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop$1) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop$1) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop$1;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    function is_date(obj) {
        return Object.prototype.toString.call(obj) === '[object Date]';
    }

    function tick_spring(ctx, last_value, current_value, target_value) {
        if (typeof current_value === 'number' || is_date(current_value)) {
            // @ts-ignore
            const delta = target_value - current_value;
            // @ts-ignore
            const velocity = (current_value - last_value) / (ctx.dt || 1 / 60); // guard div by 0
            const spring = ctx.opts.stiffness * delta;
            const damper = ctx.opts.damping * velocity;
            const acceleration = (spring - damper) * ctx.inv_mass;
            const d = (velocity + acceleration) * ctx.dt;
            if (Math.abs(d) < ctx.opts.precision && Math.abs(delta) < ctx.opts.precision) {
                return target_value; // settled
            }
            else {
                ctx.settled = false; // signal loop to keep ticking
                // @ts-ignore
                return is_date(current_value) ?
                    new Date(current_value.getTime() + d) : current_value + d;
            }
        }
        else if (Array.isArray(current_value)) {
            // @ts-ignore
            return current_value.map((_, i) => tick_spring(ctx, last_value[i], current_value[i], target_value[i]));
        }
        else if (typeof current_value === 'object') {
            const next_value = {};
            for (const k in current_value) {
                // @ts-ignore
                next_value[k] = tick_spring(ctx, last_value[k], current_value[k], target_value[k]);
            }
            // @ts-ignore
            return next_value;
        }
        else {
            throw new Error(`Cannot spring ${typeof current_value} values`);
        }
    }
    function spring(value, opts = {}) {
        const store = writable(value);
        const { stiffness = 0.15, damping = 0.8, precision = 0.01 } = opts;
        let last_time;
        let task;
        let current_token;
        let last_value = value;
        let target_value = value;
        let inv_mass = 1;
        let inv_mass_recovery_rate = 0;
        let cancel_task = false;
        function set(new_value, opts = {}) {
            target_value = new_value;
            const token = current_token = {};
            if (value == null || opts.hard || (spring.stiffness >= 1 && spring.damping >= 1)) {
                cancel_task = true; // cancel any running animation
                last_time = now();
                last_value = new_value;
                store.set(value = target_value);
                return Promise.resolve();
            }
            else if (opts.soft) {
                const rate = opts.soft === true ? .5 : +opts.soft;
                inv_mass_recovery_rate = 1 / (rate * 60);
                inv_mass = 0; // infinite mass, unaffected by spring forces
            }
            if (!task) {
                last_time = now();
                cancel_task = false;
                task = loop(now => {
                    if (cancel_task) {
                        cancel_task = false;
                        task = null;
                        return false;
                    }
                    inv_mass = Math.min(inv_mass + inv_mass_recovery_rate, 1);
                    const ctx = {
                        inv_mass,
                        opts: spring,
                        settled: true,
                        dt: (now - last_time) * 60 / 1000
                    };
                    const next_value = tick_spring(ctx, last_value, value, target_value);
                    last_time = now;
                    last_value = value;
                    store.set(value = next_value);
                    if (ctx.settled) {
                        task = null;
                    }
                    return !ctx.settled;
                });
            }
            return new Promise(fulfil => {
                task.promise.then(() => {
                    if (token === current_token)
                        fulfil();
                });
            });
        }
        const spring = {
            set,
            update: (fn, opts) => set(fn(target_value, value), opts),
            subscribe: store.subscribe,
            stiffness,
            damping,
            precision
        };
        return spring;
    }

    /* node_modules/svelte-range-slider-pips/src/RangePips.svelte generated by Svelte v3.53.1 */

    const file$2 = "node_modules/svelte-range-slider-pips/src/RangePips.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[28] = list[i];
    	child_ctx[30] = i;
    	return child_ctx;
    }

    // (178:2) {#if ( all && first !== false ) || first }
    function create_if_block_9(ctx) {
    	let span;
    	let span_style_value;
    	let mounted;
    	let dispose;
    	let if_block = (/*all*/ ctx[6] === 'label' || /*first*/ ctx[7] === 'label') && create_if_block_10(ctx);

    	const block = {
    		c: function create() {
    			span = element("span");
    			if (if_block) if_block.c();
    			attr_dev(span, "class", "pip first");
    			attr_dev(span, "style", span_style_value = "" + (/*orientationStart*/ ctx[14] + ": 0%;"));
    			toggle_class(span, "selected", /*isSelected*/ ctx[18](/*min*/ ctx[0]));
    			toggle_class(span, "in-range", /*inRange*/ ctx[17](/*min*/ ctx[0]));
    			add_location(span, file$2, 178, 4, 4495);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			if (if_block) if_block.m(span, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						span,
    						"click",
    						function () {
    							if (is_function(/*labelClick*/ ctx[21](/*min*/ ctx[0]))) /*labelClick*/ ctx[21](/*min*/ ctx[0]).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						span,
    						"touchend",
    						prevent_default(function () {
    							if (is_function(/*labelClick*/ ctx[21](/*min*/ ctx[0]))) /*labelClick*/ ctx[21](/*min*/ ctx[0]).apply(this, arguments);
    						}),
    						false,
    						true,
    						false
    					)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (/*all*/ ctx[6] === 'label' || /*first*/ ctx[7] === 'label') {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_10(ctx);
    					if_block.c();
    					if_block.m(span, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*orientationStart*/ 16384 && span_style_value !== (span_style_value = "" + (/*orientationStart*/ ctx[14] + ": 0%;"))) {
    				attr_dev(span, "style", span_style_value);
    			}

    			if (dirty & /*isSelected, min*/ 262145) {
    				toggle_class(span, "selected", /*isSelected*/ ctx[18](/*min*/ ctx[0]));
    			}

    			if (dirty & /*inRange, min*/ 131073) {
    				toggle_class(span, "in-range", /*inRange*/ ctx[17](/*min*/ ctx[0]));
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_9.name,
    		type: "if",
    		source: "(178:2) {#if ( all && first !== false ) || first }",
    		ctx
    	});

    	return block;
    }

    // (187:6) {#if all === 'label' || first === 'label'}
    function create_if_block_10(ctx) {
    	let span;
    	let t_value = /*formatter*/ ctx[12](/*fixFloat*/ ctx[16](/*min*/ ctx[0]), 0, 0) + "";
    	let t;
    	let if_block0 = /*prefix*/ ctx[10] && create_if_block_12(ctx);
    	let if_block1 = /*suffix*/ ctx[11] && create_if_block_11(ctx);

    	const block = {
    		c: function create() {
    			span = element("span");
    			if (if_block0) if_block0.c();
    			t = text(t_value);
    			if (if_block1) if_block1.c();
    			attr_dev(span, "class", "pipVal");
    			add_location(span, file$2, 187, 8, 4785);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			if (if_block0) if_block0.m(span, null);
    			append_dev(span, t);
    			if (if_block1) if_block1.m(span, null);
    		},
    		p: function update(ctx, dirty) {
    			if (/*prefix*/ ctx[10]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_12(ctx);
    					if_block0.c();
    					if_block0.m(span, t);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty & /*formatter, fixFloat, min*/ 69633 && t_value !== (t_value = /*formatter*/ ctx[12](/*fixFloat*/ ctx[16](/*min*/ ctx[0]), 0, 0) + "")) set_data_dev(t, t_value);

    			if (/*suffix*/ ctx[11]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_11(ctx);
    					if_block1.c();
    					if_block1.m(span, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_10.name,
    		type: "if",
    		source: "(187:6) {#if all === 'label' || first === 'label'}",
    		ctx
    	});

    	return block;
    }

    // (189:10) {#if prefix}
    function create_if_block_12(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(/*prefix*/ ctx[10]);
    			attr_dev(span, "class", "pipVal-prefix");
    			add_location(span, file$2, 188, 22, 4829);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*prefix*/ 1024) set_data_dev(t, /*prefix*/ ctx[10]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_12.name,
    		type: "if",
    		source: "(189:10) {#if prefix}",
    		ctx
    	});

    	return block;
    }

    // (189:100) {#if suffix}
    function create_if_block_11(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(/*suffix*/ ctx[11]);
    			attr_dev(span, "class", "pipVal-suffix");
    			add_location(span, file$2, 188, 112, 4919);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*suffix*/ 2048) set_data_dev(t, /*suffix*/ ctx[11]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_11.name,
    		type: "if",
    		source: "(189:100) {#if suffix}",
    		ctx
    	});

    	return block;
    }

    // (195:2) {#if ( all && rest !== false ) || rest}
    function create_if_block_4$1(ctx) {
    	let each_1_anchor;
    	let each_value = Array(/*pipCount*/ ctx[20] + 1);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*orientationStart, percentOf, pipVal, isSelected, inRange, labelClick, suffix, formatter, prefix, all, rest, min, max, pipCount*/ 4120131) {
    				each_value = Array(/*pipCount*/ ctx[20] + 1);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4$1.name,
    		type: "if",
    		source: "(195:2) {#if ( all && rest !== false ) || rest}",
    		ctx
    	});

    	return block;
    }

    // (197:6) {#if pipVal(i) !== min && pipVal(i) !== max}
    function create_if_block_5(ctx) {
    	let span;
    	let t;
    	let span_style_value;
    	let mounted;
    	let dispose;
    	let if_block = (/*all*/ ctx[6] === 'label' || /*rest*/ ctx[9] === 'label') && create_if_block_6(ctx);

    	const block = {
    		c: function create() {
    			span = element("span");
    			if (if_block) if_block.c();
    			t = space();
    			attr_dev(span, "class", "pip");
    			attr_dev(span, "style", span_style_value = "" + (/*orientationStart*/ ctx[14] + ": " + /*percentOf*/ ctx[15](/*pipVal*/ ctx[19](/*i*/ ctx[30])) + "%;"));
    			toggle_class(span, "selected", /*isSelected*/ ctx[18](/*pipVal*/ ctx[19](/*i*/ ctx[30])));
    			toggle_class(span, "in-range", /*inRange*/ ctx[17](/*pipVal*/ ctx[19](/*i*/ ctx[30])));
    			add_location(span, file$2, 197, 8, 5158);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			if (if_block) if_block.m(span, null);
    			append_dev(span, t);

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						span,
    						"click",
    						function () {
    							if (is_function(/*labelClick*/ ctx[21](/*pipVal*/ ctx[19](/*i*/ ctx[30])))) /*labelClick*/ ctx[21](/*pipVal*/ ctx[19](/*i*/ ctx[30])).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						span,
    						"touchend",
    						prevent_default(function () {
    							if (is_function(/*labelClick*/ ctx[21](/*pipVal*/ ctx[19](/*i*/ ctx[30])))) /*labelClick*/ ctx[21](/*pipVal*/ ctx[19](/*i*/ ctx[30])).apply(this, arguments);
    						}),
    						false,
    						true,
    						false
    					)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (/*all*/ ctx[6] === 'label' || /*rest*/ ctx[9] === 'label') {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_6(ctx);
    					if_block.c();
    					if_block.m(span, t);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*orientationStart, percentOf, pipVal*/ 573440 && span_style_value !== (span_style_value = "" + (/*orientationStart*/ ctx[14] + ": " + /*percentOf*/ ctx[15](/*pipVal*/ ctx[19](/*i*/ ctx[30])) + "%;"))) {
    				attr_dev(span, "style", span_style_value);
    			}

    			if (dirty & /*isSelected, pipVal*/ 786432) {
    				toggle_class(span, "selected", /*isSelected*/ ctx[18](/*pipVal*/ ctx[19](/*i*/ ctx[30])));
    			}

    			if (dirty & /*inRange, pipVal*/ 655360) {
    				toggle_class(span, "in-range", /*inRange*/ ctx[17](/*pipVal*/ ctx[19](/*i*/ ctx[30])));
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(197:6) {#if pipVal(i) !== min && pipVal(i) !== max}",
    		ctx
    	});

    	return block;
    }

    // (206:10) {#if all === 'label' || rest === 'label'}
    function create_if_block_6(ctx) {
    	let span;
    	let t_value = /*formatter*/ ctx[12](/*pipVal*/ ctx[19](/*i*/ ctx[30]), /*i*/ ctx[30], /*percentOf*/ ctx[15](/*pipVal*/ ctx[19](/*i*/ ctx[30]))) + "";
    	let t;
    	let if_block0 = /*prefix*/ ctx[10] && create_if_block_8(ctx);
    	let if_block1 = /*suffix*/ ctx[11] && create_if_block_7(ctx);

    	const block = {
    		c: function create() {
    			span = element("span");
    			if (if_block0) if_block0.c();
    			t = text(t_value);
    			if (if_block1) if_block1.c();
    			attr_dev(span, "class", "pipVal");
    			add_location(span, file$2, 206, 12, 5522);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			if (if_block0) if_block0.m(span, null);
    			append_dev(span, t);
    			if (if_block1) if_block1.m(span, null);
    		},
    		p: function update(ctx, dirty) {
    			if (/*prefix*/ ctx[10]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_8(ctx);
    					if_block0.c();
    					if_block0.m(span, t);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty & /*formatter, pipVal, percentOf*/ 561152 && t_value !== (t_value = /*formatter*/ ctx[12](/*pipVal*/ ctx[19](/*i*/ ctx[30]), /*i*/ ctx[30], /*percentOf*/ ctx[15](/*pipVal*/ ctx[19](/*i*/ ctx[30]))) + "")) set_data_dev(t, t_value);

    			if (/*suffix*/ ctx[11]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_7(ctx);
    					if_block1.c();
    					if_block1.m(span, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(206:10) {#if all === 'label' || rest === 'label'}",
    		ctx
    	});

    	return block;
    }

    // (208:14) {#if prefix}
    function create_if_block_8(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(/*prefix*/ ctx[10]);
    			attr_dev(span, "class", "pipVal-prefix");
    			add_location(span, file$2, 207, 26, 5570);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*prefix*/ 1024) set_data_dev(t, /*prefix*/ ctx[10]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(208:14) {#if prefix}",
    		ctx
    	});

    	return block;
    }

    // (208:119) {#if suffix}
    function create_if_block_7(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(/*suffix*/ ctx[11]);
    			attr_dev(span, "class", "pipVal-suffix");
    			add_location(span, file$2, 207, 131, 5675);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*suffix*/ 2048) set_data_dev(t, /*suffix*/ ctx[11]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(208:119) {#if suffix}",
    		ctx
    	});

    	return block;
    }

    // (196:4) {#each Array(pipCount + 1) as _, i}
    function create_each_block$1(ctx) {
    	let show_if = /*pipVal*/ ctx[19](/*i*/ ctx[30]) !== /*min*/ ctx[0] && /*pipVal*/ ctx[19](/*i*/ ctx[30]) !== /*max*/ ctx[1];
    	let if_block_anchor;
    	let if_block = show_if && create_if_block_5(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*pipVal, min, max*/ 524291) show_if = /*pipVal*/ ctx[19](/*i*/ ctx[30]) !== /*min*/ ctx[0] && /*pipVal*/ ctx[19](/*i*/ ctx[30]) !== /*max*/ ctx[1];

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_5(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(196:4) {#each Array(pipCount + 1) as _, i}",
    		ctx
    	});

    	return block;
    }

    // (216:2) {#if ( all && last !== false ) || last}
    function create_if_block$2(ctx) {
    	let span;
    	let span_style_value;
    	let mounted;
    	let dispose;
    	let if_block = (/*all*/ ctx[6] === 'label' || /*last*/ ctx[8] === 'label') && create_if_block_1$1(ctx);

    	const block = {
    		c: function create() {
    			span = element("span");
    			if (if_block) if_block.c();
    			attr_dev(span, "class", "pip last");
    			attr_dev(span, "style", span_style_value = "" + (/*orientationStart*/ ctx[14] + ": 100%;"));
    			toggle_class(span, "selected", /*isSelected*/ ctx[18](/*max*/ ctx[1]));
    			toggle_class(span, "in-range", /*inRange*/ ctx[17](/*max*/ ctx[1]));
    			add_location(span, file$2, 216, 4, 5855);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			if (if_block) if_block.m(span, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						span,
    						"click",
    						function () {
    							if (is_function(/*labelClick*/ ctx[21](/*max*/ ctx[1]))) /*labelClick*/ ctx[21](/*max*/ ctx[1]).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						span,
    						"touchend",
    						prevent_default(function () {
    							if (is_function(/*labelClick*/ ctx[21](/*max*/ ctx[1]))) /*labelClick*/ ctx[21](/*max*/ ctx[1]).apply(this, arguments);
    						}),
    						false,
    						true,
    						false
    					)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (/*all*/ ctx[6] === 'label' || /*last*/ ctx[8] === 'label') {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$1(ctx);
    					if_block.c();
    					if_block.m(span, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*orientationStart*/ 16384 && span_style_value !== (span_style_value = "" + (/*orientationStart*/ ctx[14] + ": 100%;"))) {
    				attr_dev(span, "style", span_style_value);
    			}

    			if (dirty & /*isSelected, max*/ 262146) {
    				toggle_class(span, "selected", /*isSelected*/ ctx[18](/*max*/ ctx[1]));
    			}

    			if (dirty & /*inRange, max*/ 131074) {
    				toggle_class(span, "in-range", /*inRange*/ ctx[17](/*max*/ ctx[1]));
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(216:2) {#if ( all && last !== false ) || last}",
    		ctx
    	});

    	return block;
    }

    // (225:6) {#if all === 'label' || last === 'label'}
    function create_if_block_1$1(ctx) {
    	let span;
    	let t_value = /*formatter*/ ctx[12](/*fixFloat*/ ctx[16](/*max*/ ctx[1]), /*pipCount*/ ctx[20], 100) + "";
    	let t;
    	let if_block0 = /*prefix*/ ctx[10] && create_if_block_3$1(ctx);
    	let if_block1 = /*suffix*/ ctx[11] && create_if_block_2$1(ctx);

    	const block = {
    		c: function create() {
    			span = element("span");
    			if (if_block0) if_block0.c();
    			t = text(t_value);
    			if (if_block1) if_block1.c();
    			attr_dev(span, "class", "pipVal");
    			add_location(span, file$2, 225, 8, 6145);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			if (if_block0) if_block0.m(span, null);
    			append_dev(span, t);
    			if (if_block1) if_block1.m(span, null);
    		},
    		p: function update(ctx, dirty) {
    			if (/*prefix*/ ctx[10]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_3$1(ctx);
    					if_block0.c();
    					if_block0.m(span, t);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty & /*formatter, fixFloat, max, pipCount*/ 1118210 && t_value !== (t_value = /*formatter*/ ctx[12](/*fixFloat*/ ctx[16](/*max*/ ctx[1]), /*pipCount*/ ctx[20], 100) + "")) set_data_dev(t, t_value);

    			if (/*suffix*/ ctx[11]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_2$1(ctx);
    					if_block1.c();
    					if_block1.m(span, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(225:6) {#if all === 'label' || last === 'label'}",
    		ctx
    	});

    	return block;
    }

    // (227:10) {#if prefix}
    function create_if_block_3$1(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(/*prefix*/ ctx[10]);
    			attr_dev(span, "class", "pipVal-prefix");
    			add_location(span, file$2, 226, 22, 6189);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*prefix*/ 1024) set_data_dev(t, /*prefix*/ ctx[10]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(227:10) {#if prefix}",
    		ctx
    	});

    	return block;
    }

    // (227:109) {#if suffix}
    function create_if_block_2$1(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(/*suffix*/ ctx[11]);
    			attr_dev(span, "class", "pipVal-suffix");
    			add_location(span, file$2, 226, 121, 6288);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*suffix*/ 2048) set_data_dev(t, /*suffix*/ ctx[11]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(227:109) {#if suffix}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let if_block0 = (/*all*/ ctx[6] && /*first*/ ctx[7] !== false || /*first*/ ctx[7]) && create_if_block_9(ctx);
    	let if_block1 = (/*all*/ ctx[6] && /*rest*/ ctx[9] !== false || /*rest*/ ctx[9]) && create_if_block_4$1(ctx);
    	let if_block2 = (/*all*/ ctx[6] && /*last*/ ctx[8] !== false || /*last*/ ctx[8]) && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			attr_dev(div, "class", "rangePips");
    			toggle_class(div, "disabled", /*disabled*/ ctx[5]);
    			toggle_class(div, "hoverable", /*hoverable*/ ctx[4]);
    			toggle_class(div, "vertical", /*vertical*/ ctx[2]);
    			toggle_class(div, "reversed", /*reversed*/ ctx[3]);
    			toggle_class(div, "focus", /*focus*/ ctx[13]);
    			add_location(div, file$2, 169, 0, 4330);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block0) if_block0.m(div, null);
    			append_dev(div, t0);
    			if (if_block1) if_block1.m(div, null);
    			append_dev(div, t1);
    			if (if_block2) if_block2.m(div, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*all*/ ctx[6] && /*first*/ ctx[7] !== false || /*first*/ ctx[7]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_9(ctx);
    					if_block0.c();
    					if_block0.m(div, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*all*/ ctx[6] && /*rest*/ ctx[9] !== false || /*rest*/ ctx[9]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_4$1(ctx);
    					if_block1.c();
    					if_block1.m(div, t1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*all*/ ctx[6] && /*last*/ ctx[8] !== false || /*last*/ ctx[8]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block$2(ctx);
    					if_block2.c();
    					if_block2.m(div, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (dirty & /*disabled*/ 32) {
    				toggle_class(div, "disabled", /*disabled*/ ctx[5]);
    			}

    			if (dirty & /*hoverable*/ 16) {
    				toggle_class(div, "hoverable", /*hoverable*/ ctx[4]);
    			}

    			if (dirty & /*vertical*/ 4) {
    				toggle_class(div, "vertical", /*vertical*/ ctx[2]);
    			}

    			if (dirty & /*reversed*/ 8) {
    				toggle_class(div, "reversed", /*reversed*/ ctx[3]);
    			}

    			if (dirty & /*focus*/ 8192) {
    				toggle_class(div, "focus", /*focus*/ ctx[13]);
    			}
    		},
    		i: noop$1,
    		o: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let pipStep;
    	let pipCount;
    	let pipVal;
    	let isSelected;
    	let inRange;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('RangePips', slots, []);
    	let { range = false } = $$props;
    	let { min = 0 } = $$props;
    	let { max = 100 } = $$props;
    	let { step = 1 } = $$props;
    	let { values = [(max + min) / 2] } = $$props;
    	let { vertical = false } = $$props;
    	let { reversed = false } = $$props;
    	let { hoverable = true } = $$props;
    	let { disabled = false } = $$props;
    	let { pipstep = undefined } = $$props;
    	let { all = true } = $$props;
    	let { first = undefined } = $$props;
    	let { last = undefined } = $$props;
    	let { rest = undefined } = $$props;
    	let { prefix = "" } = $$props;
    	let { suffix = "" } = $$props;
    	let { formatter = (v, i) => v } = $$props;
    	let { focus = undefined } = $$props;
    	let { orientationStart = undefined } = $$props;
    	let { percentOf = undefined } = $$props;
    	let { moveHandle = undefined } = $$props;
    	let { fixFloat = undefined } = $$props;

    	function labelClick(val) {
    		if (!disabled) {
    			moveHandle(undefined, val);
    		}
    	}

    	const writable_props = [
    		'range',
    		'min',
    		'max',
    		'step',
    		'values',
    		'vertical',
    		'reversed',
    		'hoverable',
    		'disabled',
    		'pipstep',
    		'all',
    		'first',
    		'last',
    		'rest',
    		'prefix',
    		'suffix',
    		'formatter',
    		'focus',
    		'orientationStart',
    		'percentOf',
    		'moveHandle',
    		'fixFloat'
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<RangePips> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('range' in $$props) $$invalidate(22, range = $$props.range);
    		if ('min' in $$props) $$invalidate(0, min = $$props.min);
    		if ('max' in $$props) $$invalidate(1, max = $$props.max);
    		if ('step' in $$props) $$invalidate(23, step = $$props.step);
    		if ('values' in $$props) $$invalidate(24, values = $$props.values);
    		if ('vertical' in $$props) $$invalidate(2, vertical = $$props.vertical);
    		if ('reversed' in $$props) $$invalidate(3, reversed = $$props.reversed);
    		if ('hoverable' in $$props) $$invalidate(4, hoverable = $$props.hoverable);
    		if ('disabled' in $$props) $$invalidate(5, disabled = $$props.disabled);
    		if ('pipstep' in $$props) $$invalidate(25, pipstep = $$props.pipstep);
    		if ('all' in $$props) $$invalidate(6, all = $$props.all);
    		if ('first' in $$props) $$invalidate(7, first = $$props.first);
    		if ('last' in $$props) $$invalidate(8, last = $$props.last);
    		if ('rest' in $$props) $$invalidate(9, rest = $$props.rest);
    		if ('prefix' in $$props) $$invalidate(10, prefix = $$props.prefix);
    		if ('suffix' in $$props) $$invalidate(11, suffix = $$props.suffix);
    		if ('formatter' in $$props) $$invalidate(12, formatter = $$props.formatter);
    		if ('focus' in $$props) $$invalidate(13, focus = $$props.focus);
    		if ('orientationStart' in $$props) $$invalidate(14, orientationStart = $$props.orientationStart);
    		if ('percentOf' in $$props) $$invalidate(15, percentOf = $$props.percentOf);
    		if ('moveHandle' in $$props) $$invalidate(26, moveHandle = $$props.moveHandle);
    		if ('fixFloat' in $$props) $$invalidate(16, fixFloat = $$props.fixFloat);
    	};

    	$$self.$capture_state = () => ({
    		range,
    		min,
    		max,
    		step,
    		values,
    		vertical,
    		reversed,
    		hoverable,
    		disabled,
    		pipstep,
    		all,
    		first,
    		last,
    		rest,
    		prefix,
    		suffix,
    		formatter,
    		focus,
    		orientationStart,
    		percentOf,
    		moveHandle,
    		fixFloat,
    		labelClick,
    		inRange,
    		isSelected,
    		pipStep,
    		pipVal,
    		pipCount
    	});

    	$$self.$inject_state = $$props => {
    		if ('range' in $$props) $$invalidate(22, range = $$props.range);
    		if ('min' in $$props) $$invalidate(0, min = $$props.min);
    		if ('max' in $$props) $$invalidate(1, max = $$props.max);
    		if ('step' in $$props) $$invalidate(23, step = $$props.step);
    		if ('values' in $$props) $$invalidate(24, values = $$props.values);
    		if ('vertical' in $$props) $$invalidate(2, vertical = $$props.vertical);
    		if ('reversed' in $$props) $$invalidate(3, reversed = $$props.reversed);
    		if ('hoverable' in $$props) $$invalidate(4, hoverable = $$props.hoverable);
    		if ('disabled' in $$props) $$invalidate(5, disabled = $$props.disabled);
    		if ('pipstep' in $$props) $$invalidate(25, pipstep = $$props.pipstep);
    		if ('all' in $$props) $$invalidate(6, all = $$props.all);
    		if ('first' in $$props) $$invalidate(7, first = $$props.first);
    		if ('last' in $$props) $$invalidate(8, last = $$props.last);
    		if ('rest' in $$props) $$invalidate(9, rest = $$props.rest);
    		if ('prefix' in $$props) $$invalidate(10, prefix = $$props.prefix);
    		if ('suffix' in $$props) $$invalidate(11, suffix = $$props.suffix);
    		if ('formatter' in $$props) $$invalidate(12, formatter = $$props.formatter);
    		if ('focus' in $$props) $$invalidate(13, focus = $$props.focus);
    		if ('orientationStart' in $$props) $$invalidate(14, orientationStart = $$props.orientationStart);
    		if ('percentOf' in $$props) $$invalidate(15, percentOf = $$props.percentOf);
    		if ('moveHandle' in $$props) $$invalidate(26, moveHandle = $$props.moveHandle);
    		if ('fixFloat' in $$props) $$invalidate(16, fixFloat = $$props.fixFloat);
    		if ('inRange' in $$props) $$invalidate(17, inRange = $$props.inRange);
    		if ('isSelected' in $$props) $$invalidate(18, isSelected = $$props.isSelected);
    		if ('pipStep' in $$props) $$invalidate(27, pipStep = $$props.pipStep);
    		if ('pipVal' in $$props) $$invalidate(19, pipVal = $$props.pipVal);
    		if ('pipCount' in $$props) $$invalidate(20, pipCount = $$props.pipCount);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*pipstep, max, min, step, vertical*/ 41943047) {
    			$$invalidate(27, pipStep = pipstep || ((max - min) / step >= (vertical ? 50 : 100)
    			? (max - min) / (vertical ? 10 : 20)
    			: 1));
    		}

    		if ($$self.$$.dirty & /*max, min, step, pipStep*/ 142606339) {
    			$$invalidate(20, pipCount = parseInt((max - min) / (step * pipStep), 10));
    		}

    		if ($$self.$$.dirty & /*fixFloat, min, step, pipStep*/ 142671873) {
    			$$invalidate(19, pipVal = function (val) {
    				return fixFloat(min + val * step * pipStep);
    			});
    		}

    		if ($$self.$$.dirty & /*values, fixFloat*/ 16842752) {
    			$$invalidate(18, isSelected = function (val) {
    				return values.some(v => fixFloat(v) === fixFloat(val));
    			});
    		}

    		if ($$self.$$.dirty & /*range, values*/ 20971520) {
    			$$invalidate(17, inRange = function (val) {
    				if (range === "min") {
    					return values[0] > val;
    				} else if (range === "max") {
    					return values[0] < val;
    				} else if (range) {
    					return values[0] < val && values[1] > val;
    				}
    			});
    		}
    	};

    	return [
    		min,
    		max,
    		vertical,
    		reversed,
    		hoverable,
    		disabled,
    		all,
    		first,
    		last,
    		rest,
    		prefix,
    		suffix,
    		formatter,
    		focus,
    		orientationStart,
    		percentOf,
    		fixFloat,
    		inRange,
    		isSelected,
    		pipVal,
    		pipCount,
    		labelClick,
    		range,
    		step,
    		values,
    		pipstep,
    		moveHandle,
    		pipStep
    	];
    }

    class RangePips extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			range: 22,
    			min: 0,
    			max: 1,
    			step: 23,
    			values: 24,
    			vertical: 2,
    			reversed: 3,
    			hoverable: 4,
    			disabled: 5,
    			pipstep: 25,
    			all: 6,
    			first: 7,
    			last: 8,
    			rest: 9,
    			prefix: 10,
    			suffix: 11,
    			formatter: 12,
    			focus: 13,
    			orientationStart: 14,
    			percentOf: 15,
    			moveHandle: 26,
    			fixFloat: 16
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "RangePips",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get range() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set range(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get min() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set min(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get max() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set max(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get step() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set step(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get values() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set values(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get vertical() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set vertical(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get reversed() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set reversed(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get hoverable() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set hoverable(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabled() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabled(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pipstep() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pipstep(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get all() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set all(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get first() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set first(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get last() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set last(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get rest() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set rest(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get prefix() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set prefix(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get suffix() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set suffix(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get formatter() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set formatter(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get focus() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set focus(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get orientationStart() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set orientationStart(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get percentOf() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set percentOf(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get moveHandle() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set moveHandle(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get fixFloat() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set fixFloat(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-range-slider-pips/src/RangeSlider.svelte generated by Svelte v3.53.1 */

    const { console: console_1 } = globals;
    const file$1 = "node_modules/svelte-range-slider-pips/src/RangeSlider.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[64] = list[i];
    	child_ctx[66] = i;
    	return child_ctx;
    }

    // (842:6) {#if float}
    function create_if_block_2(ctx) {
    	let span;
    	let t_value = /*handleFormatter*/ ctx[21](/*value*/ ctx[64], /*index*/ ctx[66], /*percentOf*/ ctx[23](/*value*/ ctx[64])) + "";
    	let t;
    	let if_block0 = /*prefix*/ ctx[18] && create_if_block_4(ctx);
    	let if_block1 = /*suffix*/ ctx[19] && create_if_block_3(ctx);

    	const block = {
    		c: function create() {
    			span = element("span");
    			if (if_block0) if_block0.c();
    			t = text(t_value);
    			if (if_block1) if_block1.c();
    			attr_dev(span, "class", "rangeFloat");
    			add_location(span, file$1, 842, 8, 25024);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			if (if_block0) if_block0.m(span, null);
    			append_dev(span, t);
    			if (if_block1) if_block1.m(span, null);
    		},
    		p: function update(ctx, dirty) {
    			if (/*prefix*/ ctx[18]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_4(ctx);
    					if_block0.c();
    					if_block0.m(span, t);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty[0] & /*handleFormatter, values, percentOf*/ 10485761 && t_value !== (t_value = /*handleFormatter*/ ctx[21](/*value*/ ctx[64], /*index*/ ctx[66], /*percentOf*/ ctx[23](/*value*/ ctx[64])) + "")) set_data_dev(t, t_value);

    			if (/*suffix*/ ctx[19]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_3(ctx);
    					if_block1.c();
    					if_block1.m(span, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(842:6) {#if float}",
    		ctx
    	});

    	return block;
    }

    // (844:10) {#if prefix}
    function create_if_block_4(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(/*prefix*/ ctx[18]);
    			attr_dev(span, "class", "rangeFloat-prefix");
    			add_location(span, file$1, 843, 22, 25072);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*prefix*/ 262144) set_data_dev(t, /*prefix*/ ctx[18]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(844:10) {#if prefix}",
    		ctx
    	});

    	return block;
    }

    // (844:121) {#if suffix}
    function create_if_block_3(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(/*suffix*/ ctx[19]);
    			attr_dev(span, "class", "rangeFloat-suffix");
    			add_location(span, file$1, 843, 133, 25183);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*suffix*/ 524288) set_data_dev(t, /*suffix*/ ctx[19]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(844:121) {#if suffix}",
    		ctx
    	});

    	return block;
    }

    // (821:2) {#each values as value, index}
    function create_each_block(ctx) {
    	let span1;
    	let span0;
    	let t;
    	let span1_style_value;
    	let span1_aria_valuemin_value;
    	let span1_aria_valuemax_value;
    	let span1_aria_valuenow_value;
    	let span1_aria_valuetext_value;
    	let span1_aria_orientation_value;
    	let span1_tabindex_value;
    	let mounted;
    	let dispose;
    	let if_block = /*float*/ ctx[7] && create_if_block_2(ctx);

    	const block = {
    		c: function create() {
    			span1 = element("span");
    			span0 = element("span");
    			t = space();
    			if (if_block) if_block.c();
    			attr_dev(span0, "class", "rangeNub");
    			add_location(span0, file$1, 840, 6, 24972);
    			attr_dev(span1, "role", "slider");
    			attr_dev(span1, "class", "rangeHandle");
    			attr_dev(span1, "data-handle", /*index*/ ctx[66]);
    			attr_dev(span1, "style", span1_style_value = "" + (/*orientationStart*/ ctx[28] + ": " + /*$springPositions*/ ctx[29][/*index*/ ctx[66]] + "%; z-index: " + (/*activeHandle*/ ctx[26] === /*index*/ ctx[66] ? 3 : 2) + ";"));

    			attr_dev(span1, "aria-valuemin", span1_aria_valuemin_value = /*range*/ ctx[2] === true && /*index*/ ctx[66] === 1
    			? /*values*/ ctx[0][0]
    			: /*min*/ ctx[3]);

    			attr_dev(span1, "aria-valuemax", span1_aria_valuemax_value = /*range*/ ctx[2] === true && /*index*/ ctx[66] === 0
    			? /*values*/ ctx[0][1]
    			: /*max*/ ctx[4]);

    			attr_dev(span1, "aria-valuenow", span1_aria_valuenow_value = /*value*/ ctx[64]);
    			attr_dev(span1, "aria-valuetext", span1_aria_valuetext_value = "" + (/*prefix*/ ctx[18] + /*handleFormatter*/ ctx[21](/*value*/ ctx[64], /*index*/ ctx[66], /*percentOf*/ ctx[23](/*value*/ ctx[64])) + /*suffix*/ ctx[19]));
    			attr_dev(span1, "aria-orientation", span1_aria_orientation_value = /*vertical*/ ctx[6] ? 'vertical' : 'horizontal');
    			attr_dev(span1, "aria-disabled", /*disabled*/ ctx[10]);
    			attr_dev(span1, "disabled", /*disabled*/ ctx[10]);
    			attr_dev(span1, "tabindex", span1_tabindex_value = /*disabled*/ ctx[10] ? -1 : 0);
    			toggle_class(span1, "active", /*focus*/ ctx[24] && /*activeHandle*/ ctx[26] === /*index*/ ctx[66]);
    			toggle_class(span1, "press", /*handlePressed*/ ctx[25] && /*activeHandle*/ ctx[26] === /*index*/ ctx[66]);
    			add_location(span1, file$1, 821, 4, 24159);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span1, anchor);
    			append_dev(span1, span0);
    			append_dev(span1, t);
    			if (if_block) if_block.m(span1, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(span1, "blur", /*sliderBlurHandle*/ ctx[34], false, false, false),
    					listen_dev(span1, "focus", /*sliderFocusHandle*/ ctx[35], false, false, false),
    					listen_dev(span1, "keydown", /*sliderKeydown*/ ctx[36], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*float*/ ctx[7]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_2(ctx);
    					if_block.c();
    					if_block.m(span1, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty[0] & /*orientationStart, $springPositions, activeHandle*/ 872415232 && span1_style_value !== (span1_style_value = "" + (/*orientationStart*/ ctx[28] + ": " + /*$springPositions*/ ctx[29][/*index*/ ctx[66]] + "%; z-index: " + (/*activeHandle*/ ctx[26] === /*index*/ ctx[66] ? 3 : 2) + ";"))) {
    				attr_dev(span1, "style", span1_style_value);
    			}

    			if (dirty[0] & /*range, values, min*/ 13 && span1_aria_valuemin_value !== (span1_aria_valuemin_value = /*range*/ ctx[2] === true && /*index*/ ctx[66] === 1
    			? /*values*/ ctx[0][0]
    			: /*min*/ ctx[3])) {
    				attr_dev(span1, "aria-valuemin", span1_aria_valuemin_value);
    			}

    			if (dirty[0] & /*range, values, max*/ 21 && span1_aria_valuemax_value !== (span1_aria_valuemax_value = /*range*/ ctx[2] === true && /*index*/ ctx[66] === 0
    			? /*values*/ ctx[0][1]
    			: /*max*/ ctx[4])) {
    				attr_dev(span1, "aria-valuemax", span1_aria_valuemax_value);
    			}

    			if (dirty[0] & /*values*/ 1 && span1_aria_valuenow_value !== (span1_aria_valuenow_value = /*value*/ ctx[64])) {
    				attr_dev(span1, "aria-valuenow", span1_aria_valuenow_value);
    			}

    			if (dirty[0] & /*prefix, handleFormatter, values, percentOf, suffix*/ 11272193 && span1_aria_valuetext_value !== (span1_aria_valuetext_value = "" + (/*prefix*/ ctx[18] + /*handleFormatter*/ ctx[21](/*value*/ ctx[64], /*index*/ ctx[66], /*percentOf*/ ctx[23](/*value*/ ctx[64])) + /*suffix*/ ctx[19]))) {
    				attr_dev(span1, "aria-valuetext", span1_aria_valuetext_value);
    			}

    			if (dirty[0] & /*vertical*/ 64 && span1_aria_orientation_value !== (span1_aria_orientation_value = /*vertical*/ ctx[6] ? 'vertical' : 'horizontal')) {
    				attr_dev(span1, "aria-orientation", span1_aria_orientation_value);
    			}

    			if (dirty[0] & /*disabled*/ 1024) {
    				attr_dev(span1, "aria-disabled", /*disabled*/ ctx[10]);
    			}

    			if (dirty[0] & /*disabled*/ 1024) {
    				attr_dev(span1, "disabled", /*disabled*/ ctx[10]);
    			}

    			if (dirty[0] & /*disabled*/ 1024 && span1_tabindex_value !== (span1_tabindex_value = /*disabled*/ ctx[10] ? -1 : 0)) {
    				attr_dev(span1, "tabindex", span1_tabindex_value);
    			}

    			if (dirty[0] & /*focus, activeHandle*/ 83886080) {
    				toggle_class(span1, "active", /*focus*/ ctx[24] && /*activeHandle*/ ctx[26] === /*index*/ ctx[66]);
    			}

    			if (dirty[0] & /*handlePressed, activeHandle*/ 100663296) {
    				toggle_class(span1, "press", /*handlePressed*/ ctx[25] && /*activeHandle*/ ctx[26] === /*index*/ ctx[66]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span1);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(821:2) {#each values as value, index}",
    		ctx
    	});

    	return block;
    }

    // (849:2) {#if range}
    function create_if_block_1(ctx) {
    	let span;
    	let span_style_value;

    	const block = {
    		c: function create() {
    			span = element("span");
    			attr_dev(span, "class", "rangeBar");
    			attr_dev(span, "style", span_style_value = "" + (/*orientationStart*/ ctx[28] + ": " + /*rangeStart*/ ctx[32](/*$springPositions*/ ctx[29]) + "%; " + /*orientationEnd*/ ctx[27] + ": " + /*rangeEnd*/ ctx[33](/*$springPositions*/ ctx[29]) + "%;"));
    			add_location(span, file$1, 849, 4, 25304);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*orientationStart, $springPositions, orientationEnd*/ 939524096 && span_style_value !== (span_style_value = "" + (/*orientationStart*/ ctx[28] + ": " + /*rangeStart*/ ctx[32](/*$springPositions*/ ctx[29]) + "%; " + /*orientationEnd*/ ctx[27] + ": " + /*rangeEnd*/ ctx[33](/*$springPositions*/ ctx[29]) + "%;"))) {
    				attr_dev(span, "style", span_style_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(849:2) {#if range}",
    		ctx
    	});

    	return block;
    }

    // (855:2) {#if pips}
    function create_if_block$1(ctx) {
    	let rangepips;
    	let current;

    	rangepips = new RangePips({
    			props: {
    				values: /*values*/ ctx[0],
    				min: /*min*/ ctx[3],
    				max: /*max*/ ctx[4],
    				step: /*step*/ ctx[5],
    				range: /*range*/ ctx[2],
    				vertical: /*vertical*/ ctx[6],
    				reversed: /*reversed*/ ctx[8],
    				orientationStart: /*orientationStart*/ ctx[28],
    				hoverable: /*hoverable*/ ctx[9],
    				disabled: /*disabled*/ ctx[10],
    				all: /*all*/ ctx[13],
    				first: /*first*/ ctx[14],
    				last: /*last*/ ctx[15],
    				rest: /*rest*/ ctx[16],
    				pipstep: /*pipstep*/ ctx[12],
    				prefix: /*prefix*/ ctx[18],
    				suffix: /*suffix*/ ctx[19],
    				formatter: /*formatter*/ ctx[20],
    				focus: /*focus*/ ctx[24],
    				percentOf: /*percentOf*/ ctx[23],
    				moveHandle: /*moveHandle*/ ctx[31],
    				fixFloat: /*fixFloat*/ ctx[30]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(rangepips.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(rangepips, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const rangepips_changes = {};
    			if (dirty[0] & /*values*/ 1) rangepips_changes.values = /*values*/ ctx[0];
    			if (dirty[0] & /*min*/ 8) rangepips_changes.min = /*min*/ ctx[3];
    			if (dirty[0] & /*max*/ 16) rangepips_changes.max = /*max*/ ctx[4];
    			if (dirty[0] & /*step*/ 32) rangepips_changes.step = /*step*/ ctx[5];
    			if (dirty[0] & /*range*/ 4) rangepips_changes.range = /*range*/ ctx[2];
    			if (dirty[0] & /*vertical*/ 64) rangepips_changes.vertical = /*vertical*/ ctx[6];
    			if (dirty[0] & /*reversed*/ 256) rangepips_changes.reversed = /*reversed*/ ctx[8];
    			if (dirty[0] & /*orientationStart*/ 268435456) rangepips_changes.orientationStart = /*orientationStart*/ ctx[28];
    			if (dirty[0] & /*hoverable*/ 512) rangepips_changes.hoverable = /*hoverable*/ ctx[9];
    			if (dirty[0] & /*disabled*/ 1024) rangepips_changes.disabled = /*disabled*/ ctx[10];
    			if (dirty[0] & /*all*/ 8192) rangepips_changes.all = /*all*/ ctx[13];
    			if (dirty[0] & /*first*/ 16384) rangepips_changes.first = /*first*/ ctx[14];
    			if (dirty[0] & /*last*/ 32768) rangepips_changes.last = /*last*/ ctx[15];
    			if (dirty[0] & /*rest*/ 65536) rangepips_changes.rest = /*rest*/ ctx[16];
    			if (dirty[0] & /*pipstep*/ 4096) rangepips_changes.pipstep = /*pipstep*/ ctx[12];
    			if (dirty[0] & /*prefix*/ 262144) rangepips_changes.prefix = /*prefix*/ ctx[18];
    			if (dirty[0] & /*suffix*/ 524288) rangepips_changes.suffix = /*suffix*/ ctx[19];
    			if (dirty[0] & /*formatter*/ 1048576) rangepips_changes.formatter = /*formatter*/ ctx[20];
    			if (dirty[0] & /*focus*/ 16777216) rangepips_changes.focus = /*focus*/ ctx[24];
    			if (dirty[0] & /*percentOf*/ 8388608) rangepips_changes.percentOf = /*percentOf*/ ctx[23];
    			rangepips.$set(rangepips_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(rangepips.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(rangepips.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(rangepips, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(855:2) {#if pips}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*values*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	let if_block0 = /*range*/ ctx[2] && create_if_block_1(ctx);
    	let if_block1 = /*pips*/ ctx[11] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			if (if_block0) if_block0.c();
    			t1 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(div, "id", /*id*/ ctx[17]);
    			attr_dev(div, "class", "rangeSlider");
    			toggle_class(div, "range", /*range*/ ctx[2]);
    			toggle_class(div, "disabled", /*disabled*/ ctx[10]);
    			toggle_class(div, "hoverable", /*hoverable*/ ctx[9]);
    			toggle_class(div, "vertical", /*vertical*/ ctx[6]);
    			toggle_class(div, "reversed", /*reversed*/ ctx[8]);
    			toggle_class(div, "focus", /*focus*/ ctx[24]);
    			toggle_class(div, "min", /*range*/ ctx[2] === 'min');
    			toggle_class(div, "max", /*range*/ ctx[2] === 'max');
    			toggle_class(div, "pips", /*pips*/ ctx[11]);
    			toggle_class(div, "pip-labels", /*all*/ ctx[13] === 'label' || /*first*/ ctx[14] === 'label' || /*last*/ ctx[15] === 'label' || /*rest*/ ctx[16] === 'label');
    			add_location(div, file$1, 801, 0, 23625);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append_dev(div, t0);
    			if (if_block0) if_block0.m(div, null);
    			append_dev(div, t1);
    			if (if_block1) if_block1.m(div, null);
    			/*div_binding*/ ctx[50](div);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(window, "mousedown", /*bodyInteractStart*/ ctx[39], false, false, false),
    					listen_dev(window, "touchstart", /*bodyInteractStart*/ ctx[39], false, false, false),
    					listen_dev(window, "mousemove", /*bodyInteract*/ ctx[40], false, false, false),
    					listen_dev(window, "touchmove", /*bodyInteract*/ ctx[40], false, false, false),
    					listen_dev(window, "mouseup", /*bodyMouseUp*/ ctx[41], false, false, false),
    					listen_dev(window, "touchend", /*bodyTouchEnd*/ ctx[42], false, false, false),
    					listen_dev(window, "keydown", /*bodyKeyDown*/ ctx[43], false, false, false),
    					listen_dev(div, "mousedown", /*sliderInteractStart*/ ctx[37], false, false, false),
    					listen_dev(div, "mouseup", /*sliderInteractEnd*/ ctx[38], false, false, false),
    					listen_dev(div, "touchstart", prevent_default(/*sliderInteractStart*/ ctx[37]), false, true, false),
    					listen_dev(div, "touchend", prevent_default(/*sliderInteractEnd*/ ctx[38]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*orientationStart, $springPositions, activeHandle, range, values, min, max, prefix, handleFormatter, percentOf, suffix, vertical, disabled, focus, handlePressed, float*/ 934020317 | dirty[1] & /*sliderBlurHandle, sliderFocusHandle, sliderKeydown*/ 56) {
    				each_value = /*values*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, t0);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (/*range*/ ctx[2]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					if_block0.m(div, t1);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*pips*/ ctx[11]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty[0] & /*pips*/ 2048) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block$1(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div, null);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty[0] & /*id*/ 131072) {
    				attr_dev(div, "id", /*id*/ ctx[17]);
    			}

    			if (!current || dirty[0] & /*range*/ 4) {
    				toggle_class(div, "range", /*range*/ ctx[2]);
    			}

    			if (!current || dirty[0] & /*disabled*/ 1024) {
    				toggle_class(div, "disabled", /*disabled*/ ctx[10]);
    			}

    			if (!current || dirty[0] & /*hoverable*/ 512) {
    				toggle_class(div, "hoverable", /*hoverable*/ ctx[9]);
    			}

    			if (!current || dirty[0] & /*vertical*/ 64) {
    				toggle_class(div, "vertical", /*vertical*/ ctx[6]);
    			}

    			if (!current || dirty[0] & /*reversed*/ 256) {
    				toggle_class(div, "reversed", /*reversed*/ ctx[8]);
    			}

    			if (!current || dirty[0] & /*focus*/ 16777216) {
    				toggle_class(div, "focus", /*focus*/ ctx[24]);
    			}

    			if (!current || dirty[0] & /*range*/ 4) {
    				toggle_class(div, "min", /*range*/ ctx[2] === 'min');
    			}

    			if (!current || dirty[0] & /*range*/ 4) {
    				toggle_class(div, "max", /*range*/ ctx[2] === 'max');
    			}

    			if (!current || dirty[0] & /*pips*/ 2048) {
    				toggle_class(div, "pips", /*pips*/ ctx[11]);
    			}

    			if (!current || dirty[0] & /*all, first, last, rest*/ 122880) {
    				toggle_class(div, "pip-labels", /*all*/ ctx[13] === 'label' || /*first*/ ctx[14] === 'label' || /*last*/ ctx[15] === 'label' || /*rest*/ ctx[16] === 'label');
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			/*div_binding*/ ctx[50](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function index(el) {
    	if (!el) return -1;
    	var i = 0;

    	while (el = el.previousElementSibling) {
    		i++;
    	}

    	return i;
    }

    /**
     * normalise a mouse or touch event to return the
     * client (x/y) object for that event
     * @param {event} e a mouse/touch event to normalise
     * @returns {object} normalised event client object (x,y)
     **/
    function normalisedClient(e) {
    	if (e.type.includes("touch")) {
    		return e.touches[0];
    	} else {
    		return e;
    	}
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let percentOf;
    	let clampValue;
    	let alignValueToStep;
    	let orientationStart;
    	let orientationEnd;

    	let $springPositions,
    		$$unsubscribe_springPositions = noop$1,
    		$$subscribe_springPositions = () => ($$unsubscribe_springPositions(), $$unsubscribe_springPositions = subscribe(springPositions, $$value => $$invalidate(29, $springPositions = $$value)), springPositions);

    	$$self.$$.on_destroy.push(() => $$unsubscribe_springPositions());
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('RangeSlider', slots, []);
    	let { slider = undefined } = $$props;
    	let { range = false } = $$props;
    	let { pushy = false } = $$props;
    	let { min = 0 } = $$props;
    	let { max = 100 } = $$props;
    	let { step = 1 } = $$props;
    	let { values = [(max + min) / 2] } = $$props;
    	let { vertical = false } = $$props;
    	let { float = false } = $$props;
    	let { reversed = false } = $$props;
    	let { hoverable = true } = $$props;
    	let { disabled = false } = $$props;
    	let { pips = false } = $$props;
    	let { pipstep = undefined } = $$props;
    	let { all = undefined } = $$props;
    	let { first = undefined } = $$props;
    	let { last = undefined } = $$props;
    	let { rest = undefined } = $$props;
    	let { id = undefined } = $$props;
    	let { prefix = "" } = $$props;
    	let { suffix = "" } = $$props;
    	let { formatter = (v, i, p) => v } = $$props;
    	let { handleFormatter = formatter } = $$props;
    	let { precision = 2 } = $$props;
    	let { springValues = { stiffness: 0.15, damping: 0.4 } } = $$props;

    	// prepare dispatched events
    	const dispatch = createEventDispatcher();

    	// state management
    	let valueLength = 0;

    	let focus = false;
    	let handleActivated = false;
    	let handlePressed = false;
    	let keyboardActive = false;
    	let activeHandle = values.length - 1;
    	let startValue;
    	let previousValue;

    	// copy the initial values in to a spring function which
    	// will update every time the values array is modified
    	let springPositions;

    	const fixFloat = v => parseFloat(v.toFixed(precision));

    	/**
     * check if an element is a handle on the slider
     * @param {object} el dom object reference we want to check
     * @returns {boolean}
     **/
    	function targetIsHandle(el) {
    		const handles = slider.querySelectorAll(".handle");
    		const isHandle = Array.prototype.includes.call(handles, el);
    		const isChild = Array.prototype.some.call(handles, e => e.contains(el));
    		return isHandle || isChild;
    	}

    	/**
     * trim the values array based on whether the property
     * for 'range' is 'min', 'max', or truthy. This is because we
     * do not want more than one handle for a min/max range, and we do
     * not want more than two handles for a true range.
     * @param {array} values the input values for the rangeSlider
     * @return {array} the range array for creating a rangeSlider
     **/
    	function trimRange(values) {
    		if (range === "min" || range === "max") {
    			return values.slice(0, 1);
    		} else if (range) {
    			return values.slice(0, 2);
    		} else {
    			return values;
    		}
    	}

    	/**
     * helper to return the slider dimensions for finding
     * the closest handle to user interaction
     * @return {object} the range slider DOM client rect
     **/
    	function getSliderDimensions() {
    		return slider.getBoundingClientRect();
    	}

    	/**
     * helper to return closest handle to user interaction
     * @param {object} clientPos the client{x,y} positions to check against
     * @return {number} the index of the closest handle to clientPos
     **/
    	function getClosestHandle(clientPos) {
    		// first make sure we have the latest dimensions
    		// of the slider, as it may have changed size
    		const dims = getSliderDimensions();

    		// calculate the interaction position, percent and value
    		let handlePos = 0;

    		let handlePercent = 0;
    		let handleVal = 0;

    		if (vertical) {
    			handlePos = clientPos.clientY - dims.top;
    			handlePercent = handlePos / dims.height * 100;
    			handlePercent = reversed ? handlePercent : 100 - handlePercent;
    		} else {
    			handlePos = clientPos.clientX - dims.left;
    			handlePercent = handlePos / dims.width * 100;
    			handlePercent = reversed ? 100 - handlePercent : handlePercent;
    		}

    		handleVal = (max - min) / 100 * handlePercent + min;
    		let closest;

    		// if we have a range, and the handles are at the same
    		// position, we want a simple check if the interaction
    		// value is greater than return the second handle
    		if (range === true && values[0] === values[1]) {
    			if (handleVal > values[1]) {
    				return 1;
    			} else {
    				return 0;
    			}
    		} else // we sort the handles values, and return the first one closest
    		// to the interaction value
    		{
    			closest = values.indexOf([...values].sort((a, b) => Math.abs(handleVal - a) - Math.abs(handleVal - b))[0]); // if there are multiple handles, and not a range, then
    		}

    		return closest;
    	}

    	/**
     * take the interaction position on the slider, convert
     * it to a value on the range, and then send that value
     * through to the moveHandle() method to set the active
     * handle's position
     * @param {object} clientPos the client{x,y} of the interaction
     **/
    	function handleInteract(clientPos) {
    		// first make sure we have the latest dimensions
    		// of the slider, as it may have changed size
    		const dims = getSliderDimensions();

    		// calculate the interaction position, percent and value
    		let handlePos = 0;

    		let handlePercent = 0;
    		let handleVal = 0;

    		if (vertical) {
    			handlePos = clientPos.clientY - dims.top;
    			handlePercent = handlePos / dims.height * 100;
    			handlePercent = reversed ? handlePercent : 100 - handlePercent;
    		} else {
    			handlePos = clientPos.clientX - dims.left;
    			handlePercent = handlePos / dims.width * 100;
    			handlePercent = reversed ? 100 - handlePercent : handlePercent;
    		}

    		handleVal = (max - min) / 100 * handlePercent + min;

    		// move handle to the value
    		moveHandle(activeHandle, handleVal);
    	}

    	/**
     * move a handle to a specific value, respecting the clamp/align rules
     * @param {number} index the index of the handle we want to move
     * @param {number} value the value to move the handle to
     * @return {number} the value that was moved to (after alignment/clamping)
     **/
    	function moveHandle(index, value) {
    		// align & clamp the value so we're not doing extra
    		// calculation on an out-of-range value down below
    		value = alignValueToStep(value);

    		// use the active handle if handle index is not provided
    		if (typeof index === 'undefined') {
    			index = activeHandle;
    		}

    		// if this is a range slider perform special checks
    		if (range) {
    			// restrict the handles of a range-slider from
    			// going past one-another unless "pushy" is true
    			if (index === 0 && value > values[1]) {
    				if (pushy) {
    					$$invalidate(0, values[1] = value, values);
    				} else {
    					value = values[1];
    				}
    			} else if (index === 1 && value < values[0]) {
    				if (pushy) {
    					$$invalidate(0, values[0] = value, values);
    				} else {
    					value = values[0];
    				}
    			}
    		}

    		// if the value has changed, update it
    		if (values[index] !== value) {
    			$$invalidate(0, values[index] = value, values);
    		}

    		// fire the change event when the handle moves,
    		// and store the previous value for the next time
    		if (previousValue !== value) {
    			eChange();
    			previousValue = value;
    		}

    		return value;
    	}

    	/**
     * helper to find the beginning range value for use with css style
     * @param {array} values the input values for the rangeSlider
     * @return {number} the beginning of the range
     **/
    	function rangeStart(values) {
    		if (range === "min") {
    			return 0;
    		} else {
    			return values[0];
    		}
    	}

    	/**
     * helper to find the ending range value for use with css style
     * @param {array} values the input values for the rangeSlider
     * @return {number} the end of the range
     **/
    	function rangeEnd(values) {
    		if (range === "max") {
    			return 0;
    		} else if (range === "min") {
    			return 100 - values[0];
    		} else {
    			return 100 - values[1];
    		}
    	}

    	/**
     * when the user has unfocussed (blurred) from the
     * slider, deactivate all handles
     * @param {event} e the event from browser
     **/
    	function sliderBlurHandle(e) {
    		if (keyboardActive) {
    			$$invalidate(24, focus = false);
    			handleActivated = false;
    			$$invalidate(25, handlePressed = false);
    		}
    	}

    	/**
     * when the user focusses the handle of a slider
     * set it to be active
     * @param {event} e the event from browser
     **/
    	function sliderFocusHandle(e) {
    		if (!disabled) {
    			$$invalidate(26, activeHandle = index(e.target));
    			$$invalidate(24, focus = true);
    		}
    	}

    	/**
     * handle the keyboard accessible features by checking the
     * input type, and modfier key then moving handle by appropriate amount
     * @param {event} e the event from browser
     **/
    	function sliderKeydown(e) {
    		if (!disabled) {
    			const handle = index(e.target);
    			let jump = e.ctrlKey || e.metaKey || e.shiftKey ? step * 10 : step;
    			let prevent = false;

    			switch (e.key) {
    				case "PageDown":
    					jump *= 10;
    				case "ArrowRight":
    				case "ArrowUp":
    					moveHandle(handle, values[handle] + jump);
    					prevent = true;
    					break;
    				case "PageUp":
    					jump *= 10;
    				case "ArrowLeft":
    				case "ArrowDown":
    					moveHandle(handle, values[handle] - jump);
    					prevent = true;
    					break;
    				case "Home":
    					moveHandle(handle, min);
    					prevent = true;
    					break;
    				case "End":
    					moveHandle(handle, max);
    					prevent = true;
    					break;
    			}

    			if (prevent) {
    				e.preventDefault();
    				e.stopPropagation();
    			}
    		}
    	}

    	/**
     * function to run when the user touches
     * down on the slider element anywhere
     * @param {event} e the event from browser
     **/
    	function sliderInteractStart(e) {
    		if (!disabled) {
    			const el = e.target;
    			const clientPos = normalisedClient(e);

    			// set the closest handle as active
    			$$invalidate(24, focus = true);

    			handleActivated = true;
    			$$invalidate(25, handlePressed = true);
    			$$invalidate(26, activeHandle = getClosestHandle(clientPos));

    			// fire the start event
    			startValue = previousValue = alignValueToStep(values[activeHandle]);

    			eStart();

    			// for touch devices we want the handle to instantly
    			// move to the position touched for more responsive feeling
    			if (e.type === "touchstart" && !el.matches(".pipVal")) {
    				handleInteract(clientPos);
    			}
    		}
    	}

    	/**
     * function to run when the user stops touching
     * down on the slider element anywhere
     * @param {event} e the event from browser
     **/
    	function sliderInteractEnd(e) {
    		// fire the stop event for touch devices
    		if (e.type === "touchend") {
    			eStop();
    		}

    		$$invalidate(25, handlePressed = false);
    	}

    	/**
     * unfocus the slider if the user clicked off of
     * it, somewhere else on the screen
     * @param {event} e the event from browser
     **/
    	function bodyInteractStart(e) {
    		keyboardActive = false;

    		if (focus && e.target !== slider && !slider.contains(e.target)) {
    			$$invalidate(24, focus = false);
    		}
    	}

    	/**
     * send the clientX through to handle the interaction
     * whenever the user moves acros screen while active
     * @param {event} e the event from browser
     **/
    	function bodyInteract(e) {
    		if (!disabled) {
    			if (handleActivated) {
    				handleInteract(normalisedClient(e));
    			}
    		}
    	}

    	/**
     * if user triggers mouseup on the body while
     * a handle is active (without moving) then we
     * trigger an interact event there
     * @param {event} e the event from browser
     **/
    	function bodyMouseUp(e) {
    		if (!disabled) {
    			const el = e.target;

    			// this only works if a handle is active, which can
    			// only happen if there was sliderInteractStart triggered
    			// on the slider, already
    			if (handleActivated) {
    				if (el === slider || slider.contains(el)) {
    					$$invalidate(24, focus = true);

    					// don't trigger interact if the target is a handle (no need) or
    					// if the target is a label (we want to move to that value from rangePips)
    					if (!targetIsHandle(el) && !el.matches(".pipVal")) {
    						handleInteract(normalisedClient(e));
    					}
    				}

    				// fire the stop event for mouse device
    				// when the body is triggered with an active handle
    				eStop();
    			}
    		}

    		handleActivated = false;
    		$$invalidate(25, handlePressed = false);
    	}

    	/**
     * if user triggers touchend on the body then we
     * defocus the slider completely
     * @param {event} e the event from browser
     **/
    	function bodyTouchEnd(e) {
    		handleActivated = false;
    		$$invalidate(25, handlePressed = false);
    	}

    	function bodyKeyDown(e) {
    		if (!disabled) {
    			if (e.target === slider || slider.contains(e.target)) {
    				keyboardActive = true;
    			}
    		}
    	}

    	function eStart() {
    		!disabled && dispatch("start", {
    			activeHandle,
    			value: startValue,
    			values: values.map(v => alignValueToStep(v))
    		});
    	}

    	function eStop() {
    		!disabled && dispatch("stop", {
    			activeHandle,
    			startValue,
    			value: values[activeHandle],
    			values: values.map(v => alignValueToStep(v))
    		});
    	}

    	function eChange() {
    		!disabled && dispatch("change", {
    			activeHandle,
    			startValue,
    			previousValue: typeof previousValue === "undefined"
    			? startValue
    			: previousValue,
    			value: values[activeHandle],
    			values: values.map(v => alignValueToStep(v))
    		});
    	}

    	const writable_props = [
    		'slider',
    		'range',
    		'pushy',
    		'min',
    		'max',
    		'step',
    		'values',
    		'vertical',
    		'float',
    		'reversed',
    		'hoverable',
    		'disabled',
    		'pips',
    		'pipstep',
    		'all',
    		'first',
    		'last',
    		'rest',
    		'id',
    		'prefix',
    		'suffix',
    		'formatter',
    		'handleFormatter',
    		'precision',
    		'springValues'
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<RangeSlider> was created with unknown prop '${key}'`);
    	});

    	function div_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			slider = $$value;
    			$$invalidate(1, slider);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('slider' in $$props) $$invalidate(1, slider = $$props.slider);
    		if ('range' in $$props) $$invalidate(2, range = $$props.range);
    		if ('pushy' in $$props) $$invalidate(44, pushy = $$props.pushy);
    		if ('min' in $$props) $$invalidate(3, min = $$props.min);
    		if ('max' in $$props) $$invalidate(4, max = $$props.max);
    		if ('step' in $$props) $$invalidate(5, step = $$props.step);
    		if ('values' in $$props) $$invalidate(0, values = $$props.values);
    		if ('vertical' in $$props) $$invalidate(6, vertical = $$props.vertical);
    		if ('float' in $$props) $$invalidate(7, float = $$props.float);
    		if ('reversed' in $$props) $$invalidate(8, reversed = $$props.reversed);
    		if ('hoverable' in $$props) $$invalidate(9, hoverable = $$props.hoverable);
    		if ('disabled' in $$props) $$invalidate(10, disabled = $$props.disabled);
    		if ('pips' in $$props) $$invalidate(11, pips = $$props.pips);
    		if ('pipstep' in $$props) $$invalidate(12, pipstep = $$props.pipstep);
    		if ('all' in $$props) $$invalidate(13, all = $$props.all);
    		if ('first' in $$props) $$invalidate(14, first = $$props.first);
    		if ('last' in $$props) $$invalidate(15, last = $$props.last);
    		if ('rest' in $$props) $$invalidate(16, rest = $$props.rest);
    		if ('id' in $$props) $$invalidate(17, id = $$props.id);
    		if ('prefix' in $$props) $$invalidate(18, prefix = $$props.prefix);
    		if ('suffix' in $$props) $$invalidate(19, suffix = $$props.suffix);
    		if ('formatter' in $$props) $$invalidate(20, formatter = $$props.formatter);
    		if ('handleFormatter' in $$props) $$invalidate(21, handleFormatter = $$props.handleFormatter);
    		if ('precision' in $$props) $$invalidate(45, precision = $$props.precision);
    		if ('springValues' in $$props) $$invalidate(46, springValues = $$props.springValues);
    	};

    	$$self.$capture_state = () => ({
    		spring,
    		createEventDispatcher,
    		RangePips,
    		slider,
    		range,
    		pushy,
    		min,
    		max,
    		step,
    		values,
    		vertical,
    		float,
    		reversed,
    		hoverable,
    		disabled,
    		pips,
    		pipstep,
    		all,
    		first,
    		last,
    		rest,
    		id,
    		prefix,
    		suffix,
    		formatter,
    		handleFormatter,
    		precision,
    		springValues,
    		dispatch,
    		valueLength,
    		focus,
    		handleActivated,
    		handlePressed,
    		keyboardActive,
    		activeHandle,
    		startValue,
    		previousValue,
    		springPositions,
    		fixFloat,
    		index,
    		normalisedClient,
    		targetIsHandle,
    		trimRange,
    		getSliderDimensions,
    		getClosestHandle,
    		handleInteract,
    		moveHandle,
    		rangeStart,
    		rangeEnd,
    		sliderBlurHandle,
    		sliderFocusHandle,
    		sliderKeydown,
    		sliderInteractStart,
    		sliderInteractEnd,
    		bodyInteractStart,
    		bodyInteract,
    		bodyMouseUp,
    		bodyTouchEnd,
    		bodyKeyDown,
    		eStart,
    		eStop,
    		eChange,
    		alignValueToStep,
    		orientationEnd,
    		orientationStart,
    		clampValue,
    		percentOf,
    		$springPositions
    	});

    	$$self.$inject_state = $$props => {
    		if ('slider' in $$props) $$invalidate(1, slider = $$props.slider);
    		if ('range' in $$props) $$invalidate(2, range = $$props.range);
    		if ('pushy' in $$props) $$invalidate(44, pushy = $$props.pushy);
    		if ('min' in $$props) $$invalidate(3, min = $$props.min);
    		if ('max' in $$props) $$invalidate(4, max = $$props.max);
    		if ('step' in $$props) $$invalidate(5, step = $$props.step);
    		if ('values' in $$props) $$invalidate(0, values = $$props.values);
    		if ('vertical' in $$props) $$invalidate(6, vertical = $$props.vertical);
    		if ('float' in $$props) $$invalidate(7, float = $$props.float);
    		if ('reversed' in $$props) $$invalidate(8, reversed = $$props.reversed);
    		if ('hoverable' in $$props) $$invalidate(9, hoverable = $$props.hoverable);
    		if ('disabled' in $$props) $$invalidate(10, disabled = $$props.disabled);
    		if ('pips' in $$props) $$invalidate(11, pips = $$props.pips);
    		if ('pipstep' in $$props) $$invalidate(12, pipstep = $$props.pipstep);
    		if ('all' in $$props) $$invalidate(13, all = $$props.all);
    		if ('first' in $$props) $$invalidate(14, first = $$props.first);
    		if ('last' in $$props) $$invalidate(15, last = $$props.last);
    		if ('rest' in $$props) $$invalidate(16, rest = $$props.rest);
    		if ('id' in $$props) $$invalidate(17, id = $$props.id);
    		if ('prefix' in $$props) $$invalidate(18, prefix = $$props.prefix);
    		if ('suffix' in $$props) $$invalidate(19, suffix = $$props.suffix);
    		if ('formatter' in $$props) $$invalidate(20, formatter = $$props.formatter);
    		if ('handleFormatter' in $$props) $$invalidate(21, handleFormatter = $$props.handleFormatter);
    		if ('precision' in $$props) $$invalidate(45, precision = $$props.precision);
    		if ('springValues' in $$props) $$invalidate(46, springValues = $$props.springValues);
    		if ('valueLength' in $$props) $$invalidate(47, valueLength = $$props.valueLength);
    		if ('focus' in $$props) $$invalidate(24, focus = $$props.focus);
    		if ('handleActivated' in $$props) handleActivated = $$props.handleActivated;
    		if ('handlePressed' in $$props) $$invalidate(25, handlePressed = $$props.handlePressed);
    		if ('keyboardActive' in $$props) keyboardActive = $$props.keyboardActive;
    		if ('activeHandle' in $$props) $$invalidate(26, activeHandle = $$props.activeHandle);
    		if ('startValue' in $$props) startValue = $$props.startValue;
    		if ('previousValue' in $$props) previousValue = $$props.previousValue;
    		if ('springPositions' in $$props) $$subscribe_springPositions($$invalidate(22, springPositions = $$props.springPositions));
    		if ('alignValueToStep' in $$props) $$invalidate(48, alignValueToStep = $$props.alignValueToStep);
    		if ('orientationEnd' in $$props) $$invalidate(27, orientationEnd = $$props.orientationEnd);
    		if ('orientationStart' in $$props) $$invalidate(28, orientationStart = $$props.orientationStart);
    		if ('clampValue' in $$props) $$invalidate(49, clampValue = $$props.clampValue);
    		if ('percentOf' in $$props) $$invalidate(23, percentOf = $$props.percentOf);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*min, max*/ 24) {
    			/**
     * clamp a value from the range so that it always
     * falls within the min/max values
     * @param {number} val the value to clamp
     * @return {number} the value after it's been clamped
     **/
    			$$invalidate(49, clampValue = function (val) {
    				// return the min/max if outside of that range
    				return val <= min ? min : val >= max ? max : val;
    			});
    		}

    		if ($$self.$$.dirty[0] & /*min, max, step*/ 56 | $$self.$$.dirty[1] & /*clampValue*/ 262144) {
    			/**
     * align the value with the steps so that it
     * always sits on the closest (above/below) step
     * @param {number} val the value to align
     * @return {number} the value after it's been aligned
     **/
    			$$invalidate(48, alignValueToStep = function (val) {
    				// sanity check for performance
    				if (val <= min) {
    					return fixFloat(min);
    				} else if (val >= max) {
    					return fixFloat(max);
    				}

    				// find the middle-point between steps
    				// and see if the value is closer to the
    				// next step, or previous step
    				let remainder = (val - min) % step;

    				let aligned = val - remainder;

    				if (Math.abs(remainder) * 2 >= step) {
    					aligned += remainder > 0 ? step : -step;
    				}

    				// make sure the value is within acceptable limits
    				aligned = clampValue(aligned);

    				// make sure the returned value is set to the precision desired
    				// this is also because javascript often returns weird floats
    				// when dealing with odd numbers and percentages
    				return fixFloat(aligned);
    			});
    		}

    		if ($$self.$$.dirty[0] & /*min, max*/ 24) {
    			/**
     * take in a value, and then calculate that value's percentage
     * of the overall range (min-max);
     * @param {number} val the value we're getting percent for
     * @return {number} the percentage value
     **/
    			$$invalidate(23, percentOf = function (val) {
    				let perc = (val - min) / (max - min) * 100;

    				if (isNaN(perc) || perc <= 0) {
    					return 0;
    				} else if (perc >= 100) {
    					return 100;
    				} else {
    					return fixFloat(perc);
    				}
    			});
    		}

    		if ($$self.$$.dirty[0] & /*values, max, min, percentOf, springPositions*/ 12582937 | $$self.$$.dirty[1] & /*alignValueToStep, valueLength, springValues*/ 229376) {
    			{
    				// check that "values" is an array, or set it as array
    				// to prevent any errors in springs, or range trimming
    				if (!Array.isArray(values)) {
    					$$invalidate(0, values = [(max + min) / 2]);
    					console.error("'values' prop should be an Array (https://github.com/simeydotme/svelte-range-slider-pips#slider-props)");
    				}

    				// trim the range so it remains as a min/max (only 2 handles)
    				// and also align the handles to the steps
    				$$invalidate(0, values = trimRange(values.map(v => alignValueToStep(v))));

    				// check if the valueLength (length of values[]) has changed,
    				// because if so we need to re-seed the spring function with the
    				// new values array.
    				if (valueLength !== values.length) {
    					// set the initial spring values when the slider initialises,
    					// or when values array length has changed
    					$$subscribe_springPositions($$invalidate(22, springPositions = spring(values.map(v => percentOf(v)), springValues)));
    				} else {
    					// update the value of the spring function for animated handles
    					// whenever the values has updated
    					springPositions.set(values.map(v => percentOf(v)));
    				}

    				// set the valueLength for the next check
    				$$invalidate(47, valueLength = values.length);
    			}
    		}

    		if ($$self.$$.dirty[0] & /*vertical, reversed*/ 320) {
    			/**
     * the orientation of the handles/pips based on the
     * input values of vertical and reversed
     **/
    			$$invalidate(28, orientationStart = vertical
    			? reversed ? 'top' : 'bottom'
    			: reversed ? 'right' : 'left');
    		}

    		if ($$self.$$.dirty[0] & /*vertical, reversed*/ 320) {
    			$$invalidate(27, orientationEnd = vertical
    			? reversed ? 'bottom' : 'top'
    			: reversed ? 'left' : 'right');
    		}
    	};

    	return [
    		values,
    		slider,
    		range,
    		min,
    		max,
    		step,
    		vertical,
    		float,
    		reversed,
    		hoverable,
    		disabled,
    		pips,
    		pipstep,
    		all,
    		first,
    		last,
    		rest,
    		id,
    		prefix,
    		suffix,
    		formatter,
    		handleFormatter,
    		springPositions,
    		percentOf,
    		focus,
    		handlePressed,
    		activeHandle,
    		orientationEnd,
    		orientationStart,
    		$springPositions,
    		fixFloat,
    		moveHandle,
    		rangeStart,
    		rangeEnd,
    		sliderBlurHandle,
    		sliderFocusHandle,
    		sliderKeydown,
    		sliderInteractStart,
    		sliderInteractEnd,
    		bodyInteractStart,
    		bodyInteract,
    		bodyMouseUp,
    		bodyTouchEnd,
    		bodyKeyDown,
    		pushy,
    		precision,
    		springValues,
    		valueLength,
    		alignValueToStep,
    		clampValue,
    		div_binding
    	];
    }

    class RangeSlider extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance$1,
    			create_fragment$1,
    			safe_not_equal,
    			{
    				slider: 1,
    				range: 2,
    				pushy: 44,
    				min: 3,
    				max: 4,
    				step: 5,
    				values: 0,
    				vertical: 6,
    				float: 7,
    				reversed: 8,
    				hoverable: 9,
    				disabled: 10,
    				pips: 11,
    				pipstep: 12,
    				all: 13,
    				first: 14,
    				last: 15,
    				rest: 16,
    				id: 17,
    				prefix: 18,
    				suffix: 19,
    				formatter: 20,
    				handleFormatter: 21,
    				precision: 45,
    				springValues: 46
    			},
    			null,
    			[-1, -1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "RangeSlider",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get slider() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set slider(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get range() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set range(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pushy() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pushy(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get min() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set min(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get max() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set max(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get step() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set step(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get values() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set values(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get vertical() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set vertical(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get float() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set float(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get reversed() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set reversed(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get hoverable() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set hoverable(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabled() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabled(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pips() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pips(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pipstep() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pipstep(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get all() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set all(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get first() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set first(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get last() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set last(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get rest() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set rest(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get prefix() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set prefix(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get suffix() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set suffix(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get formatter() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set formatter(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleFormatter() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleFormatter(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get precision() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set precision(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get springValues() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set springValues(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.53.1 */
    const file = "src/App.svelte";

    // (33:2) {#if initConfig}
    function create_if_block(ctx) {
    	let previous_key = /*initConfig*/ ctx[0];
    	let key_block_anchor;
    	let current;
    	let key_block = create_key_block(ctx);

    	const block = {
    		c: function create() {
    			key_block.c();
    			key_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			key_block.m(target, anchor);
    			insert_dev(target, key_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*initConfig*/ 1 && safe_not_equal(previous_key, previous_key = /*initConfig*/ ctx[0])) {
    				group_outros();
    				transition_out(key_block, 1, 1, noop$1);
    				check_outros();
    				key_block = create_key_block(ctx);
    				key_block.c();
    				transition_in(key_block, 1);
    				key_block.m(key_block_anchor.parentNode, key_block_anchor);
    			} else {
    				key_block.p(ctx, dirty);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(key_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(key_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(key_block_anchor);
    			key_block.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(33:2) {#if initConfig}",
    		ctx
    	});

    	return block;
    }

    // (34:3) {#key initConfig}
    function create_key_block(ctx) {
    	let game;
    	let current;

    	game = new Game({
    			props: { config: /*initConfig*/ ctx[0] },
    			$$inline: true
    		});

    	game.$on("end", /*setupGame*/ ctx[2]);

    	const block = {
    		c: function create() {
    			create_component(game.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(game, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const game_changes = {};
    			if (dirty & /*initConfig*/ 1) game_changes.config = /*initConfig*/ ctx[0];
    			game.$set(game_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(game.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(game.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(game, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_key_block.name,
    		type: "key",
    		source: "(34:3) {#key initConfig}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let div1;
    	let h1;
    	let t1;
    	let div0;
    	let rangeslider;
    	let updating_values;
    	let t2;
    	let div2;
    	let current;

    	function rangeslider_values_binding(value) {
    		/*rangeslider_values_binding*/ ctx[3](value);
    	}

    	let rangeslider_props = { min: 50, max: 300 };

    	if (/*complexity*/ ctx[1] !== void 0) {
    		rangeslider_props.values = /*complexity*/ ctx[1];
    	}

    	rangeslider = new RangeSlider({ props: rangeslider_props, $$inline: true });
    	binding_callbacks.push(() => bind$1(rangeslider, 'values', rangeslider_values_binding));
    	rangeslider.$on("change", /*setupGame*/ ctx[2]);
    	let if_block = /*initConfig*/ ctx[0] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			div1 = element("div");
    			h1 = element("h1");
    			h1.textContent = "LABYRINTHIUM";
    			t1 = space();
    			div0 = element("div");
    			create_component(rangeslider.$$.fragment);
    			t2 = space();
    			div2 = element("div");
    			if (if_block) if_block.c();
    			attr_dev(h1, "class", "svelte-82a4gu");
    			add_location(h1, file, 24, 2, 781);
    			attr_dev(div0, "class", "slider-container svelte-82a4gu");
    			add_location(div0, file, 25, 2, 805);
    			attr_dev(div1, "id", "header");
    			add_location(div1, file, 23, 1, 761);
    			attr_dev(div2, "id", "game-container");
    			add_location(div2, file, 31, 1, 945);
    			attr_dev(main, "class", "svelte-82a4gu");
    			add_location(main, file, 22, 0, 753);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div1);
    			append_dev(div1, h1);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			mount_component(rangeslider, div0, null);
    			append_dev(main, t2);
    			append_dev(main, div2);
    			if (if_block) if_block.m(div2, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const rangeslider_changes = {};

    			if (!updating_values && dirty & /*complexity*/ 2) {
    				updating_values = true;
    				rangeslider_changes.values = /*complexity*/ ctx[1];
    				add_flush_callback(() => updating_values = false);
    			}

    			rangeslider.$set(rangeslider_changes);

    			if (/*initConfig*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*initConfig*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div2, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(rangeslider.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(rangeslider.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(rangeslider);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let initConfig;
    	let complexity = [150];

    	const setupGame = () => {
    		const header = document.getElementById('header');
    		const numberOfColumns = complexity[0];
    		const gameAreaHeight = window.innerHeight - header.offsetHeight - 50;
    		const squareWidth = Math.floor(header.offsetWidth / numberOfColumns);
    		const numberOfRows = Math.floor(gameAreaHeight / squareWidth);

    		$$invalidate(0, initConfig = {
    			squareWidth,
    			canvasHeight: squareWidth * numberOfRows,
    			canvasWidth: squareWidth * numberOfColumns,
    			numberOfColumns,
    			numberOfRows
    		});
    	};

    	onMount(() => setupGame());
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function rangeslider_values_binding(value) {
    		complexity = value;
    		$$invalidate(1, complexity);
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		Game,
    		RangeSlider,
    		initConfig,
    		complexity,
    		setupGame
    	});

    	$$self.$inject_state = $$props => {
    		if ('initConfig' in $$props) $$invalidate(0, initConfig = $$props.initConfig);
    		if ('complexity' in $$props) $$invalidate(1, complexity = $$props.complexity);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [initConfig, complexity, setupGame, rangeslider_values_binding];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
        target: document.body,
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
