---
title: "Operators & Expressions: Challenges"
summary: Hard problems that combine arithmetic, remainders, overflow, logic, bit manipulation and the conditional operator into small real programs.
---

These problems are meant to be **hard**. Each one is a small program with a precise specification and
inputs chosen to break the first solution that comes to mind: negative remainders, sums that overflow,
shifts that go too far, precedence that groups things differently than you meant. Read the constraints
carefully; they tell you which types you need. Try each problem on your own, without the hints, and
use the solution only to compare once you're done.

You haven't learned `if` or loops yet, and you don't need them: everything here can be done with
expressions, `?:`, `&&`/`||`, and the operators from this module.

:::exercise Clock arithmetic {hard}
A 24-hour clock shows `HH:MM`. Move it forward (or backward) by a number of minutes and print the new
time. The clock wraps around midnight, possibly many times.

**Input:** a time `HH:MM` (00 ≤ HH ≤ 23, 00 ≤ MM ≤ 59), then an integer `offset` in minutes
(−10¹⁸ ≤ offset ≤ 10¹⁸, negative means backward). Read the time with
`std::cin >> hours >> colon >> minutes`, where `colon` is a `char` that swallows the `:`.
**Output:** the new time as `HH:MM`, always two digits each, newline.

| Input | Output |
| --- | --- |
| `23:59 1` | `00:00` |
| `00:00 -1` | `23:59` |
| `07:05 0` | `07:05` |

```cpp starter
#include <iostream>

int main() {
    // read the time and the offset, print the new time
}
```

```cpp solution
#include <iostream>

int main() {
    constexpr long long minutesPerDay = 24 * 60;

    int hours{}, minutes{};
    char colon{};
    long long offset{};
    std::cin >> hours >> colon >> minutes >> offset;

    long long total = hours * 60 + minutes + offset;
    long long wrapped = (total % minutesPerDay + minutesPerDay) % minutesPerDay;
    long long h = wrapped / 60;
    long long m = wrapped % 60;

    std::cout << (h < 10 ? "0" : "") << h << ':' << (m < 10 ? "0" : "") << m << '\n';
}
```

```hint
Convert everything to "minutes since midnight", add the offset, and wrap into `0 .. 1439`. Remember
that `%` keeps the sign of the left operand, so a negative total needs the `(x % n + n) % n` trick.
```

```hint
The offset can be up to 10¹⁸, far beyond an `int`. And to print `7` as `07`, put a conditional in front
of the number: `(h < 10 ? "0" : "")`.
```

```stdin
23:59 1
```

```expected
00:00
```

```stdin
00:00 -1
```

```expected
23:59
```

```stdin
07:05 0
```

```expected
07:05
```

```stdin
12:30 -1000000000
```

```expected hidden
01:50
```

```stdin
09:09 1000000000000000000
```

```expected hidden
19:49
```

```stdin
00:00 1440
```

```expected hidden
00:00
```

```stdin
10:00 -600
```

```expected hidden
00:00
```

```stdin
05:07 -2881
```

```expected hidden
05:06
```

```stdin
23:59 -1000000000000000000
```

```expected hidden
13:19
```

```stdin
13:45 0
```

```expected hidden
13:45
```

```checks
must % :: Wrap the minutes with %.
must \? :: Use ?: to pad with a leading zero.
```
:::

:::exercise Permission bits {hard}
Unix file permissions are 12 bits, usually written as an **octal** number like `755`. The low 9 bits
are three groups of `rwx` (read, write, execute) for the owner, the group, and everyone else:

```
octal digit:   special    owner     group     other
bits:          11 10 9    8 7 6     5 4 3     2 1 0
meaning:       u  g  t    r w x     r w x     r w x
```

`ls -l` shows them as 9 characters: the letter if the bit is set, `-` if not. So `754` is `rwxr-xr--`.
The three **special** bits change the execute letters:

- **setuid** (bit 11, octal `4000`): the owner's execute letter becomes `s` if owner-execute is set, `S` if not;
- **setgid** (bit 10, octal `2000`): the group's execute letter becomes `s` or `S` the same way;
- **sticky** (bit 9, octal `1000`): the others' execute letter becomes `t` if other-execute is set, `T` if not.

**Input:** one octal number of up to four digits (0 ≤ mode ≤ 7777 in octal).
**Output:** the 9-character permission string, newline.

| Input | Output |
| --- | --- |
| `754` | `rwxr-xr--` |
| `4755` | `rwsr-xr-x` |
| `1644` | `rw-r--r-T` |

```cpp starter
#include <iostream>

int main() {
    unsigned int mode{};
    std::cin >> mode;
    std::cout << mode << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    unsigned int mode{};
    std::cin >> std::oct >> mode;

    bool setuid = (mode & 04000) != 0;
    bool setgid = (mode & 02000) != 0;
    bool sticky = (mode & 01000) != 0;
    bool ownerX = (mode & 0100) != 0;
    bool groupX = (mode & 010) != 0;
    bool otherX = (mode & 01) != 0;

    std::cout << ((mode & 0400) != 0 ? 'r' : '-') << ((mode & 0200) != 0 ? 'w' : '-')
              << (setuid ? (ownerX ? 's' : 'S') : (ownerX ? 'x' : '-'))
              << ((mode & 040) != 0 ? 'r' : '-') << ((mode & 020) != 0 ? 'w' : '-')
              << (setgid ? (groupX ? 's' : 'S') : (groupX ? 'x' : '-'))
              << ((mode & 04) != 0 ? 'r' : '-') << ((mode & 02) != 0 ? 'w' : '-')
              << (sticky ? (otherX ? 't' : 'T') : (otherX ? 'x' : '-')) << '\n';
}
```

```hint
Read the number with `std::cin >> std::oct >> mode;` so that `754` means octal 754. Then each
permission is one bit, and octal literals like `0400` (owner read) make the masks easy to write.
```

```hint
Test a bit with `(mode & mask) != 0` (parenthesized!) and turn it into a letter with `?:`. The execute
positions need a nested conditional: first "is the special bit set?", then "is execute set?".
```

```stdin
754
```

```expected
rwxr-xr--
```

```stdin
4755
```

```expected
rwsr-xr-x
```

```stdin
1644
```

```expected
rw-r--r-T
```

```stdin
0
```

```expected hidden
---------
```

```stdin
777
```

```expected hidden
rwxrwxrwx
```

```stdin
644
```

```expected hidden
rw-r--r--
```

```stdin
2750
```

```expected hidden
rwxr-s---
```

```stdin
1777
```

```expected hidden
rwxrwxrwt
```

```stdin
7000
```

```expected hidden
--S--S--T
```

```stdin
7777
```

```expected hidden
rwsrwsrwt
```

```stdin
421
```

```expected hidden
r---w---x
```

```stdin
0644
```

```expected hidden
rw-r--r--
```

```stdin
4644
```

```expected hidden
rwSr--r--
```

```checks
must & :: Test the bits with &.
must \? :: Choose each letter with ?:.
```
:::

:::exercise Triangle classifier {hard}
Read three side lengths and classify the triangle they form.

- If they can't form a real triangle, print `invalid`. Three lengths form a (non-flat) triangle exactly
  when **each** side is shorter than the sum of the other two. A side of length 0 is never valid.
- Otherwise print `equilateral` (all three equal), `isosceles` (exactly two equal) or `scalene` (all
  different).
- If a valid triangle is **right-angled** (the squares of the two shorter sides add up to the square of
  the longest), append ` right` (a space, then `right`).

The sides can be given in any order.

**Input:** three integers `a b c` (0 ≤ a, b, c ≤ 2,000,000,000).
**Output:** the classification, newline.

| Input | Output |
| --- | --- |
| `3 4 5` | `scalene right` |
| `2 2 3` | `isosceles` |
| `1 1 2` | `invalid` |

```cpp starter
#include <iostream>

int main() {
    // read three sides and classify them
}
```

```cpp solution
#include <iostream>

int main() {
    long long a{}, b{}, c{};
    std::cin >> a >> b >> c;

    bool valid = a + b > c && a + c > b && b + c > a;
    bool right = a * a + b * b == c * c || a * a + c * c == b * b || b * b + c * c == a * a;
    bool equilateral = a == b && b == c;
    bool isosceles = a == b || b == c || a == c;

    std::cout << (!valid         ? "invalid"
                  : equilateral ? "equilateral"
                  : isosceles   ? "isosceles"
                                : "scalene")
              << (valid && right ? " right" : "") << '\n';
}
```

```hint
You don't need to sort the sides: check all three versions of each condition (`a + b > c`,
`a + c > b`, `b + c > a`) and combine them with `&&` or `||`.
```

```hint
With sides up to 2,000,000,000, `a + b` overflows an `int`, and `a * a` is 4 × 10¹⁸. Is there a type
that holds `a * a + b * b`? (It just fits.)
```

```stdin
3 4 5
```

```expected
scalene right
```

```stdin
2 2 3
```

```expected
isosceles
```

```stdin
1 1 2
```

```expected
invalid
```

```stdin
5 5 5
```

```expected hidden
equilateral
```

```stdin
5 3 4
```

```expected hidden
scalene right
```

```stdin
2000000000 2000000000 2000000000
```

```expected hidden
equilateral
```

```stdin
2000000000 2000000000 1
```

```expected hidden
isosceles
```

```stdin
0 5 5
```

```expected hidden
invalid
```

```stdin
0 0 0
```

```expected hidden
invalid
```

```stdin
1200000000 1600000000 2000000000
```

```expected hidden
scalene right
```

```stdin
7 10 5
```

```expected hidden
scalene
```

```stdin
10 6 8
```

```expected hidden
scalene right
```

```stdin
1 2 2
```

```expected hidden
isosceles
```

```stdin
1000000000 1000000000 2000000000
```

```expected hidden
invalid
```

```checks
must \? :: Use ?: to pick the words.
must && :: Combine conditions with &&.
```
:::

:::exercise Saturating arithmetic {hard}
Audio and graphics code often uses **saturating** arithmetic: when a result is too big for the type, it
is clamped to the largest (or smallest) value instead of overflowing. Implement it for 32-bit `int`.

**Input:** two integers `a b` (each between −2,147,483,648 and 2,147,483,647).
**Output:** two lines:

```
sum: <a + b, clamped to the int range>
product: <a * b, clamped to the int range>
```

The int range is −2,147,483,648 to 2,147,483,647. For `2147483647 2`:

```
sum: 2147483647
product: 2147483647
```

```cpp starter
#include <iostream>
#include <limits>

int main() {
    int a{}, b{};
    std::cin >> a >> b;
    std::cout << "sum: " << a + b << '\n';
}
```

```cpp solution
#include <iostream>
#include <limits>

int main() {
    constexpr long long lowest = std::numeric_limits<int>::min();
    constexpr long long highest = std::numeric_limits<int>::max();

    int a{}, b{};
    std::cin >> a >> b;

    long long sum = static_cast<long long>(a) + b;
    long long product = static_cast<long long>(a) * b;

    std::cout << "sum: " << (sum > highest ? highest : sum < lowest ? lowest : sum) << '\n';
    std::cout << "product: " << (product > highest ? highest : product < lowest ? lowest : product)
              << '\n';
}
```

```hint
You can't detect `int` overflow after it happened: by then it's undefined behavior. Compute the exact
result in a wider type first. Does the product of two `int`s always fit in a `long long`?
```

```hint
Clamping is a nested conditional: `x > highest ? highest : x < lowest ? lowest : x`. Get the limits from
`std::numeric_limits<int>` instead of typing the numbers.
```

```stdin
2147483647 2
```

```expected
sum: 2147483647
product: 2147483647
```

```stdin
5 -7
```

```expected
sum: -2
product: -35
```

```stdin
-2147483648 -1
```

```expected hidden
sum: -2147483648
product: 2147483647
```

```stdin
2147483647 -2147483648
```

```expected hidden
sum: -1
product: -2147483648
```

```stdin
65536 65536
```

```expected hidden
sum: 131072
product: 2147483647
```

```stdin
-65536 65536
```

```expected hidden
sum: 0
product: -2147483648
```

```stdin
0 0
```

```expected hidden
sum: 0
product: 0
```

```stdin
-2147483648 -2147483648
```

```expected hidden
sum: -2147483648
product: 2147483647
```

```stdin
46341 46340
```

```expected hidden
sum: 92681
product: 2147441940
```

```stdin
-1 1
```

```expected hidden
sum: 0
product: -1
```

```checks
must \? :: Clamp with the conditional operator.
```
:::

:::exercise Round up to a power of two {hard}
Hash tables and memory allocators often round sizes up to the next power of two. Read `x` and print the
**smallest power of two that is ≥ x**.

**Rules:** no loops and no library helpers (`std::bit_ceil`, `std::pow`, `std::log2`, ...). Use bitwise
operators.

**Input:** one integer `x` (1 ≤ x ≤ 2,147,483,648).
**Output:** the power of two, newline.

| Input | Output |
| --- | --- |
| `5` | `8` |
| `16` | `16` |
| `1000` | `1024` |

```cpp starter
#include <iostream>

int main() {
    unsigned int x{};
    std::cin >> x;
    std::cout << x << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    unsigned int x{};
    std::cin >> x;
    unsigned int v = x - 1;   // so that exact powers of two stay the same
    v |= v >> 1;              // copy the highest set bit into every lower position
    v |= v >> 2;
    v |= v >> 4;
    v |= v >> 8;
    v |= v >> 16;
    std::cout << v + 1 << '\n';   // all ones + 1 is the next power of two
}
```

```hint
A number like `0b0001'1111` (all ones below some position) plus 1 is a power of two. Can you turn
`0b0001'0100` into `0b0001'1111`? `v |= v >> 1` copies every 1 bit one position down. What do
`v |= v >> 2`, `>> 4`, ... add?
```

```hint
Start from `x - 1`, not `x`, so that a power of two like 16 maps to itself and not to 32. Check that
`x = 1` and `x = 2147483648` still work.
```

```stdin
5
```

```expected
8
```

```stdin
16
```

```expected
16
```

```stdin
1000
```

```expected
1024
```

```stdin
1
```

```expected hidden
1
```

```stdin
2
```

```expected hidden
2
```

```stdin
3
```

```expected hidden
4
```

```stdin
1025
```

```expected hidden
2048
```

```stdin
65537
```

```expected hidden
131072
```

```stdin
2147483647
```

```expected hidden
2147483648
```

```stdin
2147483648
```

```expected hidden
2147483648
```

```stdin
1000000000
```

```expected hidden
1073741824
```

```stdin
1073741825
```

```expected hidden
2147483648
```

```checks
must >> :: Use shifts.
must \| :: Use | to spread the bits.
mustnot bit_ceil|bit_width|countl_zero|has_single_bit|\bpow\b|\blog2?\b :: Use bitwise operators, not library helpers.
```
:::

:::quiz
What does this print? (C++20)

```cpp
int i = 5;
std::cout << (i++ > 5 ? i : -i) << ' ' << i;
```

- [x] `-6 6`
- [ ] `-5 6`
- [ ] `6 6`
- [ ] It's undefined behavior

Since C++17 the left operand of `<<` is evaluated before the right one, so the conditional runs first.
`?:` evaluates its condition first, too: `i++ > 5` compares the old value 5 (false) and leaves `i` at 6,
so the chosen branch `-i` is -6. Then the last operand prints the current `i`, 6.
:::

:::quiz
What does this print? (`unsigned int` is 32 bits.)

```cpp
unsigned int x = 0;
std::cout << (x - 1 > 0) << (5 & 3 << 1 | 2) << (-7 / 2 % 3);
```

- [ ] `06-1`
- [x] `160`
- [ ] `170`
- [ ] `16-1`

`x - 1` wraps around to 4294967295, which is greater than 0: `1`. Shift binds tighter than `&`, which
binds tighter than `|`: `(5 & (3 << 1)) | 2` is `(5 & 6) | 2` = `4 | 2` = `6`. And `-7 / 2` truncates to
`-3`, and `-3 % 3` is `0`.
:::
