---
title: Scope, Blocks, and Lifetime
summary: Where a variable can be used (block scope), how long it exists (lifetime), what happens to variables declared in loops and if statements, shadowing and -Wshadow, and why to declare variables in the smallest scope.
---

Now that your programs have blocks inside blocks (`if` inside `for` inside `main`), it's time to be
precise about two questions for every variable:

- **Scope**: *where in the code* can the name be used?
- **Lifetime**: *when, while the program runs,* does the variable exist?

For the local variables you've been writing, the answers are tied to **blocks**.

## Block scope

A **block** is a pair of braces `{ ... }`. A variable declared inside a block is visible from its
**declaration** to the **closing brace** of that block. That's called **block scope** (or local scope).

```cpp run
#include <iostream>

int main() {
    int a = 1;                       // a: visible from here to the end of main
    {
        int b = 2;                   // b: visible from here to the matching }
        std::cout << a + b << '\n';  // inner blocks can see outer names
    }                                // b's scope ends here
    std::cout << a << '\n';
}
```

```output
3
1
```

Two rules follow:

**Inner blocks see outer names; outer code can't see inner names.**

```cpp compile-error
#include <iostream>

int main() {
    {
        int secret = 42;
    }
    std::cout << secret << '\n';     // error: 'secret' was not declared in this scope
}
```

**A name can't be used before its declaration**, even in the same block:

```cpp compile-error
#include <iostream>

int main() {
    std::cout << later << '\n';      // error: 'later' was not declared in this scope
    int later = 5;
}
```

And within one scope, each name can be declared only once:

```cpp compile-error
int main() {
    int count = 0;
    int count = 1;                   // error: redeclaration of 'int count'
}
```

A block doesn't have to belong to an `if` or a loop. A bare `{ ... }` is legal anywhere a statement is,
and it's occasionally useful just to limit how long some temporary variables stay around.

## Variables in `if`, `for`, and `while`

The bodies of `if`, `else`, `for`, and `while` are blocks, so variables declared in them are local to them.
Variables declared in the **header** of the statement (the `for` initializer, an `if`/`switch`
initializer, a range-for variable) are scoped to the whole statement:

```cpp
for (int i = 0; i < 3; ++i) {        // i: the whole for statement
    int square = i * i;              // square: one iteration's body
}
// neither i nor square exists here

if (int r = 17 % 5; r != 0) {        // r: condition, if block, and else block
    int doubled = r * 2;             // doubled: only this block
} else {
    // r is visible here too, doubled is not
}
```

A very common error is computing something inside a branch and then trying to use it afterwards:

```cpp compile-error
#include <iostream>
#include <string>

int main() {
    int n = -4;
    if (n < 0) {
        std::string kind = "negative";
    } else {
        std::string kind = "non-negative";   // a different variable that happens to share the name
    }
    std::cout << kind << '\n';               // error: 'kind' was not declared in this scope
}
```

The fix is to declare the variable **before** the `if`, in the scope where it's needed, and only
**assign** inside the branches (or use a ternary).

## Lifetime: when variables exist

A local variable is **created** when execution reaches its declaration and **destroyed** when execution
leaves its block. That's called **automatic storage duration**: the memory is managed for you.

The consequence for loops surprises many beginners: a variable declared **inside a loop body is
created fresh on every iteration**. Its initializer runs every time, and nothing carries over from the
previous iteration:

```cpp run
#include <iostream>

int main() {
    for (int i = 1; i <= 3; ++i) {
        int count = 0;               // created and set to 0 on EVERY iteration
        count += i;
        std::cout << "count = " << count << '\n';
    }
}
```

```output
count = 1
count = 2
count = 3
```

That's exactly right for per-iteration values ("the sum of *this* line"), and exactly wrong for
running totals across iterations. A running total must be declared **before** the loop:

```cpp run
#include <iostream>

int main() {
    int total = 0;                   // lives across all iterations
    for (int i = 1; i <= 3; ++i) {
        total += i;
    }
    std::cout << "total = " << total << '\n';
}
```

```output
total = 6
```

### `static` local variables

Occasionally you want a variable that's *visible* only in a block but *survives* between visits. A
`static` local variable is initialized **only the first time** execution reaches it and lives until the
program ends:

```cpp run
#include <iostream>

int main() {
    for (int i = 0; i < 3; ++i) {
        static int calls = 0;        // initialized once, keeps its value
        int fresh = 0;               // re-initialized every iteration
        ++calls;
        ++fresh;
        std::cout << "calls = " << calls << ", fresh = " << fresh << '\n';
    }
}
```

```output
calls = 1, fresh = 1
calls = 2, fresh = 1
calls = 3, fresh = 1
```

`static` locals are mostly useful inside functions (which you'll learn about soon). Scope and lifetime are
different things: `calls` can only be *named* inside the loop body, but it *exists* for the whole program.

## Shadowing

An inner block may declare a variable with the **same name** as one in an outer block. The inner one
**shadows** (hides) the outer one until the inner block ends:

```cpp run
#include <iostream>

int main() {
    int x = 1;
    {
        int x = 2;                   // a NEW variable that hides the outer x
        std::cout << "inner x = " << x << '\n';
        x = 99;                      // changes the inner x only
    }
    std::cout << "outer x = " << x << '\n';
}
```

```output
inner x = 2
outer x = 1
```

This is legal, and **neither `-Wall` nor `-Wextra` warns about it**, which makes it a sneaky source of
bugs. The classic one: you meant to *update* an outer variable, but you accidentally wrote a type in
front of it and *declared a new one*:

```cpp run
#include <initializer_list>
#include <iostream>

int main() {
    int best = 0;
    for (int score : {40, 75, 62}) {
        if (score > best) {
            int best = score;        // BUG: declares a new 'best' instead of updating the outer one
            std::cout << "new best: " << best << '\n';
        }
    }
    std::cout << "final best: " << best << '\n';   // still 0!
}
```

```output
new best: 40
new best: 75
new best: 62
final best: 0
```

Every score looks like a "new best", because the outer `best` is never changed. The fix is to remove
`int`: `best = score;`.

> **Tip:** Compile with **`-Wshadow`** to make GCC warn whenever a declaration shadows another
> (`declaration of 'best' shadows a previous local`). It's not part of `-Wall -Wextra`, so add it
> explicitly in your own projects. The simplest prevention is to avoid reusing names in nested scopes.

### Global variables and `::`

A variable declared **outside** every function is a **global variable**. Its scope is the rest of the
file, and it lives for the whole program. A local variable with the same name shadows it, but you can
still reach the global with the scope resolution operator `::` and no namespace name:

```cpp run
#include <iostream>

int level = 10;                      // global

int main() {
    int level = 3;                   // local, shadows the global
    std::cout << level << ' ' << ::level << '\n';
    ::level += 1;                    // changes the global
    std::cout << ::level << '\n';
}
```

```output
3 10
11
```

Global variables can be read and changed from anywhere, which makes programs hard to reason about.
Use them sparingly; global **constants** (`const int max_size = 100;`) are fine.

## Best practice: the smallest scope

Declare each variable **as late as possible**, in the **smallest scope** that needs it, ideally right
where you can give it a meaningful initial value:

```cpp
// worse: everything declared at the top, long before use
int i, sum, square;
sum = 0;
for (i = 0; i < 10; ++i) {
    square = i * i;
    sum += square;
}

// better: each variable lives exactly as long as it's needed
int sum = 0;
for (int i = 0; i < 10; ++i) {
    int square = i * i;
    sum += square;
}
```

Small scopes mean fewer names to keep in your head at any point, no accidental reuse of stale values,
and the compiler catches uses in the wrong place for you.

:::quiz
What does this print?

```cpp
int n = 5;
{
    int n = 10;
    n += 1;
}
std::cout << n;
```

- [x] `5`
- [ ] `10`
- [ ] `11`
- [ ] It doesn't compile

The inner `n` is a separate variable that shadows the outer one. Changes to it disappear at its closing brace.
:::

:::quiz
What does this print?

```cpp
for (int i = 0; i < 3; ++i) {
    int k = 0;
    k += 2;
    std::cout << k;
}
```

- [ ] `246`
- [x] `222`
- [ ] `024`
- [ ] It doesn't compile

`k` is created and initialized to 0 at the start of every iteration, so each iteration prints 2.
:::

:::quiz
Which statements are true? (select all that apply)

- [x] A variable declared in a `for` initializer can't be used after the loop
- [x] A variable declared inside a loop body is re-created on every iteration
- [ ] `-Wall -Wextra` warns about shadowed variables
- [x] An inner block can use variables declared in an enclosing block

Shadowing warnings require `-Wshadow`, which isn't included in `-Wall` or `-Wextra`.
:::

:::exercise Fix the scope
This program doesn't compile because `kind` is used outside the blocks where it was declared. Fix it so
it reads an integer and prints whether it's negative.

**Input:** one integer `n`.
**Output:** `<n> is negative` or `<n> is non-negative`.

```cpp starter broken
#include <iostream>
#include <string>

int main() {
    int n = 0;
    std::cin >> n;
    if (n < 0) {
        std::string kind = "negative";
    } else {
        std::string kind = "non-negative";
    }
    std::cout << n << " is " << kind << '\n';
}
```

```cpp solution
#include <iostream>
#include <string>

int main() {
    int n = 0;
    std::cin >> n;
    std::string kind;
    if (n < 0) {
        kind = "negative";
    } else {
        kind = "non-negative";
    }
    std::cout << n << " is " << kind << '\n';
}
```

```hint
Declare `std::string kind;` once, before the `if`, so it's in scope at the `std::cout` line.
```

```hint
Inside the branches, *assign* to it (`kind = "negative";`) instead of declaring a new variable.
```

```stdin
-4
```

```expected
-4 is negative
```

```stdin
7
```

```expected
7 is non-negative
```

```stdin
0
```

```expected hidden
0 is non-negative
```
:::

:::exercise Shadowed total
This program should add up all the **positive** numbers in the input, but it always prints 0. Find the
shadowing bug and fix it.

**Input:** zero or more integers.
**Output:** `Total: <sum of the positive numbers>`

```cpp starter
#include <iostream>

int main() {
    int total = 0;
    int x = 0;
    while (std::cin >> x) {
        if (x > 0) {
            int total = 0;
            total += x;
        }
    }
    std::cout << "Total: " << total << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int total = 0;
    int x = 0;
    while (std::cin >> x) {
        if (x > 0) {
            total += x;
        }
    }
    std::cout << "Total: " << total << '\n';
}
```

```hint
Look at the line `int total = 0;` inside the `if`. Which `total` does `total += x;` change?
```

```stdin
1 2 3
```

```expected
Total: 6
```

```stdin
5 -5 10
```

```expected
Total: 15
```

```stdin
-1 -2
```

```expected hidden
Total: 0
```
:::

:::exercise Group sums
The input consists of **groups**. Each group starts with a count `k`, followed by `k` integers. Groups
repeat until the end of input. Print the sum of each group.

**Input:** one or more groups, e.g.

```
3 1 2 3
2 10 20
0
```

**Output:** one line per group: `Group <number>: <sum>`, with groups numbered from 1. For the input above:

```
Group 1: 6
Group 2: 30
Group 3: 0
```

```cpp starter
#include <iostream>

int main() {
    int k = 0;
    int group = 0;
    int sum = 0;
    while (std::cin >> k) {
        ++group;
        for (int i = 0; i < k; ++i) {
            int x = 0;
            std::cin >> x;
            sum += x;
        }
        std::cout << "Group " << group << ": " << sum << '\n';
    }
}
```

```cpp solution
#include <iostream>

int main() {
    int k = 0;
    int group = 0;
    while (std::cin >> k) {
        ++group;
        int sum = 0;
        for (int i = 0; i < k; ++i) {
            int x = 0;
            std::cin >> x;
            sum += x;
        }
        std::cout << "Group " << group << ": " << sum << '\n';
    }
}
```

```hint
The starter's `sum` lives across all groups, so it keeps growing. Each group needs its own sum.
```

```hint
Declare `int sum = 0;` inside the `while` body, so a fresh one is created for every group.
```

```stdin
3 1 2 3
2 10 20
0
```

```expected
Group 1: 6
Group 2: 30
Group 3: 0
```

```stdin
1 -5
```

```expected
Group 1: -5
```

```stdin
2 100 200 1 1 4 1 1 1 1
```

```expected hidden
Group 1: 300
Group 2: 1
Group 3: 4
```

```checks
must while[\s\S]*\{[\s\S]*int\s+sum\s*= :: Declare the per-group sum inside the loop.
```
:::
