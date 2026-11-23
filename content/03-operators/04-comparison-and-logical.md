---
title: Comparison and Logical Operators
summary: == != < > <= >=, the = vs == trap, && || ! and their alternative spellings, short-circuit evaluation, comparing floating-point numbers, and printing bools.
---

## Comparison (relational) operators

Comparison operators compare two values and produce a **`bool`**: `true` or `false`.

| Operator | Meaning | Example (`a = 3`, `b = 5`) |
| --- | --- | --- |
| `==` | equal to | `a == b` is `false` |
| `!=` | not equal to | `a != b` is `true` |
| `<` | less than | `a < b` is `true` |
| `>` | greater than | `a > b` is `false` |
| `<=` | less than or equal to | `a <= 3` is `true` |
| `>=` | greater than or equal to | `b >= 6` is `false` |

These are the building blocks of every decision your program makes (`if`, loops). For now, we'll print
their results directly.

## Printing bools: std::boolalpha

By default `std::cout` prints `true` as `1` and `false` as `0`. The manipulator **`std::boolalpha`**
switches to the words `true`/`false`, and **`std::noboolalpha`** switches back. Like other
manipulators, it stays in effect until changed.

```cpp run
#include <iostream>

int main() {
    int a = 3;
    int b = 5;
    std::cout << (a == b) << ' ' << (a != b) << '\n';             // 0 1
    std::cout << std::boolalpha;
    std::cout << (a < b) << ' ' << (a > b) << ' ' << (a <= 3) << ' ' << (b >= 6) << '\n';
    std::cout << std::noboolalpha << (a < b) << '\n';             // 1
}
```

```output
0 1
true false true false
1
```

> **Pitfall:** The parentheses around `(a == b)` are required. `<<` binds more tightly than `==`, so
> `std::cout << a == b` means `(std::cout << a) == b`, which doesn't compile.

```cpp compile-error
#include <iostream>

int main() {
    int a = 3, b = 5;
    std::cout << a == b;   // error: no match for 'operator==' (operand types are 'std::ostream' and 'int')
}
```

## The = vs. == mistake

`=` **assigns**, `==` **compares**. Mixing them up is one of the most common bugs in C-family
languages, because `x = 5` is also an expression (its value is 5, which converts to `true`):

```cpp
int x = 3;
if (x = 5) {          // assigns 5 to x, and 5 is "true": ALWAYS runs!
    std::cout << "x is five\n";
}
```

GCC warns: `suggest parentheses around assignment used as truth value [-Wparentheses]`. Never
ignore that warning. (Some people write `5 == x`, "Yoda conditions", so that a typo `5 = x` fails
to compile, but with warnings enabled that's unnecessary.)

## Chained comparisons don't work like math

In math, `1 < x < 10` means "x is between 1 and 10". In C++ it's `(1 < x) < 10`: the first comparison
gives a `bool` (0 or 1), which is then compared with 10, which is always true!

```cpp run warns
#include <iostream>

int main() {
    int x = 20;
    std::cout << std::boolalpha << (1 < x < 10) << '\n';          // true?!  (1 < 20) is 1, and 1 < 10
    std::cout << (1 < x && x < 10) << '\n';                       // false: correct
}
```

```output
true
false
```

GCC warns: `comparisons like 'X<=Y<=Z' do not have their mathematical meaning`. Use `&&` to combine
two comparisons.

## Logical operators: &&, ||, !

Logical operators combine `bool` values:

| Operator | Name | Result |
| --- | --- | --- |
| `a && b` | AND | `true` only if **both** are true |
| `a \|\| b` | OR | `true` if **at least one** is true |
| `!a` | NOT | the opposite of `a` |

Truth table:

| `a` | `b` | `a && b` | `a \|\| b` | `!a` |
| --- | --- | --- | --- | --- |
| false | false | false | false | true |
| false | true | false | true | true |
| true | false | false | true | false |
| true | true | true | true | false |

```cpp run
#include <iostream>

int main() {
    int age = 25;
    bool hasTicket = true;

    bool canEnter = age >= 18 && hasTicket;
    bool child = age < 12 || age > 100;
    bool notAdult = !(age >= 18);

    std::cout << std::boolalpha << canEnter << ' ' << child << ' ' << notAdult << '\n';
}
```

```output
true false false
```

Operands that aren't `bool` are converted: zero is `false`, anything else `true`. So `!0` is `true`
and `!42` is `false`.

**Precedence:** `!` binds tightest, then comparisons, then `&&`, then `||`. So `a || b && c` means
`a || (b && c)`. GCC suggests parentheses when you mix `&&` and `||`. Add them; they make the intent
obvious.

> **Pitfall:** `!x == 5` means `(!x) == 5`, not `!(x == 5)`. Use `x != 5`.

### Alternative tokens

C++ also accepts **words** for these operators. They're exactly equivalent (not macros, real keywords),
just less common in practice:

| Symbol | Word | Symbol | Word |
| --- | --- | --- | --- |
| `&&` | `and` | `!=` | `not_eq` |
| `\|\|` | `or` | `&` | `bitand` |
| `!` | `not` | `\|` | `bitor` |
| `^` | `xor` | `~` | `compl` |

```cpp run
#include <iostream>

int main() {
    bool sunny = true;
    bool warm = false;
    std::cout << std::boolalpha << (sunny and warm) << ' ' << (sunny or warm) << ' ' << (not warm)
              << ' ' << (3 not_eq 4) << '\n';
}
```

```output
false true true true
```

## Short-circuit evaluation

`&&` and `||` evaluate their **left operand first**, and only evaluate the right operand **if it's
needed** to know the answer:

- `a && b`: if `a` is `false`, the result is `false` no matter what. **`b` is not evaluated.**
- `a || b`: if `a` is `true`, the result is `true` no matter what. **`b` is not evaluated.**

This is guaranteed, and it's very useful for **guards**: check that something is safe, then use it.

```cpp run
#include <iostream>

int main() {
    int divisor = 0;
    // Safe: when divisor is 0, the division on the right is never evaluated.
    bool bigQuotient = divisor != 0 && 100 / divisor > 10;
    std::cout << std::boolalpha << bigQuotient << '\n';

    int calls = 0;
    bool r1 = false && (++calls > 0);    // right side skipped
    bool r2 = true || (++calls > 0);     // right side skipped
    bool r3 = true && (++calls > 0);     // right side runs: calls becomes 1
    std::cout << r1 << ' ' << r2 << ' ' << r3 << ' ' << calls << '\n';
}
```

```output
false
false true true 1
```

Order matters: `100 / divisor > 10 && divisor != 0` would divide by zero **before** checking. Put
the guard first.

The bitwise operators `&` and `|` (next lesson) look similar but **don't short-circuit**: they always
evaluate both sides.

## Comparing floating-point numbers

Floating-point values are rounded, so two calculations that "should" give the same number often
differ in the last bits. Comparing them with `==` is fragile:

```cpp run
#include <cmath>
#include <iostream>

int main() {
    double a = 0.1 + 0.2;
    double b = 0.3;
    std::cout << std::boolalpha << (a == b) << '\n';                 // false!

    constexpr double epsilon = 1e-9;
    std::cout << (std::abs(a - b) < epsilon) << '\n';                // true: "close enough"
}
```

```output
false
true
```

Instead of `a == b`, check whether the **difference is tiny**: `std::abs(a - b) < epsilon`, using
`std::abs` from `<cmath>`. A fixed epsilon like `1e-9` works when your values are around 1. For very
large or very small values, a **relative** tolerance is better:
`std::abs(a - b) <= 1e-9 * std::max(std::abs(a), std::abs(b))`.

Comparing integers with `==` is always exact and fine. And comparing floating values with `<` or `>`
is fine as long as "almost equal" values landing on either side doesn't matter.

:::quiz
What does this print?

```cpp
int x = 7;
std::cout << std::boolalpha << (x > 5 && x < 10) << ' ' << (x < 5 || x == 7);
```

- [x] `true true`
- [ ] `true false`
- [ ] `1 1`
- [ ] `false true`

7 is between 5 and 10, and `x == 7` makes the `||` true. `std::boolalpha` prints the words.
:::

:::quiz
`int n = 0;` Which expressions are safe (never divide by zero)? (select all that apply)

- [x] `n != 0 && 10 / n > 2`
- [ ] `10 / n > 2 && n != 0`
- [x] `n == 0 || 10 / n > 2`
- [ ] `10 / n > 2 || n == 0`

Short-circuiting only helps when the guard comes **first**. With `||`, a `true` left side skips the right.
:::

:::quiz
`int x = 50;` What is `(0 < x < 10)`?

- [x] `true`
- [ ] `false`
- [ ] It doesn't compile
- [ ] Undefined behavior

It's `(0 < x) < 10`, which is `true < 10`, which is `1 < 10`: `true`. Write `0 < x && x < 10`.
:::

:::exercise Compare two numbers {easy}
Read two integers `a` and `b` and print the result of all six comparisons, using `std::boolalpha`.

**Input:** two integers `a b`.
**Output:** six lines in exactly this format (shown for `3 5`):

```
a == b: false
a != b: true
a < b: true
a > b: false
a <= b: true
a >= b: false
```

```cpp starter
#include <iostream>

int main() {
    int a{}, b{};
    std::cin >> a >> b;
    std::cout << "a == b: " << (a == b) << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int a{}, b{};
    std::cin >> a >> b;
    std::cout << std::boolalpha;
    std::cout << "a == b: " << (a == b) << '\n';
    std::cout << "a != b: " << (a != b) << '\n';
    std::cout << "a < b: " << (a < b) << '\n';
    std::cout << "a > b: " << (a > b) << '\n';
    std::cout << "a <= b: " << (a <= b) << '\n';
    std::cout << "a >= b: " << (a >= b) << '\n';
}
```

```hint
Send `std::boolalpha` into `std::cout` once at the start; it stays on.
```

```hint
Remember the parentheses: `<< (a < b) <<`.
```

```stdin
3 5
```

```expected
a == b: false
a != b: true
a < b: true
a > b: false
a <= b: true
a >= b: false
```

```stdin
4 4
```

```expected hidden
a == b: true
a != b: false
a < b: false
a > b: false
a <= b: true
a >= b: true
```

```stdin
-5 3
```

```expected hidden
a == b: false
a != b: true
a < b: true
a > b: false
a <= b: true
a >= b: false
```

```stdin
7 2
```

```expected hidden
a == b: false
a != b: true
a < b: false
a > b: true
a <= b: false
a >= b: true
```

```checks
must boolalpha :: Use std::boolalpha.
```
:::

:::exercise Leap year {medium}
A year is a leap year if it's divisible by 4, **except** years divisible by 100, which are leap years
only if they're also divisible by 400. Read a year and print whether it's a leap year, as a single
logical expression using `&&` and `||` (no `if`).

**Input:** one year (positive integer).
**Output:** `true` or `false`, newline. For `2024` print `true`, for `1900` print `false`.

```cpp starter
#include <iostream>

int main() {
    int year{};
    std::cin >> year;
    bool leap = year % 4 == 0;
    std::cout << std::boolalpha << leap << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int year{};
    std::cin >> year;
    bool leap = (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
    std::cout << std::boolalpha << leap << '\n';
}
```

```hint
"Divisible by 4" is `year % 4 == 0`.
```

```hint
Leap if: (divisible by 4 AND not divisible by 100) OR divisible by 400.
```

```stdin
2024
```

```expected
true
```

```stdin
1900
```

```expected
false
```

```stdin
2000
```

```expected hidden
true
```

```stdin
2023
```

```expected hidden
false
```

```stdin
2100
```

```expected hidden
false
```

```stdin
1600
```

```expected hidden
true
```

```stdin
4
```

```expected hidden
true
```

```stdin
1
```

```expected hidden
false
```

```checks
must &&|\band\b :: Use && (logical AND).
must \|\||\bor\b :: Use || (logical OR).
mustnot \bif\b :: Use a single logical expression, not if.
```
:::

:::exercise In range {easy}
Read three integers `lo`, `hi` and `x`, and print whether `lo ≤ x ≤ hi` (both ends included). Careful:
`lo <= x <= hi` compiles but is wrong.

**Input:** three integers `lo hi x` (with `lo ≤ hi`).
**Output:** `true` or `false`, newline. For `1 10 5` print `true`; for `1 10 20` print `false`.

```cpp starter
#include <iostream>

int main() {
    int lo{}, hi{}, x{};
    std::cin >> lo >> hi >> x;
    std::cout << std::boolalpha << (lo <= x) << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int lo{}, hi{}, x{};
    std::cin >> lo >> hi >> x;
    std::cout << std::boolalpha << (lo <= x && x <= hi) << '\n';
}
```

```hint
Two separate comparisons, joined with `&&`.
```

```stdin
1 10 5
```

```expected
true
```

```stdin
1 10 20
```

```expected
false
```

```stdin
1 10 10
```

```expected hidden
true
```

```stdin
-5 5 -6
```

```expected hidden
false
```

```stdin
5 5 5
```

```expected hidden
true
```

```stdin
-10 -1 0
```

```expected hidden
false
```

```stdin
-10 -1 -10
```

```expected hidden
true
```

```checks
must &&|\band\b :: Combine the two comparisons with &&.
mustnot <=\s*\w+\s*<= :: lo <= x <= hi doesn't mean what it looks like.
```
:::

:::exercise Close enough {hard}
Read three decimal numbers `a`, `b` and `c`, and print whether `a + b` equals `c` up to rounding
errors. With `==`, `0.1 + 0.2` would not equal `0.3`.

A fixed tolerance like `1e-9` doesn't work for every size of number: for values around 10⁸, a single
rounding step is already bigger than `1e-9`, and for values around 10⁻¹², `1e-9` accepts numbers that
differ by a factor of three. So use a **relative** tolerance, exactly this test (note the `<=`):

```
|a + b - c| <= 1e-9 * max(|a + b|, |c|)
```

Use `std::abs` from `<cmath>` and `std::max` from `<algorithm>`.

**Input:** three numbers `a b c` (absolute values below 10³⁰⁰).
**Output:** `true` or `false`, newline. For `0.1 0.2 0.3` print `true`.

```cpp starter
#include <algorithm>
#include <cmath>
#include <iostream>

int main() {
    double a{}, b{}, c{};
    std::cin >> a >> b >> c;
    std::cout << std::boolalpha << (a + b == c) << '\n';
}
```

```cpp solution
#include <algorithm>
#include <cmath>
#include <iostream>

int main() {
    double a{}, b{}, c{};
    std::cin >> a >> b >> c;
    constexpr double relativeTolerance = 1e-9;
    double sum = a + b;
    double difference = std::abs(sum - c);
    double scale = std::max(std::abs(sum), std::abs(c));
    std::cout << std::boolalpha << (difference <= relativeTolerance * scale) << '\n';
}
```

```hint
Compute the pieces in separate variables: `sum`, `difference = std::abs(sum - c)`, and
`scale = std::max(std::abs(sum), std::abs(c))`. Then compare `difference <= 1e-9 * scale`.
```

```hint
Why `<=` and not `<`? Try `0 0 0`: the difference is 0 and the scale is 0, and 0 equals 0.
```

```stdin
0.1 0.2 0.3
```

```expected
true
```

```stdin
1 2 4
```

```expected
false
```

```stdin
1 2 3
```

```expected hidden
true
```

```stdin
0.1 0.2 0.30001
```

```expected hidden
false
```

```stdin
0 0 0
```

```expected hidden
true
```

```stdin
12345678.9 0.3 12345679.2
```

```expected hidden
true
```

```stdin
1e-12 1e-12 3e-12
```

```expected hidden
false
```

```stdin
1e20 1e20 2.0000001e20
```

```expected hidden
false
```

```checks
must \babs\s*\(|\bfabs\s*\( :: Use std::abs to measure the difference.
mustnot [^=!<>]==[^=] :: Don't compare floating-point numbers with ==.
```
:::
