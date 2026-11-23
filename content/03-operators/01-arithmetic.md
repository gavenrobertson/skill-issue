---
title: Arithmetic Operators
summary: + - * / %, integer vs. floating-point division, remainders with negative numbers, unary minus and plus, mixed types, and dividing by zero.
---

## Expressions and operators

An **expression** is anything that produces a value: `42`, `x`, `x + 1`, `price * quantity`. An
**operator** is a symbol that combines values (its **operands**) into a new value. `+` is a **binary**
operator (two operands: `a + b`); `-` in `-x` is a **unary** operator (one operand).

## The five arithmetic operators

| Operator | Meaning | Example | Result |
| --- | --- | --- | --- |
| `+` | addition | `7 + 2` | `9` |
| `-` | subtraction | `7 - 2` | `5` |
| `*` | multiplication | `7 * 2` | `14` |
| `/` | division | `7 / 2` | `3` (integers!) |
| `%` | remainder (modulo) | `7 % 2` | `1` |

```cpp run
#include <iostream>

int main() {
    int a = 17;
    int b = 5;
    std::cout << a + b << ' ' << a - b << ' ' << a * b << ' ' << a / b << ' ' << a % b << '\n';

    double x = 17.0;
    double y = 5.0;
    std::cout << x + y << ' ' << x - y << ' ' << x * y << ' ' << x / y << '\n';
}
```

```output
22 12 85 3 2
22 12 85 3.4
```

There's **no exponent operator** in C++. Use `std::pow(base, exponent)` from `<cmath>` (it works on
`double`s), or just multiply: `x * x`.

## Integer division truncates

When **both operands are integers**, `/` performs **integer division**: the result is an integer, and
the fractional part is **thrown away** (truncated toward zero). It does not round:

```cpp run
#include <iostream>

int main() {
    std::cout << 7 / 2 << '\n';     // 3, not 3.5
    std::cout << 9 / 10 << '\n';    // 0
    std::cout << 19 / 10 << '\n';   // 1 (no rounding up)
    std::cout << -7 / 2 << '\n';    // -3: toward zero, not -4
    std::cout << 7 / -2 << '\n';    // -3
}
```

```output
3
0
1
-3
-3
```

If **at least one operand is a floating-point type**, you get floating division:

```cpp run
#include <iostream>

int main() {
    int total = 7;
    int parts = 2;
    std::cout << 7.0 / 2 << ' ' << 7 / 2.0 << ' ' << 7.0 / 2.0 << '\n';     // 3.5 3.5 3.5
    std::cout << static_cast<double>(total) / parts << '\n';                 // 3.5
    std::cout << total / parts * 1.0 << '\n';                                // 3: too late!
}
```

```output
3.5 3.5 3.5
3.5
3
```

> **Pitfall:** In `total / parts * 1.0`, the integer division `total / parts` runs **first** and has
> already lost the `.5`. Convert an operand **before** dividing.

## The remainder operator %

`a % b` gives the **remainder** of the integer division `a / b`. It's incredibly useful:

- `n % 2` is `0` for even numbers and `1` for odd (positive) numbers.
- `n % 10` is the last decimal digit, and `n / 10` removes it.
- `minutes % 60` wraps a count into a range (`0`-`59`), like a clock.

```cpp run
#include <iostream>

int main() {
    int totalSeconds = 3725;
    int hours = totalSeconds / 3600;
    int minutes = totalSeconds % 3600 / 60;
    int seconds = totalSeconds % 60;
    std::cout << hours << "h " << minutes << "m " << seconds << "s\n";

    int n = 1234;
    std::cout << "last digit: " << n % 10 << ", rest: " << n / 10 << '\n';
}
```

```output
1h 2m 5s
last digit: 4, rest: 123
```

`%` works **only on integers**. For floating-point remainders, use `std::fmod` from `<cmath>`:

```cpp compile-error
int main() {
    double r = 7.5 % 2.0;   // error: invalid operands of types 'double' and 'double' to binary 'operator%'
}
```

### Remainder with negative numbers

Since C++11, division truncates toward zero, and the remainder is defined so that
**`(a / b) * b + a % b == a`** always holds. The result: **the sign of `a % b` follows `a`** (the left operand):

```cpp run
#include <iostream>

int main() {
    std::cout << 7 % 3 << ' ' << -7 % 3 << ' ' << 7 % -3 << ' ' << -7 % -3 << '\n';
}
```

```output
1 -1 1 -1
```

This differs from the mathematical "modulo" (and from Python's `%`), where `-7 mod 3` is `2`. If you
need a result in `0 .. n-1` even for negative numbers, use `((a % n) + n) % n`.

> **Pitfall:** `n % 2 == 1` fails for negative odd numbers (`-3 % 2` is `-1`). Test `n % 2 != 0` instead.

## Unary minus and plus

Unary `-` negates a value. Unary `+` returns the value unchanged... except that it applies
**integral promotion**, which makes it a handy trick for printing a `char` as a number:

```cpp run
#include <iostream>

int main() {
    int x = 5;
    int y = -x;            // -5
    int z = -(-x);         // 5
    char c = 'A';
    std::cout << y << ' ' << z << ' ' << +x << ' ' << c << ' ' << +c << '\n';
}
```

```output
-5 5 5 A 65
```

`- -x` (with a space) is minus-minus-x. But `--x` (no space) is the **decrement** operator, a different thing!

## Mixed types

When operands have different types, they're converted to a common type first (the *usual arithmetic
conversions* from the **Type Conversions** lesson): `int` and `double` give `double`, `int` and
`long long` give `long long`, small types like `char` and `short` become `int`.

```cpp run
#include <iostream>

int main() {
    int items = 3;
    double price = 2.50;
    long long big = 4'000'000'000;
    char letter = 'a';

    std::cout << items * price << '\n';   // double: 7.5
    std::cout << big * items << '\n';     // long long: 12000000000
    std::cout << letter + items << '\n';  // int: 100
}
```

```output
7.5
12000000000
100
```

> **Warning:** The common type is chosen from the **operands**, not from where the result goes.
> `long long r = 100000 * 100000;` multiplies two `int`s, overflows (undefined behavior), and only then
> converts. Write `100000LL * 100000`.

## Dividing by zero

- **Integer** division or remainder by zero (`x / 0`, `x % 0`) is **undefined behavior**. On x86 PCs
  (like the machine that runs your code here) the program usually crashes on the spot, reported as
  "Floating point exception" on Linux, oddly. Other CPUs may just produce a garbage result.
- **Floating-point** division by zero follows the IEEE 754 standard, used by practically every
  computer: a nonzero value divided by `0.0` gives **infinity** (`inf` or `-inf`), and `0.0 / 0.0` gives
  **NaN** ("not a number"). Any arithmetic involving NaN gives NaN.

```cpp run
#include <cmath>
#include <iostream>

int main() {
    double zero = 0.0;
    double posInf = 1.0 / zero;
    double negInf = -1.0 / zero;
    double notANumber = zero / zero;
    std::cout << posInf << ' ' << negInf << '\n';
    std::cout << std::boolalpha << std::isinf(posInf) << ' ' << std::isnan(notANumber) << '\n';
}
```

```output
inf -inf
true true
```

Always check a divisor that comes from input before dividing by it (you'll learn `if` soon).

## A classic mistake: ^ is not "power"

```cpp run warns
#include <iostream>

int main() {
    std::cout << (2 ^ 3) << '\n';    // 1!  ^ is bitwise XOR, not exponentiation
}
```

```output
1
```

GCC 13 even warns: `result of '2^3' is 1; did you mean '1 << 3' (8)?`. For powers use `std::pow(2, 3)`
(which returns the `double` `8`), or multiply.

:::quiz
What does this print?

```cpp
std::cout << 17 / 5 << ' ' << 17 % 5;
```

- [ ] `3.4 2`
- [x] `3 2`
- [ ] `3 3`
- [ ] `4 2`

Both operands are `int`, so `/` truncates to 3, and the remainder is 17 - 15 = 2.
:::

:::quiz
What is `-13 % 4` in C++?

- [ ] `3`
- [x] `-1`
- [ ] `1`
- [ ] `-3`

`-13 / 4` truncates toward zero to `-3`, and `-3 * 4 + (-1) == -13`, so the remainder is `-1`. The sign
follows the left operand.
:::

:::quiz
Which expressions evaluate to `2.5`? (select all that apply)

- [x] `5 / 2.0`
- [ ] `5 / 2`
- [x] `5.0 / 2`
- [ ] `static_cast<double>(5 / 2)`
- [x] `static_cast<double>(5) / 2`

Floating division needs a floating-point operand **before** the division happens. `static_cast<double>(5 / 2)`
converts the already-truncated `2` to `2.0`.
:::

:::exercise Last digit {easy}
Read a non-negative integer `n`. Print its last decimal digit and the number with that digit removed,
separated by a space.

**Input:** one integer `n` (0 ≤ n ≤ 2,000,000,000).
**Output:** `<last digit> <n without its last digit>`, newline. For `1234` print `4 123`.

```cpp starter
#include <iostream>

int main() {
    int n{};
    std::cin >> n;
    std::cout << n << ' ' << n << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int n{};
    std::cin >> n;
    std::cout << n % 10 << ' ' << n / 10 << '\n';
}
```

```hint
`n % 10` is the remainder after dividing by 10: the last digit. `n / 10` drops it.
```

```stdin
1234
```

```expected
4 123
```

```stdin
7
```

```expected hidden
7 0
```

```stdin
0
```

```expected hidden
0 0
```

```stdin
2000000000
```

```expected hidden
0 200000000
```

```stdin
10
```

```expected hidden
0 1
```

```checks
must % :: Use the % operator.
```
:::

:::exercise Celsius to Fahrenheit {easy}
Read a whole-number temperature in Celsius and print it in Fahrenheit using `F = C × 9 / 5 + 32`. The
result can have a fractional part, so make sure you're not doing integer division.

**Input:** one integer `c`.
**Output:** the Fahrenheit value with plain `std::cout <<`, newline. For `37` print `98.6`; for `100` print `212`.

```cpp starter
#include <iostream>

int main() {
    int c{};
    std::cin >> c;
    std::cout << c * 9 / 5 + 32 << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int c{};
    std::cin >> c;
    double f = c * 9.0 / 5 + 32;
    std::cout << f << '\n';
}
```

```hint
With input `37` the starter prints `98`: `37 * 9 / 5` is integer division.
```

```hint
Make one operand a `double`, for example `9.0` instead of `9`.
```

```stdin
100
```

```expected
212
```

```stdin
37
```

```expected
98.6
```

```stdin
-40
```

```expected hidden
-40
```

```stdin
1
```

```expected hidden
33.8
```

```stdin
-273
```

```expected hidden
-459.4
```

```stdin
0
```

```expected hidden
32
```

:::

:::exercise Make change {medium}
Read an amount in cents and give change using as many **quarters** (25¢) as possible, then **dimes**
(10¢), then **nickels** (5¢), then **pennies** (1¢). Use `/` and `%`.

**Input:** one integer `cents` (0 ≤ cents ≤ 100000).
**Output:** the four counts separated by spaces: `<quarters> <dimes> <nickels> <pennies>`, newline.
For `289` print `11 1 0 4`.

```cpp starter
#include <iostream>

int main() {
    int cents{};
    std::cin >> cents;
    int quarters = cents / 25;
    std::cout << quarters << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int cents{};
    std::cin >> cents;
    int quarters = cents / 25;
    cents = cents % 25;
    int dimes = cents / 10;
    cents = cents % 10;
    int nickels = cents / 5;
    int pennies = cents % 5;
    std::cout << quarters << ' ' << dimes << ' ' << nickels << ' ' << pennies << '\n';
}
```

```hint
After taking out the quarters, what's left is `cents % 25`. Repeat the same idea for each coin.
```

```stdin
289
```

```expected
11 1 0 4
```

```stdin
0
```

```expected hidden
0 0 0 0
```

```stdin
99
```

```expected hidden
3 2 0 4
```

```stdin
30
```

```expected hidden
1 0 1 0
```

```stdin
100000
```

```expected hidden
4000 0 0 0
```

```stdin
4
```

```expected hidden
0 0 0 4
```

```stdin
41
```

```expected hidden
1 1 1 1
```

```checks
must % :: Use % to find the remaining cents.
```
:::

:::exercise Wrap around {hard}
A clock-like counter has positions `0` to `n - 1`. Read a position `a` (which may be negative or larger
than `n`) and the size `n`, and print the equivalent position in `0 .. n-1`. Remember that `%` keeps
the sign of the left operand, so `-7 % 3` is `-1`, but the answer here must be `2`.

Both numbers can be anywhere in the `int` range, so watch out for intermediate results that don't fit
in an `int`.

**Input:** two integers `a n` (−2,147,483,648 ≤ a ≤ 2,147,483,647 and 1 ≤ n ≤ 2,147,483,647).
**Output:** the wrapped position, newline. For `-7 3` print `2`.

```cpp starter
#include <iostream>

int main() {
    int a{}, n{};
    std::cin >> a >> n;
    std::cout << a % n << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int a{}, n{};
    std::cin >> a >> n;
    long long shifted = a % n + static_cast<long long>(n);   // up to 2n - 2: too big for int
    std::cout << shifted % n << '\n';
}
```

```hint
`a % n` is between `-(n-1)` and `n-1`. Adding `n` makes it non-negative, but might push it to `n` or more.
```

```hint
Take the remainder a second time: `(a % n + n) % n`.
```

```hint
For a large `n` (say 2,000,000,000), `a % n + n` can be almost `2n`, which overflows an `int`
(undefined behavior). Do that addition in `long long`.
```

```stdin
-7 3
```

```expected
2
```

```stdin
7 3
```

```expected
1
```

```stdin
-9 3
```

```expected hidden
0
```

```stdin
0 5
```

```expected hidden
0
```

```stdin
-1 12
```

```expected hidden
11
```

```stdin
2147483646 2147483647
```

```expected hidden
2147483646
```

```stdin
-2147483648 2147483647
```

```expected hidden
2147483646
```

```stdin
-2147483648 1
```

```expected hidden
0
```

```stdin
2000000000 2000000000
```

```expected hidden
0
```

```stdin
1999999999 2000000000
```

```expected hidden
1999999999
```

```stdin
-1999999999 2000000000
```

```expected hidden
1
```

```stdin
2147483647 1000000007
```

```expected hidden
147483633
```

```checks
must % :: Use the % operator.
```
:::
