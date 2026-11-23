---
title: Attributes & noexcept
summary: Tell the compiler more about your functions with [[nodiscard]], [[maybe_unused]], [[deprecated]] and [[noreturn]], plus a first look at noexcept.
---

## What's an attribute?

An **attribute** is a note to the compiler, written in double square brackets, that gives it extra
information about a declaration. Attributes don't change what correct code does; they let the
compiler **warn** you about misuse, or optimize better.

```cpp
[[nodiscard]] int computeTotal();                 // one attribute
[[nodiscard, deprecated]] int oldTotal();         // several, comma-separated
[[deprecated]] [[nodiscard]] int olderTotal();    // or several brackets
```

Attributes on functions go **in front of** the declaration. A compiler ignores attributes it
doesn't recognize (with a warning), so they're safe to use.

## `[[nodiscard]]`: don't ignore my result

Some functions are useless, or dangerous, if you ignore what they return: a function that
computes something without side effects, or one that reports whether it succeeded. Mark them
`[[nodiscard]]` and the compiler warns when a caller throws the result away:

```cpp run warns
#include <iostream>

[[nodiscard]] int add(int a, int b) {
    return a + b;
}

[[nodiscard("check whether the save worked")]] bool saveFile() {   // C++20: with a reason
    return false;
}

int main() {
    add(2, 3);    // warning: ignoring return value of 'int add(int, int)', declared with attribute 'nodiscard'
    saveFile();   // warning: ... 'nodiscard': 'check whether the save worked'

    int sum = add(2, 3);   // fine: the result is used
    std::cout << sum << '\n';
}
```

If you really do want to ignore the result, cast it to `void` to say so explicitly:
`static_cast<void>(add(2, 3));` (or the C-style `(void)add(2, 3);`).

> **Tip:** Many standard library functions are `[[nodiscard]]`, like `std::vector::empty()`. Writing
> `v.empty();` when you meant `v.clear();` gets you a warning instead of a silent bug.

## `[[maybe_unused]]`: silence "unused" warnings on purpose

With `-Wall -Wextra`, the compiler warns about unused variables and parameters, which usually catches
mistakes. Sometimes a name is unused on purpose: a parameter that a function must accept to match an
expected signature, or a variable only used in debug builds. `[[maybe_unused]]` says "I know":

```cpp run
#include <iostream>

// The signature must take 'verbose', but this version doesn't need it.
int area(int width, int height, [[maybe_unused]] bool verbose) {
    return width * height;
}

int main() {
    [[maybe_unused]] int debugCounter = 0;   // no "unused variable" warning
    std::cout << area(3, 4, true) << '\n';
}
```

```output
12
```

Another way to silence an unused **parameter** is to leave out its name:
`int area(int width, int height, bool /*verbose*/)`. Both are common.

## `[[deprecated]]`: please stop using this

When you replace a function with a better one but can't delete the old one yet (others still call
it), mark it `[[deprecated]]`. Code still compiles, but every use gets a warning, optionally with a
message:

```cpp run warns
#include <iostream>

[[deprecated("use areaOf(width, height) instead")]]
int area(int w, int h) {
    return w * h;
}

int areaOf(int width, int height) {
    return width * height;
}

int main() {
    std::cout << area(2, 3) << '\n';     // warning: 'int area(int, int)' is deprecated: use areaOf(width, height) instead
    std::cout << areaOf(2, 3) << '\n';
}
```

```output
6
6
```

## `[[noreturn]]`: this function never comes back

Some functions never return to their caller: they end the program (`std::exit`, `std::abort`), or
always throw an exception, or loop forever. Marking them `[[noreturn]]` tells the compiler, which
helps it optimize and, more visibly, avoids false "control reaches end of non-void function" warnings:

```cpp run
#include <cstdlib>
#include <iostream>
#include <string>

[[noreturn]] void fatal(const std::string& message) {
    std::cout << "fatal: " << message << '\n';
    std::exit(0);   // ends the whole program right here (see the main lesson); 0 = success
}

int checkedDivide(int a, int b) {
    if (b != 0) {
        return a / b;
    }
    fatal("division by zero");
    // no return needed: the compiler knows fatal() never returns
}

int main() {
    std::cout << checkedDivide(10, 2) << '\n';
    std::cout << checkedDivide(1, 0) << '\n';
    std::cout << "never printed\n";
}
```

```output
5
fatal: division by zero
```

`std::exit` (from `<cstdlib>`) is itself declared `[[noreturn]]`. A `[[noreturn]]` function that
*does* return is undefined behavior, and GCC warns if it can see that happening.

## `noexcept`: this function won't throw

C++ reports some errors with **exceptions** (a later module). Writing `noexcept` after a function's
parameter list promises that no exception will escape from it:

```cpp run
#include <iostream>

int clampPercent(int value) noexcept {
    if (value < 0) return 0;
    if (value > 100) return 100;
    return value;
}

int main() {
    std::cout << clampPercent(150) << ' ' << clampPercent(-3) << ' ' << clampPercent(42) << '\n';
    static_assert(noexcept(clampPercent(5)));   // the noexcept *operator* checks it at compile time
}
```

```output
100 0 42
```

Notes for now:

- `noexcept` is part of the function's type and goes **after** the parameters (and after `const`
  on member functions), not in front like attributes.
- If an exception does try to escape a `noexcept` function, the program is terminated immediately
  with `std::terminate()`. It's a promise, not a safety net.
- It matters most for move operations and swap functions, which you'll meet with classes; the
  standard containers run faster when those are `noexcept`.
- `noexcept(true)` and `noexcept(false)` exist too; plain `noexcept` means `noexcept(true)`.

## Other attributes you'll see

| Attribute | Since | Meaning |
| --- | --- | --- |
| `[[fallthrough]]` | C++17 | In a `switch`, falling into the next `case` is intentional (silences the warning) |
| `[[likely]]` / `[[unlikely]]` | C++20 | Hint that a branch is usually / rarely taken |
| `[[no_unique_address]]` | C++20 | A member may take no space (advanced, for classes) |
| `[[assume(expr)]]` | C++23 | Tell the optimizer `expr` is always true |

:::quiz
What does `[[nodiscard]]` on a function do?

- [ ] Makes it impossible to ignore the result (a compile error)
- [x] Makes the compiler warn when a caller ignores the returned value
- [ ] Removes the function if it's never called
- [ ] Makes the result `const`

It's a warning, not an error. Casting the call to `void` says "I'm ignoring it on purpose".
:::

:::quiz
Where does `noexcept` go?

- [ ] `noexcept int f(int x);`
- [ ] `[[noexcept]] int f(int x);`
- [x] `int f(int x) noexcept;`

`noexcept` is a specifier that comes after the parameter list. It's not an attribute.
:::

:::exercise Leap years {easy}
Write `[[nodiscard]] bool isLeapYear(int year)`: a year is a leap year if it's divisible by 4, except
years divisible by 100, which are leap years only if also divisible by 400. Also write
`[[nodiscard]] int daysInYear(int year)` that uses it. Read years until the end of input and print
`YEAR: DAYS` for each.

**Input:** zero or more years.
**Output:** one line per year, like `2024: 366`.

```cpp starter
#include <iostream>

int main() {
    int year;
    while (std::cin >> year) {
        std::cout << year << ": " << 365 << '\n';
    }
}
```

```cpp solution
#include <iostream>

[[nodiscard]] bool isLeapYear(int year) {
    return (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
}

[[nodiscard]] int daysInYear(int year) {
    return isLeapYear(year) ? 366 : 365;
}

int main() {
    int year;
    while (std::cin >> year) {
        std::cout << year << ": " << daysInYear(year) << '\n';
    }
}
```

```hint
`(year % 4 == 0 && year % 100 != 0) || year % 400 == 0`
```

```stdin
2024 2023
```

```expected
2024: 366
2023: 365
```

```stdin
1900 2000 2100 2400
```

```expected hidden
1900: 365
2000: 366
2100: 365
2400: 366
```

```stdin
```

```expected hidden
```

```stdin
1 4 100 400
```

```expected hidden
1: 365
4: 366
100: 365
400: 366
```

```checks
must \[\[\s*nodiscard\s*\]\]\s*bool\s+isLeapYear :: Mark isLeapYear [[nodiscard]].
must \[\[\s*nodiscard\s*\]\]\s*int\s+daysInYear :: Mark daysInYear [[nodiscard]].
```
:::

:::exercise Stop on bad input {medium}
Write `[[noreturn]] void stop(int total)` that prints `stopped, total = T` and then ends the program
with `std::exit(0)` (from `<cstdlib>`). In `main`, read integers and keep a running total; print
`total = T` after each number. If a **negative** number is read, call `stop(total)` without adding
it. If the input simply ends, print `done` at the end.

**Input:** zero or more integers.
**Output:** as described, one message per line.

```cpp starter
#include <cstdlib>
#include <iostream>

int main() {
    int total = 0;
    int n;
    while (std::cin >> n) {
        total += n;
        std::cout << "total = " << total << '\n';
    }
    std::cout << "done\n";
}
```

```cpp solution
#include <cstdlib>
#include <iostream>

[[noreturn]] void stop(int total) {
    std::cout << "stopped, total = " << total << '\n';
    std::exit(0);
}

int main() {
    int total = 0;
    int n;
    while (std::cin >> n) {
        if (n < 0) {
            stop(total);
        }
        total += n;
        std::cout << "total = " << total << '\n';
    }
    std::cout << "done\n";
}
```

```hint
`[[noreturn]]` goes in front of the return type: `[[noreturn]] void stop(int total) { ... }`.
```

```stdin
5 10 -1 100
```

```expected
total = 5
total = 15
stopped, total = 15
```

```stdin
1 2 3
```

```expected
total = 1
total = 3
total = 6
done
```

```stdin
-7
```

```expected hidden
stopped, total = 0
```

```stdin
```

```expected hidden
done
```

```stdin
0 0 -5 1
```

```expected hidden
total = 0
total = 0
stopped, total = 0
```

```stdin
3 0 -1
```

```expected hidden
total = 3
total = 3
stopped, total = 3
```

```checks
must \[\[\s*noreturn\s*\]\]\s*void\s+stop :: Mark stop [[noreturn]].
must exit\s*\( :: End the program with std::exit inside stop.
```
:::

:::exercise Unused on purpose {easy}
All the "shape" functions below must take the same three parameters, `(int a, int b, int c)`, so they
can be used interchangeably, but `rectangle` doesn't need `c` and `square` only needs `a`. Write them
so they compile **without unused-parameter warnings**, using `[[maybe_unused]]`, and mark all three
`noexcept`:

- `int box(int a, int b, int c) noexcept` returns `a * b * c`
- `int rectangle(int a, int b, int c) noexcept` returns `a * b`
- `int square(int a, int b, int c) noexcept` returns `a * a`

Read a shape name and three integers, and print the result.

**Input:** a word (`box`, `rectangle` or `square`) and three integers.
**Output:** the result followed by a newline.

```cpp starter
#include <iostream>
#include <string>

int main() {
    std::string shape;
    int a, b, c;
    std::cin >> shape >> a >> b >> c;
}
```

```cpp solution
#include <iostream>
#include <string>

int box(int a, int b, int c) noexcept {
    return a * b * c;
}

int rectangle(int a, int b, [[maybe_unused]] int c) noexcept {
    return a * b;
}

int square(int a, [[maybe_unused]] int b, [[maybe_unused]] int c) noexcept {
    return a * a;
}

int main() {
    std::string shape;
    int a, b, c;
    std::cin >> shape >> a >> b >> c;
    if (shape == "box") {
        std::cout << box(a, b, c) << '\n';
    } else if (shape == "rectangle") {
        std::cout << rectangle(a, b, c) << '\n';
    } else {
        std::cout << square(a, b, c) << '\n';
    }
}
```

```hint
Put `[[maybe_unused]]` right before the parameter's type: `[[maybe_unused]] int c`.
```

```hint
`noexcept` goes after the closing `)` of the parameter list.
```

```stdin
box 2 3 4
```

```expected
24
```

```stdin
rectangle 5 6 100
```

```expected
30
```

```stdin
square 9 0 0
```

```expected hidden
81
```

```stdin
box -2 3 0
```

```expected hidden
0
```

```stdin
square -3 7 7
```

```expected hidden
9
```

```stdin
rectangle -4 5 0
```

```expected hidden
-20
```

```checks
must \[\[\s*maybe_unused\s*\]\] :: Use [[maybe_unused]] on the parameters you don't need.
must int\s+square\s*\([^)]*\)\s*noexcept :: Mark square noexcept.
must int\s+rectangle\s*\([^)]*\)\s*noexcept :: Mark rectangle noexcept.
must int\s+box\s*\([^)]*\)\s*noexcept :: Mark box noexcept.
```
:::
