---
title: "Control Flow: Challenges"
summary: Hard problems that combine conditions, switch and every kind of loop with the input, output and formatting you already know.
---

These problems are meant to be **hard**. They are classic exercises (FizzBuzz with a twist, primes
without arrays, digit tricks, patterns, a calendar) written as complete programs with exact input and
output formats. The hidden tests check the edge cases: empty ranges, negative numbers, leading zeros,
the first and last cases of every rule.

No arrays or vectors are needed (or allowed in spirit): everything can be done with variables, nested
loops and careful conditions. Try each problem before you look at the hints.

:::exercise FizzBuzz deluxe {hard}
The classic FizzBuzz, with more rules.

**Input:** two integers `a` and `b` (between `-1000` and `1000`, and at most 40 apart). Go through every
integer from `a` to `b` **inclusive**, counting **down** if `a > b`.
**Output:** one line per number, then a summary line.

- Build a word from the rules that apply, in this order: `Fizz` if the number is divisible by 3, `Buzz`
  if divisible by 5, `Bazz` if divisible by 7. So 15 is `FizzBuzz`, 21 is `FizzBazz`, and 0 is
  `FizzBuzzBazz`.
- If no rule applies but the number **contains the digit 7** (like 17 or -71), print `Lucky`.
- Otherwise print the number itself.
- The summary counts how often each word appeared (a `FizzBuzz` counts once for `Fizz` and once for
  `Buzz`) and how many plain numbers were printed:
  `Fizz: F, Buzz: B, Bazz: Z, Lucky: L, numbers: N`

For `21 14`:

```
FizzBazz
Buzz
19
Fizz
Lucky
16
FizzBuzz
Bazz
Fizz: 3, Buzz: 2, Bazz: 2, Lucky: 1, numbers: 2
```

```cpp starter
#include <iostream>

int main() {
    int a = 0, b = 0;
    std::cin >> a >> b;
    for (int n = a; n <= b; ++n) {
        if (n % 15 == 0) {
            std::cout << "FizzBuzz\n";
        } else {
            std::cout << n << '\n';
        }
    }
}
```

```cpp solution
#include <iostream>

int main() {
    int a = 0, b = 0;
    std::cin >> a >> b;
    int step = a <= b ? 1 : -1;
    int fizz = 0, buzz = 0, bazz = 0, lucky = 0, numbers = 0;

    for (int n = a; n != b + step; n += step) {
        bool any = false;
        if (n % 3 == 0) {
            std::cout << "Fizz";
            ++fizz;
            any = true;
        }
        if (n % 5 == 0) {
            std::cout << "Buzz";
            ++buzz;
            any = true;
        }
        if (n % 7 == 0) {
            std::cout << "Bazz";
            ++bazz;
            any = true;
        }
        if (!any) {
            bool hasSeven = false;
            for (int rest = n < 0 ? -n : n; rest > 0; rest /= 10) {
                if (rest % 10 == 7) {
                    hasSeven = true;
                }
            }
            if (hasSeven) {
                std::cout << "Lucky";
                ++lucky;
            } else {
                std::cout << n;
                ++numbers;
            }
        }
        std::cout << '\n';
    }
    std::cout << "Fizz: " << fizz << ", Buzz: " << buzz << ", Bazz: " << bazz
              << ", Lucky: " << lucky << ", numbers: " << numbers << '\n';
}
```

```hint
Don't write one branch per combination. Print each part that applies, one after the other, and use a
`bool` to remember whether anything was printed.
```

```hint
To look for a 7, peel off the digits of the absolute value with `% 10` and `/ 10`.
```

```hint
To go in either direction with one loop, compute `step` (`1` or `-1`) first and stop when `n` reaches
`b + step`.
```
```stdin
21 14
```

```expected
FizzBazz
Buzz
19
Fizz
Lucky
16
FizzBuzz
Bazz
Fizz: 3, Buzz: 2, Bazz: 2, Lucky: 1, numbers: 2
```

```stdin
1 1
```

```expected hidden
1
Fizz: 0, Buzz: 0, Bazz: 0, Lucky: 0, numbers: 1
```

```stdin
0 0
```

```expected hidden
FizzBuzzBazz
Fizz: 1, Buzz: 1, Bazz: 1, Lucky: 0, numbers: 0
```

```stdin
-21 -14
```

```expected hidden
FizzBazz
Buzz
-19
Fizz
Lucky
-16
FizzBuzz
Bazz
Fizz: 3, Buzz: 2, Bazz: 2, Lucky: 1, numbers: 2
```

```stdin
70 80
```

```expected hidden
BuzzBazz
Lucky
Fizz
Lucky
Lucky
FizzBuzz
Lucky
Bazz
Fizz
Lucky
Buzz
Fizz: 3, Buzz: 3, Bazz: 2, Lucky: 5, numbers: 0
```

```stdin
5 5
```

```expected hidden
Buzz
Fizz: 0, Buzz: 1, Bazz: 0, Lucky: 0, numbers: 0
```

```stdin
-1 1
```

```expected hidden
-1
FizzBuzzBazz
1
Fizz: 1, Buzz: 1, Bazz: 1, Lucky: 0, numbers: 2
```

:::

:::exercise Prime gaps {hard}
Study the primes in a range, without storing them anywhere.

**Input:** two integers `a` and `b` (`1 <= a <= b <= 200000`).
**Output:** three lines about the primes `p` with `a <= p <= b`:

```
Primes: N
Twin pairs: T
Largest gap: G (P to Q)
```

- **Twin pairs** are pairs `p`, `p + 2` that are **both** prime and both inside the range (3 and 5, 5 and
  7, 11 and 13, ...).
- The **largest gap** is the largest difference between two **consecutive** primes in the range; `P` and
  `Q` are those two primes (the first such pair if there are several). With fewer than two primes in the
  range, print `Largest gap: none`.

For `1 30`:

```
Primes: 10
Twin pairs: 4
Largest gap: 6 (23 to 29)
```

```cpp starter
#include <iostream>

int main() {
    int a = 0, b = 0;
    std::cin >> a >> b;
    std::cout << "Primes: 0\n";
}
```

```cpp solution
#include <iostream>

int main() {
    int a = 0, b = 0;
    std::cin >> a >> b;

    int count = 0, twins = 0;
    int previous = 0;            // the previous prime in the range, 0 if none yet
    int bestGap = 0, gapFrom = 0, gapTo = 0;

    for (int n = a; n <= b; ++n) {
        bool prime = n >= 2;
        for (int d = 2; d * d <= n && prime; ++d) {
            if (n % d == 0) {
                prime = false;
            }
        }
        if (!prime) {
            continue;
        }
        ++count;
        if (previous != 0) {
            if (n - previous == 2) {
                ++twins;
            }
            if (n - previous > bestGap) {
                bestGap = n - previous;
                gapFrom = previous;
                gapTo = n;
            }
        }
        previous = n;
    }

    std::cout << "Primes: " << count << '\n';
    std::cout << "Twin pairs: " << twins << '\n';
    if (count < 2) {
        std::cout << "Largest gap: none\n";
    } else {
        std::cout << "Largest gap: " << bestGap << " (" << gapFrom << " to " << gapTo << ")\n";
    }
}
```

```hint
Test each number with trial division: try divisors `d` while `d * d <= n`. Numbers below 2 aren't
prime. Stop testing a number as soon as you find a divisor.
```

```hint
You only ever need the **previous** prime: a twin pair is two consecutive primes that differ by 2, and a
gap is the difference between consecutive primes.
```

```hint
Only replace the largest gap when the new one is **strictly** larger, so the first one wins ties.
```
```stdin
1 30
```

```expected
Primes: 10
Twin pairs: 4
Largest gap: 6 (23 to 29)
```

```stdin
1 1
```

```expected hidden
Primes: 0
Twin pairs: 0
Largest gap: none
```

```stdin
14 16
```

```expected hidden
Primes: 0
Twin pairs: 0
Largest gap: none
```

```stdin
2 3
```

```expected hidden
Primes: 2
Twin pairs: 0
Largest gap: 1 (2 to 3)
```

```stdin
17 17
```

```expected hidden
Primes: 1
Twin pairs: 0
Largest gap: none
```

```stdin
1 200000
```

```expected hidden
Primes: 17984
Twin pairs: 2160
Largest gap: 86 (155921 to 156007)
```

```stdin
113 127
```

```expected hidden
Primes: 2
Twin pairs: 0
Largest gap: 14 (113 to 127)
```

:::

:::exercise Kaprekar's routine {hard}
Take a four-digit number whose digits are not all the same. Arrange its digits in **descending** order
and in **ascending** order, and subtract the smaller number from the larger. Repeat with the result.
In 1949 D. R. Kaprekar noticed that you always reach **6174** within at most 7 steps, and then stay there
(`7641 - 1467 = 6174`).

Numbers always have **four digits**, with leading zeros if needed: `21` is `0021`, and a result of `999`
is `0999` (so the next step is `9990 - 0999`).

**Input:** one integer `n` (`1 <= n <= 9999`).
**Output:**

- If all four digits of `n` (with leading zeros) are equal, print `n has no Kaprekar routine` (with `n`
  printed as four digits).
- Otherwise print every step as `DDDD - AAAA = RRRR` (all three as four digits), until a step produces
  6174. If `n` is already 6174, that's one step. Finish with `Reached 6174 in K steps` (`1 step` for one).

For `2111`:

```
2111 - 1112 = 0999
9990 - 0999 = 8991
9981 - 1899 = 8082
8820 - 0288 = 8532
8532 - 2358 = 6174
Reached 6174 in 5 steps
```

```cpp starter
#include <iostream>

int main() {
    int n = 0;
    std::cin >> n;
    std::cout << n << '\n';
}
```

```cpp solution
#include <format>
#include <iostream>

int main() {
    int n = 0;
    std::cin >> n;

    if (n % 1111 == 0) {
        std::cout << std::format("{:04} has no Kaprekar routine\n", n);
        return 0;
    }

    int steps = 0;
    do {
        // Sort the digits: for each digit value from 9 down to 0, append it as often as it occurs.
        int descending = 0, ascending = 0;
        for (int digit = 9; digit >= 0; --digit) {
            int rest = n;
            for (int i = 0; i < 4; ++i) {
                if (rest % 10 == digit) {
                    descending = descending * 10 + digit;
                }
                rest /= 10;
            }
        }
        for (int digit = 0; digit <= 9; ++digit) {
            int rest = n;
            for (int i = 0; i < 4; ++i) {
                if (rest % 10 == digit) {
                    ascending = ascending * 10 + digit;
                }
                rest /= 10;
            }
        }
        n = descending - ascending;
        ++steps;
        std::cout << std::format("{:04} - {:04} = {:04}\n", descending, ascending, n);
    } while (n != 6174);

    std::cout << "Reached 6174 in " << steps << (steps == 1 ? " step" : " steps") << '\n';
}
```

```hint
You can sort four digits without an array: for each digit value from 9 down to 0, walk over the four
digits of `n` (`% 10` and `/ 10`, exactly four times, so leading zeros are included) and append every
digit that equals the value: `result = result * 10 + digit`.
```

```hint
The "all digits equal" numbers are exactly the multiples of 1111.
```

```hint
6174 itself must still produce one step, so this is a job for `do`-`while`. Print with
`std::format("{:04}", x)` or `std::setfill('0') << std::setw(4)`.
```
```stdin
2111
```

```expected
2111 - 1112 = 0999
9990 - 0999 = 8991
9981 - 1899 = 8082
8820 - 0288 = 8532
8532 - 2358 = 6174
Reached 6174 in 5 steps
```

```stdin
6174
```

```expected
7641 - 1467 = 6174
Reached 6174 in 1 step
```

```stdin
3524
```

```expected hidden
5432 - 2345 = 3087
8730 - 0378 = 8352
8532 - 2358 = 6174
Reached 6174 in 3 steps
```

```stdin
1111
```

```expected hidden
1111 has no Kaprekar routine
```

```stdin
21
```

```expected hidden
2100 - 0012 = 2088
8820 - 0288 = 8532
8532 - 2358 = 6174
Reached 6174 in 3 steps
```

```stdin
9998
```

```expected hidden
9998 - 8999 = 0999
9990 - 0999 = 8991
9981 - 1899 = 8082
8820 - 0288 = 8532
8532 - 2358 = 6174
Reached 6174 in 5 steps
```

```stdin
1000
```

```expected hidden
1000 - 0001 = 0999
9990 - 0999 = 8991
9981 - 1899 = 8082
8820 - 0288 = 8532
8532 - 2358 = 6174
Reached 6174 in 5 steps
```

```stdin
7777
```

```expected hidden
7777 has no Kaprekar routine
```

:::

:::exercise Letter diamond {hard}
Print a diamond of letters, a classic warm-up kata. For the letter `C`:

```
  A
 B B
C   C
 B B
  A
```

**Input:** one character.
**Output:**

- For an upper-case letter `L`, a diamond with `2k + 1` rows, where `k` is the distance from `A` to `L`
  (so `A` gives the single line `A`). Row `i` (from 0) of the top half has `k - i` leading spaces and the
  `i`-th letter; except for `A`, the letter appears twice with `2i - 1` spaces between. The bottom half
  mirrors the top. There are no spaces after the last letter of a row.
- For a lower-case letter, the same diamond made of lower-case letters.
- For anything else: `invalid`.

```cpp starter
#include <iostream>

int main() {
    char letter = ' ';
    std::cin >> letter;
    std::cout << letter << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    char letter = ' ';
    std::cin >> letter;

    char first = ' ';
    if (letter >= 'A' && letter <= 'Z') {
        first = 'A';
    } else if (letter >= 'a' && letter <= 'z') {
        first = 'a';
    } else {
        std::cout << "invalid\n";
        return 0;
    }

    int k = letter - first;
    for (int row = 0; row <= 2 * k; ++row) {
        int i = row <= k ? row : 2 * k - row;      // distance from the top or bottom tip
        for (int s = 0; s < k - i; ++s) {
            std::cout << ' ';
        }
        char c = static_cast<char>(first + i);
        std::cout << c;
        if (i > 0) {
            for (int s = 0; s < 2 * i - 1; ++s) {
                std::cout << ' ';
            }
            std::cout << c;
        }
        std::cout << '\n';
    }
}
```

```hint
Loop over all `2k + 1` rows and compute, for each row, how far it is from the nearest tip:
`i = row` in the top half and `i = 2k - row` in the bottom half. Then every row is drawn the same way.
```

```hint
The `i`-th letter is `first + i`, where `first` is `'A'` or `'a'`. Convert back with
`static_cast<char>(...)` before printing it.
```
```stdin
C
```

```expected
  A
 B B
C   C
 B B
  A
```

```stdin
A
```

```expected
A
```

```stdin
a
```

```expected hidden
a
```

```stdin
e
```

```expected hidden
    a
   b b
  c   c
 d     d
e       e
 d     d
  c   c
   b b
    a
```

```stdin
?
```

```expected hidden
invalid
```

```stdin
B
```

```expected hidden
 A
B B
 A
```

:::

:::exercise Month calendar {hard}
Print a month calendar like the Unix `cal` command, with weeks starting on **Monday**.

**Input:** two integers `month year` (`1583 <= year <= 9999`, the Gregorian calendar).
**Output:** `invalid month` if `month` isn't 1 to 12. Otherwise:

1. The month's English name, a space and the year, **centered** in a field of 20 characters (when the
   padding is odd, the extra space goes on the right).
2. The header `Mo Tu We Th Fr Sa Su`.
3. One line per week. Each day is right-aligned in a field of 2, and the days are separated by single
   spaces, so every number sits under its weekday. The first week starts with blanks for the days before
   the 1st. There are no spaces after the last day of a line.

For `11 2026`:

```
   November 2026
Mo Tu We Th Fr Sa Su
                   1
 2  3  4  5  6  7  8
 9 10 11 12 13 14 15
16 17 18 19 20 21 22
23 24 25 26 27 28 29
30
```

To find the weekday of the 1st, use **Zeller's congruence**: for day `q` of month `m` in year `y`, first
treat January and February as months 13 and 14 of the **previous** year. With `K = y % 100` and
`J = y / 100`:

```
h = (q + 13 * (m + 1) / 5 + K + K / 4 + J / 4 + 5 * J) % 7
```

gives `0` for Saturday, `1` for Sunday, `2` for Monday, ..., `6` for Friday (all divisions are integer
divisions).

```cpp starter
#include <iostream>

int main() {
    int month = 0, year = 0;
    std::cin >> month >> year;
    std::cout << "Mo Tu We Th Fr Sa Su\n";
}
```

```cpp solution
#include <format>
#include <iostream>
#include <string>

int main() {
    int month = 0, year = 0;
    std::cin >> month >> year;

    std::string name;
    int days = 31;
    switch (month) {
        case 1: name = "January"; break;
        case 2: name = "February"; break;
        case 3: name = "March"; break;
        case 4: name = "April"; days = 30; break;
        case 5: name = "May"; break;
        case 6: name = "June"; days = 30; break;
        case 7: name = "July"; break;
        case 8: name = "August"; break;
        case 9: name = "September"; days = 30; break;
        case 10: name = "October"; break;
        case 11: name = "November"; days = 30; break;
        case 12: name = "December"; break;
        default:
            std::cout << "invalid month\n";
            return 0;
    }
    if (month == 2) {
        bool leap = (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
        days = leap ? 29 : 28;
    }

    // Zeller's congruence for the 1st of the month.
    int m = month, y = year;
    if (m < 3) {
        m += 12;
        y -= 1;
    }
    int K = y % 100, J = y / 100;
    int h = (1 + 13 * (m + 1) / 5 + K + K / 4 + J / 4 + 5 * J) % 7;
    int column = (h + 5) % 7;          // 0 = Monday, ..., 6 = Sunday

    std::cout << std::format("{:^20}\n", name + " " + std::to_string(year));
    std::cout << "Mo Tu We Th Fr Sa Su\n";
    for (int c = 0; c < column; ++c) {
        std::cout << "   ";
    }
    for (int day = 1; day <= days; ++day) {
        std::cout << std::format("{:2}", day);
        if (column == 6 || day == days) {
            std::cout << '\n';
            column = 0;
        } else {
            std::cout << ' ';
            ++column;
        }
    }
}
```

```hint
Zeller gives Saturday = 0, Sunday = 1, Monday = 2. Convert it to a column where Monday = 0:
`(h + 5) % 7`.
```

```hint
Print three spaces for every blank day before the 1st. Then print the days, keeping track of the
column: after column 6 (Sunday), or after the last day of the month, end the line.
```

```hint
Centering: `std::format("{:^20}", text)`. The number of days per month is a job for `switch`, with
February depending on leap years.
```
```stdin
11 2026
```

```expected
   November 2026
Mo Tu We Th Fr Sa Su
                   1
 2  3  4  5  6  7  8
 9 10 11 12 13 14 15
16 17 18 19 20 21 22
23 24 25 26 27 28 29
30
```

```stdin
2 2024
```

```expected hidden
   February 2024
Mo Tu We Th Fr Sa Su
          1  2  3  4
 5  6  7  8  9 10 11
12 13 14 15 16 17 18
19 20 21 22 23 24 25
26 27 28 29
```

```stdin
2 2021
```

```expected hidden
   February 2021
Mo Tu We Th Fr Sa Su
 1  2  3  4  5  6  7
 8  9 10 11 12 13 14
15 16 17 18 19 20 21
22 23 24 25 26 27 28
```

```stdin
13 2024
```

```expected hidden
invalid month
```

```stdin
1 2000
```

```expected hidden
    January 2000
Mo Tu We Th Fr Sa Su
                1  2
 3  4  5  6  7  8  9
10 11 12 13 14 15 16
17 18 19 20 21 22 23
24 25 26 27 28 29 30
31
```

```stdin
12 9999
```

```expected hidden
   December 9999
Mo Tu We Th Fr Sa Su
       1  2  3  4  5
 6  7  8  9 10 11 12
13 14 15 16 17 18 19
20 21 22 23 24 25 26
27 28 29 30 31
```

```stdin
6 2025
```

```expected hidden
     June 2025
Mo Tu We Th Fr Sa Su
                   1
 2  3  4  5  6  7  8
 9 10 11 12 13 14 15
16 17 18 19 20 21 22
23 24 25 26 27 28 29
30
```

:::

:::quiz
What does this print? (It compiles, with a fallthrough warning.)

```cpp
for (int i = 0; i < 4; ++i) {
    switch (i % 3) {
        case 0: std::cout << 'a';
        case 1: std::cout << 'b'; continue;
        default: std::cout << 'c';
    }
    std::cout << '.';
}
```

- [ ] `ab.b.c.ab.`
- [x] `abbc.ab`
- [ ] `abc.`
- [ ] `ab`

`continue` isn't stopped by a `switch` (only `break` is), so it jumps straight to the loop's next
iteration and skips the `'.'`. Case 0 falls through into case 1. Only `i == 2` reaches `default` and
then the `'.'`.
:::

:::quiz
What does this print?

```cpp
int i = 10;
for (int i = 0; i < 3; ++i) { }
int n = 0;
while (n++ < 3);
std::cout << i << ' ' << n;
```

- [ ] `3 3`
- [ ] `10 3`
- [x] `10 4`
- [ ] `3 4`

The `for` loop declares its own `i`, which shadows the outer one and disappears after the loop, so the
outer `i` is still 10. The `while` has an empty body (the `;`), and `n++ < 3` compares the old value:
the test fails when `n` was 3, but the increment still happens, leaving `n` at 4.
:::
