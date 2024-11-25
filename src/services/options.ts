/**
 * @module
 * 
 * Options are key-value pairs that are used to store information such as user preferences (for example
 * the current theme, sync server information), but also information about the state of the application.
 * 
 * Although options internally are represented as strings, their value can be interpreted as a number or
 * boolean by calling the appropriate methods from this service (e.g. {@link #getOptionInt}).\
 * 
 * Generally options are shared across multiple instances of the application via the sync mechanism,
 * however it is possible to have options that are local to an instance. For example, the user can select
 * a theme on a device and it will not affect other devices.
 */

import becca from "../becca/becca.js";
import BOption from "../becca/entities/boption.js";
import { OptionRow } from '../becca/entities/rows.js';
import sql from "./sql.js";

/**
 * A dictionary where the keys are the option keys (e.g. `theme`) and their corresponding values.
 */
export type OptionMap = Record<string | number, string>;

function getOptionOrNull(name: string): string | null {
    let option;

    if (becca.loaded) {
        option = becca.getOption(name);
    } else {
        // e.g. in initial sync becca is not loaded because DB is not initialized
        option = sql.getRow<OptionRow>("SELECT * FROM options WHERE name = ?", [name]);
    }

    return option ? option.value : null;
}

function getOption(name: string) {
    const val = getOptionOrNull(name);

    if (val === null) {
        throw new Error(`Option '${name}' doesn't exist`);
    }

    return val;
}

function getOptionInt(name: string, defaultValue?: number): number {
    const val = getOption(name);

    const intVal = parseInt(val);

    if (isNaN(intVal)) {
        if (defaultValue === undefined) {
            throw new Error(`Could not parse '${val}' into integer for option '${name}'`);
        } else {
            return defaultValue;
        }
    }

    return intVal;
}

function getOptionBool(name: string): boolean {
    const val = getOption(name);

    if (typeof val !== "string" || !['true', 'false'].includes(val)) {
        throw new Error(`Could not parse '${val}' into boolean for option '${name}'`);
    }

    return val === 'true';
}

function setOption(name: string, value: string | number | boolean) {
    if (value === true || value === false || typeof value === "number") {
        value = value.toString();
    }

    const option = becca.getOption(name);

    if (option) {
        option.value = value;

        option.save();
    }
    else {
        createOption(name, value, false);
    }
}

/**
 * Creates a new option in the database, with the given name, value and whether it should be synced.
 * 
 * @param name the name of the option to be created.
 * @param value the value of the option, as a string. It can then be interpreted as other types such as a number of boolean.
 * @param isSynced `true` if the value should be synced across multiple instances (e.g. locale) or `false` if it should be local-only (e.g. theme).
 */
function createOption(name: string, value: string, isSynced: boolean) {
    new BOption({
        name: name,
        value: value,
        isSynced: isSynced
    }).save();
}

function getOptions() {
    return Object.values(becca.options);
}

function getOptionMap() {
    const map: OptionMap = {};

    for (const option of Object.values(becca.options)) {
        map[option.name] = option.value;
    }

    return map;
}

export default {
    getOption,
    getOptionInt,
    getOptionBool,
    setOption,
    createOption,
    getOptions,
    getOptionMap,
    getOptionOrNull
};
