---
title: Increment and Decrement
summary: ++ and --, the difference between prefix (++x) and postfix (x++), and why expressions like i = i++ are a bad idea.
---

## Adding or subtracting one

Adding 1 to a variable is so common (counters, loop indices) that C++ has dedicated operators for it
(the "++" in the name *C++* is a joke: "one better than C"):

| Operator | Name | Effect |
| --- | --- | --- |
| `++x` | prefix increment | add 1 to `x`, then give the **new** value |
| `x++` | postfix increment | add 1 to `x`, but give the **old** value |
| `--x` | prefix decrement | subtract 1, then give the **new** value |
| `x--` | postfix decrement | subtract 1, but give the **old** value |

Used as a **statement on its own**, prefix and postfix do the same thing: the variable changes by one.

```cpp run
#include <iostream>

int main() {
    int count = 5;
    count++;            // 6
    ++count;            // 7
    count--;            // 6
    --count;            // 5
    std::cout << count << '\n';
}
```

```output
5
```

## Prefix vs. postfix: the value of the expression

The difference appears when you **use the result** of the expression, for example print it or store it:

- **Prefix `++x`**: increment first, then the expression's value is the **new** value.
- **Postfix `x++`**: the expression's value is the **old** value; the variable is still incremented.

```cpp run
#include <iostream>

int main() {
    int a = 5;
    int b = ++a;        // a becomes 6, b gets the NEW value 6
    std::cout << "a=" << a << " b=" << b << '\n';

    int c = 5;
    int d = c++;        // d gets the OLD value 5, then c becomes 6
    std::cout << "c=" << c << " d=" << d << '\n';

    int e = 10;
    std::cout << e-- << '\n';   // prints 10 (old value); e is now 9
    std::cout << e << '\n';     // 9
    std::cout << --e << '\n';   // 8 (new value)
}
```

```output
a=6 b=6
c=6 d=5
10
9
8
```

A way to remember: read left to right. In `++x` the `++` comes **first**, so the increment happens
first. In `x++` you see `x` first, so you get `x` (as it was) first.

Postfix is handy when you want to "use the current value, then advance", like taking a ticket number:

```cpp run
#include <iostream>

int main() {
    int nextTicket = 100;
    int first = nextTicket++;    // first gets 100, nextTicket moves to 101
    int second = nextTicket++;   // 101, nextTicket moves to 102
    std::cout << first << ' ' << second << ' ' << nextTicket << '\n';
}
```

```output
100 101 102
```

> **Tip:** When you don't use the value, prefer **`++i`**. For `int` it makes no difference, but for
> complex types like iterators, postfix has to make a copy of the old value, so prefix can be cheaper.
> It's a good habit.

## What can be incremented

`++` and `--` need a **modifiable variable** (an *lvalue*), because they store the result back. They
work on all integer types, `char`, floating-point types (adds `1.0`), and pointers (you'll see that later).

```cpp run
#include <iostream>

int main() {
    double temperature = 20.5;
    ++temperature;                 // 21.5
    char letter = 'a';
    ++letter;                      // 'b'
    std::cout << temperature << ' ' << letter << '\n';
}
```

```output
21.5 b
```

```cpp compile-error
int main() {
    int x = 5++;     // error: lvalue required as increment operand (5 is a literal, not a variable)
}
```

```cpp compile-error
int main() {
    const int fixed = 1;
    ++fixed;         // error: increment of read-only variable 'fixed'
}
```

```cpp compile-error
int main() {
    bool flag = false;
    flag++;          // error: use of an operand of type 'bool' in 'operator++' is forbidden in C++17
}
```

Prefix `++x` gives back the variable itself (an lvalue), so `++x = 10;` is legal (but silly). Postfix
`x++` gives back a temporary copy of the old value, so you can't assign to it or increment it again:

```cpp compile-error
int main() {
    int x = 1;
    x++ = 10;        // error: lvalue required as left operand of assignment
}
```

## Maximal munch: x+++y

The compiler splits code into tokens greedily, taking the **longest** operator it can. So `x+++y` is
read as `x++ + y`, never `x + ++y`:

```cpp run
#include <iostream>

int main() {
    int x = 1;
    int y = 10;
    int z = x+++y;       // (x++) + y  ->  1 + 10 = 11, and x becomes 2
    std::cout << x << ' ' << y << ' ' << z << '\n';
}
```

```output
2 10 11
```

Legal, but unreadable. Add spaces: `x++ + y`.

## Don't modify a variable twice in one expression

What does this do?

```cpp
int i = 1;
i = i++;         // ???
int j = i++ + i++;   // ???
```

The problem is **sequencing**: C++ doesn't always specify in what order the parts of an expression are
evaluated, or exactly when a side effect (like the store that `++` does) happens.

- Before C++17, `i = i++` was **undefined behavior**: both the assignment and the `++` write to `i`,
  with no rule saying which comes first.
- Since C++17, the right side of `=` is fully evaluated (including its side effects) **before** the
  assignment. So `i = i++` is now defined: `i++` produces the old value `1` and sets `i` to 2, then the
  assignment stores `1` back. **`i` ends up unchanged**, which is surely not what the writer wanted.
- `i++ + i++` is **still undefined behavior** in C++20: the two operands of `+` are *unsequenced*
  relative to each other, and both modify `i`. Anything can happen.

GCC warns about all of these: `warning: operation on 'i' may be undefined [-Wsequence-point]`.

The rule to live by: **never modify a variable more than once in a single expression, and don't read a
variable in the same expression where you modify it** (other than the obvious `x = x + 1` style).
Split it into separate statements:

```cpp
i++;                 // clear
int j = i + (i + 1); // clear, if that's what you meant
i++;
i++;
```

:::quiz
What does this print?

```cpp
int x = 3;
int y = x++;
std::cout << x << ' ' << y;
```

- [x] `4 3`
- [ ] `4 4`
- [ ] `3 3`
- [ ] `3 4`

Postfix `x++` produces the old value (3) for `y`, and `x` becomes 4.
:::

:::quiz
After these lines, what are `a` and `b`?

```cpp
int a = 10;
int b = --a + 1;
```

- [ ] `a = 10, b = 11`
- [x] `a = 9, b = 10`
- [ ] `a = 9, b = 11`
- [ ] `a = 10, b = 10`

Prefix `--a` decrements first and produces the new value 9, then `+ 1` gives 10.
:::

:::quiz
Which of these is undefined behavior in C++20?

- [ ] `i++;`
- [ ] `j = i++;`
- [x] `j = i++ + i++;`
- [ ] `++i;`

`i++ + i++` modifies `i` twice with no ordering between the two modifications. (Since C++17, `i = i++`
is defined, but useless: it leaves `i` unchanged.)
:::

:::exercise Before and after
Read an integer `n`, then print, each on its own line and **each with its own statement**, the value of
these expressions in this order:

1. `n++`
2. `n`
3. `++n`
4. `n--`
5. `--n`

**Input:** one integer `n`.
**Output:** five lines. For `5` print `5`, `6`, `7`, `7`, `5`.

```cpp starter
#include <iostream>

int main() {
    int n{};
    std::cin >> n;
    // print n++, then n, then ++n, then n--, then --n, one per line
}
```

```cpp solution
#include <iostream>

int main() {
    int n{};
    std::cin >> n;
    std::cout << n++ << '\n';
    std::cout << n << '\n';
    std::cout << ++n << '\n';
    std::cout << n-- << '\n';
    std::cout << --n << '\n';
}
```

```hint
Write five separate `std::cout << ... << '\n';` statements. Don't put two increments in the same statement.
```

```hint
Trace it with `5`: `n++` prints 5 (n is 6), `n` prints 6, `++n` prints 7, `n--` prints 7 (n is 6), `--n` prints 5.
```

```stdin
5
```

```expected
5
6
7
7
5
```

```stdin
-1
```

```expected hidden
-1
0
1
1
-1
```

```checks
must \bn\s*\+\+ :: Use postfix n++.
must \+\+\s*n\b :: Use prefix ++n.
must \bn\s*-- :: Use postfix n--.
must --\s*n\b :: Use prefix --n.
```
:::

:::exercise Now serving
A bakery's ticket machine starts at number `t`. Three customers take tickets, one after another. For
each one, print `Now serving <ticket>` using a **postfix** increment (`t++`) to hand out the current
number and advance the machine. Finally print the number the next customer will get.

**Input:** one integer `t`.
**Output:** four lines. For `41`:

```
Now serving 41
Now serving 42
Now serving 43
Next ticket: 44
```

```cpp starter
#include <iostream>

int main() {
    int t{};
    std::cin >> t;
    std::cout << "Now serving " << t << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int t{};
    std::cin >> t;
    std::cout << "Now serving " << t++ << '\n';
    std::cout << "Now serving " << t++ << '\n';
    std::cout << "Now serving " << t++ << '\n';
    std::cout << "Next ticket: " << t << '\n';
}
```

```hint
`t++` gives the current number and then advances `t`, exactly like a ticket machine.
```

```stdin
41
```

```expected
Now serving 41
Now serving 42
Now serving 43
Next ticket: 44
```

```stdin
-1
```

```expected hidden
Now serving -1
Now serving 0
Now serving 1
Next ticket: 2
```

```checks
must \bt\s*\+\+ :: Use postfix t++ to hand out tickets.
mustnot t\s*\+\s*1|t\s*\+=|\+\+\s*t\b :: Hand out tickets with t++ only.
```
:::

:::exercise Prefix pays first
Read two integers `a` and `b`. In **one** declaration compute `int c = ++a * b--;` and then print `a`,
`b` and `c` separated by spaces. Predict the output before you run it!

**Input:** two integers `a b`.
**Output:** `a b c` after the computation, newline. For `2 5` print `3 4 15`.

```cpp starter
#include <iostream>

int main() {
    int a{}, b{};
    std::cin >> a >> b;
    int c = a * b;
    std::cout << a << ' ' << b << ' ' << c << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int a{}, b{};
    std::cin >> a >> b;
    int c = ++a * b--;
    std::cout << a << ' ' << b << ' ' << c << '\n';
}
```

```hint
`++a` contributes the **new** value of `a`; `b--` contributes the **old** value of `b`. Both variables still change.
```

```stdin
2 5
```

```expected
3 4 15
```

```stdin
0 0
```

```expected hidden
1 -1 0
```

```stdin
-3 -2
```

```expected hidden
-2 -3 4
```

```checks
must \+\+\s*a\s*\*\s*b\s*-- :: Compute c with ++a * b--
```
:::
