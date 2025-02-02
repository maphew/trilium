import { expect, describe, it } from "vitest";
import { formatDownloadTitle } from "./utils.js";

const testCases: [fnValue: Parameters<typeof formatDownloadTitle>, expectedValue: ReturnType<typeof formatDownloadTitle>][] = [
    // empty fileName tests
    [["", "text", ""], "untitled.html"],

    [["", "canvas", ""], "untitled.json"],

    [["", null, ""], "untitled"],

    // json extension from type tests
    [["test_file", "canvas", ""], "test_file.json"],

    [["test_file", "relationMap", ""], "test_file.json"],

    [["test_file", "search", ""], "test_file.json"],

    // extension based on mime type
    [["test_file", null, "text/csv"], "test_file.csv"],

    [["test_file_wo_ext", "image", "image/svg+xml"], "test_file_wo_ext.svg"],

    [["test_file_wo_ext", "file", "application/json"], "test_file_wo_ext.json"],

    [["test_file_w_fake_ext.ext", "image", "image/svg+xml"], "test_file_w_fake_ext.ext.svg"],

    [["test_file_w_correct_ext.svg", "image", "image/svg+xml"], "test_file_w_correct_ext.svg"],

    [["test_file_w_correct_ext.svgz", "image", "image/svg+xml"], "test_file_w_correct_ext.svgz"],

    [["test_file.zip", "file", "application/zip"], "test_file.zip"],

    [["test_file", "file", "application/zip"], "test_file.zip"],

    // application/octet-stream tests
    [["test_file", "file", "application/octet-stream"], "test_file"],

    [["test_file.zip", "file", "application/octet-stream"], "test_file.zip"],

    [["test_file.unknown", null, "application/octet-stream"], "test_file.unknown"],

    // sanitized filename tests
    [["test/file", null, "application/octet-stream"], "testfile"],

    [["test:file.zip", "file", "application/zip"], "testfile.zip"],

    [[":::", "file", "application/zip"], ".zip"],

    [[":::a", "file", "application/zip"], "a.zip"]
];

describe("utils/formatDownloadTitle unit tests", () => {
    testCases.forEach((testCase) => {
        return it(`With args '${JSON.stringify(testCase[0])}' it should return '${testCase[1]}'`, () => {
            const [value, expected] = testCase;
            const actual = formatDownloadTitle(...value);
            expect(actual).toStrictEqual(expected);
        });
    });
});