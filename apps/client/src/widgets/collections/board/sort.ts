import { useMemo } from "preact/hooks";

import type FNote from "../../../entities/fnote";
import { useNoteLabel, useNoteLabelBoolean } from "../../react/hooks";
import { parseSortKey } from "../sorting";
import type { ColumnSort } from "./data";

/** The labels the board keeps the order its columns take by default. */
export const SORT_LABEL = "sortColumns";
export const SORT_DESCENDING_LABEL = "sortColumnsDescending";

/**
 * The order the board holds, absent while it arranges its cards by hand.
 *
 * Kept in step with the labels rather than read per column: every column taking the board's order
 * asks for it, and the labels change only when the reader picks another one.
 */
export function useBoardSort(note: FNote): ColumnSort | undefined {
    const [ stored ] = useNoteLabel(note, SORT_LABEL);
    const [ isDescending ] = useNoteLabelBoolean(note, SORT_DESCENDING_LABEL);

    return useMemo(() => {
        const orderBy = parseSortKey(stored);
        return orderBy ? { orderBy, isDescending } : undefined;
    }, [ stored, isDescending ]);
}
