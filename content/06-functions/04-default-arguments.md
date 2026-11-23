---
title: Default Arguments
summary: Give parameters default values so callers can leave them out, and learn the two rules (trailing only, declaration only).
---

## The idea

Often a parameter has an obvious "usual" value. Instead of forcing every caller to spell it out, you
can give it a **default argument** with `= value` in the parameter list:

```cpp run
#include <iostream>
#include <string>

void greet(const std::string& name, const std::string& greeting = "Hello") {
    std::cout << greeting << ", " << name << "!\n";
}

int main() {
    greet("Ada");               // greeting defaults to "Hello"
    greet("Linus", "Hi");       // explicit argument overrides the default
}
```

```output
Hello, Ada!
Hi, Linus!
```

When an argument is missing, the compiler simply fills in the default **at the call site**:
`greet("Ada")` is compiled as `greet("Ada", "Hello")`.

## Several defaults

Any number of parameters can have defaults:

```cpp run
#include <iostream>

void printLine(int width = 10, char symbol = '-') {
    for (int i = 0; i < width; ++i) {
        std::cout << symbol;
    }
    std::cout << '\n';
}

int main() {
    printLine();          // width = 10, symbol = '-'
    printLine(4);         // width = 4,  symbol = '-'
    printLine(6, '=');    // width = 6,  symbol = '='
}
```

```output
----------
----
======
```

Arguments are always matched **left to right**. There is no way to skip `width` and only give
`symbol`: `printLine('=')` would pass `'='` as the *width* (the character code 61, converted to
`int`), which compiles but is clearly not what you meant.

> **Pitfall:** C++ has no named arguments like `printLine(symbol='=')`. If callers often want to
> change a later parameter alone, reorder the parameters or use overloading (next lesson).

## Rule 1: defaults must be trailing

Once a parameter has a default, **every parameter after it** must have one too. Otherwise the
compiler couldn't tell which argument goes where:

```cpp compile-error
// error: default argument missing for parameter 2 of 'void box(int, int)'
void box(int width = 5, int height) {
}

int main() {
    box(3);
}
```

Valid patterns:

```cpp
void f(int a, int b, int c);             // no defaults
void f(int a, int b, int c = 3);         // last one
void f(int a, int b = 2, int c = 3);     // last two
void f(int a = 1, int b = 2, int c = 3); // all of them
```

## Rule 2: put the default in the declaration only

If a function has a separate declaration (prototype), the default goes there, **not** in the
definition. The caller needs to see the default, and callers see the declaration. Repeating it
in the definition is an error, even if the value is the same:

```cpp run
#include <iostream>

double applyTax(double price, double rate = 0.2);   // default lives here

int main() {
    std::cout << applyTax(100) << '\n';
    std::cout << applyTax(100, 0.05) << '\n';
}

double applyTax(double price, double rate) {        // no default repeated here
    return price * (1 + rate);
}
```

```output
120
105
```

```cpp compile-error
double applyTax(double price, double rate = 0.2);

// error: default argument given for parameter 2 of 'double applyTax(double, double)'
double applyTax(double price, double rate = 0.2) {
    return price * (1 + rate);
}

int main() {}
```

A common convention is to leave a reminder comment in the definition:
`double applyTax(double price, double rate /* = 0.2 */) { ... }`.

## What can a default be?

Any expression that's valid where the function is declared: a literal, a constant, even a
function call. It's evaluated **each time** the function is called without that argument.

```cpp run
#include <iostream>

const int kDefaultSize = 3;

int nextId() {
    static int id = 0;   // static locals are covered later in this module
    return ++id;
}

void make(int size = kDefaultSize, int id = nextId()) {
    std::cout << "size " << size << ", id " << id << '\n';
}

int main() {
    make();
    make(7);
    make(1, 100);
    make();
}
```

```output
size 3, id 1
size 7, id 2
size 1, id 100
size 3, id 3
```

Notice `nextId()` was **not** called for `make(1, 100)`, because the argument was supplied.

## When to use defaults

- Good: an "optional extra" that most callers don't care about (`precision = 2`, `verbose = false`).
- Not so good: when the default hides an important decision, or when callers would need to
  supply a later argument while skipping an earlier one.

:::quiz
Given `void draw(int x, int y = 0, int z = 0);`, which calls are valid? (select all that apply)

- [x] `draw(1);`
- [x] `draw(1, 2);`
- [x] `draw(1, 2, 3);`
- [ ] `draw();`

`x` has no default, so at least one argument is needed.
:::

:::quiz
Which declaration is **illegal**?

- [ ] `int f(int a, int b = 1);`
- [x] `int f(int a = 1, int b);`
- [ ] `int f(int a = 1, int b = 2);`

Defaults must be trailing: once one parameter has a default, all following parameters need one too.
:::

:::exercise Power with default
Write `long long power(long long base, int exponent = 2)` that returns `base` raised to `exponent`
(use a loop; `exponent` is never negative). Read a line containing either **one** number (base only)
or **two** numbers (base and exponent). If only the base is given, call `power(base)` so the default
is used.

**Input:** one or two integers on a line.
**Output:** the result followed by a newline.

```cpp starter
#include <iostream>

int main() {
    long long base;
    int exponent;
    std::cin >> base;
    if (std::cin >> exponent) {
        std::cout << base << '\n';
    } else {
        std::cout << base << '\n';
    }
}
```

```cpp solution
#include <iostream>

long long power(long long base, int exponent = 2) {
    long long result = 1;
    for (int i = 0; i < exponent; ++i) {
        result *= base;
    }
    return result;
}

int main() {
    long long base;
    int exponent;
    std::cin >> base;
    if (std::cin >> exponent) {
        std::cout << power(base, exponent) << '\n';
    } else {
        std::cout << power(base) << '\n';
    }
}
```

```hint
Put `= 2` after the exponent parameter in the function definition.
```

```hint
Start with `result = 1` and multiply by `base` exactly `exponent` times.
```

```stdin
9
```

```expected
81
```

```stdin
2 10
```

```expected
1024
```

```stdin
7 0
```

```expected hidden
1
```

```checks
must int\s+\w+\s*=\s*2\s*\) :: Give the exponent parameter a default value of 2.
must power\s*\(\s*base\s*\) :: Call power(base) with one argument when the exponent is missing.
```
:::

:::exercise Formatted price
Write `std::string formatPrice(int cents, const std::string& currency = "$", bool showCents = true)`
**declared above `main` with the defaults** and **defined below `main` without them**. It turns a
non-negative number of cents into text: with `showCents`, `1234` becomes `$12.34` (always two digits
after the dot); without it, just the whole units, `$12`.

Read `cents` and a mode word, then print:

- mode `full`: `formatPrice(cents)`
- mode `euro`: `formatPrice(cents, "EUR ")`
- mode `short`: `formatPrice(cents, "$", false)`

**Input:** an integer and a word.
**Output:** the formatted price followed by a newline.

```cpp starter
#include <iostream>
#include <string>

int main() {
    int cents;
    std::string mode;
    std::cin >> cents >> mode;
    std::cout << cents << '\n';
}
```

```cpp solution
#include <iostream>
#include <string>

std::string formatPrice(int cents, const std::string& currency = "$", bool showCents = true);

int main() {
    int cents;
    std::string mode;
    std::cin >> cents >> mode;
    if (mode == "full") {
        std::cout << formatPrice(cents) << '\n';
    } else if (mode == "euro") {
        std::cout << formatPrice(cents, "EUR ") << '\n';
    } else {
        std::cout << formatPrice(cents, "$", false) << '\n';
    }
}

std::string formatPrice(int cents, const std::string& currency, bool showCents) {
    std::string text = currency + std::to_string(cents / 100);
    if (showCents) {
        int rest = cents % 100;
        text += '.';
        if (rest < 10) {
            text += '0';
        }
        text += std::to_string(rest);
    }
    return text;
}
```

```hint
`std::to_string(n)` turns a number into a `std::string`, and `+` / `+=` join strings.
```

```hint
For the cents part, `cents % 100` gives 0 to 99. Add a leading `'0'` when it's below 10.
```

```stdin
1234 full
```

```expected
$12.34
```

```stdin
705 euro
```

```expected
EUR 7.05
```

```stdin
99 short
```

```expected hidden
$0
```

```stdin
0 full
```

```expected hidden
$0.00
```

```checks
must formatPrice\s*\([^)]*=[^)]*\)\s*;[\s\S]*int\s+main :: Declare formatPrice with its defaults above main.
must int\s+main[\s\S]*formatPrice\s*\([^)=]*\)\s*\{ :: Define formatPrice below main, without repeating the defaults.
must formatPrice\s*\(\s*cents\s*\) :: Call formatPrice(cents) with just one argument for mode full.
```
:::
