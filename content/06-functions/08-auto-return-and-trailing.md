---
title: auto Return Types & Trailing Returns
summary: Let the compiler deduce a function's return type, the trailing return syntax, its rules and pitfalls, and a glimpse of decltype(auto).
---

## `auto` as a return type (C++14)

You've seen `auto x = 5;` let the compiler deduce a variable's type from its initializer. The same
works for a function's return type: write `auto` and the compiler deduces it from the `return`
statements.

```cpp run
#include <iostream>
#include <string>

auto add(int a, int b) {           // deduced: int
    return a + b;
}

auto average(int a, int b) {       // deduced: double
    return (a + b) / 2.0;
}

auto greeting(const std::string& name) {   // deduced: std::string
    return "Hi, " + name;
}

int main() {
    std::cout << add(2, 3) << ' ' << average(2, 3) << ' ' << greeting("Bo") << '\n';
}
```

```output
5 2.5 Hi, Bo
```

## Rules

**1. All `return` statements must deduce the same type.** The compiler won't pick a common type
for you:

```cpp compile-error
auto pick(bool flag) {
    if (flag) {
        return 1;      // int
    }
    return 2.5;        // error: inconsistent deduction for auto return type: 'int' and then 'double'
}

int main() {}
```

Fix it by making them agree (`return 1.0;`) or by writing the return type explicitly.

**2. Deduction drops references and top-level `const`**, just like `auto x = ...`. Returning a
reference parameter with plain `auto` returns a **copy**:

```cpp run
#include <iostream>

auto firstCopy(int& a) {        // deduces int: returns a copy of a
    return a;
}

auto& firstRef(int& a) {        // auto& deduces int&: returns a reference to a
    return a;
}

int main() {
    int x = 1;
    firstRef(x) = 10;           // assigns to x through the returned reference
    int c = firstCopy(x);       // c is a separate copy
    c = 99;                     // changes only the copy
    std::cout << x << ' ' << c << '\n';
}
```

```output
10 99
```

You can add `&`, `const auto&` or `auto*` to control the result, just like with variables.

**3. The function's definition must be seen before it's called.** A declaration alone isn't
enough, because the compiler can't know the type without reading the body:

```cpp compile-error
auto twice(int x);

int main() {
    return twice(4);   // error: use of 'auto twice(int)' before deduction of 'auto'
}

auto twice(int x) {
    return x * 2;
}
```

That's one reason `auto` return types are mostly used for short functions defined in place (and for
templates, later).

**4. A `void` function can use `auto`** if it has no return values (or only `return;`), and a
recursive `auto` function works as long as a non-recursive `return` comes first so the type is known.

## Trailing return types

C++11 added a second way to write any function's return type: put `auto` in front and the actual
type **after** the parameter list, with `->`:

```cpp run
#include <iostream>
#include <string>

auto square(int x) -> int {                 // same as: int square(int x)
    return x * x;
}

auto describe(int n) -> std::string {
    return n % 2 == 0 ? "even" : "odd";
}

auto ratio(int a, int b) -> double;         // works in declarations too

int main() {
    std::cout << square(9) << ' ' << describe(7) << ' ' << ratio(1, 4) << '\n';
}

auto ratio(int a, int b) -> double {
    return static_cast<double>(a) / b;
}
```

```output
81 odd 0.25
```

Here `auto` doesn't mean "deduce"; it's just a placeholder saying "the return type comes later".
Unlike deduced `auto`, a trailing-return function **can** be declared first and defined later.

Why would anyone write it this way?

- **The return type can use the parameters.** Something like `-> decltype(a + b)` names the type of
  an expression involving the parameters, which haven't been declared yet at the front of the line.
  This matters for templates.
- **Long return types read better at the end.** Some codebases use trailing returns everywhere so
  function names line up.
- **Lambdas** (a later module) can only specify their return type this way.

## Choosing a style

| Form | Example | When |
| --- | --- | --- |
| Explicit | `int f(int x)` | The default. Clear and works with separate declarations. |
| Deduced | `auto f(int x)` | Short functions where the type is obvious or annoying to spell. |
| Trailing | `auto f(int x) -> int` | Return type depends on parameters, or team style. |

> **Tip:** For a public function that others will call, an explicit return type is documentation.
> Readers shouldn't have to read the body to know what they get back.

## A glimpse of `decltype(auto)`

`decltype(expr)` gives the exact type of an expression, references included. `decltype(auto)` as a
return type deduces the type **exactly** as written in the return statement, keeping references
that plain `auto` would drop. It's mainly used in generic code that forwards results from other
functions. You can safely skip it for now; just recognize it when you see it.

```cpp
int value = 0;

auto getCopy() { return value; }              // returns int
decltype(auto) getRef() { return (value); }   // returns int&: (value) is an lvalue expression
```

:::quiz
What return type does the compiler deduce?

```cpp
auto f(int n) {
    return n * 1.5;
}
```

- [ ] `int`
- [x] `double`
- [ ] `float`
- [ ] It doesn't compile

`int * double` is a `double`, so the function returns `double`.
:::

:::quiz
Which of these functions **fails** to compile?

- [ ] `auto f() -> int { return 1; }`
- [x] `auto g(bool b) { if (b) return 1; return 2u; }`
- [ ] `auto h(int x) { return x; }`

In `g`, the returns deduce `int` and `unsigned int`. All returns must deduce the same type.
:::

:::exercise Trailing returns {medium}
Rewrite both functions to use **trailing return type** syntax (`auto name(params) -> type`). Their
behavior should stay the same.

**Input:** two integers `a` and `b` (`b` is not 0).
**Output:** two lines: `a * b` and then `a / b` as a floating-point division (default `std::cout` formatting).

```cpp starter
#include <iostream>

long long product(int a, int b) {
    return a * b;
}

double divide(int a, int b) {
    return a / b;
}

int main() {
    int a, b;
    std::cin >> a >> b;
    std::cout << product(a, b) << '\n';
    std::cout << divide(a, b) << '\n';
}
```

```cpp solution
#include <iostream>

auto product(int a, int b) -> long long {
    return static_cast<long long>(a) * b;
}

auto divide(int a, int b) -> double {
    return static_cast<double>(a) / b;
}

int main() {
    int a, b;
    std::cin >> a >> b;
    std::cout << product(a, b) << '\n';
    std::cout << divide(a, b) << '\n';
}
```

```hint
The syntax is `auto product(int a, int b) -> long long { ... }`.
```

```hint
The starter also has two bugs: `a / b` with two ints truncates, and `a * b` can overflow `int` before it's converted to `long long`. Cast one operand first.
```

```stdin
7 2
```

```expected
14
3.5
```

```stdin
100000 100000
```

```expected hidden
10000000000
1
```

```stdin
-7 2
```

```expected hidden
-14
-3.5
```

```stdin
46341 46341
```

```expected hidden
2147488281
1
```

```stdin
1 3
```

```expected hidden
3
0.333333
```

```checks
must auto\s+product\s*\([^)]*\)\s*->\s*long\s+long :: Use a trailing return type for product.
must auto\s+divide\s*\([^)]*\)\s*->\s*double :: Use a trailing return type for divide.
```
:::

:::exercise Deduce it {easy}
Write three functions with a **deduced** `auto` return type (no trailing `->`):

- `auto mid(int a, int b)` returns the average of `a` and `b` as a `double`.
- `auto label(int n)` returns a `std::string`: `"negative"`, `"zero"` or `"positive"`.
- `auto isMultiple(int n, int k)` returns a `bool`: whether `n` is a multiple of `k`.

Make sure every `return` in a function deduces the **same** type (hint: string literals are not
`std::string`s). Read `a`, `b` and print `mid(a, b)`, `label(a)` and `isMultiple(a, b)` on three
lines, printing the bool as `true`/`false` with `std::boolalpha`.

**Input:** two integers `a` and `b` (`b` is not 0).
**Output:** three lines as described.

```cpp starter
#include <iostream>
#include <string>

int main() {
    int a, b;
    std::cin >> a >> b;
}
```

```cpp solution
#include <iostream>
#include <string>

auto mid(int a, int b) {
    return (a + b) / 2.0;
}

auto label(int n) {
    if (n < 0) return std::string("negative");
    if (n == 0) return std::string("zero");
    return std::string("positive");
}

auto isMultiple(int n, int k) {
    return n % k == 0;
}

int main() {
    int a, b;
    std::cin >> a >> b;
    std::cout << mid(a, b) << '\n';
    std::cout << label(a) << '\n';
    std::cout << std::boolalpha << isMultiple(a, b) << '\n';
}
```

```hint
`return "zero";` would deduce `const char*`. Wrap each literal: `return std::string("zero");`
```

```stdin
9 3
```

```expected
6
positive
true
```

```stdin
-3 2
```

```expected hidden
-0.5
negative
false
```

```stdin
0 5
```

```expected hidden
2.5
zero
true
```

```stdin
-4 -2
```

```expected hidden
-3
negative
true
```

```stdin
7 7
```

```expected hidden
7
positive
true
```

```checks
must auto\s+mid\s*\([^)]*\)\s*\{ :: mid must use a deduced auto return type.
must auto\s+label\s*\([^)]*\)\s*\{ :: label must use a deduced auto return type.
must auto\s+isMultiple\s*\([^)]*\)\s*\{ :: isMultiple must use a deduced auto return type.
must boolalpha :: Print the bool with std::boolalpha.
```
:::

:::exercise Collatz records {hard}
The **Collatz** sequence starting at `n` repeats one rule until it reaches 1: if `n` is even, halve it;
otherwise replace it with `3n + 1`. Starting at 6: `6 3 10 5 16 8 4 2 1`, which takes **8 steps** and
reaches a **peak** of 16.

Write two **recursive** functions:

- `auto steps(long long n)` with a **deduced** return type: how many steps the sequence from `n` takes
  to reach 1 (`steps(1)` is 0).
- `auto peak(long long n) -> long long` with a **trailing** return type: the largest value the sequence
  from `n` reaches (including `n` itself; `peak(1)` is 1).

**Input:** one integer `N` (`1 <= N <= 150000`).
**Output:** two lines, considering every start from 1 to `N`:

```
Most steps: start=S steps=K
Highest peak: start=S peak=P
```

If several starts tie, report the **smallest** one. For `N = 10`:

```
Most steps: start=9 steps=19
Highest peak: start=7 peak=52
```

```cpp starter
#include <iostream>

int main() {
    long long n = 0;
    std::cin >> n;
    std::cout << "Most steps: start=" << n << " steps=0\n";
    std::cout << "Highest peak: start=" << n << " peak=" << n << '\n';
}
```

```cpp solution
#include <iostream>

auto steps(long long n) {
    if (n == 1) {
        return 0;                       // deduces int: must come before the recursive return
    }
    return 1 + steps(n % 2 == 0 ? n / 2 : 3 * n + 1);
}

auto peak(long long n) -> long long {
    if (n == 1) {
        return 1;
    }
    long long rest = peak(n % 2 == 0 ? n / 2 : 3 * n + 1);
    return rest > n ? rest : n;
}

int main() {
    long long limit = 0;
    std::cin >> limit;

    long long bestStepsStart = 1;
    int bestSteps = 0;
    long long bestPeakStart = 1;
    long long bestPeak = 1;
    for (long long start = 1; start <= limit; ++start) {
        int s = steps(start);
        if (s > bestSteps) {
            bestSteps = s;
            bestStepsStart = start;
        }
        long long p = peak(start);
        if (p > bestPeak) {
            bestPeak = p;
            bestPeakStart = start;
        }
    }
    std::cout << "Most steps: start=" << bestStepsStart << " steps=" << bestSteps << '\n';
    std::cout << "Highest peak: start=" << bestPeakStart << " peak=" << bestPeak << '\n';
}
```

```hint
In a recursive function with a deduced `auto` return type, the compiler must see a non-recursive
`return` (the base case) **before** the recursive one.
```

```hint
The values inside a sequence get much bigger than the start: from 113383 the sequence climbs past
2 billion, which doesn't fit in an `int`. That's why the parameter is a `long long`.
```

```hint
To report the smallest start on ties, only replace the record when the new value is **strictly**
greater.
```

```stdin
10
```

```expected
Most steps: start=9 steps=19
Highest peak: start=7 peak=52
```

```stdin
1
```

```expected
Most steps: start=1 steps=0
Highest peak: start=1 peak=1
```

```stdin
2
```

```expected hidden
Most steps: start=2 steps=1
Highest peak: start=2 peak=2
```

```stdin
27
```

```expected hidden
Most steps: start=27 steps=111
Highest peak: start=27 peak=9232
```

```stdin
120000
```

```expected hidden
Most steps: start=106239 steps=353
Highest peak: start=113383 peak=2482111348
```

```checks
must auto\s+steps\s*\([^)]*\)\s*\{ :: steps must use a deduced auto return type.
must auto\s+peak\s*\([^)]*\)\s*->\s*long\s+long :: peak must use a trailing return type.
mustnot \bwhile\s*\( :: Compute each sequence with recursion, not a while loop.
```
:::
