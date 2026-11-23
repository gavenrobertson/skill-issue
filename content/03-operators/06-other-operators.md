---
title: Ternary, Comma, sizeof and <=>
summary: The conditional operator ?:, the comma operator, sizeof in detail, and C++20's three-way comparison operator <=> (the spaceship).
---

## The conditional (ternary) operator ?:

`condition ? valueIfTrue : valueIfFalse` is an **expression** that picks one of two values. It's the
only operator with three operands, hence the nickname "ternary operator".

```cpp run
#include <iostream>

int main() {
    int a = 7;
    int b = 12;

    int larger = a > b ? a : b;
    std::cout << larger << '\n';

    int n = 1;
    std::cout << n << (n == 1 ? " item" : " items") << '\n';

    int temperature = 30;
    std::cout << (temperature > 25 ? "hot" : "comfortable") << '\n';
}
```

```output
12
1 item
hot
```

Key facts:

- **Only one** of the two branches is evaluated. `x != 0 ? 100 / x : 0` is safe.
- It's an **expression**, so it can go where `if` can't: in an initializer, inside `std::cout <<`, as
  a function argument. Use it for short choices between two **values**; use `if` for choosing between
  **actions**.
- Both branches must have **compatible types**, and the result has their **common type**:
  `true ? 1 : 2.5` is a `double` (`1.0`).

```cpp compile-error
#include <string>

int main() {
    bool ok = true;
    auto result = ok ? 42 : std::string("no");   // error: operands to '?:' have different types
}
```

### Parenthesize it inside std::cout

`?:` has very low precedence, lower than `<<`. Without parentheses, `std::cout << x > 0 ? ...` is
parsed as `((std::cout << x) > 0) ? ...`, which doesn't compile:

```cpp compile-error
#include <iostream>

int main() {
    int x = 1;
    std::cout << x > 0 ? "positive" : "negative";   // error: no match for 'operator>'
}
```

Write `std::cout << (x > 0 ? "positive" : "negative");`.

### Nesting

Ternaries can be chained to choose among several values. The operator is right-associative, so
`a ? x : b ? y : z` means `a ? x : (b ? y : z)`, which reads like an if/else-if chain:

```cpp run
#include <iostream>

int main() {
    int score = 73;
    char grade = score >= 90 ? 'A'
               : score >= 80 ? 'B'
               : score >= 70 ? 'C'
               : 'F';
    std::cout << grade << '\n';
}
```

```output
C
```

Format nested ternaries one condition per line like this, or they become unreadable. More than two or
three levels? Use `if`.

### The result can be a variable

When both branches are variables (lvalues) of the same type, the result **is** one of the variables,
so you can even assign to it. Rarely needed, but good to know it isn't a copy:

```cpp run
#include <iostream>

int main() {
    int low = 3;
    int high = 9;
    (low < high ? low : high) = 0;     // sets whichever is smaller to 0
    std::cout << low << ' ' << high << '\n';
}
```

```output
0 9
```

## The comma operator

`a, b` evaluates `a`, **throws away its value**, then evaluates `b`, and the whole expression's value
is `b`. The left side is fully finished (including side effects) before the right side starts.

```cpp run
#include <iostream>

int main() {
    int a = 1;
    int b = 2;
    int r = (a++, b++, a + b);    // a becomes 2, b becomes 3, then r = 2 + 3
    std::cout << r << ' ' << a << ' ' << b << '\n';
}
```

```output
5 2 3
```

The comma operator has the **lowest precedence** of all, hence the parentheses above. Its main
legitimate use is doing two updates in a `for` loop header: `for (int i = 0, j = 10; i < j; ++i, --j)`.

> **Note:** Most commas in C++ are **not** the comma operator. In `int a = 1, b = 2;`, in a function
> call `f(x, y)`, and in `{1, 2, 3}`, the comma is just a **separator**.

> **Pitfall:** `int x = (1, 2);` gives `x` the value 2, and GCC warns `left operand of comma operator
> has no effect`. And `double d = 3,14;` (a comma as decimal separator, as in many languages) doesn't
> compile: after the comma, the compiler expects the name of another variable. Write `3.14`.

## sizeof, in detail

`sizeof` gives the size in **bytes** of a type or of an expression's type, as a `std::size_t`
(an unsigned type). It's computed **at compile time**.

```cpp run
#include <iostream>

int main() {
    int x = 5;
    int numbers[10] = {};

    std::cout << sizeof(int) << '\n';           // type: parentheses required
    std::cout << sizeof x << '\n';              // expression: parentheses optional
    std::cout << sizeof(x + 1.0) << '\n';       // type of the expression is double: 8
    std::cout << sizeof numbers << '\n';        // whole array: 10 * 4 = 40
    std::cout << sizeof numbers / sizeof numbers[0] << '\n';   // element count: 10

    auto bytes = sizeof(x++);    // the operand is NOT evaluated...
    std::cout << bytes << ' ' << x << '\n';     // ...so x is still 5
}
```

```output
4
4
8
40
10
4 5
```

- `sizeof` never evaluates its operand. It only needs the **type**, so `sizeof(x++)` doesn't increment `x`.
- `sizeof(char)` is always 1.
- The array trick `sizeof arr / sizeof arr[0]` only works on real arrays, not on pointers. In
  modern C++ prefer `std::size(arr)` from `<iterator>`, which refuses to compile with a pointer.

```cpp compile-error
int main() {
    auto s = sizeof int;   // error: a type needs parentheses: sizeof(int)
}
```

## The three-way comparison operator <=> (C++20)

`a <=> b` (nicknamed the **spaceship operator**) compares two values **once** and tells you whether `a`
is less than, equal to, or greater than `b`. Include `<compare>` to use its result types.

The result isn't a number or a `bool`; it's an **ordering** object. You compare it with the literal `0`:

| Expression | Meaning |
| --- | --- |
| `(a <=> b) < 0` | `a` is less than `b` |
| `(a <=> b) == 0` | `a` equals `b` |
| `(a <=> b) > 0` | `a` is greater than `b` |

```cpp run
#include <compare>
#include <iostream>

int main() {
    int a = 3;
    int b = 5;
    auto result = a <=> b;          // std::strong_ordering

    std::cout << std::boolalpha;
    std::cout << (result < 0) << ' ' << (result == 0) << ' ' << (result > 0) << '\n';
    std::cout << (result == std::strong_ordering::less) << '\n';
    std::cout << std::is_lt(result) << ' ' << std::is_eq(result) << ' ' << std::is_gt(result) << '\n';
}
```

```output
true false false
true
true false false
```

The named helpers `std::is_lt`, `std::is_lteq`, `std::is_eq`, `std::is_neq`, `std::is_gt` and
`std::is_gteq` do the same as comparing with `0`.

The result type depends on the operands:

| Type | When | Values |
| --- | --- | --- |
| `std::strong_ordering` | integers, `char`, pointers | `less`, `equal`, `greater` |
| `std::partial_ordering` | floating point (because NaN is unordered) | `less`, `equivalent`, `greater`, `unordered` |
| `std::weak_ordering` | custom types where "equivalent" isn't "identical" (e.g. case-insensitive strings) | `less`, `equivalent`, `greater` |

```cpp run
#include <cmath>
#include <compare>
#include <iostream>

int main() {
    auto r1 = 2.5 <=> 1.0;                  // std::partial_ordering
    auto r2 = 1.0 <=> std::nan("");         // NaN is neither less, equal, nor greater
    std::cout << std::boolalpha << (r1 > 0) << ' ' << (r2 == std::partial_ordering::unordered) << '\n';
}
```

```output
true true
```

You can't print an ordering directly; compare it with `0` first:

```cpp compile-error
#include <compare>
#include <iostream>

int main() {
    std::cout << (1 <=> 2);   // error: no match for 'operator<<'
}
```

Where `<=>` really shines is in your **own types**: writing one line,
`auto operator<=>(const Point&) const = default;`, gives a class all six comparison operators
(`<`, `<=`, `>`, `>=`, and with it `==` and `!=`). You'll see that in the classes module.

:::quiz
What does this print?

```cpp
int x = -4;
std::cout << (x >= 0 ? x : -x);
```

- [x] `4`
- [ ] `-4`
- [ ] `0`
- [ ] `1`

`x >= 0` is false, so the third operand `-x` (which is 4) is chosen. That's an absolute value.
:::

:::quiz
After `int a = 1; int b = (a += 5, a * 2);` what is `b`?

- [ ] `2`
- [ ] `5`
- [x] `12`
- [ ] `7`

The comma operator evaluates `a += 5` first (a becomes 6), discards that, then evaluates `a * 2` = 12.
:::

:::quiz
`int x = 3, y = 7;` Which expressions are `true`? (select all that apply)

- [x] `(x <=> y) < 0`
- [ ] `(x <=> y) > 0`
- [x] `(y <=> x) > 0`
- [x] `(x <=> x) == 0`

`x <=> y` is "less" because 3 < 7, `y <=> x` is "greater", and a value compared with itself is "equal".
:::

:::exercise Max with a ternary {easy}
Read two integers and print the larger one, using the conditional operator `?:` (no `if`, no `std::max`).

**Input:** two integers `a b`.
**Output:** the larger value, newline. For `3 9` print `9`.

```cpp starter
#include <iostream>

int main() {
    int a{}, b{};
    std::cin >> a >> b;
    std::cout << a << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int a{}, b{};
    std::cin >> a >> b;
    std::cout << (a > b ? a : b) << '\n';
}
```

```hint
`a > b ? a : b` evaluates to `a` when `a > b`, otherwise to `b`. Wrap it in parentheses inside `std::cout <<`.
```

```stdin
3 9
```

```expected
9
```

```stdin
-2 -8
```

```expected hidden
-2
```

```stdin
5 5
```

```expected hidden
5
```

```stdin
-2147483648 2147483647
```

```expected hidden
2147483647
```

```checks
must \? :: Use the conditional operator ?:
mustnot \bif\b :: Don't use if.
mustnot \bmax\b :: Don't use std::max.
```
:::

:::exercise Plural {easy}
Read a number of apples `n` and print `<n> apple` if `n` is exactly 1, otherwise `<n> apples`.
Use `?:` to choose the ending.

**Input:** one integer `n` (n ≥ 0).
**Output:** `<n> apple` or `<n> apples`, newline. For `1` print `1 apple`; for `0` print `0 apples`.

```cpp starter
#include <iostream>

int main() {
    int n{};
    std::cin >> n;
    std::cout << n << " apples\n";
}
```

```cpp solution
#include <iostream>

int main() {
    int n{};
    std::cin >> n;
    std::cout << n << (n == 1 ? " apple" : " apples") << '\n';
}
```

```hint
Both branches can be string literals: `(n == 1 ? " apple" : " apples")`.
```

```stdin
1
```

```expected
1 apple
```

```stdin
0
```

```expected
0 apples
```

```stdin
12
```

```expected hidden
12 apples
```

```stdin
2
```

```expected hidden
2 apples
```

```checks
must \? :: Use the conditional operator ?:
mustnot \bif\b :: Don't use if.
```
:::

:::exercise Sign word {medium}
Read an integer and print `positive`, `negative` or `zero`, using a **nested** conditional expression
(two `?:` operators, no `if`).

**Input:** one integer `x`.
**Output:** `positive`, `negative` or `zero`, newline.

```cpp starter
#include <iostream>

int main() {
    int x{};
    std::cin >> x;
    std::cout << (x > 0 ? "positive" : "negative") << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int x{};
    std::cin >> x;
    std::cout << (x > 0 ? "positive" : x < 0 ? "negative" : "zero") << '\n';
}
```

```hint
Put a second `?:` in the "false" branch of the first one: `x > 0 ? "positive" : (x < 0 ? "negative" : "zero")`.
```

```stdin
42
```

```expected
positive
```

```stdin
0
```

```expected
zero
```

```stdin
-7
```

```expected hidden
negative
```

```stdin
-1
```

```expected hidden
negative
```

```stdin
1
```

```expected hidden
positive
```

```stdin
-2147483648
```

```expected hidden
negative
```

```checks
must \?[\s\S]*\? :: Use two nested ?: operators.
mustnot \bif\b :: Don't use if.
```
:::

:::exercise Spaceship verdict {hard}
Software versions like `1.10` and `1.2` are compared **field by field**: first the major numbers, and
only if those are equal, the minor numbers. So `1.10` is *greater* than `1.2` (10 > 2), even though
`1.10 < 1.2` as decimal numbers.

Read two versions and print how the first relates to the second. Use the three-way comparison
operator `<=>`: compare the majors, and when that comparison says "equal", use the comparison of the
minors instead. Store the final ordering in a variable and turn it into a word.

**Input:** four integers `major1 minor1 major2 minor2` (each between 0 and 2,147,483,647).
**Output:** `less`, `equal` or `greater`, newline. For `1 2 1 10` (version 1.2 vs. 1.10) print `less`.

```cpp starter
#include <compare>
#include <iostream>

int main() {
    int major1{}, minor1{}, major2{}, minor2{};
    std::cin >> major1 >> minor1 >> major2 >> minor2;
    // auto order = ...;
    std::cout << "equal\n";
}
```

```cpp solution
#include <compare>
#include <iostream>

int main() {
    int major1{}, minor1{}, major2{}, minor2{};
    std::cin >> major1 >> minor1 >> major2 >> minor2;
    auto byMajor = major1 <=> major2;
    auto order = byMajor != 0 ? byMajor : minor1 <=> minor2;
    std::cout << (order < 0 ? "less" : order > 0 ? "greater" : "equal") << '\n';
}
```

```hint
An ordering can be compared with `0`: `byMajor != 0` means "the majors already decide it".
```

```hint
Both branches of `?:` can be orderings: `auto order = byMajor != 0 ? byMajor : minor1 <=> minor2;`.
Then a nested conditional turns `order` into a word.
```

```stdin
1 2 1 10
```

```expected
less
```

```stdin
2 0 1 99
```

```expected
greater
```

```stdin
3 4 3 4
```

```expected hidden
equal
```

```stdin
1 10 1 2
```

```expected hidden
greater
```

```stdin
1 0 0 5
```

```expected hidden
greater
```

```stdin
1 1000 2 0
```

```expected hidden
less
```

```stdin
2147483647 5 2147483646 2147483647
```

```expected hidden
greater
```

```stdin
0 0 0 1
```

```expected hidden
less
```

```checks
must <=> :: Use the <=> operator.
must \? :: Combine the orderings with ?:.
mustnot \bif\b :: Use ?: instead of if.
```
:::
