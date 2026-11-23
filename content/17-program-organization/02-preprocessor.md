---
title: The Preprocessor
summary: "#include, object-like and function-like macros and their pitfalls, # and ##, conditional compilation, predefined macros, #error and #pragma once, and why modern C++ prefers constexpr and templates."
---

## A text editor that runs before the compiler

Before your code is compiled, the **preprocessor** runs over it. It doesn't understand C++ at all: no
types, no scopes, no functions. It works on **text** (tokens), following **directives**: lines that
start with `#`. When it's done, the compiler sees the result, with every directive gone.

| Directive | Does |
| --- | --- |
| `#include` | paste in the contents of another file |
| `#define` / `#undef` | define / remove a macro (a text replacement) |
| `#if`, `#ifdef`, `#ifndef`, `#elif`, `#else`, `#endif` | keep or drop blocks of code |
| `#error`, `#warning` | stop with an error / print a warning |
| `#pragma` | compiler-specific instructions (`#pragma once`) |
| `#line` | change the reported line number (rare, used by code generators) |

Rules: a directive must be the first thing on its line (spaces before `#` are allowed), and it ends at
the end of the line. A backslash `\` at the very end of a line continues the directive onto the next line.

> **Tip:** To see what the preprocessor produces, run `g++ -E main.cpp` on your machine. You'll find
> that `#include <iostream>` turns your 5-line program into tens of thousands of lines.

## `#include`

`#include` literally copies a file's contents in place of the directive. Two spellings:

```cpp
#include <vector>        // angle brackets: search the system/library include paths
#include "player.h"      // quotes: search the current file's directory first, then the system paths
```

Use `<...>` for the standard library and installed libraries, and `"..."` for your own project's
headers. You can add directories to the search path with `-I`: `g++ -Iinclude main.cpp`.

C++17 added `__has_include` to test whether a header exists:

```cpp
#if __has_include(<format>)
#include <format>
#endif
```

## Object-like macros

`#define NAME replacement` makes the preprocessor replace every later occurrence of the token `NAME`
with `replacement`:

```cpp run
#include <iostream>

#define GREETING "Hello"
#define MAX_PLAYERS 4
#define TWICE_MAX (MAX_PLAYERS * 2)    // macros can use other macros

int main() {
    std::cout << GREETING << ", up to " << MAX_PLAYERS << " players ("
              << TWICE_MAX << " with guests)\n";
}
```

```output
Hello, up to 4 players (8 with guests)
```

By convention macro names are `ALL_CAPS`, so readers know "this is a macro, not a real variable".
Replacement doesn't happen inside string literals or in the middle of other identifiers: `"MAX_PLAYERS"`
and `MAX_PLAYERS_ONLINE` are left alone.

`#undef NAME` removes a macro, after which the name means nothing special again:

```cpp compile-error
#define LIMIT 10
int a = LIMIT;     // fine: becomes int a = 10;
#undef LIMIT
int b = LIMIT;     // error: 'LIMIT' was not declared in this scope
int main() {}
```

## Function-like macros

A macro can take parameters. There must be **no space** between the name and the `(`:

```cpp run
#include <iostream>

#define SQUARE(x) ((x) * (x))
#define MAX(a, b) ((a) > (b) ? (a) : (b))
#define PRINT_LINE(text) std::cout << "> " << text << '\n'

int main() {
    std::cout << SQUARE(5) << ' ' << SQUARE(1 + 2) << '\n';
    std::cout << MAX(3, 8) << '\n';
    PRINT_LINE("macros paste text");
}
```

```output
25 9
8
> macros paste text
```

It looks like a function call, but it isn't. The arguments are pasted as **text** into the replacement,
and that causes the classic pitfalls.

### Pitfall 1: missing parentheses

```cpp run
#include <iostream>

#define BAD_SQUARE(x) x * x
#define GOOD_SQUARE(x) ((x) * (x))

int main() {
    std::cout << BAD_SQUARE(1 + 2) << '\n';        // 1 + 2 * 1 + 2  = 5
    std::cout << GOOD_SQUARE(1 + 2) << '\n';       // ((1 + 2) * (1 + 2)) = 9
    std::cout << 36 / BAD_SQUARE(3) << '\n';       // 36 / 3 * 3     = 36
    std::cout << 36 / GOOD_SQUARE(3) << '\n';      // 36 / ((3) * (3)) = 4
}
```

```output
5
9
36
4
```

Rule: put parentheses around **every parameter** and around **the whole replacement**.

### Pitfall 2: arguments evaluated more than once

Each time a parameter appears in the replacement, the argument's text appears again, and is
**evaluated** again:

```cpp run
#include <iostream>

#define MAX(a, b) ((a) > (b) ? (a) : (b))

int main() {
    int i = 5;
    int j = 3;
    int m = MAX(i++, j);          // expands to ((i++) > (j) ? (i++) : (j))
    std::cout << "m=" << m << " i=" << i << '\n';   // i was incremented TWICE
}
```

```output
m=6 i=7
```

A real function (or `std::max`) evaluates each argument exactly once. No amount of parentheses can
fix this; it's inherent to macros.

### Pitfall 3: macros ignore scope and types

Macros don't respect namespaces, classes, or blocks. A macro named `max` would break every
`std::max` and `x.max()` in any file that sees it. (Windows' `<windows.h>` famously defines `min` and
`max` macros, which is why you see `#define NOMINMAX` in Windows code.) And since there's no type
checking, `SQUARE("hi")` produces a confusing error deep inside the expansion.

### Multi-statement macros: `do { ... } while (0)`

A macro that expands to several statements needs wrapping so it behaves like **one** statement,
especially after an `if` without braces:

```cpp run
#include <iostream>

#define LOG_TWICE(msg) do { std::cout << msg << '\n'; std::cout << msg << '\n'; } while (0)

int main() {
    bool verbose = false;
    if (verbose)
        LOG_TWICE("hidden");      // without do/while(0), the 2nd statement would always run
    else
        std::cout << "quiet\n";
}
```

```output
quiet
```

The backslash form is common for long macros:

```cpp
#define SWAP_INTS(a, b) \
    do {                \
        int tmp_ = (a); \
        (a) = (b);      \
        (b) = tmp_;     \
    } while (0)
```

### Variadic macros

`...` accepts any number of arguments, and `__VA_ARGS__` pastes them:

```cpp run
#include <cstdio>

#define LOG(fmt, ...) std::printf("[log] " fmt "\n", __VA_ARGS__)

int main() {
    LOG("%d + %d = %d", 2, 3, 5);
    LOG("%s", "done");
}
```

```output
[log] 2 + 3 = 5
[log] done
```

## The `#` and `##` operators

Inside a function-like macro, two special operators work on the **tokens** of the arguments:

- `#param` (**stringizing**) turns the argument into a string literal.
- `a ## b` (**token pasting**) glues two tokens into one new token.

```cpp run
#include <iostream>

#define SHOW(expr) std::cout << #expr << " = " << (expr) << '\n'

#define DECLARE_COUNTER(name) int name##_count = 0
#define BUMP(name) ++name##_count

int main() {
    int width = 6;
    SHOW(width * 7);              // prints the expression's source text and its value
    SHOW(width > 10);

    DECLARE_COUNTER(apple);       // int apple_count = 0
    BUMP(apple);                  // ++apple_count
    BUMP(apple);
    std::cout << "apple_count = " << apple_count << '\n';
}
```

```output
width * 7 = 42
width > 10 = 0
apple_count = 2
```

`#` is why test frameworks can print `CHECK failed: x == 3` with your exact expression, and why
`assert` messages include the condition.

## Conditional compilation

These directives keep or remove whole blocks of code **before** compilation. Removed code isn't
compiled at all, so it can even contain code that wouldn't compile.

```cpp run
#include <iostream>

#define DEBUG_LEVEL 2
#define USE_FAST_PATH

int main() {
#ifdef USE_FAST_PATH                  // is the macro defined (any value)?
    std::cout << "fast path\n";
#else
    std::cout << "slow path\n";
#endif

#ifndef USE_COLORS                    // is it NOT defined?
    std::cout << "no colors\n";
#endif

#if DEBUG_LEVEL >= 3                  // integer expressions with macros
    std::cout << "very verbose\n";
#elif DEBUG_LEVEL == 2
    std::cout << "verbose\n";
#else
    std::cout << "quiet\n";
#endif

#if defined(USE_FAST_PATH) && !defined(USE_COLORS)   // defined() combines with && || !
    std::cout << "fast, no colors\n";
#endif

#if 0
    this text is never compiled, which makes #if 0 a way to disable a big block
#endif
}
```

```output
fast path
no colors
verbose
fast, no colors
```

- `#ifdef X` is shorthand for `#if defined(X)`, and `#ifndef X` for `#if !defined(X)`.
- In `#if`, an identifier that isn't a defined macro counts as `0`.
- C++23 adds `#elifdef` and `#elifndef`.

Macros used for configuration are usually set **on the command line** rather than in the code, with
`-D`:

```
g++ -DDEBUG_LEVEL=3 -DUSE_FAST_PATH main.cpp     # like #define DEBUG_LEVEL 3 and #define USE_FAST_PATH
g++ -DNDEBUG main.cpp                            # disables assert() (release builds)
```

Typical uses: debug-only code, platform differences (`#ifdef _WIN32`), and optional features.

## Predefined macros

The compiler defines some macros for you:

| Macro | Value |
| --- | --- |
| `__cplusplus` | the language version: `201703L` for C++17, `202002L` for C++20, `202302L` for C++23 |
| `__FILE__` | the current file name, as a string literal |
| `__LINE__` | the current line number, as an integer |
| `__DATE__`, `__TIME__` | when the file was compiled (strings) |
| `_WIN32`, `__linux__`, `__APPLE__` | defined on that platform (compiler-specific) |
| `__GNUC__`, `__clang__`, `_MSC_VER` | which compiler (compiler-specific) |
| `NDEBUG` | not predefined; *you* define it to turn off `assert` |

Plus **feature-test macros** like `__cpp_concepts` or `__cpp_lib_format`, so code can check whether a
feature is available.

`__func__` looks similar but is **not** a macro: it's a variable the compiler gives every function,
holding the function's name.

```cpp run
#include <iostream>

void whereAmI() {
    std::cout << "in function " << __func__ << '\n';
}

int main() {
    std::cout << "C++ version: " << __cplusplus << '\n';
    std::cout << "this is line " << __LINE__ << '\n';
    whereAmI();
#ifdef __cpp_concepts
    std::cout << "concepts are supported\n";
#endif
}
```

```output
C++ version: 202002
this is line 9
in function whereAmI
concepts are supported
```

Combining `__FILE__`, `__LINE__`, and `__func__` in a macro gives you log messages that say where
they came from:

```cpp
#define TRACE(msg) std::cerr << __FILE__ << ':' << __LINE__ << " (" << __func__ << "): " << msg << '\n'
// main.cpp:42 (loadConfig): file not found
```

It has to be a macro: inside a normal function, `__LINE__` would always be the line of that function.
(C++20's `std::source_location` solves this without macros; see the modern features tour.)

## `#error` and `#warning`

`#error` stops compilation with your message. It's used to reject unsupported configurations:

```cpp compile-error
#if __cplusplus < 202302L
#error "This program needs C++23"
#endif

int main() {}
```

`#warning` (standard since C++23, long supported by GCC and Clang) prints a warning but keeps going:

```cpp run warns
#include <iostream>

#warning "TODO: replace this placeholder algorithm"

int main() {
    std::cout << "compiled with a warning; check the compiler output\n";
}
```

```output
compiled with a warning; check the compiler output
```

## `#pragma`

`#pragma` passes compiler-specific instructions. Unknown pragmas are ignored. The ones you'll meet:

```cpp
#pragma once                                   // in a header: include this file only once (next lesson)
#pragma GCC diagnostic ignored "-Wunused"      // silence a warning for the rest of the file
#pragma pack(push, 1)                          // change struct packing (rare, for binary formats)
```

## Prefer the language over the preprocessor

Most historical uses of macros have better C++ replacements that respect types and scope, can be
debugged, and evaluate arguments once:

| Instead of | Use |
| --- | --- |
| `#define PI 3.14159` | `constexpr double pi = 3.14159;` |
| `#define SQUARE(x) ((x)*(x))` | `constexpr int square(int x) { return x * x; }` or a template |
| `#define MAX(a,b) ...` | `std::max(a, b)` |
| `#define BUFFER_SIZE 256` in a header | `inline constexpr std::size_t bufferSize = 256;` |
| `#define` for a set of related constants | `enum class` |

```cpp run
#include <iostream>

constexpr double pi = 3.14159;                  // typed, scoped, visible to the debugger

template <typename T>
constexpr T square(T x) { return x * x; }       // works for any type, evaluates x once

int main() {
    int i = 4;
    int sq = square(i++);
    std::cout << sq << ' ' << i << '\n';            // i incremented once
    std::cout << square(1.5) << ' ' << pi << '\n';
}
```

```output
16 5
2.25 3.14159
```

What macros are still good for: include guards, conditional compilation (platforms, debug builds,
feature tests), and the few things that need `#`, `##`, `__FILE__`, or `__LINE__` (assertion and
logging macros, test frameworks).

:::quiz
Given `#define DOUBLE(x) x + x`, what is `3 * DOUBLE(2)`?

- [ ] `12`
- [x] `8`
- [ ] `10`
- [ ] Compile error

It expands to `3 * 2 + 2`, which is `8`. Writing `((x) + (x))` would give `12`.
:::

:::quiz
Which directive checks whether a macro is **not** defined?

- [ ] `#ifdef`
- [x] `#ifndef`
- [ ] `#undef`
- [ ] `#else`

`#ifndef X` means `#if !defined(X)`. `#undef` removes a macro definition.
:::

:::quiz
What does `#define STR(x) #x` make `STR(a + b)` expand to?

- [ ] The value of `a + b`
- [x] The string literal `"a + b"`
- [ ] `ab`
- [ ] `a##b`

`#` (stringizing) turns the macro argument's tokens into a string literal. `##` would paste tokens.
:::

:::exercise Fix the square macro
This program uses a broken `SQUARE` macro, so two of its three results are wrong. Fix the **macro
definition** (keep using the macro in `main`) so the program prints:

```
<a squared>
<(a + 1) squared>
<100 divided by (b squared)>
```

`b` is never 0.

```cpp starter
#include <iostream>

#define SQUARE(x) x * x

int main() {
    int a, b;
    std::cin >> a >> b;
    std::cout << SQUARE(a) << '\n';
    std::cout << SQUARE(a + 1) << '\n';
    std::cout << 100 / SQUARE(b) << '\n';
}
```

```cpp solution
#include <iostream>

#define SQUARE(x) ((x) * (x))

int main() {
    int a, b;
    std::cin >> a >> b;
    std::cout << SQUARE(a) << '\n';
    std::cout << SQUARE(a + 1) << '\n';
    std::cout << 100 / SQUARE(b) << '\n';
}
```

```hint
Write out what `SQUARE(a + 1)` and `100 / SQUARE(b)` expand to, token by token.
```

```hint
Parenthesize each use of `x` **and** the whole replacement: `((x) * (x))`.
```

```stdin
3 5
```

```expected
9
16
4
```

```stdin
0 -2
```

```expected hidden
0
1
25
```

```stdin
-4 1
```

```expected
16
9
100
```

```checks
must #define\s+SQUARE\s*\( :: Keep (and fix) the SQUARE macro.
must SQUARE\s*\(\s*a\s*\+\s*1\s*\) :: Keep using SQUARE(a + 1) in main.
```
:::

:::exercise Log levels
Write a program that reads integers until the end of input and prints their sum, with logging
controlled by a macro `LOG_LEVEL`:

- Define `LOG_LEVEL` as `2`, but only if it isn't already defined (so it could be overridden with `-DLOG_LEVEL=...`).
- If `LOG_LEVEL >= 2`, print `[debug] read <x>` for every number read.
- If `LOG_LEVEL >= 1`, print `[info] sum = <sum>` at the end.

Use `#ifndef` / `#define` / `#endif` for the default and `#if` for the checks. With `LOG_LEVEL` 2, input
`4 5` gives:

```
[debug] read 4
[debug] read 5
[info] sum = 9
```

```cpp starter
#include <iostream>

int main() {
    int sum = 0;
    int x;
    while (std::cin >> x) {
        sum += x;
    }
    std::cout << sum << '\n';
}
```

```cpp solution
#include <iostream>

#ifndef LOG_LEVEL
#define LOG_LEVEL 2
#endif

int main() {
    int sum = 0;
    int x;
    while (std::cin >> x) {
#if LOG_LEVEL >= 2
        std::cout << "[debug] read " << x << '\n';
#endif
        sum += x;
    }
#if LOG_LEVEL >= 1
    std::cout << "[info] sum = " << sum << '\n';
#endif
}
```

```hint
The default pattern is three lines: `#ifndef LOG_LEVEL`, then `#define LOG_LEVEL 2`, then `#endif`.
```

```hint
Directives can appear inside a function body, as long as each is on its own line.
```

```stdin
4 5
```

```expected
[debug] read 4
[debug] read 5
[info] sum = 9
```

```stdin
-10
```

```expected hidden
[debug] read -10
[info] sum = -10
```

```expected
[info] sum = 0
```

```checks
must #ifndef\s+LOG_LEVEL :: Give LOG_LEVEL a default with #ifndef.
must #define\s+LOG_LEVEL\s+2 :: Default LOG_LEVEL to 2.
must #if\s+LOG_LEVEL\s*>=\s*2 :: Guard the debug output with #if LOG_LEVEL >= 2.
must #if\s+LOG_LEVEL\s*>=\s*1 :: Guard the info output with #if LOG_LEVEL >= 1.
```
:::

:::exercise Show your work
Write a macro `SHOW(expr)` that prints the expression's **source text**, then ` = `, then its value,
then a newline. Use the `#` operator. Read two integers `a` and `b` (`b` is never 0) and use your macro
exactly like this:

```cpp
SHOW(a + b);
SHOW(a * b);
SHOW(a / b);
SHOW(a % b);
SHOW(a < b);
```

For `a = 7`, `b = 2` the output is:

```
a + b = 9
a * b = 14
a / b = 3
a % b = 1
a < b = 0
```

(A `bool` prints as `1` or `0`.)

```cpp starter
#include <iostream>

// define SHOW here

int main() {
    int a, b;
    std::cin >> a >> b;
    std::cout << a + b << '\n';
}
```

```cpp solution
#include <iostream>

#define SHOW(expr) std::cout << #expr << " = " << (expr) << '\n'

int main() {
    int a, b;
    std::cin >> a >> b;
    SHOW(a + b);
    SHOW(a * b);
    SHOW(a / b);
    SHOW(a % b);
    SHOW(a < b);
}
```

```hint
`#expr` in the replacement becomes the string literal `"a + b"` when you write `SHOW(a + b)`.
```

```hint
Parenthesize the value: `<< (expr)`. Without it, `SHOW(a < b)` would expand to `std::cout << a < b`,
which doesn't mean what you want.
```

```stdin
7 2
```

```expected
a + b = 9
a * b = 14
a / b = 3
a % b = 1
a < b = 0
```

```stdin
-9 4
```

```expected hidden
a + b = -5
a * b = -36
a / b = -2
a % b = -1
a < b = 1
```

```checks
must #define\s+SHOW\s*\(\s*(\w+)\s*\)(?:[^\n]|\\\n)*#\s*\1\b :: Use the # operator on the macro parameter.
must SHOW\s*\(\s*a\s*<\s*b\s*\) :: Use SHOW(a < b) in main.
```
:::
