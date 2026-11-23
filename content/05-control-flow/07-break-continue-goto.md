---
title: break, continue, and goto
summary: Leaving a loop early with break, skipping to the next iteration with continue, the ways to exit nested loops (flag, return, goto), and why goto is otherwise avoided.
---

Loops normally run until their condition becomes false. Two statements let you change that from
**inside** the body: `break` leaves the loop immediately, and `continue` skips the rest of the current
iteration.

## `break`

`break` ends the **innermost** enclosing loop (or `switch`) right away. Execution continues with the first
statement after the loop.

```cpp run
#include <iostream>

int main() {
    // find the first multiple of 7 greater than 50
    for (int n = 51; n < 1000; ++n) {
        if (n % 7 == 0) {
            std::cout << "found " << n << '\n';
            break;                        // no need to keep looking
        }
    }
    std::cout << "after the loop\n";
}
```

```output
found 56
after the loop
```

`break` is what makes **intentionally infinite loops** useful. The loop runs "forever", and the exit
happens in the middle, wherever it's most natural:

```cpp run
#include <iostream>

int main() {
    int total = 0;
    while (true) {
        int x = 0;
        if (!(std::cin >> x)) {
            break;                       // end of input (or bad input)
        }
        if (x == 0) {
            break;                       // sentinel
        }
        total += x;
    }
    std::cout << "total = " << total << '\n';
}
```

With input `4 5 0 6` it prints `total = 9`; with an empty stdin box, `total = 0`. Use this "loop and a
half" shape when the exit test naturally sits in the middle of the body; otherwise prefer a plain loop
condition, which is easier to read.

### `break` inside a `switch` inside a loop

`break` leaves the **innermost** loop *or* `switch`. Inside a `switch`, it exits only the `switch`, not
the loop around it:

```cpp run
#include <iostream>

int main() {
    for (int i = 1; i <= 3; ++i) {
        switch (i) {
            case 2:
                std::cout << "two ";
                break;                   // exits the switch, NOT the for loop
            default:
                std::cout << i << ' ';
                break;
        }
    }
    std::cout << '\n';
}
```

```output
1 two 3 
```

If you need to leave the loop from inside a `switch`, use a flag (below) or restructure with `if`.

## `continue`

`continue` skips the rest of the current iteration and jumps to the next one:

- in a `for` loop, it jumps to the **update** (`++i`), then the condition,
- in a `while` or `do`-`while` loop, it jumps straight to the **condition**.

```cpp run
#include <iostream>

int main() {
    for (int i = 1; i <= 10; ++i) {
        if (i % 3 == 0) {
            continue;                    // skip multiples of 3
        }
        std::cout << i << ' ';
    }
    std::cout << '\n';
}
```

```output
1 2 4 5 7 8 10 
```

`continue` is often used as a **guard** at the top of a loop body: "if this item doesn't interest me,
move on". It keeps the main logic from being nested inside an `if`:

```cpp
while (std::cin >> x) {
    if (x < 0) {
        continue;            // ignore negative values
    }
    // ... lots of code handling x, not indented inside an if ...
}
```

> **Pitfall:** In a `while` loop, `continue` skips everything after it, **including your update**:
>
> ```cpp
> int i = 0;
> while (i < 10) {
>     if (i % 2 == 0) {
>         continue;        // jumps back to the condition... i is never incremented: infinite loop
>     }
>     ++i;
> }
> ```
>
> In a `for` loop the update is part of the loop header, so `continue` can't skip it. That's one more
> reason to prefer `for` for counting loops.

## Exiting nested loops

`break` only leaves the **innermost** loop. In a nested loop, the outer loop keeps going:

```cpp run
#include <iostream>

int main() {
    for (int i = 1; i <= 3; ++i) {
        for (int j = 1; j <= 3; ++j) {
            if (j == 2) {
                break;                   // leaves the j loop only
            }
            std::cout << i << ',' << j << ' ';
        }
    }
    std::cout << '\n';
}
```

```output
1,1 2,1 3,1 
```

So how do you stop *both* loops, say, as soon as you find what you're searching for? There are three
common ways. All three examples search for the first pair `a <= b` with `a * b == 36` and `a + b == 13`.

### 1. A flag variable

```cpp run
#include <iostream>

int main() {
    bool found = false;
    int fa = 0, fb = 0;
    for (int a = 1; a <= 36 && !found; ++a) {      // the outer loop also checks the flag
        for (int b = a; b <= 36; ++b) {
            if (a * b == 36 && a + b == 13) {
                found = true;
                fa = a;
                fb = b;
                break;                              // leave the inner loop
            }
        }
    }
    if (found) {
        std::cout << fa << " x " << fb << '\n';
    }
}
```

```output
4 x 9
```

Clear and always available, but it needs an extra variable and an extra test.

### 2. Return from a function

If the loops are in their own **function**, `return` leaves the function, and so both loops, at once.
(Functions get their own module soon. Here, `find_pair` is a function that returns `true` or `false`,
and `main` calls it.)

```cpp run
#include <iostream>

bool find_pair(int product, int sum) {
    for (int a = 1; a <= product; ++a) {
        for (int b = a; b <= product; ++b) {
            if (a * b == product && a + b == sum) {
                std::cout << a << " x " << b << '\n';
                return true;                        // exits both loops and the function
            }
        }
    }
    return false;
}

int main() {
    if (!find_pair(36, 13)) {
        std::cout << "no pair\n";
    }
}
```

```output
4 x 9
```

This is usually the cleanest option, and it's what experienced C++ programmers reach for first.

### 3. `goto`

`goto label;` jumps directly to the statement marked `label:` in the same function. Jumping *out* of
nested loops is the one place where many style guides accept it:

```cpp run
#include <iostream>

int main() {
    for (int a = 1; a <= 36; ++a) {
        for (int b = a; b <= 36; ++b) {
            if (a * b == 36 && a + b == 13) {
                std::cout << a << " x " << b << '\n';
                goto done;
            }
        }
    }
    std::cout << "no pair\n";
done:
    std::cout << "search finished\n";
}
```

```output
4 x 9
search finished
```

## `goto` in general

A **label** is a name followed by a colon, placed before a statement: `done:`. `goto done;` transfers
control there unconditionally. Labels have function-wide scope, so you can jump forward or backward
anywhere within the same function.

```cpp run
#include <iostream>

int main() {
    int i = 1;
again:                                   // a loop built from goto: please don't
    std::cout << i << ' ';
    ++i;
    if (i <= 3) {
        goto again;
    }
    std::cout << '\n';
}
```

```output
1 2 3 
```

That works, but compare it with `for (int i = 1; i <= 3; ++i)`. Code that jumps around with `goto` is
hard to follow because you can't read it top to bottom; with many gotos it becomes "spaghetti code".
The structured statements (`if`, `while`, `for`, `break`, `continue`, `return`) express every pattern
more clearly. So:

- **Don't** use `goto` to build loops or `if`s.
- **Maybe** use it to break out of deeply nested loops, if a function with `return` isn't practical.
- You'll also see it in C code for "jump to the cleanup code at the end of the function". C++ has a
  better tool for that (destructors, much later).

Rules the compiler enforces:

- You can't jump **into** the scope of a variable past its initialization:

```cpp compile-error
#include <iostream>

int main() {
    goto skip;
    int x = 5;                          // initialization would be skipped
skip:
    std::cout << x << '\n';             // error: jump to label 'skip' crosses initialization of 'int x'
}
```

- A label must be followed by a statement. In C++20, `label: }` at the very end of a block is not
  allowed (C++23 allows it). Write `label: ;` (an empty statement) if you need it there.
- A label that no `goto` uses triggers the warning `label 'x' defined but not used`.
- You can't `goto` a label in a different function.

:::quiz
What does this print?

```cpp
for (int i = 0; i < 5; ++i) {
    if (i == 1) continue;
    if (i == 3) break;
    std::cout << i;
}
```

- [ ] `01234`
- [ ] `0234`
- [x] `02`
- [ ] `0`

`i = 0` prints, `1` is skipped by `continue`, `2` prints, and at `3` the `break` ends the loop.
:::

:::quiz
Inside a loop, a `switch` contains `case 5: break;`. When `case 5` runs, what does that `break` do?

- [x] Leaves the `switch`; the loop continues
- [ ] Leaves the loop
- [ ] Leaves both
- [ ] It's a compile error to use `break` in a `switch` inside a loop

`break` exits the innermost enclosing `switch` or loop, and here that's the `switch`.
:::

:::quiz
Which are reasonable ways to exit two nested loops at once? (select all that apply)

- [x] Set a flag, `break` the inner loop, and have the outer loop check the flag
- [x] Put the loops in a function and `return`
- [x] `goto` a label placed after the outer loop
- [ ] Write `break break;`

C++ has no multi-level `break`. The first three are the standard techniques, roughly from most to least common.
:::

:::exercise First negative
Read integers until the end of input and print the first negative one, then stop reading.

**Input:** zero or more integers.
**Output:** `First negative: X` for the first negative number `X`, or `No negatives` if there isn't one.

```cpp starter
#include <iostream>

int main() {
    int x = 0;
    int first = 0;
    while (std::cin >> x) {
        if (x < 0) {
            first = x;
        }
    }
    std::cout << "First negative: " << first << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int x = 0;
    bool found = false;
    while (std::cin >> x) {
        if (x < 0) {
            found = true;
            break;
        }
    }
    if (found) {
        std::cout << "First negative: " << x << '\n';
    } else {
        std::cout << "No negatives\n";
    }
}
```

```hint
When you find a negative number, remember it and `break` out of the loop.
```

```hint
You also need to know whether the loop ended because of `break` or because the input ran out. A `bool` flag works.
```

```stdin
4 7 -3 2 -8
```

```expected
First negative: -3
```

```stdin
1 2 3
```

```expected
No negatives
```

```stdin
-1
```

```expected hidden
First negative: -1
```

```stdin
```

```expected hidden
No negatives
```

```checks
must \bbreak\s*; :: Stop the loop with break.
```
:::

:::exercise Skip the multiples of three
Read `n` and print the numbers from 1 to `n` on one line, separated by spaces, **skipping** multiples of 3.

**Input:** one integer `n` (1 or more).
**Output:** one line, e.g. for `n = 10`: `1 2 4 5 7 8 10`

```cpp starter
#include <iostream>

int main() {
    int n = 0;
    std::cin >> n;
    for (int i = 1; i <= n; ++i) {
        std::cout << i << ' ';
    }
    std::cout << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int n = 0;
    std::cin >> n;
    for (int i = 1; i <= n; ++i) {
        if (i % 3 == 0) {
            continue;
        }
        std::cout << i << ' ';
    }
    std::cout << '\n';
}
```

```hint
At the top of the loop body: `if (i % 3 == 0) { continue; }`.
```

```hint
A trailing space at the end of the line is fine; the checker ignores trailing whitespace.
```

```stdin
10
```

```expected
1 2 4 5 7 8 10
```

```stdin
2
```

```expected
1 2
```

```stdin
3
```

```expected hidden
1 2
```

```stdin
15
```

```expected hidden
1 2 4 5 7 8 10 11 13 14
```

```checks
must \bcontinue\s*; :: Skip the multiples with continue.
```
:::

:::exercise Positive sum until zero
Read integers until the end of input. **Ignore** negative numbers, and **stop completely** at the first
`0`. Print how many numbers were added and their sum.

**Input:** a sequence of integers.
**Output:** `Added N numbers, sum = S`

For input `5 -2 3 0 10`, the `-2` is ignored and reading stops at the `0`: `Added 2 numbers, sum = 8`.

```cpp starter
#include <iostream>

int main() {
    int x = 0;
    int count = 0;
    int sum = 0;
    while (std::cin >> x) {
        sum += x;
        ++count;
    }
    std::cout << "Added " << count << " numbers, sum = " << sum << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int x = 0;
    int count = 0;
    int sum = 0;
    while (std::cin >> x) {
        if (x == 0) {
            break;
        }
        if (x < 0) {
            continue;
        }
        sum += x;
        ++count;
    }
    std::cout << "Added " << count << " numbers, sum = " << sum << '\n';
}
```

```hint
Check for `0` first and `break`. Then check for negatives and `continue`.
```

```stdin
5 -2 3 0 10
```

```expected
Added 2 numbers, sum = 8
```

```stdin
-1 -2 -3
```

```expected
Added 0 numbers, sum = 0
```

```stdin
0 5 5
```

```expected hidden
Added 0 numbers, sum = 0
```

```stdin
7 8 -100 9
```

```expected hidden
Added 3 numbers, sum = 24
```

```checks
must \bbreak\s*; :: Stop at zero with break.
must \bcontinue\s*; :: Skip negatives with continue.
```
:::

:::exercise Factor pair
Read a target number `t` and a limit `n`. Search for the first pair `a`, `b` with `1 <= a <= b <= n`
and `a * b == t`, trying `a` from 1 upward and, for each `a`, `b` from `a` upward. Stop searching as soon
as you find one (exit **both** loops), using any technique from this lesson.

**Input:** two integers `t` and `n` (both at least 1).
**Output:** `a x b = t` for the first pair found, or `No pair` if there is none.

For `12 10`, the pair `1 x 12` isn't allowed because 12 is above the limit 10, so the answer is `2 x 6 = 12`.

```cpp starter
#include <iostream>

int main() {
    int t = 0, n = 0;
    std::cin >> t >> n;
    for (int a = 1; a <= n; ++a) {
        for (int b = a; b <= n; ++b) {
            if (a * b == t) {
                std::cout << a << " x " << b << " = " << t << '\n';
                break;
            }
        }
    }
}
```

```cpp solution
#include <iostream>

int main() {
    int t = 0, n = 0;
    std::cin >> t >> n;
    bool found = false;
    for (int a = 1; a <= n && !found; ++a) {
        for (int b = a; b <= n; ++b) {
            if (a * b == t) {
                std::cout << a << " x " << b << " = " << t << '\n';
                found = true;
                break;
            }
        }
    }
    if (!found) {
        std::cout << "No pair\n";
    }
}
```

```hint
The starter's `break` only leaves the inner loop, so the outer loop keeps finding more pairs.
```

```hint
Use a `bool found` flag: set it before `break`, and add `&& !found` to the outer loop's condition. Print
`No pair` after the loops if it's still false.
```

```stdin
12 10
```

```expected
2 x 6 = 12
```

```stdin
36 100
```

```expected
1 x 36 = 36
```

```stdin
13 10
```

```expected hidden
No pair
```

```stdin
49 7
```

```expected hidden
7 x 7 = 49
```

```checks
must for[\s\S]*\{[\s\S]*for\s*\( :: Use nested for loops.
```
:::
