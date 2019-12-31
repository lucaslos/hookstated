/**
 * forked from v1 of https://github.com/jhonnymichel/react-hookstore
 */
// TODO: remove fork comment and add credit to readme
import { useEffect, useState } from 'react';
import devtools from './devTools';
/* code */
let stores = {};
const devToolsMiddeware = process.env.NODE_ENV === 'development' &&
    typeof window !== 'undefined' &&
    (window.__REDUX_DEVTOOLS_EXTENSION__ ? devtools : false);
export function createStore(name, { state, reducers, subscriber, }) {
    if (stores[name]) {
        throw new Error(`Store ${name} already exists`);
    }
    const store = {
        state,
        reducers,
        setters: [],
        subscribers: subscriber ? [subscriber] : [],
    };
    if (devToolsMiddeware) {
        store.subscribers.push(devToolsMiddeware(name, state, (newState) => {
            setState(getStore(name), newState);
        }));
    }
    stores = { ...stores, [name]: store };
    function dispatchHOF(type, ...payload) {
        return dispatch(name, type, payload[0]);
    }
    return {
        getState: () => getState(name),
        setKey: (key, value) => setKey(name, key, value),
        dispatch: dispatchHOF,
        subscribe: (callback) => subscribe(name, callback),
        useStore: (key) => useStore(name, key),
    };
}
function setState(store, newState, action) {
    for (let i = 0; i < store.setters.length; i++) {
        const setter = store.setters[i];
        if (store.state[setter.key] !== newState[setter.key]) {
            setter.callback(newState[setter.key]);
        }
    }
    const prevState = { ...store.state };
    store.state = newState;
    for (let i = 0; i < store.subscribers.length; i++) {
        store.subscribers[i](prevState, newState, action);
    }
}
function getStore(name) {
    const store = stores[name];
    if (!store) {
        throw new Error(`Store ${name} does not exist`);
    }
    return store;
}
/**
 * Returns the state for the selected store
 * @param {String} name - The namespace for the wanted store
 */
export function getState(name) {
    return getStore(name).state;
}
export function dispatch(name, type, payload) {
    const store = getStore(name);
    if (store.reducers && store.reducers[type]) {
        const newState = store.reducers[type](store.state, payload);
        if (newState) {
            setState(store, newState, { type: `${name}.${type}`, ...payload });
        }
    }
    else {
        throw new Error(`Action ${type} does not exist on store ${name}`);
    }
}
export function setKey(name, key, value) {
    const store = getStore(name);
    const newState = { ...store.state, [key]: value };
    setState(store, newState, { type: `${name}.set.${key}`, key, value });
    return value;
}
/**
 * Returns a [ state, setState ] pair for the selected store. Can only be called within React Components
 * @param {String} name - The namespace for the wanted store
 * @param {String} key - The wanted state key
 */
export function useStore(name, key) {
    const store = getStore(name);
    const [state, set] = useState(store.state[key]);
    useEffect(() => {
        store.setters.push({
            key,
            callback: set,
        });
        return () => {
            store.setters = store.setters.filter((setter) => setter.callback !== set);
        };
    }, []);
    if (store.state[key] === undefined) {
        throw new Error(`Key '${key}' for the store '${name}' does not exist`);
    }
    const getter = () => getState(name)[key];
    return [state, (value) => setKey(name, key, value), getter];
}
/**
 * Subscribe callback
 *
 * @callback subscribeCallback
 * @param {Object} prevState - previous state
 * @param {Object} nextState - next state
 * @param {String} action - action dispatched
 */
/**
 * Subscribe to changes in a store
 * @param {String} name - The store name
 * @param {subscribeCallback} callback - callback to run
 */
export function subscribe(name, callback) {
    const store = getStore(name);
    if (!store.subscribers.includes(callback)) {
        store.subscribers.push(callback);
    }
    return () => {
        store.subscribers = store.subscribers.filter(subscriber => subscriber !== callback);
    };
}
