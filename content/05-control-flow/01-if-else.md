---
title: if and else
summary: Making decisions with if, else, and else-if chains, nesting, braces vs single statements, combining conditions with && and ||, and the classic mistakes (=, stray semicolons, dangling else).
---

Until now, every statement in your programs ran, top to bottom. **Control flow** statements let the
program decide *which* statements run and *how many times*. The most basic one is `if`.

## `if`

```cpp
if (condition) {
    // runs only when condition is true
}
```

The **condition** goes in parentheses (they're required) and must be something that can be turned
into a `bool`. If it's `true`, the block runs. If it's `false`, the block is skipped and the program
continues after the closing `}`.

```cpp run
#include <iostream>

int main() {
    int temperature = 31;

    if (temperature > 30) {
        std::cout << "It's hot.\n";
        std::cout << "Drink water.\n";
    }
    std::cout << "This line always runs.\n";
}
```

```output
It's hot.
Drink water.
This line always runs.
```

Change `31` to `20` and run it again: only the last line prints.

Conditions are usually comparisons (`==`, `!=`, `<`, `<=`, `>`, `>=`), but anything convertible to `bool`
works. Numbers convert as **zero is false, everything else is true**, and a `bool` variable can be
used directly:

```cpp run
#include <iostream>

int main() {
    bool logged_in = true;
    int unread = 3;

    if (logged_in) {                 // not: if (logged_in == true)
        std::cout << "Welcome back!\n";
    }
    if (unread) {                    // same as: if (unread != 0)
        std::cout << "You have " << unread << " unread messages.\n";
    }
    if (!logged_in) {                // "if not logged in"
        std::cout << "Please log in.\n";
    }
}
```

```output
Welcome back!
You have 3 unread messages.
```

## `else`

`else` gives the alternative: exactly one of the two blocks runs.

```cpp run
#include <iostream>

int main() {
    int n = 7;
    if (n % 2 == 0) {
        std::cout << n << " is even\n";
    } else {
        std::cout << n << " is odd\n";
    }
}
```

```output
7 is odd
```

## `else if` chains

To choose between more than two options, chain them. The conditions are tested **top to bottom**, and
**only the first one that's true** runs. The final `else` (optional) catches everything else.

```cpp run
#include <iostream>

int main() {
    int score = 84;

    if (score >= 90) {
        std::cout << "A\n";
    } else if (score >= 80) {
        std::cout << "B\n";
    } else if (score >= 70) {
        std::cout << "C\n";
    } else {
        std::cout << "F\n";
    }
}
```

```output
B
```

`84 >= 80` is true, so `B` prints and the rest of the chain is skipped, even though `84 >= 70` is also
true. That's why the order matters: put the **most specific** (here, the highest) test first. In the
wrong order, every passing score would be a `C`:

```cpp
if (score >= 70) { ... }        // 84 stops here: "C". The A and B branches can never run
else if (score >= 80) { ... }
else if (score >= 90) { ... }
```

There's no special `elseif` keyword. `else if` is just an `else` whose single statement happens to
be another `if`.

## Nested `if`

An `if` can go inside another `if`'s block:

```cpp run
#include <iostream>

int main() {
    int age = 20;
    bool has_ticket = false;

    if (age >= 18) {
        if (has_ticket) {
            std::cout << "Enjoy the show!\n";
        } else {
            std::cout << "Please buy a ticket.\n";
        }
    } else {
        std::cout << "Sorry, adults only.\n";
    }
}
```

```output
Please buy a ticket.
```

Deep nesting gets hard to read quickly. Often you can flatten it with `&&` or an `else if` chain.

## Combining conditions: `&&`, `||`, `!`

| Operator | Meaning | True when |
| --- | --- | --- |
| `a && b` | and | both are true |
| `a \|\| b` | or | at least one is true |
| `!a` | not | `a` is false |

```cpp run
#include <iostream>

int main() {
    int hour = 14;
    bool weekend = true;

    if (hour >= 9 && hour < 17) {
        std::cout << "Working hours\n";
    }
    if (weekend || hour >= 17) {
        std::cout << "Free time\n";
    }
    if (!(hour < 12)) {
        std::cout << "Afternoon\n";
    }
}
```

```output
Working hours
Free time
Afternoon
```

**Short-circuiting.** `&&` stops as soon as the left side is false, and `||` stops as soon as the left
side is true, so the right side isn't even evaluated. That lets you guard a dangerous test with a safe
one:

```cpp
if (count != 0 && total / count > 10) {   // never divides by zero
    // ...
}
```

> **Pitfall:** To test whether `x` is between 0 and 10, write `0 <= x && x <= 10`. Writing
> `0 <= x <= 10` compiles, but it means `(0 <= x) <= 10`, which compares a `bool` (0 or 1) to 10 and is
> **always true**. GCC warns: `comparisons like 'X<=Y<=Z' do not have their mathematical meaning`.

## Braces or no braces?

The body of an `if` or `else` is **one statement**. A block `{ ... }` counts as one statement, which is
how you get several. Without braces, only the very next statement belongs to the `if`:

```cpp run
#include <iostream>

int main() {
    int x = 5;

    if (x > 10)
        std::cout << "big\n";           // single statement: fine
    else
        std::cout << "small\n";

    if (x > 0) std::cout << "positive\n";   // also fine on one line
}
```

```output
small
positive
```

This is legal, but it's a trap when someone later adds a line:

```cpp run warns
#include <iostream>

int main() {
    int balance = 100;
    if (balance < 0)
        std::cout << "Overdrawn!\n";
        std::cout << "Fee charged.\n";   // NOT part of the if, despite the indentation
}
```

```output
Fee charged.
```

The indentation lies: the second line always runs. GCC warns with `-Wmisleading-indentation`
(`this 'if' clause does not guard...`). Many style guides (and this course) **always use braces**,
even for one statement.

## Common mistakes

### `=` instead of `==`

```cpp run warns
#include <iostream>

int main() {
    int x = 3;
    if (x = 5) {                 // ASSIGNS 5 to x, then tests 5 (true)
        std::cout << "x is " << x << '\n';
    }
}
```

```output
x is 5
```

`x = 5` is an assignment. It stores 5 in `x` and evaluates to `5`, which is non-zero, so the condition
is **always** true, and `x` has been changed. GCC warns: `suggest parentheses around assignment used as
truth value`. You meant `x == 5`.

### A semicolon after the condition

```cpp run warns
#include <iostream>

int main() {
    int x = 3;
    if (x > 5);                  // the ; IS the if's body: an empty statement
    {
        std::cout << "x is big?\n";   // an ordinary block that always runs
    }
}
```

```output
x is big?
```

`if (x > 5);` means "if x > 5, do nothing". The block after it isn't connected to the `if` at all. GCC
warns: `suggest braces around empty body in an 'if' statement`.

### Dangling `else`

When `if`s are nested without braces, which `if` does an `else` belong to? The rule: an `else` always
pairs with the **nearest** unmatched `if`, regardless of indentation.

```cpp run warns
#include <iostream>

int main() {
    int a = 0, b = 1;
    if (a == 1)
        if (b == 1)
            std::cout << "both\n";
    else                                  // looks like it belongs to the first if...
        std::cout << "a is not 1\n";      // ...but it belongs to if (b == 1)
    std::cout << "done\n";
}
```

```output
done
```

Since `a` is 0, the outer `if` is false and its whole body (the inner `if` *and* its `else`) is
skipped. GCC warns: `suggest explicit braces to avoid ambiguous 'else'`. Braces make the intent clear:

```cpp
if (a == 1) {
    if (b == 1) {
        std::cout << "both\n";
    }
} else {
    std::cout << "a is not 1\n";
}
```

### Syntax slips

The parentheses are mandatory, and an `else` must directly follow the `if`'s body:

```cpp compile-error
#include <iostream>

int main() {
    int x = 3;
    if x > 2 {                       // error: expected '(' before 'x'
        std::cout << "yes\n";
    }
}
```

```cpp compile-error
#include <iostream>

int main() {
    int x = 3;
    if (x > 2)
        std::cout << "yes\n";
        std::cout << "really\n";
    else                             // error: 'else' without a previous 'if'
        std::cout << "no\n";
}
```

:::quiz
What does this print?

```cpp
int x = 15;
if (x > 10) {
    std::cout << "A";
} else if (x > 5) {
    std::cout << "B";
} else {
    std::cout << "C";
}
```

- [x] `A`
- [ ] `AB`
- [ ] `B`
- [ ] `ABC`

Only the first true branch of a chain runs. `15 > 10`, so `A` prints and the rest is skipped.
:::

:::quiz
What does this print?

```cpp
int x = 0;
if (x = 0) {
    std::cout << "zero";
} else {
    std::cout << "not zero";
}
```

- [ ] `zero`
- [x] `not zero`
- [ ] Nothing, it doesn't compile

`x = 0` assigns 0 and evaluates to 0, which is false, so the `else` branch runs. A classic bug: the
programmer meant `x == 0`.
:::

:::quiz
Which conditions are true when `x` is `50`? (select all that apply)

- [x] `0 <= x <= 10`
- [ ] `0 <= x && x <= 10`
- [x] `x < 10 || x > 40`
- [x] `!(x == 10)`

`0 <= x <= 10` is `(0 <= x) <= 10`, which is `1 <= 10`: always true, and almost certainly a bug.
:::

:::exercise Even or odd {easy}
Read an integer and say whether it's even or odd.

**Input:** one integer `n` (may be negative).
**Output:** `<n> is even` or `<n> is odd`.

```cpp starter
#include <iostream>

int main() {
    int n = 0;
    std::cin >> n;
    std::cout << n << " is even\n";
}
```

```cpp solution
#include <iostream>

int main() {
    int n = 0;
    std::cin >> n;
    if (n % 2 == 0) {
        std::cout << n << " is even\n";
    } else {
        std::cout << n << " is odd\n";
    }
}
```

```hint
`n % 2` is the remainder after dividing by 2. A number is even when that remainder is 0.
```

```hint
Careful with negatives: `-3 % 2` is `-1`, not `1`. Testing `== 0` works for both signs; testing `== 1` doesn't.
```

```stdin
4
```

```expected
4 is even
```

```stdin
7
```

```expected
7 is odd
```

```stdin
-3
```

```expected hidden
-3 is odd
```

```stdin
0
```

```expected hidden
0 is even
```

```stdin
-2147483648
```

```expected hidden
-2147483648 is even
```

```checks
must \bif\s*\( :: Use an if statement.
must \belse\b :: Use else for the other case.
```
:::

:::exercise Letter grade {easy}
Read a score from 0 to 100 and print its letter grade.

**Input:** one integer `score` (0 to 100).
**Output:** one letter:

| Score | Grade |
| --- | --- |
| 90 to 100 | `A` |
| 80 to 89 | `B` |
| 70 to 79 | `C` |
| 60 to 69 | `D` |
| below 60 | `F` |

```cpp starter
#include <iostream>

int main() {
    int score = 0;
    std::cin >> score;

    if (score >= 60) {
        std::cout << "D\n";
    } else if (score >= 90) {
        std::cout << "A\n";
    } else {
        std::cout << "F\n";
    }
}
```

```cpp solution
#include <iostream>

int main() {
    int score = 0;
    std::cin >> score;

    if (score >= 90) {
        std::cout << "A\n";
    } else if (score >= 80) {
        std::cout << "B\n";
    } else if (score >= 70) {
        std::cout << "C\n";
    } else if (score >= 60) {
        std::cout << "D\n";
    } else {
        std::cout << "F\n";
    }
}
```

```hint
In an `else if` chain only the first true condition runs. Test the highest grade first.
```

```stdin
84
```

```expected
B
```

```stdin
90
```

```expected
A
```

```stdin
59
```

```expected
F
```

```stdin
100
```

```expected hidden
A
```

```stdin
60
```

```expected hidden
D
```

```stdin
79
```

```expected hidden
C
```

```stdin
89
```

```expected hidden
B
```

```stdin
0
```

```expected hidden
F
```

```stdin
70
```

```expected hidden
C
```

```checks
must else\s+if :: Use an else-if chain.
```
:::

:::exercise Leap year {medium}
Read a year and say whether it's a leap year. A year is a leap year if it's divisible by 4, **except**
years divisible by 100, which are only leap years if they're also divisible by 400.
(So 2024 and 2000 are leap years; 1900 and 2023 are not.)

**Input:** one positive integer `year`.
**Output:** `<year> is a leap year` or `<year> is not a leap year`.

```cpp starter
#include <iostream>

int main() {
    int year = 0;
    std::cin >> year;
    if (year % 4 == 0) {
        std::cout << year << " is a leap year\n";
    } else {
        std::cout << year << " is not a leap year\n";
    }
}
```

```cpp solution
#include <iostream>

int main() {
    int year = 0;
    std::cin >> year;
    if ((year % 4 == 0 && year % 100 != 0) || year % 400 == 0) {
        std::cout << year << " is a leap year\n";
    } else {
        std::cout << year << " is not a leap year\n";
    }
}
```

```hint
"Divisible by 4 and not by 100" is `year % 4 == 0 && year % 100 != 0`.
```

```hint
Then "or divisible by 400": combine the two with `||`. Parentheses make the grouping clear.
```

```stdin
2024
```

```expected
2024 is a leap year
```

```stdin
1900
```

```expected
1900 is not a leap year
```

```stdin
2000
```

```expected hidden
2000 is a leap year
```

```stdin
2023
```

```expected hidden
2023 is not a leap year
```

```stdin
2100
```

```expected hidden
2100 is not a leap year
```

```stdin
2400
```

```expected hidden
2400 is a leap year
```

```checks
must && :: Combine conditions with &&.
must \|\| :: Combine conditions with ||.
```
:::

:::exercise Triangle type {hard}
Read three side lengths and classify the triangle.

**Input:** three positive integers `a`, `b`, `c`.
**Output:** one word:

- `invalid` if the sides can't form a triangle: that's when any one side is **greater than or equal to**
  the sum of the other two,
- otherwise `equilateral` if all three sides are equal,
- otherwise `isosceles` if exactly two sides are equal,
- otherwise `scalene`.

```cpp starter
#include <iostream>

int main() {
    int a = 0, b = 0, c = 0;
    std::cin >> a >> b >> c;
    if (a == b && b == c) {
        std::cout << "equilateral\n";
    } else {
        std::cout << "scalene\n";
    }
}
```

```cpp solution
#include <iostream>

int main() {
    int a = 0, b = 0, c = 0;
    std::cin >> a >> b >> c;
    if (a >= b + c || b >= a + c || c >= a + b) {
        std::cout << "invalid\n";
    } else if (a == b && b == c) {
        std::cout << "equilateral\n";
    } else if (a == b || b == c || a == c) {
        std::cout << "isosceles\n";
    } else {
        std::cout << "scalene\n";
    }
}
```

```hint
Check for `invalid` first. Then equilateral, because an equilateral triangle also has two equal sides.
```

```hint
"Exactly two sides equal" (once you know it's not equilateral) is `a == b || b == c || a == c`.
```

```stdin
3 4 5
```

```expected
scalene
```

```stdin
2 2 3
```

```expected
isosceles
```

```stdin
1 2 3
```

```expected
invalid
```

```stdin
7 7 7
```

```expected hidden
equilateral
```

```stdin
5 3 5
```

```expected hidden
isosceles
```

```stdin
10 1 1
```

```expected hidden
invalid
```

```stdin
1 1 2
```

```expected hidden
invalid
```

```stdin
4 6 6
```

```expected hidden
isosceles
```

```stdin
2 3 4
```

```expected hidden
scalene
```

```checks
must \bif\s*\( :: Use if statements.
```
:::
