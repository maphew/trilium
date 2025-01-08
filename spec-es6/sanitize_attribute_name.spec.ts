import sanitizeAttributeName from "../src/services/sanitize_attribute_name"
import { describe, it, execute, expect } from "./mini_test";

// fn value, expected value
const testCases: [fnValue: string, expectedValue: string][] = [
  ["testName", "testName"],
  ["test_name", "test_name"],
  ["test with space", "test_with_space"],
  ["test:with:colon", "test:with:colon"],

  // numbers
  ["123456", "123456"],
  ["123:456", "123:456"],
  ["123456 abc", "123456_abc"],

  // non-latin characters
  ["ε", "ε"],
  ["attribute ε", "attribute_ε"],


  // special characters
  ["test/name", "test_name"],
  ["test%name", "test_name"],
  ["\/", "_"],

  // empty string
  ["", "unnamed"],
]



describe("sanitizeAttributeName unit tests", () => {

  testCases.forEach(testCase => {
    return it(`'${testCase[0]}' should return '${testCase[1]}'`, () => {
      const [value, expected] = testCase;
      const actual = sanitizeAttributeName(value);
      expect(actual).toEqual(expected);
    })
  })
})

execute()