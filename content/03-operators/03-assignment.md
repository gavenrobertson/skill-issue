---
title: Assignment Operators
summary: Plain assignment, all the compound assignments (+=, -=, *=, /=, %=, &=, |=, ^=, <<=, >>=), assignment as an expression, and chained assignment.
---

## Simple assignment

`variable = expression;` evaluates the right-hand side and **stores** the result in the variable on the
left, replacing the old value. The left side must be something that can be stored into: a modifiable
variable (an **lvalue**, historically "the thing on the **l**eft of `=`").

```cpp run
#include <iostream>

int main() {
    int score = 0;       // initialization (not assignment)
    score = 10;          // assignment
    score = score * 2;   // read the old value (10), compute 20, store it
    std::cout << score << '\n';
}
```

```output
20
```

You can't assign to things that aren't variables, or to `const` variables:

```cpp compile-error
int main() {
    int x = 0;
    5 = x;           // error: lvalue required as left operand of assignment
}
```

```cpp compile-error
int main() {
    int a = 1, b = 2;
    a + b = 10;      // error: a + b is a temporary value, not a variable
}
```

Assignment converts the right side to the type of the left side, silently and possibly lossily:

```cpp run
#include <iostream>

int main() {
    int whole = 0;
    whole = 9.99;               // truncated to 9, no warning with -Wall -Wextra
    std::cout << whole << '\n';
}
```

```output
9
```

Assigning a braced value checks for narrowing, just like brace initialization: `whole = {9.99};`
doesn't compile.

## Compound assignment

"Update a variable using its own value" is so common that every binary arithmetic and bitwise operator
has a **compound assignment** form. `x op= y` means `x = x op (y)`:

| Operator | Meaning | Operator | Meaning |
| --- | --- | --- | --- |
| `x += y` | `x = x + y` | `x &= y` | `x = x & y` |
| `x -= y` | `x = x - y` | `x \|= y` | `x = x \| y` |
| `x *= y` | `x = x * y` | `x ^= y` | `x = x ^ y` |
| `x /= y` | `x = x / y` | `x <<= y` | `x = x << y` |
| `x %= y` | `x = x % y` | `x >>= y` | `x = x >> y` |

```cpp run
#include <iostream>

int main() {
    int x = 10;
    x += 5;   std::cout << x << ' ';   // 15
    x -= 3;   std::cout << x << ' ';   // 12
    x *= 2;   std::cout << x << ' ';   // 24
    x /= 5;   std::cout << x << ' ';   // 4 (integer division)
    x %= 3;   std::cout << x << '\n';  // 1

    double balance = 100.0;
    balance *= 1.05;                   // add 5% interest
    balance -= 20;
    std::cout << balance << '\n';
}
```

```output
15 12 24 4 1
85
```

The bitwise ones (`&=`, `|=`, `^=`, `<<=`, `>>=`) work on the individual bits of integers. They're
explained in the **Bitwise Operators** lesson, but here's a preview:

```cpp run
#include <iostream>

int main() {
    unsigned int flags = 0b0100;
    flags |= 0b0001;         // turn on bit 0:  0b0101 = 5
    std::cout << flags << ' ';
    flags &= 0b0110;         // keep only bits 1 and 2:  0b0100 = 4
    std::cout << flags << ' ';
    flags ^= 0b1100;         // flip bits 2 and 3:  0b1000 = 8
    std::cout << flags << ' ';
    flags <<= 2;             // shift left by 2 (multiply by 4): 32
    std::cout << flags << ' ';
    flags >>= 3;             // shift right by 3 (divide by 8): 4
    std::cout << flags << '\n';
}
```

```output
5 4 8 32 4
```

Two details:

- The right-hand side is evaluated **as a whole first**: `x *= 2 + 1` means `x = x * (2 + 1)`, not
  `x = x * 2 + 1`.
- The left side is evaluated **only once**. That matters for complicated left sides like
  `values[nextIndex()] += 1`.

```cpp run
#include <iostream>

int main() {
    int x = 3;
    x *= 2 + 1;           // x = 3 * (2 + 1) = 9
    std::cout << x << '\n';

    int n = 10;
    n += 2.7;             // n = n + 2.7 = 12.7, converted back to int: 12
    std::cout << n << '\n';
}
```

```output
9
12
```

> **Pitfall:** `x =+ 5;` is not a typo the compiler catches. It's `x = (+5)`: an assignment of
> positive five. The operator is `+=`, with the `=` **second**.

```cpp run
#include <iostream>

int main() {
    int total = 10;
    total =+ 5;       // oops: assigns +5
    std::cout << total << '\n';
}
```

```output
5
```

There is no `&&=` or `||=` operator, and no `**=` (C++ has no power operator).

## Assignment is an expression

In C++, an assignment isn't just a statement: it's an **expression** whose value is the **variable
itself** after the assignment. So you can use an assignment inside a larger expression:

```cpp run
#include <iostream>

int main() {
    int x = 0;
    int y = (x = 5) + 1;      // x becomes 5, the assignment's value is 5, y is 6
    std::cout << x << ' ' << y << '\n';

    int count = 0;
    std::cout << (count += 3) << '\n';   // compound assignments are expressions too: prints 3
}
```

```output
5 6
3
```

This enables common idioms like reading in a loop condition, `while ((ch = next()) != 0)`, which you'll
see later. But it also enables the most famous C++ typo, `if (x = 5)` instead of `if (x == 5)`, covered
in the next lesson. Use assignment-as-expression sparingly.

## Chained assignment

Assignment is **right-associative**: `a = b = c = 0` is grouped as `a = (b = (c = 0))`. `c` gets 0, that
assignment's value (0) goes into `b`, and so on. It's the idiomatic way to set several variables to the
same value:

```cpp run
#include <iostream>

int main() {
    int a, b, c;
    a = b = c = 7;
    std::cout << a << b << c << '\n';

    int x = 1, y = 2;
    x += y += 10;        // y += 10 first (y is 12), then x += 12
    std::cout << x << ' ' << y << '\n';
}
```

```output
777
13 12
```

> **Note:** Chaining only works with **assignment**, not in declarations. `int a = b = 0;` doesn't
> declare `b`; it tries to assign to an existing `b`. Write `int a = 0, b = 0;` instead.

```cpp compile-error
int main() {
    int a = b = 0;    // error: 'b' was not declared in this scope
}
```

:::quiz
What is `x` after this code?

```cpp
int x = 4;
x *= 3 + 2;
```

- [ ] `14`
- [x] `20`
- [ ] `12`
- [ ] `9`

The right side `3 + 2` is evaluated first, so this is `x = 4 * 5`.
:::

:::quiz
What does `total =+ 3;` do?

- [ ] Adds 3 to `total`
- [x] Sets `total` to 3
- [ ] Compile error
- [ ] Adds `total` to 3 and discards the result

It's parsed as `total = +3;`, an ordinary assignment of positive three. The compound operator is `+=`.
:::

:::exercise Running total
Read four integers and add them up into a variable `total` (starting at 0) using the **`+=`** operator
once per number. Print the total.

**Input:** four integers.
**Output:** the sum, newline. For `1 2 3 4` print `10`.

```cpp starter
#include <iostream>

int main() {
    int total = 0;
    int n{};
    std::cin >> n;
    // add n to total, then read and add the next three
    std::cout << total << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int total = 0;
    int n{};
    std::cin >> n;
    total += n;
    std::cin >> n;
    total += n;
    std::cin >> n;
    total += n;
    std::cin >> n;
    total += n;
    std::cout << total << '\n';
}
```

```hint
You can reuse the same variable `n`: read into it, add it to `total`, read the next number into it, and so on.
```

```stdin
1 2 3 4
```

```expected
10
```

```stdin
-5 5 -10 10
```

```expected hidden
0
```

```stdin
100 -1 0 7
```

```expected hidden
106
```

```checks
must \+= :: Accumulate with +=.
mustnot total\s*=\s*total :: Use += instead of total = total + ...
```
:::

:::exercise Compound chain
Read an integer `x` and apply these five updates in order, printing `x` after each one:

1. `x += 5`
2. `x *= 3`
3. `x -= 2`
4. `x /= 4`
5. `x %= 7`

**Input:** one integer `x`.
**Output:** the five intermediate values on one line, separated by single spaces, newline.
For `3` print `8 24 22 5 5`.

```cpp starter
#include <iostream>

int main() {
    int x{};
    std::cin >> x;
    x += 5;
    std::cout << x << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int x{};
    std::cin >> x;
    x += 5;
    std::cout << x << ' ';
    x *= 3;
    std::cout << x << ' ';
    x -= 2;
    std::cout << x << ' ';
    x /= 4;
    std::cout << x << ' ';
    x %= 7;
    std::cout << x << '\n';
}
```

```hint
Integer division truncates toward zero, and `%` keeps the sign of the left operand, so negative inputs give negative results.
```

```stdin
3
```

```expected
8 24 22 5 5
```

```stdin
-10
```

```expected hidden
-5 -15 -17 -4 -4
```

```stdin
100
```

```expected hidden
105 315 313 78 1
```

```checks
must \+= :: Use +=
must \*= :: Use *=
must -= :: Use -=
must /= :: Use /=
must %= :: Use %=
```
:::

:::exercise Swap without a temporary
Read two integers `a` and `b` and swap them **without a third variable**, using only `+=` and `-=`:
`a += b; b = a - b; a -= b;`. Work out on paper why this works!

**Input:** two integers `a b` (each between -1,000,000 and 1,000,000).
**Output:** the swapped `a` and `b`, separated by a space, newline. For `3 8` print `8 3`.

```cpp starter
#include <iostream>

int main() {
    int a{}, b{};
    std::cin >> a >> b;
    // swap a and b with += and -=
    std::cout << a << ' ' << b << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int a{}, b{};
    std::cin >> a >> b;
    a += b;      // a holds the sum
    b = a - b;   // sum - old b = old a
    a -= b;      // sum - old a = old b
    std::cout << a << ' ' << b << '\n';
}
```

```hint
After `a += b`, `a` holds `a + b`. Subtracting the old `b` from that sum gives the old `a`.
```

```stdin
3 8
```

```expected
8 3
```

```stdin
-5 5
```

```expected hidden
5 -5
```

```stdin
0 0
```

```expected hidden
0 0
```

```checks
must \+= :: Use +=
must -= :: Use -=
mustnot std::swap|\bswap\s*\( :: Don't use std::swap.
mustnot >>\s*b\s*>>\s*a :: Don't just read the numbers in the other order.
mustnot int\s+(temp|tmp|t)\b :: No temporary variable!
```
:::
