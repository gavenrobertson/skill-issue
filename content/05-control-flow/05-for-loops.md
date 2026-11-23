---
title: for Loops
summary: The classic for loop, counting up and down, step sizes, several loop variables, leaving parts out, the loop variable's scope, off-by-one errors, and nested loops for patterns and tables.
---

Most loops follow the same shape: initialize a counter, test it, update it. The `for` loop puts all three
parts on **one line**, so you can see at a glance how the loop runs.

## Syntax

```cpp
for (initialization; condition; update) {
    // body
}
```

```cpp run
#include <iostream>

int main() {
    for (int i = 1; i <= 5; ++i) {
        std::cout << i << ' ';
    }
    std::cout << '\n';
}
```

```output
1 2 3 4 5 
```

The order of events:

1. **initialization** runs once: `int i = 1`.
2. **condition** is tested: `i <= 5`. If it's false, the loop ends.
3. The **body** runs.
4. **update** runs: `++i`. Then go back to step 2.

It's exactly equivalent to this `while` loop (apart from the scope of `i`, see below):

```cpp
{
    int i = 1;
    while (i <= 5) {
        std::cout << i << ' ';
        ++i;
    }
}
```

Use `for` when you know up front how the loop variable moves (counting, stepping through a range); use
`while` when the loop runs "until something happens" (input ends, a value converges).

## Counting

The most common C++ loop is "do this `n` times", counting **from 0 while less than `n`**:

```cpp run
#include <iostream>

int main() {
    int n = 4;
    for (int i = 0; i < n; ++i) {         // i = 0, 1, 2, 3: exactly n iterations
        std::cout << "iteration " << i << '\n';
    }
}
```

```output
iteration 0
iteration 1
iteration 2
iteration 3
```

Starting at 0 with `<` is the convention because array and string positions in C++ start at 0. Get used
to reading `for (int i = 0; i < n; ++i)` as "repeat n times".

### Counting down

```cpp run
#include <iostream>

int main() {
    for (int i = 5; i > 0; --i) {         // 5 4 3 2 1
        std::cout << i << ' ';
    }
    std::cout << '\n';
    for (int i = 3; i >= 0; --i) {        // 3 2 1 0: include 0 with >=
        std::cout << i << ' ';
    }
    std::cout << '\n';
}
```

```output
5 4 3 2 1 
3 2 1 0 
```

> **Pitfall:** Counting down to 0 with an **unsigned** variable never ends:
> `for (unsigned i = 3; i >= 0; --i)`. An unsigned value is *always* `>= 0`; after 0, `--i` wraps around
> to about 4 billion. GCC warns: `comparison of unsigned expression in '>= 0' is always true`. Use a
> signed `int` for loops that count down to 0.

### Other step sizes

The update can be any expression:

```cpp run
#include <iostream>

int main() {
    for (int i = 0; i <= 10; i += 2) {    // even numbers
        std::cout << i << ' ';
    }
    std::cout << '\n';
    for (int i = 1; i <= 100; i *= 3) {   // powers of 3
        std::cout << i << ' ';
    }
    std::cout << '\n';
    for (int i = 20; i > 0; i -= 7) {     // 20 13 6
        std::cout << i << ' ';
    }
    std::cout << '\n';
}
```

```output
0 2 4 6 8 10 
1 3 9 27 81 
20 13 6 
```

## Several variables: the comma

The initialization can declare **several variables of the same type**, and the update can do several
things separated by the **comma operator**:

```cpp run
#include <iostream>

int main() {
    for (int lo = 0, hi = 10; lo < hi; ++lo, --hi) {
        std::cout << lo << '-' << hi << ' ';
    }
    std::cout << '\n';
}
```

```output
0-10 1-9 2-8 3-7 4-6 
```

The variables must share one type (`int lo = 0, hi = 10`). You can't write `int i = 0, double x = 1.0`.

## Leaving parts out

Each of the three parts is optional; the semicolons are not.

```cpp run
#include <iostream>

int main() {
    int i = 0;
    for (; i < 3; ++i) {             // no initialization: i was declared before
        std::cout << i;
    }
    std::cout << " (i is now " << i << ")\n";

    for (int j = 0; j < 3;) {        // no update: done in the body
        std::cout << j;
        j += 1;
    }
    std::cout << '\n';
}
```

```output
012 (i is now 3)
012
```

Leaving out the **condition** means "always true": `for (;;)` is an infinite loop, read aloud as
"forever". It's the same as `while (true)` and needs a `break` (later lesson) to end.

```cpp
for (;;) {
    // runs until something inside breaks out
}
```

## The loop variable's scope

A variable declared in the initialization exists **only inside the loop**. After the loop, it's gone:

```cpp compile-error
#include <iostream>

int main() {
    for (int i = 0; i < 3; ++i) {
        std::cout << i;
    }
    std::cout << i << '\n';     // error: 'i' was not declared in this scope
}
```

This is a feature: you can reuse the name `i` in the next loop without clashing. If you need the final
value after the loop, declare the variable **before** it, as in the `for (; i < 3; ++i)` example above.

> **Tip:** `++i` or `i++` in the update? For an `int`, it makes no difference: the value of the update
> expression is thrown away. `++i` is the common C++ habit because for some types (iterators, later) it can
> be cheaper.

## Off-by-one errors

The most common loop bug is running **one time too many or too few**. Ask two questions about every loop:
*what is the first value?* and *what is the last value?*

| Loop | Values | Count |
| --- | --- | --- |
| `for (int i = 0; i < 5; ++i)` | 0 1 2 3 4 | 5 |
| `for (int i = 0; i <= 5; ++i)` | 0 1 2 3 4 5 | **6** |
| `for (int i = 1; i < 5; ++i)` | 1 2 3 4 | **4** |
| `for (int i = 1; i <= 5; ++i)` | 1 2 3 4 5 | 5 |

A related classic is the **fencepost problem**: printing `n` items with separators *between* them takes
only `n - 1` separators. Print the separator before every item except the first:

```cpp run
#include <iostream>

int main() {
    int n = 5;
    for (int i = 1; i <= n; ++i) {
        if (i > 1) {
            std::cout << ", ";
        }
        std::cout << i;
    }
    std::cout << '\n';
}
```

```output
1, 2, 3, 4, 5
```

> **Warning:** Don't use a floating-point loop variable with `!=`, like
> `for (double x = 0.0; x != 1.0; x += 0.1)`. Because `0.1` can't be represented exactly, `x` never
> becomes exactly `1.0` and the loop never ends. Loop over an integer and compute the double from it:
> `for (int i = 0; i <= 10; ++i) { double x = i / 10.0; ... }`.

> **Note:** When looping up to a `.size()` (like the length of a `std::string`), compare with an unsigned
> index, `for (std::size_t i = 0; i < s.size(); ++i)`. Comparing an `int` to `.size()` triggers
> GCC's warning `comparison of integer expressions of different signedness`. The next lesson shows the
> range-based `for`, which avoids indexes entirely.

## Nested loops

A loop inside a loop: for **every** iteration of the outer loop, the inner loop runs **completely**.
That's the natural way to handle anything two-dimensional: rows and columns, grids, tables.

```cpp run
#include <iostream>

int main() {
    for (int row = 1; row <= 3; ++row) {
        for (int col = 1; col <= 4; ++col) {
            std::cout << '(' << row << ',' << col << ") ";
        }
        std::cout << '\n';                   // end of a row
    }
}
```

```output
(1,1) (1,2) (1,3) (1,4) 
(2,1) (2,2) (2,3) (2,4) 
(3,1) (3,2) (3,3) (3,4) 
```

The inner loop's bounds can depend on the outer loop variable, which is how you draw shapes:

```cpp run
#include <iostream>

int main() {
    int n = 4;
    for (int row = 1; row <= n; ++row) {
        for (int i = 0; i < row; ++i) {      // row 1 gets 1 star, row 2 gets 2, ...
            std::cout << '*';
        }
        std::cout << '\n';
    }
}
```

```output
*
**
***
****
```

And with `std::setw` you get a neatly aligned multiplication table:

```cpp run
#include <iostream>
#include <iomanip>

int main() {
    for (int row = 1; row <= 5; ++row) {
        for (int col = 1; col <= 5; ++col) {
            std::cout << std::setw(4) << row * col;
        }
        std::cout << '\n';
    }
}
```

```output
   1   2   3   4   5
   2   4   6   8  10
   3   6   9  12  15
   4   8  12  16  20
   5  10  15  20  25
```

Use different names for the inner and outer loop variables. Reusing `i` in both compiles (the inner
one hides the outer one) but almost never does what you want.

:::quiz
How many times does the body run?

```cpp
for (int i = 2; i <= 10; i += 2) { /* ... */ }
```

- [ ] 4
- [x] 5
- [ ] 6
- [ ] 10

`i` takes the values 2, 4, 6, 8, 10: five iterations.
:::

:::quiz
What does this print?

```cpp
for (int i = 0; i < 3; ++i) {
    for (int j = 0; j < i; ++j) {
        std::cout << j;
    }
}
```

- [ ] `012`
- [x] `001`
- [ ] `000111222`
- [ ] Nothing

When `i` is 0 the inner loop doesn't run; when `i` is 1 it prints `0`; when `i` is 2 it prints `01`.
:::

:::quiz
Which loops run forever? (select all that apply)

- [x] `for (;;) { }`
- [x] `for (unsigned i = 5; i >= 0; --i) { }`
- [ ] `for (int i = 5; i >= 0; --i) { }`
- [x] `for (int i = 0; i < 10; ) { }`

An empty condition is always true; an unsigned value is always `>= 0`; and the last loop never updates `i`.
:::

:::exercise Comma-separated multiples
Read `n` and `k` and print the first `k` multiples of `n`, separated by `, ` (a comma and a space),
with no separator after the last one.

**Input:** two integers `n` and `k` (`k >= 1`).
**Output:** one line, e.g. for `3 4`: `3, 6, 9, 12`

```cpp starter
#include <iostream>

int main() {
    int n = 0, k = 0;
    std::cin >> n >> k;
    for (int i = 1; i <= k; ++i) {
        std::cout << n * i << ", ";
    }
    std::cout << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int n = 0, k = 0;
    std::cin >> n >> k;
    for (int i = 1; i <= k; ++i) {
        if (i > 1) {
            std::cout << ", ";
        }
        std::cout << n * i;
    }
    std::cout << '\n';
}
```

```hint
Print the separator *before* each item except the first one.
```

```stdin
3 4
```

```expected
3, 6, 9, 12
```

```stdin
7 1
```

```expected
7
```

```stdin
-2 3
```

```expected hidden
-2, -4, -6
```

```checks
must \bfor\s*\( :: Use a for loop.
```
:::

:::exercise Sum of a range
Read two integers `a` and `b` and print the sum of all integers from `a` to `b`, **inclusive**. If `a` is
greater than `b`, the range is empty and the sum is 0.

**Input:** two integers `a` and `b` (each between -10000 and 10000).
**Output:** `Sum from a to b: S`, e.g. `Sum from 1 to 10: 55`.

```cpp starter
#include <iostream>

int main() {
    int a = 0, b = 0;
    std::cin >> a >> b;
    int sum = 0;
    for (int i = a; i < b; ++i) {
        sum += i;
    }
    std::cout << "Sum from " << a << " to " << b << ": " << sum << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int a = 0, b = 0;
    std::cin >> a >> b;
    int sum = 0;
    for (int i = a; i <= b; ++i) {
        sum += i;
    }
    std::cout << "Sum from " << a << " to " << b << ": " << sum << '\n';
}
```

```hint
"Inclusive" means `b` itself is part of the range. Which comparison includes it?
```

```stdin
1 10
```

```expected
Sum from 1 to 10: 55
```

```stdin
5 5
```

```expected
Sum from 5 to 5: 5
```

```stdin
10 1
```

```expected hidden
Sum from 10 to 1: 0
```

```stdin
-3 2
```

```expected hidden
Sum from -3 to 2: -3
```

```checks
must \bfor\s*\( :: Use a for loop.
```
:::

:::exercise Staircase
Read `n` and print a right-aligned staircase of `#` characters with `n` rows. Row `i` (counting from 1)
has `n - i` spaces followed by `i` `#` characters.

**Input:** one integer `n` (1 or more).
**Output:** `n` lines. For `n = 4`:

```
   #
  ##
 ###
####
```

```cpp starter
#include <iostream>

int main() {
    int n = 0;
    std::cin >> n;
    for (int row = 1; row <= n; ++row) {
        std::cout << "#\n";
    }
}
```

```cpp solution
#include <iostream>

int main() {
    int n = 0;
    std::cin >> n;
    for (int row = 1; row <= n; ++row) {
        for (int s = 0; s < n - row; ++s) {
            std::cout << ' ';
        }
        for (int h = 0; h < row; ++h) {
            std::cout << '#';
        }
        std::cout << '\n';
    }
}
```

```hint
Inside the row loop you need two loops one after the other: one for the spaces, one for the `#`s.
```

```hint
Row `row` has `n - row` spaces and `row` hashes.
```

```stdin
4
```

```expected
   #
  ##
 ###
####
```

```stdin
1
```

```expected
#
```

```stdin
6
```

```expected hidden
     #
    ##
   ###
  ####
 #####
######
```

```checks
must for[\s\S]*\{[\s\S]*for\s*\( :: Use nested for loops.
```
:::

:::exercise Multiplication table
Read `n` and print the `n` × `n` multiplication table. Every number is printed right-aligned in a field
of width 4, and each row ends with a newline.

**Input:** one integer `n` (1 to 12).
**Output:** `n` lines of `n` numbers. For `n = 3`:

```
   1   2   3
   2   4   6
   3   6   9
```

```cpp starter
#include <iostream>
#include <iomanip>

int main() {
    int n = 0;
    std::cin >> n;
    for (int col = 1; col <= n; ++col) {
        std::cout << std::setw(4) << col;
    }
    std::cout << '\n';
}
```

```cpp solution
#include <iostream>
#include <iomanip>

int main() {
    int n = 0;
    std::cin >> n;
    for (int row = 1; row <= n; ++row) {
        for (int col = 1; col <= n; ++col) {
            std::cout << std::setw(4) << row * col;
        }
        std::cout << '\n';
    }
}
```

```hint
The outer loop goes over rows, the inner loop over columns. The entry is `row * col`.
```

```hint
Print `'\n'` after the inner loop finishes, not inside it.
```

```stdin
3
```

```expected
   1   2   3
   2   4   6
   3   6   9
```

```stdin
1
```

```expected
   1
```

```stdin
12
```

```expected hidden
   1   2   3   4   5   6   7   8   9  10  11  12
   2   4   6   8  10  12  14  16  18  20  22  24
   3   6   9  12  15  18  21  24  27  30  33  36
   4   8  12  16  20  24  28  32  36  40  44  48
   5  10  15  20  25  30  35  40  45  50  55  60
   6  12  18  24  30  36  42  48  54  60  66  72
   7  14  21  28  35  42  49  56  63  70  77  84
   8  16  24  32  40  48  56  64  72  80  88  96
   9  18  27  36  45  54  63  72  81  90  99 108
  10  20  30  40  50  60  70  80  90 100 110 120
  11  22  33  44  55  66  77  88  99 110 121 132
  12  24  36  48  60  72  84  96 108 120 132 144
```

```checks
must for[\s\S]*\{[\s\S]*for\s*\( :: Use nested for loops.
must setw :: Align the numbers with std::setw.
```
:::
