// Turns GCC/Clang output into editor diagnostics, and explains the common
// messages in plain language for beginners.

const LOCATION = /^(?:main\.cpp|<source>|example\.cpp|prog\.cc):(\d+):(\d+):\s+(fatal error|error|warning|note):\s+(.*)$/;

/** Parse compiler output into [{ line, col, severity, message }] (notes are attached to the previous entry). */
export function parseDiagnostics(text) {
  const out = [];
  for (const raw of String(text || '').split('\n')) {
    const m = raw.match(LOCATION);
    if (!m) continue;
    const [, line, col, kind, message] = m;
    if (kind === 'note') {
      if (out.length) out[out.length - 1].notes.push(message);
      continue;
    }
    out.push({ line: Number(line), col: Number(col), severity: kind === 'warning' ? 'warning' : 'error', message, notes: [] });
  }
  return out;
}

// [pattern, explanation]. The first match wins, so order from specific to general.
const EXPLAIN = [
  [/expected (?:',' or )?';' (?:before|at end)/, 'A semicolon `;` is missing at the end of a statement, usually the line *above* the one reported.'],
  [/expected '\}' at end of input/, 'A `{` was never closed. Count your braces: every `{` needs a matching `}`.'],
  [/expected '\)' before|expected '\(' before/, "Parentheses don't match up. Check that every `(` has a `)`."],
  [/missing terminating " character/, 'A string literal is not closed: it needs a closing `"` on the same line.'],
  [
    /stray '\\?\d+' in program|stray '.' in program/,
    "There is a character C++ doesn't understand, often “smart quotes” or a non-breaking space pasted from a document. Retype the quotes and spaces.",
  ],
  [/'(\w+)' is not a member of 'std'/, '`std::$1` lives in a header you haven\'t included (look for a "note: ... defined in header" line), or the name is misspelled.'],
  [
    /'(\w+)' was not declared in this scope/,
    "The compiler doesn't know `$1`. Check the spelling (C++ is case-sensitive), declare it before you use it, include the right header, or add `std::`.",
  ],
  [
    /'(\w+)' does not name a type/,
    "`$1` is used as a type but the compiler doesn't know it: missing `#include`, missing `std::`, a typo, or the type is declared later in the file.",
  ],
  [/no match for 'operator(<<|>>)'/, "The stream doesn't know how to print or read this type. For your own types, write an `operator$1` overload."],
  [/no match for 'operator/, "This operator isn't defined for these types. Check the types of both operands, or overload the operator for your class."],
  [/invalid operands of types/, "This operator can't combine these two types (for example adding two string literals: use `std::string` instead)."],
  [/no matching function for call to/, 'No overload accepts these arguments. Compare the number and types of your arguments with the "candidate" notes listed below the error.'],
  [/too many arguments to function|too few arguments to function/, 'The call has a different number of arguments than the function declares.'],
  [
    /cannot convert|invalid conversion from/,
    'The value has the wrong type for where it is used (for example a `string` where an `int` is expected). Convert it explicitly or fix the type.',
  ],
  [/narrowing conversion/, 'Brace initialization `{}` refuses conversions that can lose data (like `double` → `int`). Use a matching type or `static_cast`.'],
  [/lvalue required as left operand of assignment/, 'You can only assign to something with a memory location. Did you write `=` where you meant `==`?'],
  [/assignment of read-only|assignment of member .* in read-only object/, 'You are modifying something declared `const`.'],
  [
    /passing 'const .*' as 'this' argument discards qualifiers/,
    "You are calling a non-`const` member function on a `const` object. Mark that member function `const` if it doesn't modify the object.",
  ],
  [/use of deleted function/, "This operation was deleted, most often copying a type that can't be copied (like `std::unique_ptr`). Use `std::move` or pass by reference."],
  [
    /cannot declare variable .* to be of abstract type|invalid new-expression of abstract class/,
    "This class still has pure virtual functions (`= 0`) that aren't overridden, so you can't create objects of it.",
  ],
  [/redefinition of|redeclaration of|conflicting declaration/, 'The same name is defined twice in the same scope. Rename one or remove the duplicate.'],
  [
    /is private within this context|is protected within this context/,
    'You are accessing a private or protected member from outside the class. Use a public member function, or make it public.',
  ],
  [
    /expected unqualified-id|expected primary-expression before/,
    'A syntax error: something is missing or extra here (an operator, comma, parenthesis or brace), or code is outside a function.',
  ],
  [/jump to case label|crosses initialization/, "A variable declared inside a `case` is visible in later cases. Wrap that case's code in braces `{ }`."],
  [
    /control reaches end of non-void function/,
    'Some path through this function reaches the end without a `return` statement, which is undefined behavior for a non-`void` function.',
  ],
  [/may be used uninitialized|is used uninitialized/, 'This variable might be read before it gets a value, which is undefined behavior. Initialize it when you declare it.'],
  [/unused variable|unused parameter/, 'Declared but never used. Remove it, or use it if you forgot to.'],
  [
    /comparison of integer expressions of different signedness/,
    'Comparing a signed and an unsigned number (often `int i < v.size()`). Use `std::size_t` for the index or `std::ssize(v)`.',
  ],
  [/suggest parentheses around assignment used as truth value/, 'You wrote `=` (assignment) inside a condition. You almost certainly meant `==` (comparison).'],
  [/statement has no effect|value computed is not used/, 'This statement does nothing, for example `x == 5;` where you meant `x = 5;`.'],
  [/division by zero/, 'Dividing by zero is undefined behavior for integers.'],
  [/array subscript .* is (above|outside) array bounds/, 'This index is outside the array. Valid indexes run from 0 to size − 1.'],
  [
    /returning reference to temporary|reference to local variable .* returned|address of local variable .* returned/,
    'You return a reference or pointer to a local variable, which is destroyed when the function returns. Return by value instead.',
  ],
  [/undefined reference to `main'/, "The linker can't find `main`. Check that it is spelled `int main()` exactly."],
  [/undefined reference to/, 'Linker error: something is declared but never defined (a function prototype without a body, or a static member that is never defined).'],
];

export function explain(message) {
  for (const [re, text] of EXPLAIN) {
    const m = message.match(re);
    if (m) return text.replace(/\$(\d)/g, (_, i) => m[Number(i)] ?? '');
  }
  return null;
}

/** Explanations for the first few distinct problems in compiler output. */
export function explainOutput(text, limit = 3) {
  const seen = new Set();
  const out = [];
  const lines = String(text || '').split('\n');
  for (const l of lines) {
    if (!/(error|warning)/.test(l)) continue;
    const e = explain(l);
    if (e && !seen.has(e)) {
      seen.add(e);
      const loc = l.match(LOCATION);
      out.push({ line: loc ? Number(loc[1]) : null, text: e, severity: /warning:/.test(l) ? 'warning' : 'error' });
    }
  }
  // Errors first: they stop the build; warnings are advice.
  return out.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1)).slice(0, limit);
}

/** Explain an abnormal exit (signals show up as 128 + signal number). */
export function explainExit(code, stderr = '') {
  if (/AddressSanitizer|UndefinedBehaviorSanitizer|runtime error:/.test(stderr))
    return 'A sanitizer caught a memory or undefined-behavior bug. Read the first "ERROR" or "runtime error" line in stderr: it names the problem and the line.';
  if (/terminate called after throwing/.test(stderr))
    return 'An exception was thrown and never caught, so the program was terminated. Catch it with try/catch, or fix what throws.';
  switch (code) {
    case 139:
      return "Segmentation fault: the program accessed memory it doesn't own (null or dangling pointer, or an index out of bounds). Turn on Sanitizers in Settings to find the exact line.";
    case 134:
      return 'The program aborted: a failed `assert`, an uncaught exception, or a detected memory error (like a double free).';
    case 136:
      return 'Arithmetic error (SIGFPE), most often an integer division or modulo by zero.';
    case 137:
      return 'The program was killed, usually for using too much memory or running too long.';
    default:
      return null;
  }
}
