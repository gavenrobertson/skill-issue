---
title: Precedence and Evaluation Order
summary: How C++ groups an expression (precedence and associativity), when to add parentheses, why the order of evaluation is mostly unspecified, and a gallery of surprising expressions.
---

## Precedence: who binds tighter

In `2 + 3 * 4`, does the `+` or the `*` happen first? Like in math, `*` has **higher precedence**, so
the expression is grouped as `2 + (3 * 4)` = 14. **Precedence** decides how operators and operands are
grouped when there are no parentheses.

Here is the precedence of the operators you've met, from **highest** (binds tightest) to **lowest**.
Operators in the same row have the same precedence.

| Level | Operators | Description | Associativity |
| --- | --- | --- | --- |
| 1 | `::` | scope resolution | left to right |
| 2 | `x++` `x--` `f()` `a[i]` `.` `->` | postfix | left to right |
| 3 | `++x` `--x` `+x` `-x` `!` `~` `*p` `&x` `sizeof` `(type)` `new` `delete` | prefix / unary | **right to left** |
| 4 | `.*` `->*` | pointer to member | left to right |
| 5 | `*` `/` `%` | multiplicative | left to right |
| 6 | `+` `-` | additive | left to right |
| 7 | `<<` `>>` | shift (and stream insertion/extraction!) | left to right |
| 8 | `<=>` | three-way comparison | left to right |
| 9 | `<` `<=` `>` `>=` | relational | left to right |
| 10 | `==` `!=` | equality | left to right |
| 11 | `&` | bitwise AND | left to right |
| 12 | `^` | bitwise XOR | left to right |
| 13 | `\|` | bitwise OR | left to right |
| 14 | `&&` | logical AND | left to right |
| 15 | `\|\|` | logical OR | left to right |
| 16 | `?:` `=` `+=` `-=` `*=` (all assignments) `throw` | conditional, assignment | **right to left** |
| 17 | `,` | comma | left to right |

You don't need to memorize all of it. Remember the broad strokes: **unary > multiplicative > additive >
shift > comparison > bitwise > logical > ternary/assignment > comma**, and **when in doubt, add
parentheses**. Parentheses cost nothing and make intent obvious to the reader.

## Associativity: same precedence, which first?

When operators of the **same** precedence are next to each other, **associativity** decides the
grouping. Most binary operators are **left-to-right**:

```cpp run
#include <iostream>

int main() {
    std::cout << 10 - 4 - 3 << '\n';      // (10 - 4) - 3 = 3, not 10 - (4 - 3) = 9
    std::cout << 100 / 10 / 5 << '\n';    // (100 / 10) / 5 = 2
    std::cout << 2 * 3 % 4 << '\n';       // (2 * 3) % 4 = 2: * and % have equal precedence
    std::cout << 2 + 3 * 4 << ' ' << (2 + 3) * 4 << '\n';
}
```

```output
3
2
2
14 20
```

Assignment, the ternary operator and unary operators are **right-to-left**:

```cpp run
#include <iostream>

int main() {
    int a = 0, b = 0, c = 0;
    a = b = c = 5;              // a = (b = (c = 5))
    std::cout << a << b << c << '\n';

    int x = 3;
    std::cout << -~x << ' ' << !!x << '\n';   // -(~x) = -(-4) = 4;  !(!x) = !false = 1
}
```

```output
555
4 1
```

## Precedence is not order of evaluation

Precedence and associativity decide how an expression is **grouped** (what the operands of each
operator are). They do **not** decide in what **order** the operands are **computed**.

```cpp
int result = f() + g() * h();
```

Precedence says this means `f() + (g() * h())`. But the compiler may call `f`, `g` and `h` **in any
order**: `h` first, then `f`, then `g` is perfectly legal. If those functions print something or modify
shared variables, the output depends on the compiler. The order of evaluation of operands is
**unspecified** for most operators, including `+`, `*`, `==`, and the arguments of a function call:

```cpp
print(next(), next());   // which next() runs first? unspecified. GCC and Clang actually differ!
```

The exceptions, where the order **is** guaranteed (left operand fully evaluated before right):

| Operator | Guarantee |
| --- | --- |
| `a && b`, `a \|\| b` | `a` first; `b` only if needed (short-circuit) |
| `a ? b : c` | `a` first, then only one of `b` or `c` |
| `a , b` | `a` first, then `b` |
| `a << b`, `a >> b` | `a` before `b` (since C++17, which makes `std::cout << x << y` chains run left to right) |
| `a = b`, `a += b`, ... | `b` before `a` (since C++17) |
| `a[b]`, `a.b`, `a->b` | `a` before `b` (since C++17) |

When the order is unspecified **and** two parts touch the same variable, you can get **undefined
behavior** (like `i++ + i++` from the increment lesson). The safe habit: **if an expression modifies a
variable, don't use that variable anywhere else in the same expression.** Use separate statements.

## A gallery of surprising expressions

Each of these compiles. Predict the result, then check the explanation.

```cpp run
#include <iostream>

int main() {
    std::cout << -7 / 2 * 2 << '\n';    // (-7 / 2) * 2 = -3 * 2 = -6, not -7
    std::cout << -2 * -3 << '\n';       // unary minus binds tighter: (-2) * (-3) = 6
    std::cout << 1 << 2 << '\n';        // stream insertion twice: prints "1" then "2" = 12
    std::cout << (1 << 2) << '\n';      // a real shift: 4
    std::cout << 7 / 2 * 2.0 << '\n';   // int division first: 3 * 2.0 = 6
    std::cout << 5 - 3 - 2 << '\n';     // (5 - 3) - 2 = 0
}
```

```output
-6
6
12
4
6
0
```

Some surprises are bad enough that GCC warns about them:

```cpp run warns
#include <iostream>

int main() {
    int flags = 6;
    std::cout << (1 << 2 + 3) << '\n';          // + before <<:  1 << 5 = 32, not (1 << 2) + 3 = 7
    std::cout << (flags & 2 == 2) << '\n';      // == before &:  flags & (2 == 2) = 6 & 1 = 0
}
```

```output
32
0
```

More traps covered in earlier lessons:

| Expression | Looks like | Actually is |
| --- | --- | --- |
| `a < b < c` | b is between a and c | `(a < b) < c`: a bool compared with `c` |
| `!x == 5` | x is not 5 | `(!x) == 5`: always false |
| `x = y == z` | ? | `x = (y == z)`: x gets 0 or 1 |
| `a \|\| b && c` | left to right | `a \|\| (b && c)` |
| `std::cout << a & b` | print `a & b` | `(std::cout << a) & b`: compile error |
| `*p++` | increment what p points to | `*(p++)`: move the pointer (postfix binds tighter) |
| `x+++y` | ? | `(x++) + y` (maximal munch) |
| `TWO * 3` with `#define TWO 1 + 1` | 6 | `1 + 1 * 3` = 4 |

## Guidelines

- Use parentheses whenever the reader might hesitate, especially when mixing **bitwise** operators
  with anything else, `&&` with `||`, shifts with arithmetic, and `?:` inside `<<`.
- Don't rely on evaluation order between operands, except for `&&`, `||`, `?:`, `,` and the C++17
  guarantees above.
- Don't modify a variable and read it again in the same expression.
- Keep expressions short. Introduce a well-named variable instead of one giant line.
- Compile with `-Wall -Wextra` (as this site does): `-Wparentheses` and `-Wsequence-point` catch many
  of these mistakes.

:::quiz
What is the value of `2 + 6 / 3 * 2 - 1`?

- [ ] `0`
- [x] `5`
- [ ] `4`
- [ ] `3`

`/` and `*` first, left to right: `6 / 3` = 2, `2 * 2` = 4. Then `2 + 4 - 1` = 5.
:::

:::quiz
In `int r = f() + g();`, which function is called first?

- [ ] Always `f`, because it's on the left
- [ ] Always `g`, because `+` is evaluated right to left
- [x] Unspecified: the compiler may call either one first
- [ ] Both are called at the same time

Precedence and associativity only define grouping. The evaluation order of the operands of `+` is unspecified.
:::

:::quiz
What does `std::cout << 3 + 4 << 1;` print?

- [x] `71`
- [ ] `14`
- [ ] `8`
- [ ] It doesn't compile

`+` binds tighter than `<<`, so it's `(std::cout << (3 + 4)) << 1`: it prints `7`, then `1`.
:::

:::exercise Fix the average {easy}
This program should print the average of two integers (integer division is fine), but it prints the
wrong answer because of precedence. Fix it with parentheses.

**Input:** two integers `a b`.
**Output:** `(a + b) / 2` with integer division, newline. For `4 6` print `5`.

```cpp starter
#include <iostream>

int main() {
    int a{}, b{};
    std::cin >> a >> b;
    std::cout << a + b / 2 << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int a{}, b{};
    std::cin >> a >> b;
    std::cout << (a + b) / 2 << '\n';
}
```

```hint
`/` binds tighter than `+`, so `a + b / 2` is `a + (b / 2)`.
```

```stdin
4 6
```

```expected
5
```

```stdin
-4 -6
```

```expected hidden
-5
```

```stdin
1 2
```

```expected hidden
1
```

```stdin
3 5
```

```expected hidden
4
```

```checks
must \(\s*a\s*\+\s*b\s*\) :: Group a + b with parentheses.
```
:::

:::exercise Shift then add {easy}
Read an integer `n` (0 ≤ n ≤ 1000) and print `n` shifted left by 2 bits, plus 1. The starter tries
`std::cout << n << 2 + 1`, which is parsed as two **stream insertions**. Use parentheses so `<<` means
a shift.

**Input:** one integer `n`.
**Output:** `(n << 2) + 1`, newline. For `3` print `13`.

```cpp starter
#include <iostream>

int main() {
    int n{};
    std::cin >> n;
    std::cout << n << 2 + 1 << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int n{};
    std::cin >> n;
    std::cout << (n << 2) + 1 << '\n';
}
```

```hint
Run the starter with `3`: it prints `33`, because it inserts `3` and then `2 + 1` into the stream.
```

```hint
`(n << 2)` in parentheses is a shift. Then add 1.
```

```stdin
3
```

```expected
13
```

```stdin
0
```

```expected hidden
1
```

```stdin
1000
```

```expected hidden
4001
```

```stdin
1
```

```expected hidden
5
```

```checks
must \(\s*n\s*<<\s*2\s*\) :: Write the shift as (n << 2).
```
:::

:::exercise Low nibble check {medium}
Read a non-negative integer `x` and print whether its lowest 4 bits are exactly `1010` (that is,
`x & 15` equals `10`). The starter writes `x & 15 == 10`, which GCC warns about and which computes the
wrong thing. Fix the grouping.

**Input:** one integer `x` (0 ≤ x ≤ 1,000,000).
**Output:** `true` or `false` (use `std::boolalpha`), newline. For `26` (binary `11010`) print `true`.

```cpp starter
#include <iostream>

int main() {
    int x{};
    std::cin >> x;
    std::cout << std::boolalpha << (x & 15 == 10) << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int x{};
    std::cin >> x;
    std::cout << std::boolalpha << ((x & 15) == 10) << '\n';
}
```

```hint
`==` binds tighter than `&`, so the starter computes `x & (15 == 10)`, which is `x & 0`, an `int`, not a `bool`.
```

```hint
Parenthesize the bitwise part: `(x & 15) == 10`.
```

```stdin
26
```

```expected
true
```

```stdin
5
```

```expected
false
```

```stdin
10
```

```expected hidden
true
```

```stdin
0
```

```expected hidden
false
```

```stdin
1050
```

```expected hidden
true
```

```stdin
11
```

```expected hidden
false
```

```stdin
15
```

```expected hidden
false
```

```checks
must \(\s*x\s*&\s*\w+\s*\)\s*== :: Parenthesize (x & 15) before comparing.
```
:::

:::exercise FAT dates {hard}
The FAT file system (still used on USB sticks and SD cards) stores a file's date in one 16-bit number:

```
bit:   15 14 13 12 11 10  9 | 8  7  6  5 | 4  3  2  1  0
        year - 1980 (0-127) |   month    |      day
```

Write a decoder and an encoder. Decode the fields exactly as stored, without checking whether the
date is valid. Think about precedence for every shift, mask and `|`: which parentheses are needed,
and which aren't?

**Input:** two lines. The first holds a packed date `p` (0 ≤ p ≤ 65535) to decode. The second holds a
date `y m d` (1980 ≤ y ≤ 2107, 1 ≤ m ≤ 12, 1 ≤ d ≤ 31) to encode.
**Output:** two lines: the decoded `year month day` separated by spaces, then the packed value of
`y m d` in decimal. For

```
22127
2023 3 15
```

print

```
2023 3 15
22127
```

```cpp starter
#include <iostream>

int main() {
    unsigned int p{};
    std::cin >> p;
    unsigned int y{}, m{}, d{};
    std::cin >> y >> m >> d;
    // decode p, then encode y m d
}
```

```cpp solution
#include <iostream>

int main() {
    unsigned int p{};
    std::cin >> p;
    unsigned int year = (p >> 9 & 0x7F) + 1980;   // >> binds tighter than &, + tighter than >>
    unsigned int month = p >> 5 & 0xF;
    unsigned int day = p & 0x1F;

    unsigned int y{}, m{}, d{};
    std::cin >> y >> m >> d;
    unsigned int packed = (y - 1980) << 9 | m << 5 | d;   // - before <<, << before |

    std::cout << year << ' ' << month << ' ' << day << '\n';
    std::cout << packed << '\n';
}
```

```hint
To read a field: shift it down to bit 0, then mask off everything above it. Month is 4 bits wide, so its
mask is `0xF` (binary `1111`); day is 5 bits, mask `0x1F`.
```

```hint
`p >> 9 + 1980` shifts by 1989 (`+` binds tighter than `>>`), and `p & 0x1E0 >> 5` shifts the
**mask** (`>>` binds tighter than `&`). When in doubt, add parentheses.
```

```stdin
22127
2023 3 15
```

```expected
2023 3 15
22127
```

```stdin
0
1980 1 1
```

```expected
1980 0 0
33
```

```stdin
65535
2107 12 31
```

```expected hidden
2107 15 31
65439
```

```stdin
20000
2000 2 29
```

```expected hidden
2019 1 0
10333
```

```stdin
512
1981 1 31
```

```expected hidden
1981 0 0
575
```

```stdin
31
2024 10 1
```

```expected hidden
1980 0 31
22849
```

```checks
must >> :: Use >> to decode.
must << :: Use << to encode.
must & :: Use & to mask the fields.
must \| :: Combine the fields with |.
```
:::
