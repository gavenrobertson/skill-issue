---
title: Recursion
summary: Functions that call themselves. Base cases, recursive cases, the call stack, classic examples, stack overflow, and when to use a loop instead.
---

## A function that calls itself

A **recursive** function solves a problem by calling itself on a **smaller version** of the same
problem. Every recursive function has two parts:

- A **base case**: a version of the problem small enough to answer directly, with no further calls.
- A **recursive case**: break the problem down, call yourself on the smaller piece, combine the result.

The classic example is the factorial, `n! = n × (n-1) × ... × 1`, with `0! = 1`. Notice that
`n! = n × (n-1)!`. That's a recursive definition, and it translates straight into code:

```cpp run
#include <iostream>

long long factorial(int n) {
    if (n <= 1) {                    // base case
        return 1;
    }
    return n * factorial(n - 1);     // recursive case: a smaller problem
}

int main() {
    for (int i = 0; i <= 5; ++i) {
        std::cout << i << "! = " << factorial(i) << '\n';
    }
    std::cout << "20! = " << factorial(20) << '\n';
}
```

```output
0! = 1
1! = 1
2! = 2
3! = 6
4! = 24
5! = 120
20! = 2432902008176640000
```

## How it actually runs: the call stack

Each time a function is called, the program reserves a chunk of memory called a **stack frame** for
that call's parameters and local variables. Frames are stacked on top of each other on the
**call stack**; when a call returns, its frame is removed. Each recursive call gets **its own
frame**, so each has its own `n`.

`factorial(4)` unfolds like this:

```
factorial(4)                         waits for factorial(3)
  factorial(3)                       waits for factorial(2)
    factorial(2)                     waits for factorial(1)
      factorial(1)  -> returns 1     base case
    factorial(2)    -> returns 2 * 1 = 2
  factorial(3)      -> returns 3 * 2 = 6
factorial(4)        -> returns 4 * 6 = 24
```

The calls go **down** until they hit the base case, then the results flow back **up**. You can watch
this by printing on the way in and on the way out:

```cpp run
#include <iostream>
#include <string>

int sumTo(int n, int depth) {
    std::string indent(depth * 2, ' ');           // 2 spaces per level
    std::cout << indent << "sumTo(" << n << ")\n";
    if (n == 0) {
        std::cout << indent << "base case -> 0\n";
        return 0;
    }
    int result = n + sumTo(n - 1, depth + 1);
    std::cout << indent << "-> " << result << '\n';
    return result;
}

int main() {
    sumTo(3, 0);
}
```

```output
sumTo(3)
  sumTo(2)
    sumTo(1)
      sumTo(0)
      base case -> 0
    -> 1
  -> 3
-> 6
```

## More classic examples

```cpp run
#include <iostream>

// x^n by repeated multiplication: x^n = x * x^(n-1), x^0 = 1
long long power(long long x, int n) {
    if (n == 0) return 1;
    return x * power(x, n - 1);
}

// Greatest common divisor (Euclid's algorithm): gcd(a, b) = gcd(b, a % b), gcd(a, 0) = a
int gcd(int a, int b) {
    if (b == 0) return a;
    return gcd(b, a % b);
}

// Fibonacci: fib(0) = 0, fib(1) = 1, fib(n) = fib(n-1) + fib(n-2)
int fib(int n) {
    if (n < 2) return n;                  // two base cases in one line
    return fib(n - 1) + fib(n - 2);       // two recursive calls
}

// Sum of the digits: digitSum(1234) = 4 + digitSum(123)
int digitSum(int n) {
    if (n < 10) return n;
    return n % 10 + digitSum(n / 10);
}

int main() {
    std::cout << power(2, 10) << ' ' << gcd(48, 18) << ' ' << fib(10) << ' ' << digitSum(1234) << '\n';
}
```

```output
1024 6 55 10
```

Recursion is not only about math. Printing something "backwards" is natural with recursion, because
work done **after** the recursive call happens on the way back up:

```cpp run
#include <iostream>

void countdown(int n) {
    if (n == 0) {
        std::cout << "Liftoff!\n";
        return;
    }
    std::cout << n << ' ';      // before the call: printed on the way down
    countdown(n - 1);
}

void countup(int n) {
    if (n == 0) return;
    countup(n - 1);
    std::cout << n << ' ';      // after the call: printed on the way back up
}

int main() {
    countdown(3);
    countup(3);
    std::cout << '\n';
}
```

```output
3 2 1 Liftoff!
1 2 3
```

## How to write a recursive function

1. **Find the base case.** What's the simplest input? (0, 1, an empty string, a single digit...)
2. **Assume the function already works for smaller inputs.** This is the "leap of faith".
3. **Express the answer for `n` using the answer for something smaller.**
4. **Make sure every call moves toward the base case.** `n - 1`, `n / 10`, a shorter string...

## Stack overflow

The call stack is small (often around 1 to 8 MB). If recursion never reaches a base case, or just
goes very deep, the stack runs out and the program crashes with a **stack overflow** (on Linux,
usually `Segmentation fault`):

```cpp
int broken(int n) {
    return n * broken(n - 1);   // no base case: recurses until the stack runs out
}
```

GCC even warns about some of these: `infinite recursion detected [-Winfinite-recursion]`.

Common causes:

- **Missing base case**, as above.
- **A base case that's never reached**: `factorial(-1)` with a check of `n == 0` would count down
  forever. That's why the factorial above uses `n <= 1`.
- **Legitimately deep recursion**: summing a list of a million numbers recursively uses a million
  frames. Use a loop for that.

## Recursion vs iteration

Anything recursive can be written with a loop, and vice versa. Compare:

```cpp run
#include <iostream>

long long factorialLoop(int n) {
    long long result = 1;
    for (int i = 2; i <= n; ++i) {
        result *= i;
    }
    return result;
}

int fibLoop(int n) {
    int a = 0;   // fib(i)
    int b = 1;   // fib(i + 1)
    for (int i = 0; i < n; ++i) {
        int next = a + b;
        a = b;
        b = next;
    }
    return a;
}

int main() {
    std::cout << factorialLoop(10) << ' ' << fibLoop(40) << '\n';
}
```

```output
3628800 102334155
```

| | Recursion | Iteration |
| --- | --- | --- |
| Readability | Great for naturally recursive problems (trees, divide-and-conquer, backtracking) | Great for simple repetition |
| Memory | One stack frame per active call | Constant |
| Speed | Function-call overhead | Usually faster |
| Risk | Stack overflow on deep input | None of that |

> **Warning:** The recursive `fib` above is **exponentially slow**: `fib(n)` calls `fib(n-1)` and
> `fib(n-2)`, which recompute the same values again and again. `fib(40)` makes over 300 million
> calls. The loop version makes 40 steps. Two recursive calls per step is a red flag for repeated
> work.

## Tail recursion

A call is a **tail call** if it's the very last thing a function does, with nothing left to compute
afterwards. `gcd` above is tail-recursive (`return gcd(b, a % b);`), but `factorial` isn't
(it still has to multiply by `n` after the call returns).

Tail calls can be turned into a jump by the optimizer, reusing the same stack frame, so they don't
grow the stack. GCC does this at `-O2`, but **C++ doesn't guarantee it**, so don't rely on it for
correctness. You can often make a function tail-recursive with an **accumulator** parameter:

```cpp run
#include <iostream>

long long factorialTail(int n, long long acc = 1) {
    if (n <= 1) return acc;
    return factorialTail(n - 1, acc * n);   // nothing left to do after this call
}

int main() {
    std::cout << factorialTail(10) << '\n';
}
```

```output
3628800
```

:::quiz
What is wrong with this function?

```cpp
int sumTo(int n) {
    return n + sumTo(n - 1);
}
```

- [ ] Functions can't call themselves
- [x] It has no base case, so it recurses until the stack overflows
- [ ] It should return `void`
- [ ] Nothing

Without a base case like `if (n == 0) return 0;`, every call makes another call, forever.
:::

:::quiz
What does `mystery(3)` print?

```cpp
void mystery(int n) {
    if (n == 0) return;
    mystery(n - 1);
    std::cout << n;
}
```

- [ ] `321`
- [x] `123`
- [ ] `3`
- [ ] Nothing

The print happens *after* the recursive call, so it runs on the way back up: deepest call (`1`) first.
:::

:::quiz
Which of these is a **tail call**?

- [x] `return gcd(b, a % b);`
- [ ] `return n * factorial(n - 1);`
- [ ] `return fib(n - 1) + fib(n - 2);`

In the other two, the function still has work to do (a multiplication, an addition) after the call returns.
:::

:::exercise Recursive sum of digits
Write a **recursive** function `int digitSum(int n)` that returns the sum of the decimal digits of a
non-negative integer. No loops allowed.

**Input:** one non-negative integer.
**Output:** the sum of its digits, then a newline.

```cpp starter
#include <iostream>

int digitSum(int n) {
    return n;
}

int main() {
    int n;
    std::cin >> n;
    std::cout << digitSum(n) << '\n';
}
```

```cpp solution
#include <iostream>

int digitSum(int n) {
    if (n < 10) {
        return n;
    }
    return n % 10 + digitSum(n / 10);
}

int main() {
    int n;
    std::cin >> n;
    std::cout << digitSum(n) << '\n';
}
```

```hint
Base case: a single digit (`n < 10`) is its own digit sum.
```

```hint
Recursive case: the last digit is `n % 10`, and the rest of the number is `n / 10`.
```

```stdin
1234
```

```expected
10
```

```stdin
0
```

```expected hidden
0
```

```stdin
999999999
```

```expected hidden
81
```

```checks
must digitSum\s*\([^)]*\)\s*\{[\s\S]*digitSum\s*\( :: digitSum must call itself.
mustnot \bfor\s*\(|\bwhile\s*\( :: Solve it with recursion, no loops.
```
:::

:::exercise Fast power
Write a recursive `long long power(long long x, int n)` using **exponentiation by squaring**:

- `power(x, 0)` is `1`
- if `n` is even, `power(x, n)` is `half * half` where `half = power(x, n / 2)`
- if `n` is odd, it's `x * power(x, n - 1)`

This needs only about `log2(n)` calls instead of `n`. No loops.

**Input:** two integers `x` and `n` (`n >= 0`, and the result fits in a `long long`).
**Output:** `x` to the power `n`, then a newline.

```cpp starter
#include <iostream>

long long power(long long x, int n) {
    return x * n;
}

int main() {
    long long x;
    int n;
    std::cin >> x >> n;
    std::cout << power(x, n) << '\n';
}
```

```cpp solution
#include <iostream>

long long power(long long x, int n) {
    if (n == 0) {
        return 1;
    }
    if (n % 2 == 0) {
        long long half = power(x, n / 2);
        return half * half;
    }
    return x * power(x, n - 1);
}

int main() {
    long long x;
    int n;
    std::cin >> x >> n;
    std::cout << power(x, n) << '\n';
}
```

```hint
Store `power(x, n / 2)` in a variable and multiply it by itself. Calling it twice would throw away the speedup.
```

```stdin
2 10
```

```expected
1024
```

```stdin
-3 3
```

```expected hidden
-27
```

```stdin
7 0
```

```expected hidden
1
```

```stdin
3 39
```

```expected hidden
4052555153018976267
```

```checks
must power\s*\([^)]*\)\s*\{[\s\S]*power\s*\( :: power must call itself.
mustnot \bfor\s*\(|\bwhile\s*\( :: Solve it with recursion, no loops.
```
:::

:::exercise Reverse the words
Read words until the end of input and print them in **reverse order**, one per line, using a
recursive function `void reverseWords()` that reads one word, recurses, and then prints the word.
No arrays, vectors or loops: the call stack does the remembering.

**Input:** zero or more whitespace-separated words.
**Output:** the words in reverse order, one per line. Empty input prints nothing.

```cpp starter
#include <iostream>
#include <string>

void reverseWords() {
    std::string word;
    if (std::cin >> word) {
        std::cout << word << '\n';
    }
}

int main() {
    reverseWords();
}
```

```cpp solution
#include <iostream>
#include <string>

void reverseWords() {
    std::string word;
    if (!(std::cin >> word)) {
        return;                    // base case: no more input
    }
    reverseWords();                // handle the rest first
    std::cout << word << '\n';     // then print this word on the way back up
}

int main() {
    reverseWords();
}
```

```hint
Base case: reading a word fails (end of input), so just `return`.
```

```hint
Print the word *after* the recursive call, so it comes out on the way back up.
```

```stdin
one two three
```

```expected
three
two
one
```

```stdin
solo
```

```expected hidden
solo
```

```stdin
```

```expected hidden
```

```checks
must reverseWords\s*\(\s*\)\s*\{[\s\S]*reverseWords\s*\(\s*\)\s*; :: reverseWords must call itself.
mustnot \bfor\s*\(|\bwhile\s*\( :: No loops: use recursion.
mustnot vector|\[\s*\d*\s*\] :: Don't store the words in an array or vector.
```
:::
