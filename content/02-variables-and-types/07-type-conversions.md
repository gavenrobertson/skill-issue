---
title: Type Conversions
summary: How C++ converts between types automatically (promotions, usual arithmetic conversions, truncation), how to convert explicitly with static_cast, and the signed/unsigned traps.
---

Values constantly move between types: an `int` gets stored in a `double`, a `char` takes part in
arithmetic, a `double` is printed as a whole number. Some conversions happen **automatically**
(implicit), others you request **explicitly** (casts). Knowing the rules saves you from silent bugs.

## Implicit conversions

When a value of one type is used where another type is expected, the compiler converts it
automatically, if a conversion exists:

```cpp run
#include <iostream>

int main() {
    double d = 5;          // int -> double: 5.0, nothing lost
    int i = 7.9;           // double -> int: TRUNCATED to 7 (the fraction is dropped)
    int neg = -7.9;        // truncation goes toward zero: -7, not -8
    char c = 66;           // int -> char: 'B'
    bool b = 42;           // int -> bool: any nonzero value is true
    long long big = i;     // int -> long long: widening, always safe

    std::cout << d << ' ' << i << ' ' << neg << ' ' << c << ' ' << b << ' ' << big << '\n';
}
```

```output
5 7 -7 B 1 7
```

- **Widening** conversions (small type → bigger type of the same kind, `int` → `long long`, `float` →
  `double`, `int` → `double`) are safe.
- **Narrowing** conversions (`double` → `int`, `long long` → `int`, `int` → `char`) can **lose
  information**, and with `=` they happen **silently**. Brace initialization catches them (see **Initialization**).

> **Warning:** Converting a floating-point value that's **out of range** for the target integer type
> (like `1e20` to `int`) is undefined behavior. Converting an out-of-range integer to a smaller integer
> type wraps around modulo 2ⁿ (well-defined since C++20, but almost never what you want).

## Integral promotion

Before doing arithmetic, C++ **promotes** small integer types (`char`, `signed char`, `unsigned char`,
`short`, `unsigned short`, `bool`) to **`int`**. The CPU works on `int`-sized values anyway. One
consequence: arithmetic on `char`s gives an `int`:

```cpp run
#include <iostream>

int main() {
    char letter = 'a';
    std::cout << letter << '\n';          // a char prints as a character
    std::cout << letter + 1 << '\n';      // char + int -> int: prints the number 98
    std::cout << +letter << '\n';         // unary + promotes too: 97

    short s1 = 30000;
    short s2 = 30000;
    std::cout << s1 + s2 << '\n';         // computed as int, so no short overflow: 60000

    bool yes = true;
    std::cout << yes + yes << '\n';       // true promotes to 1: prints 2
}
```

```output
a
98
97
60000
2
```

## The usual arithmetic conversions

When a binary operator like `+`, `*` or `<` gets operands of **two different types**, C++ converts both
to a **common type** first. Simplified rules:

1. If either operand is a floating type, the other one is converted to the **largest floating type**
   involved (`long double` > `double` > `float`).
2. Otherwise, both are promoted (see above), and then the **"bigger" integer type wins**
   (`long long` > `long` > `int`).
3. If one is **signed** and the other **unsigned** of the same size, the signed one is converted to
   **unsigned**. This is the dangerous one.

| Expression | Common type | Result |
| --- | --- | --- |
| `7 / 2` | `int` | `3` (integer division) |
| `7 / 2.0` | `double` | `3.5` |
| `7.0f * 2.0` | `double` | `14` |
| `'a' + 1` | `int` | `98` |
| `3 + 4LL` | `long long` | `7` |
| `-1 + 0u` | `unsigned int` | `4294967295`! |

The type is decided **per operator**, step by step. That is why the order of mixed operations matters:

```cpp run
#include <iostream>

int main() {
    std::cout << 7 / 2 * 2.0 << '\n';    // (7 / 2) is int 3, then 3 * 2.0 = 6
    std::cout << 7 / 2.0 * 2 << '\n';    // (7 / 2.0) is 3.5, then 3.5 * 2 = 7
    std::cout << 1 / 3 + 1.0 / 3 << '\n';
}
```

```output
6
7
0.333333
```

## Explicit conversions: static_cast

When you **want** a conversion, write it explicitly with **`static_cast<NewType>(expression)`**. It
documents your intent, silences "did you mean this?" concerns, and is easy to search for.

```cpp run
#include <iostream>

int main() {
    int total = 7;
    int count = 2;

    double wrong = total / count;                          // int division happens FIRST: 3, then 3.0
    double right = static_cast<double>(total) / count;     // 7.0 / 2 = 3.5

    double price = 9.99;
    int dollars = static_cast<int>(price);                 // deliberate truncation: 9

    std::cout << wrong << ' ' << right << ' ' << dollars << '\n';
}
```

```output
3 3.5 9
```

> **Pitfall:** `static_cast<double>(total / count)` is still `3`: the integer division already
> happened inside the parentheses. Cast an **operand**, not the result.

`static_cast` converts toward zero for floating → integer. To round to the **nearest** integer, use
`std::round` from `<cmath>` (it rounds halves away from zero and returns a `double`), or `std::lround`
which returns a `long`:

```cpp run
#include <cmath>
#include <iostream>

int main() {
    double x = 2.7;
    double y = -2.5;
    std::cout << static_cast<int>(x) << ' ' << static_cast<int>(y) << '\n';   // truncate: 2 -2
    std::cout << std::round(x) << ' ' << std::round(y) << '\n';               // round:    3 -3
    std::cout << std::lround(2.5) << ' ' << std::floor(-2.5) << ' ' << std::ceil(2.1) << '\n';

    double amount = 0.29;
    std::cout << static_cast<int>(amount * 100) << ' '                        // 28!
              << static_cast<int>(std::round(amount * 100)) << '\n';           // 29
}
```

```output
2 -2
3 -3
3 -3 3
28 29
```

`0.29 * 100` is actually `28.999999999999996` (floating-point imprecision), so truncating gives 28.
When converting money-like values, round first.

## C-style casts and functional casts

You'll see two older spellings everywhere in existing code:

```cpp
double d = 3.7;
int a = (int)d;          // C-style cast
int b = int(d);          // functional cast (same meaning as the C-style cast)
int c = static_cast<int>(d);   // modern C++
```

```cpp run
#include <iostream>

int main() {
    double d = 3.7;
    std::cout << (int)d << ' ' << int(d) << ' ' << static_cast<int>(d) << '\n';
}
```

```output
3 3 3
```

All three give the same result here, so why prefer `static_cast`?

- A **C-style cast is a sledgehammer.** It tries `const_cast`, then `static_cast`, then
  `reinterpret_cast` (and combinations of them), silently doing the first that works, including
  dangerous ones like stripping `const` or reinterpreting a pointer's bits. `static_cast` only allows sensible conversions and refuses the rest.
- **Hard to find.** You can search a codebase for `static_cast`; you can't search for `(int)`.
- **Clear intent.** C++ has four named casts, each with a specific job:

| Cast | Purpose |
| --- | --- |
| `static_cast<T>(x)` | ordinary, sensible conversions (numbers, enums, up/down class hierarchies). **Your main tool.** |
| `const_cast<T>(x)` | add or remove `const` (rarely legitimate) |
| `reinterpret_cast<T>(x)` | reinterpret raw bits/pointers (low-level, dangerous) |
| `dynamic_cast<T>(x)` | safe downcast in class hierarchies, checked at run time |

`static_cast` refuses conversions that make no sense, where a C-style cast would just do them:

```cpp compile-error
int main() {
    const char* text = "42";
    int n = static_cast<int>(text);   // error: invalid 'static_cast' from 'const char*' to 'int'
}
```

(And no cast converts the *text* `"42"` into the *number* 42. Use `std::stoi` for that, later.)

## Signed/unsigned pitfalls

Because of rule 3 above, comparing a negative signed number with an unsigned number converts the
negative number into a huge unsigned value. With `-Wall`, GCC warns about it, and for good reason:

```cpp run warns
#include <iostream>

int main() {
    int balance = -1;
    unsigned int limit = 1;
    // warning: comparison of integer expressions of different signedness: 'int' and 'unsigned int'
    std::cout << std::boolalpha << (balance < limit) << '\n';   // false!?  -1 became 4294967295
}
```

```output
false
```

The same thing happens with `std::size_t` values such as `.size()` of strings and containers, which
are unsigned. Ways to avoid it:

- Use signed `int` for ordinary numbers, and don't mix signed and unsigned in one expression.
- Convert explicitly when you know the value is valid: `static_cast<int>(text.size())`.
- In C++20, use the safe comparison functions from `<utility>`, which compare the **mathematical
  values** correctly: `std::cmp_less`, `std::cmp_greater`, `std::cmp_equal`, `std::cmp_not_equal`,
  `std::cmp_less_equal`, `std::cmp_greater_equal`.

```cpp run
#include <iostream>
#include <utility>

int main() {
    int balance = -1;
    unsigned int limit = 1;
    std::cout << std::boolalpha << std::cmp_less(balance, limit) << '\n';   // true, correctly
}
```

```output
true
```

## bool conversions

- Number → `bool`: **zero is `false`, everything else is `true`** (including negatives and `0.5`).
- `bool` → number: `false` is `0`, `true` is `1`.

```cpp run
#include <iostream>

int main() {
    bool a = 0;
    bool b = -3;
    bool c = 0.5;
    int fromTrue = true;
    std::cout << std::boolalpha << a << ' ' << b << ' ' << c << ' ' << fromTrue << '\n';
}
```

```output
false true true 1
```

## char ↔ int: character codes

A `char` stores a number: the character's code (ASCII for the basic characters). Converting between
the two lets you do arithmetic on letters and digits:

```cpp run
#include <iostream>

int main() {
    char letter = 'A';
    std::cout << static_cast<int>(letter) << '\n';      // 65: its code
    std::cout << static_cast<char>(letter + 2) << '\n'; // 'A' + 2 is the int 67; cast back: 'C'

    char digit = '7';
    int value = digit - '0';                             // '7' (55) - '0' (48) = 7
    std::cout << value * 2 << '\n';

    int five = 5;
    char asChar = static_cast<char>('0' + five);         // 5 -> '5'
    std::cout << asChar << '\n';

    char lower = 'g';
    char upper = static_cast<char>(lower - 'a' + 'A');   // shift into the uppercase range
    std::cout << upper << '\n';
}
```

```output
65
C
14
5
G
```

Key ASCII codes: `'0'`-`'9'` are 48-57, `'A'`-`'Z'` are 65-90, `'a'`-`'z'` are 97-122, space is 32.
The digits and the letters are each **contiguous**, which is why `digit - '0'` and `letter - 'a'` work.

> **Pitfall:** `'7'` is not `7`. Adding the *character* `'7'` to a number adds 55.

:::quiz
What does this print?

```cpp
int a = 9, b = 2;
double r = a / b;
std::cout << r;
```

- [ ] `4.5`
- [x] `4`
- [ ] `5`
- [ ] `4.0`

`a / b` is `int / int`, so integer division happens first (giving 4), and only then is the result
converted to `double`. `std::cout` prints `4.0` as `4`. Write `static_cast<double>(a) / b` to get 4.5.
:::

:::quiz
Why is `static_cast<int>(x)` preferred over `(int)x`? (select all that apply)

- [x] It only allows sensible conversions; a C-style cast can silently do dangerous ones
- [x] It's easy to search for in a codebase
- [ ] It's faster at run time
- [x] It states the intent clearly

Both compile to the same machine code for a simple numeric conversion. The benefits are safety and readability.
:::

:::quiz
`int x = -1; unsigned y = 5;` What is `x < y`?

- [ ] `true`
- [x] `false`
- [ ] Compile error
- [ ] Undefined behavior

`x` is converted to `unsigned` (becoming 4294967295), which is not less than 5. GCC warns about this
comparison; `std::cmp_less(x, y)` gives the mathematically correct `true`.
:::

:::exercise True average {medium}
Read two integers and print their **exact** average. Use `static_cast<double>` on an operand so the
division happens in floating point.

Careful: `a` and `b` can be anywhere in the `int` range, so even the sum `a + b` can overflow if you
compute it in `int`.

**Input:** two integers `a b` (each between -2,147,483,648 and 2,147,483,647).
**Output:** the average with plain `std::cout <<`, newline. For `7 2` print `4.5`.

```cpp starter
#include <iostream>

int main() {
    int a{}, b{};
    std::cin >> a >> b;
    double average = (a + b) / 2;
    std::cout << average << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int a{}, b{};
    std::cin >> a >> b;
    double average = (static_cast<double>(a) + b) / 2;
    std::cout << average << '\n';
}
```

```hint
`(a + b) / 2` is integer division. Convert to `double` **before** dividing.
```

```hint
`static_cast<double>(a + b)` is too late for huge inputs: `a + b` is still added as `int` and can
overflow first. Convert an operand before adding: `(static_cast<double>(a) + b) / 2`.
```

```stdin
7 2
```

```expected
4.5
```

```stdin
-3 0
```

```expected hidden
-1.5
```

```stdin
10 20
```

```expected hidden
15
```

```stdin
2147483647 2147483647
```

```expected hidden
2.14748e+09
```

```stdin
-2147483648 -2147483647
```

```expected hidden
-2.14748e+09
```

```stdin
-2147483648 2147483647
```

```expected hidden
-0.5
```

```checks
must static_cast\s*<\s*double\s*> :: Use static_cast<double>.
mustnot \(\s*double\s*\) :: Don't use a C-style cast.
```
:::

:::exercise Letter codes {easy}
Read one character. Print its character code, a space, and **the next character** in the code table.
Use `static_cast` for both conversions.

**Input:** a single (non-whitespace) character `c`.
**Output:** `<code of c> <character after c>`, newline. For `A` print `65 B`.

```cpp starter
#include <iostream>

int main() {
    char c{};
    std::cin >> c;
    std::cout << c << ' ' << c + 1 << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    char c{};
    std::cin >> c;
    std::cout << static_cast<int>(c) << ' ' << static_cast<char>(c + 1) << '\n';
}
```

```hint
`std::cout << c` prints the character. `static_cast<int>(c)` prints the code.
```

```hint
`c + 1` is an `int` (integral promotion), so it prints as a number. Cast it back with `static_cast<char>(c + 1)`.
```

```stdin
A
```

```expected
65 B
```

```stdin
z
```

```expected hidden
122 {
```

```stdin
0
```

```expected hidden
48 1
```

```stdin
9
```

```expected hidden
57 :
```

```checks
must static_cast\s*<\s*int\s*> :: Convert to int with static_cast<int>.
must static_cast\s*<\s*char\s*> :: Convert back to char with static_cast<char>.
```
:::

:::exercise Dollars and cents {medium}
Read a price with at most two decimal places (like `12.75`) and split it into whole dollars and
cents. Use `static_cast<int>` to get the dollars, and **round** (with `std::round` from `<cmath>`)
when computing the cents, because floating-point values like `0.29 * 100` are slightly below 29.

**Input:** one non-negative number `price` with at most two decimals.
**Output:** `<dollars> dollars and <cents> cents`, newline. For `12.75` print `12 dollars and 75 cents`.

```cpp starter
#include <cmath>
#include <iostream>

int main() {
    double price{};
    std::cin >> price;
    int dollars = price;
    int cents = (price - dollars) * 100;
    std::cout << dollars << " dollars and " << cents << " cents\n";
}
```

```cpp solution
#include <cmath>
#include <iostream>

int main() {
    double price{};
    std::cin >> price;
    int dollars = static_cast<int>(price);
    int cents = static_cast<int>(std::round((price - dollars) * 100));
    std::cout << dollars << " dollars and " << cents << " cents\n";
}
```

```hint
Try the starter with `0.29`. It prints 28 cents: `(0.29 - 0) * 100` is `28.999999999999996`, and converting to `int` truncates.
```

```hint
`static_cast<int>(std::round(x))` rounds to the nearest whole number first, then converts.
```

```stdin
12.75
```

```expected
12 dollars and 75 cents
```

```stdin
0.29
```

```expected
0 dollars and 29 cents
```

```stdin
7
```

```expected hidden
7 dollars and 0 cents
```

```stdin
19.99
```

```expected hidden
19 dollars and 99 cents
```

```stdin
4.35
```

```expected hidden
4 dollars and 35 cents
```

```stdin
0.07
```

```expected hidden
0 dollars and 7 cents
```

```stdin
0
```

```expected hidden
0 dollars and 0 cents
```

```stdin
1000000.01
```

```expected hidden
1000000 dollars and 1 cents
```

```checks
must static_cast\s*<\s*int\s*> :: Use static_cast<int>.
must \bround\s*\( :: Round the cents with std::round.
```
:::

:::exercise Safe comparison {medium}
Read a signed integer `a` and an unsigned integer `b`, and print whether `a` is **mathematically**
less than `b`. A plain `a < b` gets this wrong for negative `a` (and GCC warns about it). Use C++20's
`std::cmp_less` from `<utility>`.

**Input:** an integer `a` (may be negative) and a non-negative integer `b`.
**Output:** `true` or `false` (use `std::boolalpha`), newline. For `-1 1` print `true`.

```cpp starter
#include <iostream>
#include <utility>

int main() {
    int a{};
    unsigned int b{};
    std::cin >> a >> b;
    std::cout << std::boolalpha << (a < b) << '\n';
}
```

```cpp solution
#include <iostream>
#include <utility>

int main() {
    int a{};
    unsigned int b{};
    std::cin >> a >> b;
    std::cout << std::boolalpha << std::cmp_less(a, b) << '\n';
}
```

```hint
`std::cmp_less(a, b)` returns a `bool` that is `true` exactly when `a` is less than `b` as numbers, whatever their signedness.
```

```stdin
-1 1
```

```expected
true
```

```stdin
5 3
```

```expected
false
```

```stdin
3 3
```

```expected hidden
false
```

```stdin
-2000000000 0
```

```expected hidden
true
```

```stdin
-1 4294967295
```

```expected hidden
true
```

```stdin
2147483647 2147483648
```

```expected hidden
true
```

```stdin
0 0
```

```expected hidden
false
```

```stdin
-2147483648 4294967295
```

```expected hidden
true
```

```checks
must cmp_less\s*\( :: Use std::cmp_less.
```
:::
