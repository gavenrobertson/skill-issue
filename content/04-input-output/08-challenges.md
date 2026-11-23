---
title: "Input & Output: Challenges"
summary: Hard problems that combine reading, validating and formatting input and output with everything from the earlier modules.
---

These problems are meant to be **hard**. Each one is a small, complete program with a precise input and
output format, and the hidden tests go after the edge cases: empty input, negative numbers, the largest
values a type can hold, odd spacing. Read the spec twice, think about what can go wrong, and try each
problem for real before you open the hints.

Everything you need is in this module and the ones before it: `std::cin` and its fail state,
`std::getline`, `cin.get()`, reading until the end of input, `<iomanip>`, `std::format` and `printf`.

:::exercise Thousands separators {hard}
Print integers with commas between groups of three digits, the way large numbers are usually written.

**Input:** integers until the end of input. Each one fits in a `long long` (from
`-9223372036854775808` to `9223372036854775807`).
**Output:** each number on its own line, with a `,` before every group of three digits counted from the
right. Negative numbers keep their minus sign in front.

| Input | Output |
| --- | --- |
| `1234567` | `1,234,567` |
| `-1000` | `-1,000` |
| `999` | `999` |
| `1000000` | `1,000,000` |

```cpp starter
#include <iostream>

int main() {
    long long n = 0;
    while (std::cin >> n) {
        std::cout << n << '\n';
    }
}
```

```cpp solution
#include <iomanip>
#include <iostream>

int main() {
    long long n = 0;
    while (std::cin >> n) {
        // The magnitude as unsigned: -n would overflow for the smallest long long.
        unsigned long long m = n < 0 ? 0ULL - static_cast<unsigned long long>(n)
                                     : static_cast<unsigned long long>(n);
        if (n < 0) {
            std::cout << '-';
        }

        unsigned long long group = 1;           // the place value of the leftmost group
        while (m / group >= 1000) {
            group *= 1000;
        }

        std::cout << m / group;                 // the first group: no padding
        m %= group;
        group /= 1000;
        while (group > 0) {
            std::cout << ',' << std::setfill('0') << std::setw(3) << m / group;
            m %= group;
            group /= 1000;
        }
        std::cout << std::setfill(' ') << '\n';
    }
}
```

```hint
Find the place value of the leftmost group: start at 1 and multiply by 1000 while the number divided
by it is still at least 1000. Then print the groups from left to right with `/` and `%`.
```

```hint
Every group except the first must be printed with **three** digits: `1,000,005` has the groups `1`,
`000` and `005`. `std::setfill('0') << std::setw(3)` does that.
```

```hint
`-n` overflows for `-9223372036854775808`, because `9223372036854775808` doesn't fit in a
`long long`. Work with the magnitude as an `unsigned long long`: `0ULL - static_cast<unsigned long long>(n)`
is well defined.
```
```stdin
1234567
-1000
999
1000000
```

```expected
1,234,567
-1,000
999
1,000,000
```

```stdin
0
-5
1000
1001
100200300
```

```expected hidden
0
-5
1,000
1,001
100,200,300
```

```stdin
-9223372036854775808
9223372036854775807
```

```expected hidden
-9,223,372,036,854,775,808
9,223,372,036,854,775,807
```

```stdin
-999
-1000000
1000005
```

```expected hidden
-999
-1,000,000
1,000,005
```

:::

:::exercise Mini wc {hard}
The Unix tool `wc` counts lines, words and characters. Write a version of it that also reports the
longest line.

**Input:** any text, possibly empty.
**Output:** four lines:

```
Lines: L
Words: W
Characters: C
Longest line: N
```

- **Lines**: the number of lines of text. A last line without a newline at the end still counts; a
  newline at the very end does **not** start an extra, empty line. Empty input has 0 lines.
- **Words**: maximal runs of characters that are not a space, a tab (`'\t'`) or a newline.
- **Characters**: every character except the newlines.
- **Longest line**: the largest number of characters on one line (newline not included), `0` for empty
  input.

For the input

```
the quick  brown
	fox
```

(the second line starts with a tab) the output is:

```
Lines: 2
Words: 4
Characters: 20
Longest line: 16
```

```cpp starter
#include <iostream>

int main() {
    char c = ' ';
    int characters = 0;
    while (std::cin.get(c)) {
        ++characters;
    }
    std::cout << "Characters: " << characters << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int lines = 0, words = 0, characters = 0, longest = 0;
    int lineLength = 0;
    bool inWord = false;
    bool lineOpen = false;        // are we in the middle of a line that hasn't been counted yet?

    char c = ' ';
    while (std::cin.get(c)) {
        if (c == '\n') {
            ++lines;
            if (lineLength > longest) {
                longest = lineLength;
            }
            lineLength = 0;
            lineOpen = false;
            inWord = false;
        } else {
            ++characters;
            ++lineLength;
            lineOpen = true;
            if (c == ' ' || c == '\t') {
                inWord = false;
            } else if (!inWord) {
                inWord = true;
                ++words;
            }
        }
    }
    if (lineOpen) {               // the last line had no newline
        ++lines;
        if (lineLength > longest) {
            longest = lineLength;
        }
    }

    std::cout << "Lines: " << lines << '\n';
    std::cout << "Words: " << words << '\n';
    std::cout << "Characters: " << characters << '\n';
    std::cout << "Longest line: " << longest << '\n';
}
```

```hint
Read one character at a time with `while (std::cin.get(c))` so you see the spaces, tabs and newlines.
```

```hint
Count a word when a non-whitespace character follows whitespace (or starts the input). A `bool inWord`
remembers which of the two you were in.
```

```hint
A line is finished by a newline. After the loop, a line that has characters but no newline yet still
needs to be counted.
```
```stdin
the quick  brown
	fox
```

```expected
Lines: 2
Words: 4
Characters: 20
Longest line: 16
```

```stdin
hello world

```

```expected
Lines: 1
Words: 2
Characters: 11
Longest line: 11
```

```stdin
```

```expected hidden
Lines: 0
Words: 0
Characters: 0
Longest line: 0
```

```stdin




```

```expected hidden
Lines: 3
Words: 0
Characters: 0
Longest line: 0
```

```stdin
  lead and trail  

x		y z

```

```expected hidden
Lines: 3
Words: 6
Characters: 24
Longest line: 18
```

```stdin
one
```

```expected hidden
Lines: 1
Words: 1
Characters: 3
Longest line: 3
```

:::

:::exercise Bank statement {hard}
Turn a list of transactions into a formatted bank statement.

**Input:** the first line is the opening balance. Each following line is one transaction: an amount
(negative for withdrawals, never zero, at most 2 decimals) followed by a description that runs to the end
of the line and may contain spaces. Extra spaces between the amount and the description are not part of
the description.
**Output:**

```
Description          |     Amount |    Balance
---------------------+------------+-----------
Opening balance      |            |     100.00
Coffee               |      -3.50 |      96.50
Salary for November  |   +1200.00 |    1296.50
Rent and utilitie... |    -800.00 |     496.50
---------------------+------------+-----------
Deposits: 1 (1200.00)
Withdrawals: 2 (803.50)
Closing balance: 496.50
```

- The description is left-aligned in a field of 20. A description **longer** than 20 characters is cut
  to its first 17 characters followed by `...`.
- The amount has a sign and 2 decimals, right-aligned in 10; the balance has 2 decimals, right-aligned
  in 10. The columns are separated by ` | `, and the separator lines are exactly as shown.
- The summary counts deposits (positive amounts) and withdrawals (negative), with their totals as
  positive numbers.
- Money must add up **exactly**. Floating-point sums like `0.1 + 0.2` are not exact, so convert every
  amount to whole cents first, with `std::llround(amount * 100)` from `<cmath>`, and do all the arithmetic
  in integers.

The example above is the output for this input:

```
100
-3.50 Coffee
1200 Salary for November
-800 Rent and utilities for November
```

```cpp starter
#include <iostream>
#include <string>

int main() {
    double opening = 0.0;
    std::cin >> opening;
    std::cout << "Closing balance: " << opening << '\n';
}
```

```cpp solution
#include <cmath>
#include <format>
#include <iostream>
#include <string>

std::string money(long long cents) {
    return std::format("{:.2f}", cents / 100.0);
}

int main() {
    double opening = 0.0;
    std::cin >> opening;
    long long balance = std::llround(opening * 100);

    std::cout << std::format("{:<20} | {:>10} | {:>10}\n", "Description", "Amount", "Balance");
    std::cout << "---------------------+------------+-----------\n";
    std::cout << std::format("{:<20} | {:>10} | {:>10}\n", "Opening balance", "", money(balance));

    int deposits = 0, withdrawals = 0;
    long long depositTotal = 0, withdrawalTotal = 0;
    double amount = 0.0;
    std::string description;
    while (std::cin >> amount && std::getline(std::cin >> std::ws, description)) {
        long long cents = std::llround(amount * 100);
        balance += cents;
        if (cents > 0) {
            ++deposits;
            depositTotal += cents;
        } else {
            ++withdrawals;
            withdrawalTotal -= cents;
        }
        if (description.size() > 20) {
            description = description.substr(0, 17) + "...";
        }
        std::string signedAmount = (cents > 0 ? "+" : "-") + money(cents > 0 ? cents : -cents);
        std::cout << std::format("{:<20} | {:>10} | {:>10}\n", description, signedAmount, money(balance));
    }

    std::cout << "---------------------+------------+-----------\n";
    std::cout << "Deposits: " << deposits << " (" << money(depositTotal) << ")\n";
    std::cout << "Withdrawals: " << withdrawals << " (" << money(withdrawalTotal) << ")\n";
    std::cout << "Closing balance: " << money(balance) << '\n';
}
```

```hint
Each transaction is a number read with `>>`, then the rest of the line read with
`std::getline(std::cin >> std::ws, description)`. You can put both reads in the loop condition.
```

```hint
Keep the balance and the totals in `long long` cents. To print cents, format `cents / 100.0` with 2
decimals: the conversion error is far too small to change the rounding.
```

```hint
To cut a long description: `description.substr(0, 17) + "..."` (`substr(pos, len)` copies part of a
string). With `std::format`, `{:+.2f}` prints the sign of a number, and `{:<20}` left-aligns a string.
```
```stdin
100
-3.50 Coffee
1200 Salary for November
-800 Rent and utilities for November
```

```expected
Description          |     Amount |    Balance
---------------------+------------+-----------
Opening balance      |            |     100.00
Coffee               |      -3.50 |      96.50
Salary for November  |   +1200.00 |    1296.50
Rent and utilitie... |    -800.00 |     496.50
---------------------+------------+-----------
Deposits: 1 (1200.00)
Withdrawals: 2 (803.50)
Closing balance: 496.50
```

```stdin
0
```

```expected hidden
Description          |     Amount |    Balance
---------------------+------------+-----------
Opening balance      |            |       0.00
---------------------+------------+-----------
Deposits: 0 (0.00)
Withdrawals: 0 (0.00)
Closing balance: 0.00
```

```stdin
50.25
0.10    a
0.20 b
-0.30 c
```

```expected hidden
Description          |     Amount |    Balance
---------------------+------------+-----------
Opening balance      |            |      50.25
a                    |      +0.10 |      50.35
b                    |      +0.20 |      50.55
c                    |      -0.30 |      50.25
---------------------+------------+-----------
Deposits: 2 (0.30)
Withdrawals: 1 (0.30)
Closing balance: 50.25
```

```stdin
-20
-0.01 Exactly twenty chars
+5 Exactly twenty-one ch
```

```expected hidden
Description          |     Amount |    Balance
---------------------+------------+-----------
Opening balance      |            |     -20.00
Exactly twenty chars |      -0.01 |     -20.01
Exactly twenty-on... |      +5.00 |     -15.01
---------------------+------------+-----------
Deposits: 1 (5.00)
Withdrawals: 1 (0.01)
Closing balance: -15.01
```

```stdin
1000000
-999999.99    Big spender and then some more
12.34 x
```

```expected hidden
Description          |     Amount |    Balance
---------------------+------------+-----------
Opening balance      |            | 1000000.00
Big spender and t... | -999999.99 |       0.01
x                    |     +12.34 |      12.35
---------------------+------------+-----------
Deposits: 1 (12.34)
Withdrawals: 1 (999999.99)
Closing balance: 12.35
```

:::

:::exercise Split the bill {hard}
A group splits a restaurant bill plus tip. Money is counted in cents, and nobody may be charged a
fraction of a cent, so the shares must be distributed fairly.

**Input:** one line: the bill as `D.CC` (dollars, a dot, and **exactly two** digits of cents), the number
of people `N` (1 to 20), and the tip percentage `P` (an integer from 0 to 100). For example
`12.34 3 15`.
**Output:**

```
Bill: $12.34
Tip (15%): $1.85
Total: $14.19
Person 1: $4.73
Person 2: $4.73
Person 3: $4.73
```

- The tip is `P` percent of the bill, rounded to the **nearest** cent, with an exact half cent rounded
  **up** (`0.10` at 5% is 0.5 cents, which becomes 1 cent).
- The total is split as evenly as possible: everybody pays the same number of cents, except that the
  first `total % N` people pay **one cent more**, so the shares add up exactly to the total.
- Every amount is printed as `$` plus dollars, a dot and two digits of cents.

Don't use floating-point numbers at all: read the dollars and cents as integers and work in cents.

```cpp starter
#include <iostream>

int main() {
    double bill = 0.0;
    int people = 0, percent = 0;
    std::cin >> bill >> people >> percent;
    std::cout << "Total: $" << bill * (100 + percent) / 100 << '\n';
}
```

```cpp solution
#include <format>
#include <iostream>
#include <string>

std::string dollars(long long cents) {
    return std::format("${}.{:02}", cents / 100, cents % 100);
}

int main() {
    long long whole = 0, fraction = 0;
    char dot = ' ';
    int people = 0, percent = 0;
    std::cin >> whole >> dot >> fraction >> people >> percent;

    long long bill = whole * 100 + fraction;
    long long tip = (bill * percent + 50) / 100;     // round half up
    long long total = bill + tip;

    std::cout << "Bill: " << dollars(bill) << '\n';
    std::cout << "Tip (" << percent << "%): " << dollars(tip) << '\n';
    std::cout << "Total: " << dollars(total) << '\n';

    long long share = total / people;
    long long extra = total % people;          // this many people pay one cent more
    int person = 1;
    while (person <= people) {
        long long pays = share + (person <= extra ? 1 : 0);
        std::cout << "Person " << person << ": " << dollars(pays) << '\n';
        ++person;
    }
}
```

```hint
`std::cin >> whole >> dot >> fraction` reads `12.05` as `12`, `'.'` and `5`. Since there are always
exactly two digits after the dot, `whole * 100 + fraction` is the bill in cents.
```

```hint
Rounding to the nearest integer with halves going up, in integer arithmetic: `(x + 50) / 100` for
`x / 100`.
```

```hint
To print cents as dollars: the dollars are `cents / 100` and the cents `cents % 100`, padded to two digits
(`{:02}` with `std::format`, or `%02lld` with `printf`).
```
```stdin
12.34 3 15
```

```expected
Bill: $12.34
Tip (15%): $1.85
Total: $14.19
Person 1: $4.73
Person 2: $4.73
Person 3: $4.73
```

```stdin
100.00 1 0
```

```expected hidden
Bill: $100.00
Tip (0%): $0.00
Total: $100.00
Person 1: $100.00
```

```stdin
0.10 3 5
```

```expected hidden
Bill: $0.10
Tip (5%): $0.01
Total: $0.11
Person 1: $0.04
Person 2: $0.04
Person 3: $0.03
```

```stdin
0.01 3 0
```

```expected hidden
Bill: $0.01
Tip (0%): $0.00
Total: $0.01
Person 1: $0.01
Person 2: $0.00
Person 3: $0.00
```

```stdin
99.99 7 18
```

```expected hidden
Bill: $99.99
Tip (18%): $18.00
Total: $117.99
Person 1: $16.86
Person 2: $16.86
Person 3: $16.86
Person 4: $16.86
Person 5: $16.85
Person 6: $16.85
Person 7: $16.85
```

```stdin
0.00 4 100
```

```expected hidden
Bill: $0.00
Tip (100%): $0.00
Total: $0.00
Person 1: $0.00
Person 2: $0.00
Person 3: $0.00
Person 4: $0.00
```

```stdin
10.00 3 20
```

```expected hidden
Bill: $10.00
Tip (20%): $2.00
Total: $12.00
Person 1: $4.00
Person 2: $4.00
Person 3: $4.00
```

:::

:::exercise Duration table {hard}
Convert durations in seconds into a readable table.

**Input:** integers until the end of input, each between `-1000000000000` and `1000000000000`.
**Output:** one line per number, then a total line:

- The number right-aligned in a field of 13, then ` = `, then the duration as `HH:MM:SS` (each part two
  digits). If the duration is at least one day, it starts with the number of days and `d `, as in
  `2d 03:04:05`.
- A negative number prints `invalid` as its duration and is left out of the total.
- The last line is `total` right-aligned in 13, ` = `, and the sum of the valid durations in the same
  format.

For `59 3600 90061 -5`:

```
           59 = 00:00:59
         3600 = 01:00:00
        90061 = 1d 01:01:01
           -5 = invalid
        total = 1d 02:02:00
```

```cpp starter
#include <iostream>

int main() {
    long long s = 0;
    while (std::cin >> s) {
        std::cout << s << " = " << s / 3600 << " hours\n";
    }
}
```

```cpp solution
#include <format>
#include <iostream>
#include <string>

std::string duration(long long s) {
    long long days = s / 86400;
    s %= 86400;
    std::string clock = std::format("{:02}:{:02}:{:02}", s / 3600, s / 60 % 60, s % 60);
    if (days > 0) {
        return std::format("{}d {}", days, clock);
    }
    return clock;
}

int main() {
    long long s = 0;
    long long total = 0;
    while (std::cin >> s) {
        if (s < 0) {
            std::cout << std::format("{:>13} = invalid\n", s);
        } else {
            std::cout << std::format("{:>13} = {}\n", s, duration(s));
            total += s;
        }
    }
    std::cout << std::format("{:>13} = {}\n", "total", duration(total));
}
```

```hint
Peel off the units from the largest: days are `s / 86400`; what's left is `s % 86400`, which splits into
hours `/ 3600`, minutes `/ 60 % 60` and seconds `% 60`.
```

```hint
The numbers go up to a trillion, far more than an `int` can hold. Use `long long` everywhere.
```
```stdin
59 3600 90061 -5
```

```expected
           59 = 00:00:59
         3600 = 01:00:00
        90061 = 1d 01:01:01
           -5 = invalid
        total = 1d 02:02:00
```

```stdin
```

```expected hidden
        total = 00:00:00
```

```stdin
0
```

```expected hidden
            0 = 00:00:00
        total = 00:00:00
```

```stdin
86399 86400 1
```

```expected hidden
        86399 = 23:59:59
        86400 = 1d 00:00:00
            1 = 00:00:01
        total = 2d 00:00:00
```

```stdin
1000000000000 -1000000000000
```

```expected hidden
1000000000000 = 11574074d 01:46:40
-1000000000000 = invalid
        total = 11574074d 01:46:40
```

```stdin
-1
```

```expected hidden
           -1 = invalid
        total = 00:00:00
```

:::

:::quiz
What does this print? (`_` marks a space)

```cpp
std::cout << std::setfill('*') << std::setw(5) << 42 << '|'
          << std::left << std::setw(4) << 7 << '|' << std::setw(2) << -1 << '|' << 8 << '\n';
```

- [x] `***42|7***|-1|8`
- [ ] `***42|***7|-1|8`
- [ ] `***42|7___|-1|8`
- [ ] `***42|7***|-1|8***`

`setfill` and `left` are sticky, `setw` is not. `7` is left-aligned and padded with `*`; `-1` is exactly
2 characters wide, so it gets no padding; `8` has no width at all.
:::

:::quiz
The input is `12 abc 7`. What does this print?

```cpp
int a = -1, b = -1, c = -1;
std::string s = "?";
std::cin >> a >> b >> s >> c;
std::cout << a << ' ' << b << ' ' << s << ' ' << c;
```

- [ ] `12 -1 abc 7`
- [x] `12 0 ? -1`
- [ ] `12 0 abc 7`
- [ ] `12 -1 ? -1`

`a` gets 12. Reading `abc` into the `int` `b` fails, which stores `0` in `b` and puts the stream into the
fail state, so the reads into `s` and `c` do nothing and they keep their old values.
:::
