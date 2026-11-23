---
title: Function Basics
summary: Why functions exist, how to define and call them, return types, void functions, parameters vs arguments, and declarations vs definitions.
---

## Why functions?

So far every program has lived inside `main`. That works for 20 lines, but real programs are
thousands of lines long. A **function** is a named block of code that does one job. You write it
once and **call** it (run it) as many times as you like.

Functions give you:

- **Reuse**: write "compute the area of a circle" once, use it everywhere.
- **Readability**: `printReceipt(total);` says *what* happens; the details live elsewhere.
- **Testing and debugging**: a small function with one job is easy to check on its own.
- **Abstraction**: callers only need to know *what* a function does, not *how*.

You have already used functions: `main` is one, and `std::sqrt` from `<cmath>` is another.

## Defining and calling a function

```cpp run
#include <iostream>

// definition: return type, name, parameter list, body
int square(int x) {
    return x * x;
}

int main() {
    int a = square(5);              // call it; the result is stored in a
    std::cout << a << '\n';
    std::cout << square(3) + square(4) << '\n';   // calls are expressions
    std::cout << square(square(2)) << '\n';       // a call's result can be an argument
}
```

```output
25
25
16
```

The pieces of `int square(int x) { return x * x; }`:

| Part | Meaning |
| --- | --- |
| `int` | **return type**: the type of the value the function gives back |
| `square` | the function's **name** (same naming rules as variables) |
| `(int x)` | the **parameter list**: inputs, each with a type and a name |
| `{ ... }` | the **body**: statements that run when the function is called |
| `return x * x;` | ends the function and hands the value back to the caller |

When `main` reaches `square(5)`, execution **jumps** into `square` with `x` set to `5`, runs the
body, and **jumps back** with the result. The call `square(5)` then *is* that value (`25`), so you
can store it, print it, or use it in a bigger expression.

## Parameters vs arguments

These two words are often mixed up:

- A **parameter** is the variable in the function's definition: `x` in `int square(int x)`.
- An **argument** is the actual value you pass in a call: `5` in `square(5)`.

Each parameter is initialized from its argument, in order. The number and types must match:

```cpp run
#include <iostream>

double average(double a, double b, double c) {   // three parameters
    return (a + b + c) / 3.0;
}

int main() {
    std::cout << average(1.0, 2.0, 6.0) << '\n';  // three arguments
    int n = 4;
    std::cout << average(n, n, 1) << '\n';        // ints convert to double automatically
}
```

```output
3
3
```

```cpp compile-error
double average(double a, double b, double c) {
    return (a + b + c) / 3.0;
}

int main() {
    average(1.0, 2.0);   // error: too few arguments to function
}
```

A function with no parameters has empty parentheses, both when defined and when called:

```cpp
int rollDie() { return 4; }   // chosen by fair dice roll
int r = rollDie();            // the () are required to call it
```

> **Pitfall:** Writing `rollDie` without `()` doesn't call the function. In an expression like
> `std::cout << rollDie;` GCC warns `the address of 'int rollDie()' will never be NULL`, and it prints `1`.

## `void` functions

Some functions *do* something (print, modify) instead of computing a value. Their return type is
**`void`**, meaning "returns nothing":

```cpp run
#include <iostream>

void printLine(int width) {
    for (int i = 0; i < width; ++i) {
        std::cout << '-';
    }
    std::cout << '\n';
}

void greet() {
    std::cout << "Hello!\n";
    return;                 // optional in a void function: just "leave now"
}

int main() {
    printLine(5);
    greet();
    printLine(10);
}
```

```output
-----
Hello!
----------
```

You can't use the "result" of a `void` function, because there isn't one:

```cpp compile-error
void greet() {}

int main() {
    int x = greet();   // error: void value not ignored as it ought to be
}
```

The reverse is allowed: you may call a non-void function and ignore its result (`square(5);` on its
own line compiles fine, although it's pointless here).

## Declare before use

C++ compilers read your file **top to bottom**. A name must be known *before* the line that uses it.
This fails because `main` calls `cube` before the compiler has seen it:

```cpp compile-error
#include <iostream>

int main() {
    std::cout << cube(3) << '\n';   // error: 'cube' was not declared in this scope
}

int cube(int x) {
    return x * x * x;
}
```

Two fixes: move the definition above `main`, or put a **declaration** (also called a **prototype**)
above `main`.

## Declaration vs definition

- A **declaration** tells the compiler a function *exists*: its name, return type and parameter
  types. It ends with `;` and has no body.
- A **definition** is a declaration **plus the body**.

```cpp run
#include <iostream>

int cube(int x);          // declaration (prototype)
void report(int);         // parameter names are optional in a declaration

int main() {
    report(cube(3));
}

int cube(int x) {         // definition
    return x * x * x;
}

void report(int value) {  // the definition's names are the ones that matter
    std::cout << "Result: " << value << '\n';
}
```

```output
Result: 27
```

Rules:

- You may **declare** a function many times, but **define** it exactly once (the
  *One Definition Rule*).
- The declaration and the definition must agree on return type and parameter types.
- If you declare a function, call it, and never define it, the program compiles but fails to
  **link**: `undefined reference to 'cube(int)'`.

Why bother with prototypes when you could just reorder? Because (1) two functions that call each
other can't both come first, and (2) in bigger projects, declarations go in **header files**
(`.h`) so other `.cpp` files can call your functions. You'll do that in the multi-file module later.

## Function scope

Variables declared inside a function (including its parameters) are **local**: they exist only
while that function runs, and only that function can see them.

```cpp run
#include <iostream>

void setToTen(int x) {
    x = 10;                          // changes the local copy only
    int y = 99;                      // local to setToTen
    std::cout << "inside: x=" << x << " y=" << y << '\n';
}

int main() {
    int x = 1;                       // a different x, local to main
    setToTen(x);
    std::cout << "outside: x=" << x << '\n';
    // std::cout << y;               // error: 'y' was not declared in this scope
}
```

```output
inside: x=10 y=99
outside: x=1
```

The `x` in `main` and the `x` in `setToTen` are **two different variables** that happen to share a
name. Each function has its own little world. (How to let a function change the caller's variable
is the next lesson.)

A function also can't see another function's locals, and you can't define a function inside another
function:

```cpp compile-error
int main() {
    int helper() { return 1; }   // error: a function-definition is not allowed here before '{' token
}
```

## Naming and design tips

- Name functions with a **verb** that says what they do: `printReport`, `computeTax`, `isEven`.
  Functions returning `bool` often start with `is`, `has` or `can`.
- **One job per function.** If you need "and" to describe it, consider splitting it.
- Keep them short. A function that doesn't fit on your screen is probably doing too much.

:::quiz
In `int add(int a, int b) { return a + b; }` and the call `add(2, 3)`, which are the **parameters**?

- [x] `a` and `b`
- [ ] `2` and `3`
- [ ] `int` and `int`
- [ ] `add`

Parameters are the named variables in the definition. The values in the call (`2`, `3`) are the arguments.
:::

:::quiz
`main` calls `foo()`, but `foo` is defined *below* `main` and there is no prototype. What happens?

- [ ] It works, the compiler searches the whole file
- [x] Compile error: `'foo' was not declared in this scope`
- [ ] Link error: undefined reference
- [ ] It compiles with a warning

The compiler reads top to bottom, so a name must be declared before it is used. A prototype above
`main` (`void foo();`) fixes it.
:::

:::quiz
Which line is a function **declaration** (not a definition)?

- [ ] `int twice(int n) { return 2 * n; }`
- [x] `int twice(int n);`
- [ ] `twice(4);`
- [ ] `int x = twice(4);`

A declaration has no body and ends with a semicolon. Lines 3 and 4 are calls.
:::

:::exercise Square function {easy}
Write a function `int square(int x)` that returns `x * x`. In `main`, read one integer and print
its square using your function.

**Input:** one integer `n`.
**Output:** `n * n` followed by a newline.

```cpp starter
#include <iostream>

// define square here

int main() {
    int n;
    std::cin >> n;
    std::cout << n << '\n';   // use your function instead
}
```

```cpp solution
#include <iostream>

int square(int x) {
    return x * x;
}

int main() {
    int n;
    std::cin >> n;
    std::cout << square(n) << '\n';
}
```

```hint
The definition looks like `int square(int x) { return ...; }` and goes **above** `main`.
```

```stdin
7
```

```expected
49
```

```stdin
-4
```

```expected hidden
16
```

```stdin
0
```

```expected hidden
0
```

```stdin
46340
```

```expected hidden
2147395600
```

```checks
must int\s+square\s*\(\s*int\s+\w+\s*\) :: Define a function int square(int x).
must square\s*\(\s*n\s*\) :: Call square(n) in main.
```
:::

:::exercise Draw a box {easy}
Write a `void` function `printRow(int width)` that prints `width` asterisks (`*`) followed by a
newline. In `main`, read `width` and `height` and call `printRow` `height` times to draw a
rectangle.

**Input:** two integers `width` and `height` (both at least 0).
**Output:** `height` lines, each with `width` asterisks. If `height` is 0, print nothing.

```cpp starter
#include <iostream>

int main() {
    int width, height;
    std::cin >> width >> height;
}
```

```cpp solution
#include <iostream>

void printRow(int width) {
    for (int i = 0; i < width; ++i) {
        std::cout << '*';
    }
    std::cout << '\n';
}

int main() {
    int width, height;
    std::cin >> width >> height;
    for (int r = 0; r < height; ++r) {
        printRow(width);
    }
}
```

```hint
`void printRow(int width)` contains a loop that prints one `*` per iteration, then a `'\n'`.
```

```hint
In `main`, loop `height` times and call `printRow(width);` inside the loop.
```

```stdin
4 3
```

```expected
****
****
****
```

```stdin
5 0
```

```expected hidden

```

```stdin
1 1
```

```expected hidden
*
```

```stdin
3 2
```

```expected hidden
***
***
```

```checks
must void\s+printRow\s*\( :: Define a void function named printRow.
```
:::

:::exercise Prototype first {easy}
Write a program where `main` comes **first** in the file and calls two functions defined **below**
it: `int maxOf(int a, int b)` (returns the larger value) and `int minOf(int a, int b)` (returns the
smaller value). You'll need prototypes above `main`.

**Input:** two integers `a` and `b`.
**Output:** `max=M min=N` followed by a newline, e.g. `max=9 min=2`.

```cpp starter
#include <iostream>

int main() {
    int a, b;
    std::cin >> a >> b;
    std::cout << "max=" << a << " min=" << b << '\n';
}
```

```cpp solution
#include <iostream>

int maxOf(int a, int b);
int minOf(int a, int b);

int main() {
    int a, b;
    std::cin >> a >> b;
    std::cout << "max=" << maxOf(a, b) << " min=" << minOf(a, b) << '\n';
}

int maxOf(int a, int b) {
    if (a > b) {
        return a;
    }
    return b;
}

int minOf(int a, int b) {
    if (a < b) {
        return a;
    }
    return b;
}
```

```hint
A prototype is the function's first line with a `;` instead of a body: `int maxOf(int a, int b);`
```

```stdin
2 9
```

```expected
max=9 min=2
```

```stdin
-5 -5
```

```expected hidden
max=-5 min=-5
```

```stdin
7 -3
```

```expected hidden
max=7 min=-3
```

```stdin
0 1
```

```expected hidden
max=1 min=0
```

```checks
must int\s+maxOf\s*\([^)]*\)\s*;[\s\S]*int\s+main :: Declare maxOf with a prototype above main.
must int\s+main[\s\S]*int\s+maxOf\s*\([^)]*\)\s*\{ :: Define maxOf below main.
must int\s+main[\s\S]*int\s+minOf\s*\([^)]*\)\s*\{ :: Define minOf below main.
```
:::

:::exercise Emirp check {hard}
An **emirp** ("prime" backwards) is a prime that gives a **different** prime when its digits are
reversed. 13 is an emirp (31 is prime), 11 is not (reversed it's 11 again), and 23 is not (32 isn't prime).

Write at least these two functions and use them:

- `bool isPrime(int n)`: whether `n` is prime (numbers below 2 are not).
- `int reverseDigits(int n)`: the digits of a non-negative `n` in reverse order (`120` gives `21`).

**Input:** integers until the end of input, each between `-1000000` and `1000000`.
**Output:** one line per number: `N is an emirp`, `N is prime` (prime but not an emirp), or
`N is not prime`.

```cpp starter
#include <iostream>

int main() {
    int n = 0;
    while (std::cin >> n) {
        std::cout << n << " is not prime\n";
    }
}
```

```cpp solution
#include <iostream>

bool isPrime(int n) {
    if (n < 2) {
        return false;
    }
    for (int d = 2; d * d <= n; ++d) {
        if (n % d == 0) {
            return false;
        }
    }
    return true;
}

int reverseDigits(int n) {
    int reversed = 0;
    while (n > 0) {
        reversed = reversed * 10 + n % 10;
        n /= 10;
    }
    return reversed;
}

int main() {
    int n = 0;
    while (std::cin >> n) {
        if (!isPrime(n)) {
            std::cout << n << " is not prime\n";
        } else if (int r = reverseDigits(n); r != n && isPrime(r)) {
            std::cout << n << " is an emirp\n";
        } else {
            std::cout << n << " is prime\n";
        }
    }
}
```

```hint
`isPrime`: try every divisor `d` from 2 while `d * d <= n`. Handle `n < 2` (including 0, 1 and
negatives) first.
```

```hint
`reverseDigits`: peel off the last digit with `n % 10` and append it to the result with
`result = result * 10 + digit`.
```

```hint
Palindromic primes like 11 or 101 reverse to themselves, so they are primes but not emirps.
```

```stdin
13 11 23
```

```expected
13 is an emirp
11 is prime
23 is prime
```

```stdin
2 1 0 -7
```

```expected hidden
2 is prime
1 is not prime
0 is not prime
-7 is not prime
```

```stdin
107 97 101 1000
```

```expected hidden
107 is an emirp
97 is an emirp
101 is prime
1000 is not prime
```

```stdin
999983 991 1000000
```

```expected hidden
999983 is an emirp
991 is an emirp
1000000 is not prime
```

```checks
must bool\s+isPrime\s*\(\s*int :: Write bool isPrime(int n).
must int\s+reverseDigits\s*\(\s*int :: Write int reverseDigits(int n).
```
:::
