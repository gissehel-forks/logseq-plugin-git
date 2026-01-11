/**
 * A class representing a value that can have hooks on change
 * @template T The type of the value
 */
export class HookableValue<T> {
    private _name: string;
    private _value: T | null;
    callbacks: ((newValue: T | null, oldValue: T | null) => Promise<void>)[];

    /**
     * Constructor
     * @param {string} name The name of the hook
     * @param {T | null} defaultValue The default value
     */
    constructor(name: string, defaultValue: T | null = null) {
        this._name = name;
        this._value = defaultValue;
        this.callbacks = [];
    }

    /**
     * Sets the value and calls the hooks if the value changed
     * 
     * @param {T} newValue The new value
     * @returns {void}
     */
    async setValue(newValue: T | null): Promise<void> {
        const oldValue = this.value;
        if (oldValue !== newValue) {
            this._value = newValue;
            for (const callback of this.callbacks) {
                await callback(newValue, oldValue);
            }
        }
    }

    /**
     * Gets the value
     * 
     * @returns {T | null} The current value
     */
    getValue(): T | null {
        return this._value;
    }

    /**
     * Register a callback to be called when the value changes
     * @param {(newValue:T | null, oldValue:T | null)=>Promise<void>} callback The callback (that may be async)
     * @returns {()=>void} The unregister function
     */
    register(callback: (newValue: T | null, oldValue: T | null) => Promise<void>): () => void {
        this.callbacks.push(callback);
        return () => {
            this.callbacks = this.callbacks.filter(cb => cb !== callback);
        }
    }

    /**
     * Clears all registered callbacks
     * @returns {void}
     */
    clearCallbacks(): void {
        this.callbacks = [];
    }

    get value(): T | null {
        return this.getValue();
    }

    set value(newValue: T) {
        this.setValue(newValue);
    }

    get name(): string {
        return this._name;
    }
}
