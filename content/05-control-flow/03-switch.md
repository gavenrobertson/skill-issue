---
title: switch
summary: Choosing between many fixed values with switch, case labels, break, intentional fallthrough with [[fallthrough]], default, grouping cases, variables inside cases, switch with an initializer, and what you can't switch on.
---

When you compare **one value** against many **fixed constants**, an `else if` chain gets repetitive:

```cpp
if (choice == 1) { ... }
else if (choice == 2) { ... }
else if (choice == 3) { ... }
else { ... }
```

`switch` expresses exactly that: "look at this value, jump to the matching case".

## Basic syntax

```cpp run
#include <iostream>

int main() {
    int choice = 2;

    switch (choice) {
        case 1:
            std::cout << "New game\n";
            break;
        case 2:
            std::cout << "Load game\n";
            break;
        case 3:
            std::cout << "Quit\n";
            break;
        default:
            std::cout << "Unknown option\n";
            break;
    }
}
```

```output
Load game
```

How it works:

1. The expression in `switch ( ... )` is evaluated **once**.
2. Execution **jumps** to the `case` label whose constant equals that value.
3. Statements run from there, top to bottom, until a **`break`** jumps out of the `switch` (to just
   after its closing `}`).
4. If no `case` matches, execution jumps to **`default`**. If there's no `default` either, the whole
   `switch` does nothing.

`case 1:` is a **label**, a named spot in the code, not a block. That detail explains everything
surprising about `switch`.

## Forgetting `break`: fallthrough

Since case labels are just jump targets, nothing stops execution at the next label. Without `break`, it
**falls through** into the following case's statements:

```cpp run warns
#include <iostream>

int main() {
    int level = 2;
    switch (level) {
        case 1:
            std::cout << "one\n";
        case 2:
            std::cout << "two\n";       // starts here...
        case 3:
            std::cout << "three\n";     // ...and keeps going
        default:
            std::cout << "default\n";
    }
}
```

```output
two
three
default
```

This is almost always a bug, so GCC warns (with `-Wextra`): `this statement may fall through`.

### Intentional fallthrough: `[[fallthrough]]`

Sometimes falling through is exactly what you want, for example when each level includes everything
from the levels below it. Say so with the C++17 attribute `[[fallthrough]];` placed where the `break`
would be. It documents the intent and silences the warning:

```cpp run
#include <iostream>

int main() {
    int stars = 2;
    std::cout << "Your reward:\n";
    switch (stars) {
        case 3:
            std::cout << "- a trophy\n";
            [[fallthrough]];
        case 2:
            std::cout << "- a medal\n";
            [[fallthrough]];
        case 1:
            std::cout << "- a certificate\n";
            break;
        default:
            std::cout << "- nothing yet\n";
            break;
    }
}
```

```output
Your reward:
- a medal
- a certificate
```

## Grouping cases

Several labels can share the same code. Write them one after another, with no statements between
(this isn't considered fallthrough, so there's no warning):

```cpp run
#include <iostream>

int main() {
    char c = 'e';
    switch (c) {
        case 'a':
        case 'e':
        case 'i':
        case 'o':
        case 'u':
            std::cout << c << " is a vowel\n";
            break;
        case ' ':
        case '\t':
        case '\n':
            std::cout << "whitespace\n";
            break;
        default:
            std::cout << c << " is something else\n";
            break;
    }
}
```

```output
e is a vowel
```

You'll also see the labels on one line: `case 'a': case 'e': case 'i':`. Both styles are common.

## `default`

- It's optional, but usually a good idea: it handles "everything else", including invalid input.
- It can appear anywhere among the cases (it's still only used when nothing else matches), but by
  convention it goes last.
- Put a `break` after the last case too. It's not required, but it protects you when someone later
  adds another case below it.

## What you can switch on

The `switch` expression must be an **integer type** (`int`, `char`, `long`, `bool`, ...) or an
**enumeration**. Each `case` label must be a **compile-time constant** of a compatible type, and no two
labels may have the same value.

```cpp compile-error
#include <iostream>

int main() {
    int x = 2;
    int limit = 5;
    switch (x) {
        case limit:              // error: the value of 'limit' is not usable in a constant expression
            std::cout << "limit\n";
            break;
    }
}
```

(`const int limit = 5;` or `constexpr int limit = 5;` would be fine, since those are constants.)

```cpp compile-error
#include <iostream>

int main() {
    int x = 1;
    switch (x) {
        case 1: std::cout << "one\n"; break;
        case 1: std::cout << "uno\n"; break;   // error: duplicate case value
    }
}
```

### No strings, no floating point

You **cannot** switch on a `std::string` (or a `double`):

```cpp compile-error
#include <iostream>
#include <string>

int main() {
    std::string cmd = "start";
    switch (cmd) {                         // error: switch quantity not an integer
        case "start": std::cout << "go\n"; break;
        case "stop": std::cout << "halt\n"; break;
    }
}
```

`switch` is designed to compile into a fast jump table over integers. For strings, use an `if` /
`else if` chain:

```cpp
if (cmd == "start") { ... }
else if (cmd == "stop") { ... }
else { ... }
```

(Switching on the *first character* of a string, `switch (cmd[0])`, does work, since a `char` is an integer type.)

### Enumerations

You'll learn about **enumerations** in detail later. In short, `enum class` defines a type with a
fixed set of named values, and those are perfect for `switch`:

```cpp run
#include <iostream>

enum class Light { Red, Yellow, Green };

int main() {
    Light light = Light::Yellow;
    switch (light) {
        case Light::Red:
            std::cout << "Stop\n";
            break;
        case Light::Yellow:
            std::cout << "Slow down\n";
            break;
        case Light::Green:
            std::cout << "Go\n";
            break;
    }
}
```

```output
Slow down
```

A bonus: if you switch on an enum **without a `default`** and forget one of its values, GCC warns
(`enumeration value 'Green' not handled in switch`). Leaving out `default` on enum switches lets the
compiler catch missing cases when someone adds a new value later.

> **Note:** GCC also accepts **case ranges** like `case 1 ... 5:`. That's a compiler extension, not
> standard C++, so other compilers reject it. Use `if` for ranges.

## Declaring variables inside a case

Because a `switch` jumps over code, C++ forbids jumping *past* the initialization of a variable that
would still be in scope at the target label:

```cpp compile-error
#include <iostream>

int main() {
    int choice = 2;
    switch (choice) {
        case 1:
            int count = 10;                  // in scope for the rest of the switch...
            std::cout << count << '\n';
            break;
        case 2:                              // error: jump to case label
            std::cout << "two\n";            // (crosses initialization of 'int count')
            break;
    }
}
```

The fix: give the case its own **block** with braces, so the variable's scope ends before the next label:

```cpp run
#include <iostream>

int main() {
    int choice = 2;
    switch (choice) {
        case 1: {
            int count = 10;
            std::cout << count << '\n';
            break;
        }
        case 2: {
            int count = 20;                  // a different variable, in a different block
            std::cout << count << '\n';
            break;
        }
    }
}
```

```output
20
```

## `switch` with an initializer (C++17)

Like `if`, a `switch` can start with an initializer statement. The variable is scoped to the `switch`:

```cpp run
#include <iostream>

int main() {
    int day_number = 10;
    switch (int weekday = day_number % 7; weekday) {
        case 0:
            std::cout << "Sunday\n";
            break;
        case 6:
            std::cout << "Saturday\n";
            break;
        default:
            std::cout << "Weekday " << weekday << '\n';
            break;
    }
}
```

```output
Weekday 3
```

## `switch` or `if`?

| Use `switch` when | Use `if` / `else if` when |
| --- | --- |
| comparing **one** integer/char/enum value | conditions involve different variables |
| against many **constant** values | you need ranges (`x > 10`) or `&&` / `\|\|` |
| several values share the same code | comparing strings or doubles |

:::quiz
What does this print?

```cpp
int x = 1;
switch (x) {
    case 1: std::cout << "A";
    case 2: std::cout << "B"; break;
    case 3: std::cout << "C";
}
```

- [ ] `A`
- [x] `AB`
- [ ] `ABC`
- [ ] Nothing

Execution starts at `case 1`, has no `break`, falls through into `case 2`, and stops at its `break`.
:::

:::quiz
Which of these can be used as the expression in `switch ( ... )`? (select all that apply)

- [x] an `int`
- [x] a `char`
- [ ] a `std::string`
- [ ] a `double`
- [x] an `enum class` value

Only integer types and enumerations can be switched on.
:::

:::quiz
Why does this fail to compile?

```cpp
switch (n) {
    case 1:
        int y = 5;
        break;
    case 2:
        break;
}
```

- [ ] `case 2` has no statements
- [x] Jumping to `case 2` would skip the initialization of `y`, which is still in scope there
- [ ] Variables can never be declared in a `switch`
- [ ] `break` is not allowed in `case 1`

Wrap the statements of `case 1` in braces to limit `y`'s scope.
:::

:::exercise Day name {easy}
Read a day number and print the day's name. Day 1 is `Monday` and day 7 is `Sunday`.

**Input:** one integer.
**Output:** `Monday`, `Tuesday`, `Wednesday`, `Thursday`, `Friday`, `Saturday`, or `Sunday` for 1 to 7,
and `Invalid day` for anything else.

```cpp starter
#include <iostream>

int main() {
    int day = 0;
    std::cin >> day;
    std::cout << "Monday\n";
}
```

```cpp solution
#include <iostream>

int main() {
    int day = 0;
    std::cin >> day;
    switch (day) {
        case 1: std::cout << "Monday\n"; break;
        case 2: std::cout << "Tuesday\n"; break;
        case 3: std::cout << "Wednesday\n"; break;
        case 4: std::cout << "Thursday\n"; break;
        case 5: std::cout << "Friday\n"; break;
        case 6: std::cout << "Saturday\n"; break;
        case 7: std::cout << "Sunday\n"; break;
        default: std::cout << "Invalid day\n"; break;
    }
}
```

```hint
One `case` per day, each ending with `break;`. Use `default:` for invalid numbers.
```

```stdin
1
```

```expected
Monday
```

```stdin
7
```

```expected
Sunday
```

```stdin
4
```

```expected hidden
Thursday
```

```stdin
0
```

```expected hidden
Invalid day
```

```stdin
8
```

```expected hidden
Invalid day
```

```stdin
-1
```

```expected hidden
Invalid day
```

```checks
must \bswitch\s*\( :: Use a switch statement.
must \bdefault\s*: :: Handle invalid days with default.
mustnot \bif\b :: Use switch instead of if.
```
:::

:::exercise Calculator {medium}
Read a simple integer expression like `7 + 5` and print the result.

**Input:** an integer `a`, an operator character, and an integer `b`, separated by spaces.
**Output:**

- `a op b = result` for the operators `+`, `-`, `*`, `/`, `%` (integer arithmetic, so `7 / 2 = 3`),
- `Error: division by zero` for `/` or `%` when `b` is 0,
- `Error: unknown operator` for any other operator.

```cpp starter
#include <iostream>

int main() {
    int a = 0, b = 0;
    char op = ' ';
    std::cin >> a >> op >> b;
    std::cout << a << ' ' << op << ' ' << b << " = " << a + b << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int a = 0, b = 0;
    char op = ' ';
    std::cin >> a >> op >> b;

    switch (op) {
        case '+':
            std::cout << a << " + " << b << " = " << a + b << '\n';
            break;
        case '-':
            std::cout << a << " - " << b << " = " << a - b << '\n';
            break;
        case '*':
            std::cout << a << " * " << b << " = " << a * b << '\n';
            break;
        case '/':
        case '%':
            if (b == 0) {
                std::cout << "Error: division by zero\n";
            } else if (op == '/') {
                std::cout << a << " / " << b << " = " << a / b << '\n';
            } else {
                std::cout << a << " % " << b << " = " << a % b << '\n';
            }
            break;
        default:
            std::cout << "Error: unknown operator\n";
            break;
    }
}
```

```hint
Read the operator into a `char` and `switch` on it: `case '+':`, `case '-':`, ...
```

```hint
Inside the `/` and `%` cases, check `b == 0` with an `if` before dividing.
```

```stdin
7 + 5
```

```expected
7 + 5 = 12
```

```stdin
7 / 2
```

```expected
7 / 2 = 3
```

```stdin
5 / 0
```

```expected
Error: division by zero
```

```stdin
-9 % 4
```

```expected hidden
-9 % 4 = -1
```

```stdin
3 * -4
```

```expected hidden
3 * -4 = -12
```

```stdin
2 ^ 3
```

```expected hidden
Error: unknown operator
```

```stdin
8 % 0
```

```expected hidden
Error: division by zero
```

```stdin
0 / 5
```

```expected hidden
0 / 5 = 0
```

```stdin
-7 / 2
```

```expected hidden
-7 / 2 = -3
```

```stdin
10 - 20
```

```expected hidden
10 - 20 = -10
```

```checks
must \bswitch\s*\( :: Use a switch on the operator.
```
:::

:::exercise Vowel or consonant {easy}
Read one character and classify it. Use a `switch` where all ten vowels (`a e i o u` in lower and upper
case) are **grouped** into one set of case labels.

**Input:** one non-whitespace character.
**Output:** `vowel` for `a e i o u A E I O U`, `consonant` for any other letter (`A`-`Z`, `a`-`z`), and
`not a letter` for everything else.

```cpp starter
#include <iostream>

int main() {
    char c = ' ';
    std::cin >> c;
    switch (c) {
        case 'a':
            std::cout << "vowel\n";
            break;
        default:
            std::cout << "consonant\n";
            break;
    }
}
```

```cpp solution
#include <iostream>

int main() {
    char c = ' ';
    std::cin >> c;
    switch (c) {
        case 'a': case 'e': case 'i': case 'o': case 'u':
        case 'A': case 'E': case 'I': case 'O': case 'U':
            std::cout << "vowel\n";
            break;
        default:
            if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')) {
                std::cout << "consonant\n";
            } else {
                std::cout << "not a letter\n";
            }
            break;
    }
}
```

```hint
Stack labels with no statements between them: `case 'a': case 'e': ...` and then the shared code.
```

```hint
In `default`, decide between a consonant and a non-letter: `(c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')`.
```

```stdin
e
```

```expected
vowel
```

```stdin
z
```

```expected
consonant
```

```stdin
U
```

```expected hidden
vowel
```

```stdin
Y
```

```expected hidden
consonant
```

```stdin
7
```

```expected hidden
not a letter
```

```stdin
a
```

```expected hidden
vowel
```

```stdin
?
```

```expected hidden
not a letter
```

```checks
must \bswitch\s*\( :: Use a switch statement.
must case\s*'.'\s*:\s*case :: Group the vowel cases (case 'a': case 'e': ...).
```
:::

:::exercise Days in month {medium}
Read a month number and a year, and print how many days that month has. Use a `switch` with grouped
cases. February has 29 days in leap years and 28 otherwise (a leap year is divisible by 4, except years
divisible by 100 that aren't divisible by 400).

**Input:** two integers: `month` and `year`.
**Output:** the number of days, or `invalid month` if `month` isn't between 1 and 12.

| Months | Days |
| --- | --- |
| 1, 3, 5, 7, 8, 10, 12 | 31 |
| 4, 6, 9, 11 | 30 |
| 2 | 28 or 29 |

```cpp starter
#include <iostream>

int main() {
    int month = 0, year = 0;
    std::cin >> month >> year;
    switch (month) {
        case 2:
            std::cout << 28 << '\n';
            break;
        default:
            std::cout << 31 << '\n';
            break;
    }
}
```

```cpp solution
#include <iostream>

int main() {
    int month = 0, year = 0;
    std::cin >> month >> year;
    switch (month) {
        case 1: case 3: case 5: case 7: case 8: case 10: case 12:
            std::cout << 31 << '\n';
            break;
        case 4: case 6: case 9: case 11:
            std::cout << 30 << '\n';
            break;
        case 2: {
            bool leap = (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
            std::cout << (leap ? 29 : 28) << '\n';
            break;
        }
        default:
            std::cout << "invalid month\n";
            break;
    }
}
```

```hint
Group the 31-day months together and the 30-day months together.
```

```hint
If you declare a variable (like `bool leap`) inside `case 2`, wrap that case in braces `{ ... }`.
```

```stdin
1 2023
```

```expected
31
```

```stdin
2 2024
```

```expected
29
```

```stdin
2 1900
```

```expected hidden
28
```

```stdin
11 2000
```

```expected hidden
30
```

```stdin
13 2024
```

```expected hidden
invalid month
```

```stdin
2 2000
```

```expected hidden
29
```

```stdin
12 1
```

```expected hidden
31
```

```stdin
0 2024
```

```expected hidden
invalid month
```

```stdin
9 2023
```

```expected hidden
30
```

```checks
must \bswitch\s*\( :: Use a switch statement.
must case\s*\d+\s*:\s*case :: Group months with the same number of days.
```
:::

:::exercise Next day {hard}
Given a date, print the date of the **next** day.

**Input:** three integers `day month year` (`1 <= year <= 9999`).
**Output:**

- `invalid date` if `month` isn't 1 to 12, or `day` isn't between 1 and the number of days in that month
  (February has 29 days in leap years: divisible by 4, except years divisible by 100 that aren't
  divisible by 400).
- Otherwise the next day's date as `YYYY-MM-DD`, with the year padded to 4 digits and the month and day
  to 2 digits (the year after 9999 is simply `10000`).

| Input | Output |
| --- | --- |
| `28 2 2023` | `2023-03-01` |
| `28 2 2024` | `2024-02-29` |
| `31 12 1999` | `2000-01-01` |

Use a `switch` with grouped cases to find the number of days in the month.

```cpp starter
#include <iostream>

int main() {
    int day = 0, month = 0, year = 0;
    std::cin >> day >> month >> year;
    std::cout << year << '-' << month << '-' << day + 1 << '\n';
}
```

```cpp solution
#include <format>
#include <iostream>

int main() {
    int day = 0, month = 0, year = 0;
    std::cin >> day >> month >> year;

    int days = 0;
    switch (month) {
        case 1: case 3: case 5: case 7: case 8: case 10: case 12:
            days = 31;
            break;
        case 4: case 6: case 9: case 11:
            days = 30;
            break;
        case 2: {
            bool leap = (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
            days = leap ? 29 : 28;
            break;
        }
        default:
            days = 0;   // invalid month
            break;
    }

    if (day < 1 || day > days) {
        std::cout << "invalid date\n";
        return 0;
    }

    ++day;
    if (day > days) {
        day = 1;
        ++month;
        if (month > 12) {
            month = 1;
            ++year;
        }
    }
    std::cout << std::format("{:04}-{:02}-{:02}\n", year, month, day);
}
```

```hint
First compute the number of days in the month (0 for an invalid month), then validate `day` against it.
```

```hint
Add one to the day. If that runs past the end of the month, go to day 1 of the next month; if *that*
runs past December, go to January of the next year.
```

```hint
Zero padding: `std::format("{:04}-{:02}-{:02}", year, month, day)`, or `std::setfill('0')` with `std::setw`.
```

```stdin
28 2 2023
```

```expected
2023-03-01
```

```stdin
28 2 2024
```

```expected
2024-02-29
```

```stdin
31 12 1999
```

```expected
2000-01-01
```

```stdin
29 2 1900
```

```expected hidden
invalid date
```

```stdin
29 2 2000
```

```expected hidden
2000-03-01
```

```stdin
30 4 2024
```

```expected hidden
2024-05-01
```

```stdin
31 4 2024
```

```expected hidden
invalid date
```

```stdin
0 5 2024
```

```expected hidden
invalid date
```

```stdin
15 7 5
```

```expected hidden
0005-07-16
```

```stdin
31 12 9999
```

```expected hidden
10000-01-01
```

```stdin
1 13 2024
```

```expected hidden
invalid date
```

```stdin
31 1 2024
```

```expected hidden
2024-02-01
```

```stdin
30 11 2023
```

```expected hidden
2023-12-01
```

```checks
must \bswitch\s*\( :: Use a switch for the days in the month.
must case\s*\d+\s*:\s*case :: Group months with the same number of days.
```
:::
