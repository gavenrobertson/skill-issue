---
title: if with Initializer and the Ternary Operator
summary: Scoping a variable to an if statement with C++17's if (init; condition), choosing between two values with ?:, when nested ternaries are (and aren't) readable, and the [[likely]] / [[unlikely]] attributes.
---

## `if` with an initializer (C++17)

Often you compute a value only to test it:

```cpp
int remainder = total % 7;
if (remainder != 0) {
    std::cout << "not a whole number of weeks, " << remainder << " days left over\n";
}
// remainder is still around here, even though nothing needs it anymore
```

`remainder` exists only for the `if`, but it stays in scope until the end of the enclosing block, where
it can be misused or clash with another name. Since C++17, an `if` can have an **initializer**
statement before the condition, separated by a semicolon:

```cpp
if (init-statement; condition) {
    ...
}
```

```cpp run
#include <iostream>

int main() {
    int total = 45;

    if (int remainder = total % 7; remainder != 0) {
        std::cout << "not whole weeks, " << remainder << " days left over\n";
    } else {
        std::cout << "exactly " << total / 7 << " weeks\n";
    }
    // remainder does not exist here
}
```

```output
not whole weeks, 3 days left over
```

The variable declared in the initializer:

- is created before the condition is evaluated,
- is visible in the condition, the `if` block, **and every `else if` / `else` branch**,
- is destroyed at the end of the whole `if` statement.

Using it afterwards is an error:

```cpp compile-error
#include <iostream>

int main() {
    if (int r = 17 % 5; r > 0) {
        std::cout << r << '\n';
    }
    std::cout << r << '\n';   // error: 'r' was not declared in this scope
}
```

### Variations

```cpp run
#include <iostream>
#include <string>

int main() {
    // several variables of the same type
    if (int lo = 1, hi = 10; lo < hi) {
        std::cout << "range " << lo << ".." << hi << '\n';
    }

    // auto works too
    if (auto half = 7 / 2.0; half > 3) {
        std::cout << "half is " << half << '\n';
    }

    // the variable is visible in the else-if and else branches
    if (int code = 404; code == 200) {
        std::cout << "OK\n";
    } else if (code == 404) {
        std::cout << "Not found (" << code << ")\n";
    } else {
        std::cout << "Other: " << code << '\n';
    }

    // the initializer can be any statement, even just a declaration used by the condition
    if (std::string word = "hello"; word.size() > 3) {
        std::cout << word << " is a long word\n";
    }
}
```

```output
range 1..10
half is 3.5
Not found (404)
hello is a long word
```

A particularly handy use: declare the variable and read into it in one `if`:

```cpp run
#include <iostream>

int main() {
    if (int n = 0; std::cin >> n) {
        std::cout << "read " << n << '\n';
    } else {
        std::cout << "no number\n";
    }
}
```

With input `42` it prints `read 42`; with an empty stdin box it prints `no number`.

### The older form: a declaration as the condition

Before C++17 you could already declare one variable *as* the condition. It is then tested for being
non-zero (true):

```cpp
if (int left = stock - sold) {          // true when left != 0
    std::cout << left << " left\n";
} else {
    std::cout << "sold out\n";          // left is 0 here, and still in scope
}
```

The C++17 form is more flexible because the condition can be anything, not just "is it non-zero".
The same initializer syntax also exists for `switch` (next lesson) and, since C++20, range-based `for`.

## The conditional (ternary) operator `?:`

`if` is a **statement**: it *does* things. Sometimes you just want to pick one of two **values**. That's
what the **conditional operator** does:

```cpp
condition ? value_if_true : value_if_false
```

It's called "the ternary operator" because it's the only operator with three operands.

```cpp run
#include <iostream>

int main() {
    int a = 7, b = 12;

    int bigger = (a > b) ? a : b;
    std::cout << "bigger: " << bigger << '\n';

    int n = 1;
    std::cout << n << (n == 1 ? " item" : " items") << '\n';
    n = 5;
    std::cout << n << (n == 1 ? " item" : " items") << '\n';
}
```

```output
bigger: 12
1 item
5 items
```

Only the chosen side is evaluated, just like an `if`.

Because it's an **expression**, the ternary works in places an `if` can't, like initializing a `const`
variable:

```cpp
const int max_players = online ? 64 : 4;     // const must be initialized right away

// the if version needs a non-const variable:
int max_players2 = 0;
if (online) { max_players2 = 64; } else { max_players2 = 4; }
```

### Parentheses with `<<`

`?:` has very low precedence, lower than `<<`. When you use it inside a `std::cout` chain, **wrap the
whole ternary in parentheses**:

```cpp compile-error
#include <iostream>

int main() {
    int x = 5;
    std::cout << x > 0 ? "positive" : "not positive";   // parsed as (std::cout << x) > 0 ? ...
}
```

The compiler groups `std::cout << x` first and then tries to compare the stream with `0`. Write
`std::cout << (x > 0 ? "positive" : "not positive");`.

### Both sides must have compatible types

The ternary produces a single value, so both branches must be convertible to a common type:

```cpp compile-error
#include <iostream>

int main() {
    int n = 3;
    std::cout << (n > 0 ? n : "none") << '\n';   // error: operands to '?:' have different types
}
```

When the types differ but are compatible, the result has the common type. `(flag ? 1 : 2.5)` is a
`double`, so even when `flag` is true it's `1.0`, not the `int` `1`.

### Nested ternaries

You can put a ternary inside another one. Laid out as a "table", one condition per line, a chain
reads quite well:

```cpp run
#include <iostream>

int main() {
    int temperature = 18;
    const char* label = temperature < 0  ? "freezing"
                      : temperature < 15 ? "cold"
                      : temperature < 25 ? "mild"
                      :                    "hot";
    std::cout << label << '\n';
}
```

```output
mild
```

(`const char*` is the type of a pointer to text such as a string literal. You'll learn about pointers
later; here it just holds the chosen literal.)

But a ternary nested *in the middle*, or crammed onto one line, quickly becomes unreadable:

```cpp
int r = a > b ? a > c ? a : c : b > c ? b : c;   // max of three... can you verify it at a glance?
```

Rule of thumb: use `?:` to choose between two simple values. When there are several branches, or
the branches *do* things (print, change variables), use `if` / `else if`.

| Use `if` / `else` when | Use `?:` when |
| --- | --- |
| the branches run statements | you're choosing a value |
| there are many branches | there are two (or a short, flat chain) |
| the logic needs explaining | it fits on a line and reads naturally |

## `[[likely]]` and `[[unlikely]]` (C++20)

You can tell the compiler which branch you expect to run most of the time, by putting an
**attribute** right after the condition (or after `else`):

```cpp run
#include <iostream>

int main() {
    int value = 42;
    if (value >= 0) [[likely]] {
        std::cout << "normal case\n";
    } else [[unlikely]] {
        std::cout << "rare error case\n";
    }
}
```

```output
normal case
```

These are **optimization hints** only: the program behaves exactly the same with or without them. The
compiler may arrange the machine code so the likely path is slightly faster. Modern compilers and CPUs
predict branches well on their own, so you'll rarely need these. Use them only when you've measured a
real difference in performance-critical code.

:::quiz
What does this print?

```cpp
int x = 4;
std::cout << (x % 2 == 0 ? "even" : "odd") << ' ' << (x > 10 ? x : 10);
```

- [ ] `odd 4`
- [x] `even 10`
- [ ] `even 4`
- [ ] It doesn't compile

`4 % 2 == 0` is true, so the first ternary gives `"even"`. `4 > 10` is false, so the second gives `10`.
:::

:::quiz
Where can the variable `v` be used?

```cpp
if (int v = compute(); v > 0) {
    // (A)
} else {
    // (B)
}
// (C)
```

- [x] In the condition
- [x] At (A)
- [x] At (B)
- [ ] At (C)

A variable declared in an `if` initializer lives until the end of the whole `if` statement, including
all `else` branches, but not after it.
:::

:::exercise Absolute value
Read an integer and print its absolute value, using the conditional operator `?:` (no `if`).

**Input:** one integer `x`.
**Output:** `|x| = <absolute value>`, e.g. `|-5| = 5`.

```cpp starter
#include <iostream>

int main() {
    int x = 0;
    std::cin >> x;
    int result = x;
    std::cout << '|' << x << "| = " << result << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int x = 0;
    std::cin >> x;
    int result = (x < 0) ? -x : x;
    std::cout << '|' << x << "| = " << result << '\n';
}
```

```hint
`condition ? value_if_true : value_if_false`. When `x` is negative, the absolute value is `-x`.
```

```stdin
-5
```

```expected
|-5| = 5
```

```stdin
7
```

```expected
|7| = 7
```

```stdin
0
```

```expected hidden
|0| = 0
```

```checks
must \? :: Use the conditional operator ?:.
mustnot \bif\b :: Solve it without an if statement.
```
:::

:::exercise Pluralize
Read a count and a noun, and print them with the noun in plural form unless the count is exactly 1.
The plural is formed by adding `s`.

**Input:** an integer `n` and a word, e.g. `3 cat`.
**Output:** `3 cats` (or `1 cat` when `n` is 1). Every count other than exactly 1, including `0` and
negative numbers, uses the plural.

Use the conditional operator, not `if`.

```cpp starter
#include <iostream>
#include <string>

int main() {
    int n = 0;
    std::string noun;
    std::cin >> n >> noun;
    std::cout << n << ' ' << noun << "s\n";
}
```

```cpp solution
#include <iostream>
#include <string>

int main() {
    int n = 0;
    std::string noun;
    std::cin >> n >> noun;
    std::cout << n << ' ' << noun << (n == 1 ? "" : "s") << '\n';
}
```

```hint
Print the noun, then a ternary that chooses between `""` and `"s"`.
```

```hint
Inside a `std::cout` chain, wrap the whole ternary in parentheses.
```

```stdin
3 cat
```

```expected
3 cats
```

```stdin
1 apple
```

```expected
1 apple
```

```stdin
0 dog
```

```expected hidden
0 dogs
```

```stdin
-1 point
```

```expected hidden
-1 points
```

```checks
must \? :: Use the conditional operator ?:.
mustnot \bif\b :: Solve it without an if statement.
```
:::

:::exercise Divisible
Read two integers `a` and `b` and report whether `a` is divisible by `b`. Compute the remainder in an
**`if` initializer** so it only exists inside the `if` statement.

**Input:** two integers `a` and `b`.
**Output:**

- `cannot divide by zero` if `b` is 0,
- otherwise `<a> is divisible by <b>` if the remainder is 0,
- otherwise `<a> % <b> = <remainder>`.

```cpp starter
#include <iostream>

int main() {
    int a = 0, b = 0;
    std::cin >> a >> b;
    if (b == 0) {
        std::cout << "cannot divide by zero\n";
    } else {
        std::cout << a << " is divisible by " << b << '\n';
    }
}
```

```cpp solution
#include <iostream>

int main() {
    int a = 0, b = 0;
    std::cin >> a >> b;
    if (b == 0) {
        std::cout << "cannot divide by zero\n";
    } else if (int r = a % b; r == 0) {
        std::cout << a << " is divisible by " << b << '\n';
    } else {
        std::cout << a << " % " << b << " = " << r << '\n';
    }
}
```

```hint
`if (int r = a % b; r == 0) { ... } else { ... }`. And `r` is still usable in the `else` branch.
```

```hint
Check `b == 0` first: `a % 0` is undefined behavior.
```

```stdin
12 4
```

```expected
12 is divisible by 4
```

```stdin
17 5
```

```expected
17 % 5 = 2
```

```stdin
3 0
```

```expected hidden
cannot divide by zero
```

```stdin
0 9
```

```expected hidden
0 is divisible by 9
```

```checks
must if\s*\(\s*(const\s+)?(int|auto)\s+\w+\s*=[^;)]*; :: Declare the remainder in an if initializer: if (int r = ...; ...).
```
:::

:::exercise Size class
Read an integer and classify it with a single chain of conditional operators (no `if`).

**Input:** one integer `n`.
**Output:** one word:

- `negative` if `n < 0`,
- `zero` if `n == 0`,
- `small` if `n` is between 1 and 9,
- `large` if `n >= 10`.

```cpp starter
#include <iostream>

int main() {
    int n = 0;
    std::cin >> n;
    std::cout << (n < 0 ? "negative" : "large") << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int n = 0;
    std::cin >> n;
    const char* label = n < 0   ? "negative"
                      : n == 0  ? "zero"
                      : n < 10  ? "small"
                      :           "large";
    std::cout << label << '\n';
}
```

```hint
Chain them: `a ? "x" : b ? "y" : c ? "z" : "w"`. Lay it out one condition per line.
```

```stdin
-4
```

```expected
negative
```

```stdin
0
```

```expected
zero
```

```stdin
9
```

```expected hidden
small
```

```stdin
10
```

```expected hidden
large
```

```checks
must \?[\s\S]*\?[\s\S]*\? :: Use a chain of three conditional operators.
mustnot \bif\b :: Solve it without an if statement.
```
:::
