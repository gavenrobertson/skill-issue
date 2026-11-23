---
title: "Error Handling & Exceptions: Challenges"
summary: Four hard problems that put the whole module to work. A config validator with line-numbered errors, a checked RPN calculator, all-or-nothing transactions with an undo journal, and error chains with nested exceptions.
---

These problems are meant to be **hard**. Each one is a small but complete program with a precise
input and output format, like a task you'd get at work: you design the classes and functions, decide
where errors are detected, where they're thrown, and where they're handled. Expect to spend a while on
each, and to test the error paths at least as much as the happy path.

Try each problem on your own before opening the hints, and only compare with the solution once your
version passes (or once you're truly stuck). There are many good designs; the tests only check the
output.

A few rules that apply to all of them:

- Read the specification twice. Every message is spelled out exactly; the checker compares your
  output character by character (trailing spaces are ignored).
- The hidden tests exercise the edge cases mentioned in the text: empty values, boundary numbers,
  malformed lines, and failures halfway through an operation.
- Your program must never crash or end with an uncaught exception, whatever the input.

:::quiz
What does this program print?

```cpp
#include <iostream>

struct A { A() { std::cout << "A"; } ~A() { std::cout << "a"; } };
struct B { B() { std::cout << "B"; throw 1; } ~B() { std::cout << "b"; } };

struct C {
    A first;
    B second;
    C() { std::cout << "C"; }
    ~C() { std::cout << "c"; }
};

int main() {
    try {
        C c;
    } catch (int) {
        std::cout << "!";
    }
}
```

- [x] `ABa!`
- [ ] `ABCcba!`
- [ ] `ABba!`
- [ ] `AB!`

`first` is fully constructed (`A`), then `B`'s constructor prints `B` and throws. An object whose
constructor didn't finish is **not** destroyed, so `~B` never runs; `C`'s body never runs and neither
does `~C`. Only the members that *were* fully constructed are destroyed during unwinding (`a`), and
then the handler prints `!`.
:::

:::quiz
What does this print? (`MyError` derives publicly from `std::runtime_error`.)

```cpp
try {
    try {
        throw MyError("disk full");
    } catch (std::exception e) {          // by value!
        std::cout << "1";
        throw;
    }
} catch (const MyError&) {
    std::cout << "2";
} catch (...) {
    std::cout << "3";
}
```

- [ ] `13`
- [x] `12`
- [ ] `1`
- [ ] It doesn't compile

Catching by value makes a sliced **copy** named `e` (a plain `std::exception`; GCC warns about it).
But a bare `throw;` rethrows the **original** exception object, which is still a `MyError`, so the outer
`catch (const MyError&)` matches. With `throw e;` instead, the sliced copy would be thrown and you'd
get `13`.
:::

:::exercise Config file validator {hard}
Write a validator and reader for INI-style configuration files that reports **every** bad line with
its line number, instead of giving up at the first one.

**Input:** the lines of a config file, then a line containing exactly `%%`, then query lines. (If
there's no `%%` line, the whole input is the config and there are no queries.)

**Config rules.** Leading and trailing spaces/tabs are ignored on every line. Lines are numbered from 1
(every physical line counts, including blank lines and comments).

| Line | Meaning |
| --- | --- |
| empty, or starting with `;` or `#` | ignored |
| `[name]` | starts the section `name` (spaces inside the brackets are trimmed) |
| `key = value` | a setting in the current section; key and value are trimmed, the value may be empty and may contain `=` (split at the **first** `=`) |

Keys before the first section belong to the **global** section. A section may appear more than once;
its keys are merged. A **name** (section or key) is a non-empty sequence of letters, digits and `_`.

Errors (check in this order; a bad line changes **nothing**, not even the current section):

| Problem | Message |
| --- | --- |
| a line starting with `[` doesn't end with `]` | `missing ']'` |
| the section name isn't a valid name | `invalid section name` |
| a setting line has no `=` | `expected 'key = value'` |
| the key isn't a valid name | `invalid key` |
| the key already exists in this section | `duplicate key 'KEY'` |

Print each error as `line N: MESSAGE` as soon as it's found. Use **exceptions**: define
`class ConfigError` deriving publicly from `std::runtime_error` with an `int line() const` member,
throw it from the line parser, and catch it in the reading loop. After the config, print
`loaded K keys, E errors`.

**Queries:** each non-blank line is `TYPE NAME`, where `NAME` is `section.key` (split at the first
`.`), or just `key` for the global section. Check in this order:

1. not exactly two words: `error: bad query`
2. `TYPE` is not `str`, `int` or `bool`: `error: unknown type TYPE`
3. the key doesn't exist: `error: NAME not found`
4. convert the value and print `NAME = VALUE`:
   - `str`: the value as stored;
   - `int`: an optional `+` or `-` followed by digits, fitting in an `int`; printed as a number
     (`+7` prints `7`). Otherwise `error: NAME is not an int`;
   - `bool`: `true`, `yes`, `on`, `1` mean true and `false`, `no`, `off`, `0` mean false, in any
     letter case; printed as `true`/`false`. Otherwise `error: NAME is not a bool`.

**Example.** For this input:

```
; demo
name = demo app
[server]
port = 8080
host=localhost
debug = Yes
[server
[ bad name ]
port = 9090
just text
 = nothing
timeout = 30s
[db]
port = 99999999999
%%
str name
int server.port
bool server.debug
int server.timeout
str server.host
int db.port
str db.user
float db.port
str
```

the output is:

```
line 7: missing ']'
line 8: invalid section name
line 9: duplicate key 'port'
line 10: expected 'key = value'
line 11: invalid key
loaded 6 keys, 5 errors
name = demo app
server.port = 8080
server.debug = true
error: server.timeout is not an int
server.host = localhost
error: db.port is not an int
error: db.user not found
error: unknown type float
error: bad query
```

Line 9 is a duplicate because lines 7 and 8 were rejected, so the current section is still `server`.

```cpp starter
#include <iostream>
#include <map>
#include <sstream>
#include <stdexcept>
#include <string>

int main() {
    std::string line;
    while (std::getline(std::cin, line)) {
        // parse the config until "%%", then answer the queries
    }
}
```

```cpp solution
#include <cctype>
#include <iostream>
#include <map>
#include <sstream>
#include <stdexcept>
#include <string>

class ConfigError : public std::runtime_error {
public:
    ConfigError(int line, const std::string& message) : std::runtime_error(message), line_(line) {}
    int line() const noexcept { return line_; }

private:
    int line_;
};

std::string trim(const std::string& s) {
    const auto first = s.find_first_not_of(" \t");
    if (first == std::string::npos) return "";
    const auto last = s.find_last_not_of(" \t");
    return s.substr(first, last - first + 1);
}

bool isIdentifier(const std::string& s) {
    if (s.empty()) return false;
    for (char c : s)
        if (!std::isalnum(static_cast<unsigned char>(c)) && c != '_') return false;
    return true;
}

class Config {
public:
    // Parses one line; throws ConfigError for a bad line (which then changes nothing).
    void parseLine(const std::string& raw, int lineNo) {
        const std::string line = trim(raw);
        if (line.empty() || line[0] == ';' || line[0] == '#') return;
        if (line[0] == '[') {
            if (line.back() != ']') throw ConfigError(lineNo, "missing ']'");
            std::string name = trim(line.substr(1, line.size() - 2));
            if (!isIdentifier(name)) throw ConfigError(lineNo, "invalid section name");
            section_ = name;
            return;
        }
        const auto eq = line.find('=');
        if (eq == std::string::npos) throw ConfigError(lineNo, "expected 'key = value'");
        std::string key = trim(line.substr(0, eq));
        if (!isIdentifier(key)) throw ConfigError(lineNo, "invalid key");
        auto& keys = data_[section_];
        if (keys.contains(key)) throw ConfigError(lineNo, "duplicate key '" + key + "'");
        keys[key] = trim(line.substr(eq + 1));
        ++count_;
    }

    int count() const { return count_; }

    // name is "section.key", or "key" for the global section. Throws std::out_of_range if missing.
    const std::string& get(const std::string& name) const {
        std::string section, key = name;
        if (auto dot = name.find('.'); dot != std::string::npos) {
            section = name.substr(0, dot);
            key = name.substr(dot + 1);
        }
        return data_.at(section).at(key);
    }

private:
    std::map<std::string, std::map<std::string, std::string>> data_;
    std::string section_;   // "" = global
    int count_ = 0;
};

int toInt(const std::string& text) {
    if (text.empty() || std::isspace(static_cast<unsigned char>(text[0]))) throw std::invalid_argument("not an int");
    std::size_t used = 0;
    int value = std::stoi(text, &used);   // may throw invalid_argument / out_of_range
    if (used != text.size()) throw std::invalid_argument("not an int");
    return value;
}

bool toBool(std::string text) {
    for (char& c : text) c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
    if (text == "true" || text == "yes" || text == "on" || text == "1") return true;
    if (text == "false" || text == "no" || text == "off" || text == "0") return false;
    throw std::invalid_argument("not a bool");
}

int main() {
    Config config;
    std::string line;
    int lineNo = 0;
    int errors = 0;
    while (std::getline(std::cin, line)) {
        if (line == "%%") break;
        ++lineNo;
        try {
            config.parseLine(line, lineNo);
        } catch (const ConfigError& e) {
            std::cout << "line " << e.line() << ": " << e.what() << '\n';
            ++errors;
        }
    }
    std::cout << "loaded " << config.count() << " keys, " << errors << " errors\n";

    while (std::getline(std::cin, line)) {
        std::istringstream in(line);
        std::string type, name, extra;
        if (!(in >> type)) continue;
        if (!(in >> name) || (in >> extra)) {
            std::cout << "error: bad query\n";
            continue;
        }
        if (type != "str" && type != "int" && type != "bool") {
            std::cout << "error: unknown type " << type << '\n';
            continue;
        }
        try {
            const std::string& value = config.get(name);   // throws std::out_of_range if missing
            std::string shown;
            try {
                if (type == "str") shown = value;
                else if (type == "int") shown = std::to_string(toInt(value));
                else shown = toBool(value) ? "true" : "false";
            } catch (const std::logic_error&) {   // invalid_argument and out_of_range from the conversion
                std::cout << "error: " << name << " is not " << (type == "int" ? "an int" : "a bool") << '\n';
                continue;
            }
            std::cout << name << " = " << shown << '\n';
        } catch (const std::out_of_range&) {
            std::cout << "error: " << name << " not found\n";
        }
    }
}
```

```hint
Split the work: a `Config` class with `void parseLine(const std::string& line, int lineNo)` that either
stores something or throws `ConfigError(lineNo, "...")`, and a loop in `main` that catches, prints and
counts. Because the parser only changes its state **after** every check passed, a rejected line can't
leave a half-applied change behind.
```

```hint
A `std::map<std::string, std::map<std::string, std::string>>` (section → key → value) handles merging
reopened sections for free. Store the global section under the empty string.
```

```hint
For `int`, `std::stoi(text, &used)` plus `used == text.size()` gives exactly the rule above, as long as
you reject an empty value. Its `std::invalid_argument` and `std::out_of_range` both derive from
`std::logic_error`, so one handler can turn either into "is not an int". Build the whole output line
*before* printing, so a failed conversion doesn't leave `NAME = ` half-printed.
```

```stdin
; demo
name = demo app
[server]
port = 8080
host=localhost
debug = Yes
[server
[ bad name ]
port = 9090
just text
 = nothing
timeout = 30s
[db]
port = 99999999999
%%
str name
int server.port
bool server.debug
int server.timeout
str server.host
int db.port
str db.user
float db.port
str
```

```expected
line 7: missing ']'
line 8: invalid section name
line 9: duplicate key 'port'
line 10: expected 'key = value'
line 11: invalid key
loaded 6 keys, 5 errors
name = demo app
server.port = 8080
server.debug = true
error: server.timeout is not an int
server.host = localhost
error: db.port is not an int
error: db.user not found
error: unknown type float
error: bad query
```

```stdin
[a]
x = 1
[b]
x = 2
[a]
y = 3
x = 4
```

```expected
line 7: duplicate key 'x'
loaded 3 keys, 1 errors
```

```stdin
a=1
	[x]	
k=
[]
[x]
k=2
flag = ON
n = +7
m=-0
z= 007
big=2147483648
small = -2147483648
hex=0x1A
b2=nope
sp = 1 2
deep = a=b=c
a=5
[y]
a.b = 1
[x y]
key with space = 1
%%
str a
str x.k
bool x.flag
int x.n
int x.m
int x.z
int x.big
int x.small
int x.hex
bool x.b2
int x.sp
str x.deep
int x.k
bool x.k
int a
str y.a.b
str x.missing
str nosuch.k
int x.n extra

STR a
```

```expected hidden
line 4: invalid section name
line 6: duplicate key 'k'
line 19: invalid key
line 20: invalid section name
line 21: invalid key
loaded 13 keys, 5 errors
a = 1
x.k =
x.flag = true
x.n = 7
x.m = 0
x.z = 7
error: x.big is not an int
x.small = -2147483648
error: x.hex is not an int
error: x.b2 is not a bool
error: x.sp is not an int
x.deep = a=b=c
error: x.k is not an int
error: x.k is not a bool
a = 1
error: y.a.b not found
error: x.missing not found
error: nosuch.k not found
error: bad query
error: unknown type STR
```

```stdin
%%
str a
```

```expected hidden
loaded 0 keys, 0 errors
error: a not found
```

```checks
must class\s+ConfigError\s*:\s*public\s+std::runtime_error :: Define ConfigError deriving publicly from std::runtime_error.
must int\s+line\s*\(\s*\)\s*const :: Give ConfigError an int line() const member.
must throw\s+ConfigError :: Throw ConfigError from the parser.
must catch\s*\(\s*const\s+ConfigError\s*& :: Catch ConfigError by const reference.
```
:::

:::exercise RPN calculator with checked arithmetic {hard}
A calculator for **Reverse Polish Notation** (RPN), where operators come after their operands:
`3 4 + 2 *` means `(3 + 4) * 2`. It works on 64-bit signed integers (`long long`) and must **never**
execute undefined behavior: every overflow and every division by zero is detected and reported.

**Input:** one expression per line (blank lines are ignored). Tokens are separated by whitespace:

| Token | Effect |
| --- | --- |
| an integer: optional `-` then one or more digits (`42`, `-7`) | push it |
| `+` `-` `*` `/` `%` | pop `b`, pop `a`, push `a op b` (`/` and `%` truncate toward zero, like C++) |
| `neg` | pop `a`, push `-a` |
| `dup` | pop `a`, push `a` twice |
| `swap` | pop `b`, pop `a`, push `b` then `a` |

Evaluation stops at the first error. Errors come in two families. Build them as an exception
hierarchy: `CalcError` (derived from `std::runtime_error`) with two subclasses `SyntaxError` and
`MathError`, and catch the two subclasses **separately** in `main`.

| Error | Family | Message |
| --- | --- | --- |
| a token that is neither an integer nor an operator (`x`, `--5`, `5-`, `+3`) | syntax | `unknown token 'TOKEN'` |
| an operator without enough values on the stack | syntax | `stack underflow at 'TOKEN'` |
| more than one value left at the end | syntax | `N values left on stack` |
| division or remainder by zero | math | `division by zero` |
| an integer literal or any result that doesn't fit in `long long` | math | `overflow` |

**Output:** for each expression, the result, or `syntax error: MESSAGE` / `math error: MESSAGE`. At the
end, `ok: X, errors: Y`.

Every result that **does** fit must be computed correctly. Careful: `-9223372036854775808 -1 %` is `0`
(the true remainder), even though evaluating `LLONG_MIN % -1` in C++ is undefined behavior; and
`-4611686018427387904 2 *` is exactly `LLONG_MIN`, which fits.

**Example:**

```
3 4 + 2 *                     ->  14
1 2 3                         ->  syntax error: 3 values left on stack
5 0 /                         ->  math error: division by zero
9223372036854775807 1 +       ->  math error: overflow
2 x +                         ->  syntax error: unknown token 'x'
-7 2 %                        ->  -1
4 dup * neg                   ->  -16
```

```cpp starter
#include <iostream>
#include <limits>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

int main() {
    std::string line;
    while (std::getline(std::cin, line)) {
        // evaluate the expression
    }
}
```

```cpp solution
#include <iostream>
#include <limits>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

class CalcError : public std::runtime_error {
public:
    using std::runtime_error::runtime_error;
};

class SyntaxError : public CalcError {
public:
    using CalcError::CalcError;
};

class MathError : public CalcError {
public:
    using CalcError::CalcError;
};

using Limits = std::numeric_limits<long long>;

long long checkedAdd(long long a, long long b) {
    if ((b > 0 && a > Limits::max() - b) || (b < 0 && a < Limits::min() - b)) throw MathError("overflow");
    return a + b;
}

long long checkedSub(long long a, long long b) {
    if ((b < 0 && a > Limits::max() + b) || (b > 0 && a < Limits::min() + b)) throw MathError("overflow");
    return a - b;
}

long long checkedMul(long long a, long long b) {
    if (a == 0 || b == 0) return 0;
    bool overflow;
    if (a > 0) overflow = b > 0 ? a > Limits::max() / b : b < Limits::min() / a;
    else overflow = b > 0 ? a < Limits::min() / b : b < Limits::max() / a;
    if (overflow) throw MathError("overflow");
    return a * b;
}

long long checkedDiv(long long a, long long b) {
    if (b == 0) throw MathError("division by zero");
    if (a == Limits::min() && b == -1) throw MathError("overflow");
    return a / b;
}

long long checkedMod(long long a, long long b) {
    if (b == 0) throw MathError("division by zero");
    if (b == -1) return 0;   // LLONG_MIN % -1 would be UB in C++, but the true result is 0
    return a % b;
}

bool isLiteral(const std::string& tok) {
    std::size_t start = tok[0] == '-' ? 1 : 0;
    if (start == tok.size()) return false;
    for (std::size_t i = start; i < tok.size(); ++i)
        if (tok[i] < '0' || tok[i] > '9') return false;
    return true;
}

long long evaluate(const std::string& line) {
    std::istringstream in(line);
    std::vector<long long> stack;
    std::string tok;
    auto pop = [&stack, &tok] {
        if (stack.empty()) throw SyntaxError("stack underflow at '" + tok + "'");
        long long v = stack.back();
        stack.pop_back();
        return v;
    };
    while (in >> tok) {
        if (isLiteral(tok)) {
            try {
                stack.push_back(std::stoll(tok));
            } catch (const std::out_of_range&) {
                throw MathError("overflow");
            }
        } else if (tok == "+" || tok == "-" || tok == "*" || tok == "/" || tok == "%" || tok == "swap") {
            if (stack.size() < 2) throw SyntaxError("stack underflow at '" + tok + "'");
            long long b = pop();
            long long a = pop();
            if (tok == "+") stack.push_back(checkedAdd(a, b));
            else if (tok == "-") stack.push_back(checkedSub(a, b));
            else if (tok == "*") stack.push_back(checkedMul(a, b));
            else if (tok == "/") stack.push_back(checkedDiv(a, b));
            else if (tok == "%") stack.push_back(checkedMod(a, b));
            else {
                stack.push_back(b);
                stack.push_back(a);
            }
        } else if (tok == "neg") {
            long long a = pop();
            stack.push_back(checkedSub(0, a));
        } else if (tok == "dup") {
            long long a = pop();
            stack.push_back(a);
            stack.push_back(a);
        } else {
            throw SyntaxError("unknown token '" + tok + "'");
        }
    }
    if (stack.size() > 1) throw SyntaxError(std::to_string(stack.size()) + " values left on stack");
    return stack.back();
}

int main() {
    int ok = 0;
    int errors = 0;
    std::string line;
    while (std::getline(std::cin, line)) {
        if (line.find_first_not_of(" \t") == std::string::npos) continue;   // blank line
        try {
            long long result = evaluate(line);
            std::cout << result << '\n';
            ++ok;
        } catch (const SyntaxError& e) {
            std::cout << "syntax error: " << e.what() << '\n';
            ++errors;
        } catch (const MathError& e) {
            std::cout << "math error: " << e.what() << '\n';
            ++errors;
        }
    }
    std::cout << "ok: " << ok << ", errors: " << errors << '\n';
}
```

```hint
Check **before** computing. With `max` and `min` from `std::numeric_limits<long long>`: `a + b` overflows
exactly when `b > 0 && a > max - b` or `b < 0 && a < min - b`, and `a - b` is the mirror image. Neither
check can overflow itself.
```

```hint
Multiplication: handle `0` first, then compare against `max / b` or `min / b` depending on the signs of
`a` and `b` (four cases). Division overflows only for `min / -1`. For `%` with `b == -1` the answer is
always `0`; return it without computing `a % b`.
```

```hint
Literals: first check the shape (optional `-`, then digits only), then convert with `std::stoll` and
turn its `std::out_of_range` into your own `MathError("overflow")`. That's **exception translation**:
low-level library errors become errors of your program's own vocabulary.
```

```stdin
3 4 + 2 *
1 2 3
5 0 /
9223372036854775807 1 +
2 x +
+
-9223372036854775808 -1 %
-7 2 /
-7 2 %
4 dup * neg
1 2 swap -
99999999999999999999
```

```expected
14
syntax error: 3 values left on stack
math error: division by zero
math error: overflow
syntax error: unknown token 'x'
syntax error: stack underflow at '+'
0
-3
-1
-16
1
math error: overflow
ok: 6, errors: 6
```

```stdin
dup
-9223372036854775808 neg
1 swap
-4611686018427387904 2 *
4611686018427387904 2 *
-1 -9223372036854775808 *
0 -9223372036854775808 -
-1 9223372036854775807 -
-9223372036854775808 -1 /
7 0 %
--5
5-
+3
 -
3037000499 3037000499 *
3037000500 3037000500 *
-3037000500 3037000500 *
9223372036854775807 -9223372036854775807 +
```

```expected hidden
syntax error: stack underflow at 'dup'
math error: overflow
syntax error: stack underflow at 'swap'
-9223372036854775808
math error: overflow
math error: overflow
math error: overflow
-9223372036854775808
math error: overflow
math error: division by zero
syntax error: unknown token '--5'
syntax error: unknown token '5-'
syntax error: unknown token '+3'
syntax error: stack underflow at '-'
9223372030926249001
math error: overflow
math error: overflow
0
ok: 4, errors: 14
```

```stdin
-9223372036854775808
9223372036854775807 neg 1 -
-9223372036854775808 1 -
5 -5 %
-5 5 /
2 3 4 5 * * *   
1 0 0 / +
```

```expected hidden
-9223372036854775808
-9223372036854775808
math error: overflow
0
-1
120
math error: division by zero
ok: 5, errors: 2
```

```expected
ok: 0, errors: 0
```

```checks
must class\s+CalcError\s*:\s*public\s+std::runtime_error :: Define CalcError deriving from std::runtime_error.
must class\s+SyntaxError\s*:\s*public\s+CalcError :: SyntaxError must derive from CalcError.
must class\s+MathError\s*:\s*public\s+CalcError :: MathError must derive from CalcError.
must catch\s*\(\s*const\s+SyntaxError\s*& :: Catch SyntaxError separately.
must catch\s*\(\s*const\s+MathError\s*& :: Catch MathError separately.
must numeric_limits :: Detect overflow with std::numeric_limits before computing.
```
:::

:::exercise Transactions with an undo journal {hard}
In the lesson you got the strong guarantee with **copy-and-swap**. That copies all the data, which is
fine for a small vector but not for a bank with millions of accounts. The other classic technique is an
**undo journal**: perform each step for real, and record how to reverse it. If a later step throws,
run the recorded reversals newest-first and **rethrow** the original exception.

Implement a bank whose batches are all-or-nothing using a journal: write a function that applies a
batch with `try { ... } catch (...) { /* undo everything */ throw; }`. **Don't copy the accounts.**

**Input:** lines (blank lines are ignored).

- `begin` starts a batch; every following line up to `commit` is one **operation** of that batch.
  `commit` applies the batch and prints `batch N: ok (K operations)` or
  `batch N: failed at operation K: MESSAGE` (batches and operations are numbered from 1). A failed batch
  leaves **every** account exactly as before, including accounts it opened or closed.
- Outside a batch, `report` prints every account as `NAME: BALANCE` sorted by name (or `no accounts`),
  and any other command prints `error: WORD outside a batch`.
- If the input ends inside a batch, print `batch N: not committed` and apply nothing.

Operations (amounts are whole numbers):

| Operation | Effect |
| --- | --- |
| `open NAME` | new account with balance 0 |
| `close NAME` | delete an account whose balance is 0 |
| `deposit NAME AMOUNT` | add to the balance |
| `withdraw NAME AMOUNT` | subtract from the balance |
| `transfer FROM TO AMOUNT` | move money between two accounts |

Errors, checked in this order:

1. wrong number of arguments, or an amount that isn't a whole number: `bad arguments`
2. an amount that is 0 or negative: `invalid amount`
3. an account that doesn't exist, checking the names in the order they appear: `no account NAME`
4. `open` of an existing account: `account NAME already exists`; `close` of a non-empty account:
   `account NAME is not empty`; `transfer` to the same account: `cannot transfer to the same account`
5. not enough money (`withdraw`, or `transfer` out of `FROM`): `insufficient funds in NAME`

An unknown operation fails with `unknown operation WORD`.

**Example:**

```
begin                      batch 1: ok (3 operations)
open alice
open bob
deposit alice 100
commit
begin                      batch 2: failed at operation 4: account carol is not empty
transfer alice bob 30        (the transfer, the open and the deposit are all undone)
open carol
deposit carol 5
close carol
withdraw bob 50
commit
report                     alice: 100
                           bob: 0
```

```cpp starter
#include <functional>
#include <iostream>
#include <map>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

int main() {
    std::string line;
    while (std::getline(std::cin, line)) {
        // collect each batch between "begin" and "commit", then apply it
    }
}
```

```cpp solution
#include <functional>
#include <iostream>
#include <map>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

class BankError : public std::runtime_error {
public:
    using std::runtime_error::runtime_error;
};

class Bank {
public:
    // Applies every operation, or none of them. On failure, failedAt is the 1-based
    // index of the failing operation and the exception propagates to the caller.
    void apply(const std::vector<std::string>& batch, std::size_t& failedAt) {
        std::vector<std::function<void()>> undo;   // how to reverse each step, in order
        for (std::size_t i = 0; i < batch.size(); ++i) {
            try {
                execute(batch[i], undo);
            } catch (...) {
                failedAt = i + 1;
                for (auto it = undo.rbegin(); it != undo.rend(); ++it) (*it)();   // roll back, newest first
                throw;                                                            // same exception, unchanged
            }
        }
    }

    void report() const {
        if (accounts_.empty()) std::cout << "no accounts\n";
        for (const auto& [name, balance] : accounts_) std::cout << name << ": " << balance << '\n';
    }

private:
    long long& account(const std::string& name) {
        auto it = accounts_.find(name);
        if (it == accounts_.end()) throw BankError("no account " + name);
        return it->second;
    }

    static long long amountOf(const std::string& text) {
        std::size_t used = 0;
        long long value = 0;
        try {
            value = std::stoll(text, &used);
        } catch (const std::logic_error&) {
            throw BankError("bad arguments");
        }
        if (used != text.size()) throw BankError("bad arguments");
        if (value <= 0) throw BankError("invalid amount");
        return value;
    }

    void execute(const std::string& line, std::vector<std::function<void()>>& undo) {
        std::istringstream in(line);
        std::string op;
        in >> op;
        std::vector<std::string> args;
        for (std::string w; in >> w;) args.push_back(w);
        auto expect = [&args](std::size_t n) {
            if (args.size() != n) throw BankError("bad arguments");
        };

        if (op == "open") {
            expect(1);
            const std::string name = args[0];
            if (accounts_.contains(name)) throw BankError("account " + name + " already exists");
            accounts_[name] = 0;
            undo.push_back([this, name] { accounts_.erase(name); });
        } else if (op == "close") {
            expect(1);
            const std::string name = args[0];
            if (account(name) != 0) throw BankError("account " + name + " is not empty");
            accounts_.erase(name);
            undo.push_back([this, name] { accounts_[name] = 0; });
        } else if (op == "deposit" || op == "withdraw") {
            expect(2);
            const long long amount = amountOf(args[1]);
            long long& balance = account(args[0]);
            if (op == "withdraw" && balance < amount) throw BankError("insufficient funds in " + args[0]);
            const long long delta = op == "deposit" ? amount : -amount;
            balance += delta;
            undo.push_back([this, name = args[0], delta] { accounts_[name] -= delta; });
        } else if (op == "transfer") {
            expect(3);
            const long long amount = amountOf(args[2]);
            long long& from = account(args[0]);
            long long& to = account(args[1]);
            if (args[0] == args[1]) throw BankError("cannot transfer to the same account");
            if (from < amount) throw BankError("insufficient funds in " + args[0]);
            from -= amount;
            to += amount;
            undo.push_back([this, a = args[0], b = args[1], amount] {
                accounts_[a] += amount;
                accounts_[b] -= amount;
            });
        } else {
            throw BankError("unknown operation " + op);
        }
    }

    std::map<std::string, long long> accounts_;
};

int main() {
    Bank bank;
    std::vector<std::string> batch;
    bool inBatch = false;
    int batchNo = 0;
    std::string line;
    while (std::getline(std::cin, line)) {
        std::istringstream in(line);
        std::string word;
        if (!(in >> word)) continue;   // blank line
        if (!inBatch) {
            if (word == "begin") {
                inBatch = true;
                batch.clear();
                ++batchNo;
            } else if (word == "report") {
                bank.report();
            } else {
                std::cout << "error: " << word << " outside a batch\n";
            }
        } else if (word == "commit") {
            inBatch = false;
            std::size_t failedAt = 0;
            try {
                bank.apply(batch, failedAt);
                std::cout << "batch " << batchNo << ": ok (" << batch.size() << " operations)\n";
            } catch (const BankError& e) {
                std::cout << "batch " << batchNo << ": failed at operation " << failedAt << ": " << e.what() << '\n';
            }
        } else {
            batch.push_back(line);
        }
    }
    if (inBatch) std::cout << "batch " << batchNo << ": not committed\n";
}
```

```hint
Collect the lines of a batch first; apply them when `commit` arrives. The journal can be a
`std::vector<std::function<void()>>`: after each successful step, push a lambda that reverses it (for
`open NAME`: erase it; for `close NAME`: re-create it with balance 0; for a deposit: subtract it again).
```

```hint
Do every check of an operation **before** changing anything, so a failing operation never needs undoing
itself; only the earlier, successful ones do. Undo in **reverse** order: a batch can close an account and
then open one with the same name.
```

```hint
To report *which* operation failed, record the index in a variable that outlives the `try` (an
out-parameter or a member) before rethrowing with `throw;`. Rethrowing keeps the original exception and
its message intact.
```

```stdin
begin
open alice
open bob
deposit alice 100
commit
begin
transfer alice bob 30
open carol
deposit carol 5
close carol
withdraw bob 50
commit
report
begin
withdraw carol 1
commit
begin
deposit bob 0
commit
begin
transfer alice bob 100
close alice
withdraw bob 100
commit
report
```

```expected
batch 1: ok (3 operations)
batch 2: failed at operation 4: account carol is not empty
alice: 100
bob: 0
batch 3: failed at operation 1: no account carol
batch 4: failed at operation 1: invalid amount
batch 5: ok (3 operations)
bob: 0
```

```stdin
report
begin
open a
open b
deposit a 50
commit
begin
close b
open b
deposit b 7
transfer a b 50
withdraw a 1
commit
report
begin
transfer a a 5
commit
begin
deposit a
commit
begin
deposit a 5x
commit
begin
fly a
commit
begin
transfer a zed 1
commit
begin
transfer zed a -1
commit
commit
deposit a 5
begin
commit
report
begin
open z
```

```expected hidden
no accounts
batch 1: ok (3 operations)
batch 2: failed at operation 5: insufficient funds in a
a: 50
b: 0
batch 3: failed at operation 1: cannot transfer to the same account
batch 4: failed at operation 1: bad arguments
batch 5: failed at operation 1: bad arguments
batch 6: failed at operation 1: unknown operation fly
batch 7: failed at operation 1: no account zed
batch 8: failed at operation 1: invalid amount
error: commit outside a batch
error: deposit outside a batch
batch 9: ok (0 operations)
a: 50
b: 0
batch 10: not committed
```

```stdin
begin
open x
open y
deposit x 10
transfer x y 10
close x
open x
deposit x 3
commit
report
begin
withdraw y 4
withdraw y 4
withdraw y 4
commit
report
```

```expected hidden
batch 1: ok (7 operations)
x: 3
y: 10
batch 2: failed at operation 3: insufficient funds in y
x: 3
y: 10
```

```checks
must catch\s*\(\s*\.\.\.\s*\) :: Roll back inside a catch (...) handler.
must throw\s*; :: Rethrow the original exception with throw; after undoing.
```
:::

:::exercise Error chains with nested exceptions {hard}
When an error passes through several layers, each layer knows something useful: the parser knows *the
age isn't a number*, the record validator knows *it was the `age` field*, the file reader knows *it was
line 2*. C++11's `<exception>` lets every layer **add context without losing the original error**:

```cpp
try {
    validateAge(text);
} catch (...) {
    // throws an object that IS a FieldError AND stores the exception currently being handled
    std::throw_with_nested(FieldError("field 'age'"));
}
```

`std::throw_with_nested(e)` must be called inside a handler. It throws an object of a type derived from
both `e`'s type and `std::nested_exception`, which captured the current exception. To walk the chain,
`std::rethrow_if_nested(e)` rethrows the stored inner exception, if `e` has one (and does nothing
otherwise):

```cpp
void printChain(const std::exception& e) {
    std::cout << e.what() << '\n';
    try {
        std::rethrow_if_nested(e);
    } catch (const std::exception& inner) {
        printChain(inner);              // one level deeper
    }
}
```

Use this to validate user records.

**Input:** lines `NAME;AGE;EMAIL`. Fields are separated by **every** `;` (so `a;b;c;` has 4 fields, the
last one empty) and trimmed of spaces and tabs. Blank lines are ignored, but every line counts for
numbering (from 1).

**Checks**, in order: the field count, then name, age, email; report only the first problem.

| Field | Rule | Messages |
| --- | --- | --- |
| (line) | exactly 3 fields | `expected 3 fields, got N` |
| name | non-empty; only letters, spaces and `-` | `empty`, `invalid character 'C'` (the first bad one) |
| age | digits only (no sign), value 0 to 150 | `not a number: 'TEXT'` (also for an empty age), `out of range: TEXT` |
| email | exactly one `@`, something before it, and a domain after it that contains a `.` and doesn't start or end with `.` | `missing '@'`, `more than one '@'`, `empty local part`, `bad domain 'DOMAIN'` |

**Output:** for a valid record `ok: NAME (AGE) <EMAIL>` (the age as a number: `007` prints `7`).
For an invalid one, the chain, outermost first:

```
error: line 2
  caused by: field 'age'
  caused by: not a number: 'abc'
```

A field-count problem has no field level: `error: line 6` then `  caused by: expected 3 fields, got 2`.
At the end print `valid: V, invalid: I`.

Build the chain with real nesting: the innermost check throws a plain error, the field level wraps it
with `std::throw_with_nested`, and the line level wraps that again. `main` prints the chain with
`std::rethrow_if_nested`.

```cpp starter
#include <exception>
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

int main() {
    std::string line;
    while (std::getline(std::cin, line)) {
        // validate the record and print "ok: ..." or the error chain
    }
}
```

```cpp solution
#include <cctype>
#include <exception>
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

class ValidationError : public std::runtime_error {
public:
    using std::runtime_error::runtime_error;
};

std::string trim(const std::string& s) {
    const auto first = s.find_first_not_of(" \t");
    if (first == std::string::npos) return "";
    return s.substr(first, s.find_last_not_of(" \t") - first + 1);
}

std::vector<std::string> split(const std::string& line, char sep) {
    std::vector<std::string> fields(1);
    for (char c : line) {
        if (c == sep) fields.emplace_back();
        else fields.back() += c;
    }
    return fields;
}

std::string checkName(const std::string& name) {
    if (name.empty()) throw ValidationError("empty");
    for (char c : name)
        if (!std::isalpha(static_cast<unsigned char>(c)) && c != ' ' && c != '-')
            throw ValidationError(std::string("invalid character '") + c + "'");
    return name;
}

int checkAge(const std::string& text) {
    if (text.empty()) throw ValidationError("not a number: ''");
    int value = 0;
    bool tooBig = false;
    for (char c : text) {
        if (c < '0' || c > '9') throw ValidationError("not a number: '" + text + "'");
        if (!tooBig) {
            value = value * 10 + (c - '0');
            if (value > 150) tooBig = true;
        }
    }
    if (tooBig) throw ValidationError("out of range: " + text);
    return value;
}

std::string checkEmail(const std::string& email) {
    const auto at = email.find('@');
    if (at == std::string::npos) throw ValidationError("missing '@'");
    if (email.find('@', at + 1) != std::string::npos) throw ValidationError("more than one '@'");
    if (at == 0) throw ValidationError("empty local part");
    const std::string domain = email.substr(at + 1);
    const auto dot = domain.find('.');
    if (dot == std::string::npos || domain.front() == '.' || domain.back() == '.')
        throw ValidationError("bad domain '" + domain + "'");
    return email;
}

// Runs check(text); if it throws, wraps that exception in "field 'name'".
template <typename Check>
auto field(const std::string& name, const std::string& text, Check check) {
    try {
        return check(text);
    } catch (...) {
        std::throw_with_nested(ValidationError("field '" + name + "'"));
    }
}

void printChain(const std::exception& e, bool top = true) {
    std::cout << (top ? "error: " : "  caused by: ") << e.what() << '\n';
    try {
        std::rethrow_if_nested(e);
    } catch (const std::exception& inner) {
        printChain(inner, false);
    }
}

int main() {
    std::string line;
    int lineNo = 0;
    int valid = 0;
    int invalid = 0;
    while (std::getline(std::cin, line)) {
        ++lineNo;
        if (trim(line).empty()) continue;
        try {
            try {
                std::vector<std::string> f = split(line, ';');
                if (f.size() != 3)
                    throw ValidationError("expected 3 fields, got " + std::to_string(f.size()));
                std::string name = field("name", trim(f[0]), checkName);
                int age = field("age", trim(f[1]), checkAge);
                std::string email = field("email", trim(f[2]), checkEmail);
                std::cout << "ok: " << name << " (" << age << ") <" << email << ">\n";
                ++valid;
            } catch (...) {
                std::throw_with_nested(ValidationError("line " + std::to_string(lineNo)));
            }
        } catch (const std::exception& e) {
            printChain(e);
            ++invalid;
        }
    }
    std::cout << "valid: " << valid << ", invalid: " << invalid << '\n';
}
```

```hint
`std::getline(row, field, ';')` does **not** produce a final empty field for `a;b;c;`, so split by hand:
start with one empty field and start a new one at every `;`.
```

```hint
A small helper keeps the field level tidy:
`template <typename Check> auto field(const std::string& name, const std::string& text, Check check)`
that returns `check(text)`, and in its `catch (...)` calls
`std::throw_with_nested(ValidationError("field '" + name + "'"))`.
```

```hint
For the age, stop accumulating once the value passes 150 (so long digit strings can't overflow), but keep
scanning: `12x` is "not a number", not "out of range".
```

```stdin
Ada Lovelace;36;ada@example.com
Alan;abc;alan@example.org
;20;x@y.z
Grace;200;grace@navy.mil
Linus;50;linus.example.com
Bob;30
Eve;25;eve@@x.com
Bjarne;72;bs@cpp
```

```expected
ok: Ada Lovelace (36) <ada@example.com>
error: line 2
  caused by: field 'age'
  caused by: not a number: 'abc'
error: line 3
  caused by: field 'name'
  caused by: empty
error: line 4
  caused by: field 'age'
  caused by: out of range: 200
error: line 5
  caused by: field 'email'
  caused by: missing '@'
error: line 6
  caused by: expected 3 fields, got 2
error: line 7
  caused by: field 'email'
  caused by: more than one '@'
error: line 8
  caused by: field 'email'
  caused by: bad domain 'cpp'
valid: 1, invalid: 7
```

```stdin
  Jean-Luc Picard ; 059 ; jl@enterprise.fed  
Ann;30;ann@x.io;

R2D2;5;r2@droid.sw
Max;;max@x.de
Old;99999999999;old@x.de
Neg;-1;neg@x.de
Mix;12x;mix@x.de
Edge;150;@x.de
Dot;1;dot@.com
Dotty;1;dot@com.
Ok;0;a@b.c
;;
```

```expected hidden
ok: Jean-Luc Picard (59) <jl@enterprise.fed>
error: line 2
  caused by: expected 3 fields, got 4
error: line 4
  caused by: field 'name'
  caused by: invalid character '2'
error: line 5
  caused by: field 'age'
  caused by: not a number: ''
error: line 6
  caused by: field 'age'
  caused by: out of range: 99999999999
error: line 7
  caused by: field 'age'
  caused by: not a number: '-1'
error: line 8
  caused by: field 'age'
  caused by: not a number: '12x'
error: line 9
  caused by: field 'email'
  caused by: empty local part
error: line 10
  caused by: field 'email'
  caused by: bad domain '.com'
error: line 11
  caused by: field 'email'
  caused by: bad domain 'com.'
ok: Ok (0) <a@b.c>
error: line 13
  caused by: field 'name'
  caused by: empty
valid: 2, invalid: 10
```

```expected hidden
valid: 0, invalid: 0
```

```checks
must throw_with_nested :: Wrap errors with std::throw_with_nested.
must rethrow_if_nested :: Walk the chain with std::rethrow_if_nested.
must catch\s*\(\s*\.\.\.\s*\) :: Wrap whatever was thrown inside catch (...).
```
:::
