---
title: Lambda Basics
summary: Anonymous functions you write right where you need them. The full syntax, storing and calling lambdas, and passing them to other functions.
---

## Why lambdas?

Many standard library functions take *another function* as an argument: "sort these, using **this**
rule to compare", "count the elements for which **this** is true". Before C++11 you had to write a
separate named function (or a whole struct) far away from where it was used, just to pass it along.

A **lambda expression** lets you write that little function inline, exactly where you need it:

```cpp run
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v{5, -3, 8, -1, 0, 7};

    // "how many elements are negative?"  The lambda is the rule.
    auto negatives = std::count_if(v.begin(), v.end(), [](int x) { return x < 0; });

    std::cout << negatives << " negative numbers\n";
}
```

```output
2 negative numbers
```

`[](int x) { return x < 0; }` is a lambda: a function with no name that takes an `int` and returns
whether it is negative. `std::count_if` calls it once per element.

## What a lambda really is

A lambda is not magic. When the compiler sees one, it invents a small unnamed **class** with an
`operator()` (a "call operator") and creates an object of that class. That object is called a
**closure**. These two are (almost exactly) the same:

```cpp
// The lambda...
auto is_negative = [](int x) { return x < 0; };

// ...is roughly what the compiler turns into this:
struct __SomeUniqueName {
    bool operator()(int x) const { return x < 0; }
};
auto is_negative2 = __SomeUniqueName{};
```

So a lambda is a **function object**: an object you can call with `()`. Keep this picture in mind;
it explains everything about captures, `mutable`, and why every lambda has its own type.

## The full syntax

```cpp
[captures] (parameters) specifiers -> return_type { body }
```

| Part | Required? | Meaning |
| --- | --- | --- |
| `[captures]` | **yes** (may be empty `[]`) | Which local variables from the surrounding scope the body may use (next lesson). |
| `(parameters)` | no, if empty | Like a normal function's parameter list. |
| `mutable` | no | Lets the body modify variables captured by value. |
| `noexcept` | no | Promises the lambda never throws. |
| `-> return_type` | no | Explicit return type. Usually deduced from `return`. |
| `{ body }` | **yes** | The code that runs when the lambda is called. |

The smallest possible lambda is `[]{}`: captures nothing, takes nothing, does nothing.

## Storing a lambda and calling it

Each lambda has a unique type that you can't spell, so you store it in an `auto` variable. Then you
call it like a function:

```cpp run
#include <iostream>
#include <string>

int main() {
    auto add = [](int a, int b) { return a + b; };
    auto greet = [](const std::string& name) { std::cout << "Hello, " << name << "!\n"; };
    auto say_hi = [] { std::cout << "hi\n"; };      // no () needed when there are no parameters
    auto also_hi = []() { std::cout << "hi\n"; };   // same thing, with an explicit empty ()

    std::cout << add(2, 3) << '\n';
    greet("Ada");
    say_hi();
    also_hi();
}
```

```output
5
Hello, Ada!
hi
hi
```

Notice the **semicolon** after the closing brace when storing a lambda. `auto add = ...;` is a
variable declaration, and every declaration ends with `;`.

## Return types: deduced or explicit

If the body has `return` statements, the compiler deduces the return type from them (just like a
function declared `auto`). If there is no `return`, the type is `void`.

When the deduced type isn't what you want, or the `return` statements disagree, write it with
`-> type`:

```cpp run
#include <iostream>

int main() {
    auto half = [](int x) { return x / 2; };                // returns int
    auto half_exact = [](int x) -> double { return x / 2.0; };

    // Two returns with different types: needs an explicit return type
    auto sign = [](double x) -> double {
        if (x < 0) return -1;      // int, converted to double
        return 1.0;                // double
    };

    std::cout << half(7) << ' ' << half_exact(7) << ' ' << sign(-4.5) << '\n';
}
```

```output
3 3.5 -1
```

Without the `-> double`, `sign` doesn't compile, because one `return` gives an `int` and the other a
`double`:

```cpp compile-error
int main() {
    auto sign = [](double x) {
        if (x < 0) return -1;   // deduces int...
        return 1.0;             // error: inconsistent deduction for auto return type: 'int' and then 'double'
    };
    return static_cast<int>(sign(2.0));
}
```

## Calling a lambda immediately (IIFE)

You can call a lambda the moment you write it by putting `()` right after it. This is called an
**immediately invoked function expression** (IIFE). It's handy for initializing a `const` variable
with logic that needs several statements:

```cpp run
#include <iostream>

int main() {
    int score = 83;

    // Without an IIFE, grade couldn't be const: we'd declare it, then assign in an if/else chain.
    const char grade = [](int s) {
        if (s >= 90) return 'A';
        if (s >= 80) return 'B';
        if (s >= 70) return 'C';
        return 'F';
    }(score);                       // <-- called right away with score

    std::cout << "Grade: " << grade << '\n';

    [] { std::cout << "I run immediately\n"; }();
}
```

```output
Grade: B
I run immediately
```

> **Pitfall:** Forgetting the final `()` means you stored the *lambda itself*, not its result.
> `const char grade = [](int s) { ... };` is a compile error, because a closure object is not a `char`.

## Specifiers: `noexcept`, `constexpr`

Specifiers go after the parameter list and before the return type:

```cpp run
#include <iostream>

int main() {
    auto twice = [](int x) noexcept { return 2 * x; };           // promises not to throw
    auto cube = [](int x) constexpr { return x * x * x; };       // usable at compile time
    auto ratio = [](int a, int b) noexcept -> double { return static_cast<double>(a) / b; };

    constexpr int c = cube(3);          // computed by the compiler
    std::cout << twice(21) << ' ' << c << ' ' << ratio(1, 4) << '\n';
}
```

```output
42 27 0.25
```

Lambdas are implicitly `constexpr` whenever they can be, so you rarely write it. `mutable` is
covered in the next lesson, together with captures.

## Lambdas as arguments

The most common use of a lambda is to pass it to a function that expects "something callable".
Standard algorithms take them all the time (you'll meet many in this module):

```cpp run
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v{4, 1, 3, 5, 2};

    std::sort(v.begin(), v.end(), [](int a, int b) { return a > b; });   // descending

    std::for_each(v.begin(), v.end(), [](int x) { std::cout << x << ' '; });
    std::cout << '\n';
}
```

```output
5 4 3 2 1
```

You can write your own functions that accept a lambda, too. Since every lambda has a different
type, the parameter is a **template** (or `auto`, which is shorthand for a template):

```cpp run
#include <iostream>

// F can be any type that can be called with an int
template <typename F>
void repeat(int times, F action) {
    for (int i = 0; i < times; ++i) action(i);
}

// C++20 abbreviated template: 'auto' parameter means the same as the template above
int apply_twice(auto f, int x) {
    return f(f(x));
}

int main() {
    repeat(3, [](int i) { std::cout << "call " << i << '\n'; });
    std::cout << apply_twice([](int x) { return x * 10; }, 7) << '\n';
}
```

```output
call 0
call 1
call 2
700
```

## Every lambda has its own type

Two lambdas with identical code are still two **different** types (two different invented classes).
That's why you use `auto`, and why this doesn't compile:

```cpp compile-error
int main() {
    auto a = [] { return 1; };
    auto b = [] { return 1; };
    a = b;   // error: no match for 'operator=': the closure types are different
}
```

(To store different lambdas in the same variable or container, you'll use `std::function` in a later
lesson.)

## Common mistakes

- **Forgetting `;`** after a lambda stored in a variable: `auto f = [] { };` needs that final `;`.
- **Forgetting the call `()`.** `f;` names the lambda; `f();` calls it.
- **Using a local variable without capturing it.** A lambda's body can only see its parameters,
  global/static variables, and what it captures. That's the topic of the next lesson:

```cpp compile-error
int main() {
    int limit = 10;
    auto check = [](int x) { return x < limit; };   // error: 'limit' is not captured
    return check(3);
}
```

:::quiz
What does this print?

```cpp
auto f = [](int x) { return x * 2; };
std::cout << f(f(3));
```

- [ ] `6`
- [x] `12`
- [ ] `9`
- [ ] It doesn't compile

`f(3)` is `6`, and `f(6)` is `12`. A lambda stored in a variable is called exactly like a function.
:::

:::quiz
Which of these are valid, complete lambda expressions? (select all that apply)

- [x] `[]{}`
- [x] `[](int x) -> long { return x; }`
- [ ] `(int x) { return x; }`
- [x] `[]() noexcept { return 0; }`

The capture list `[...]` and the body `{...}` are always required; everything else is optional.
Without `[...]`, `(int x) { return x; }` isn't a lambda at all.
:::

:::exercise Square with a lambda
Read one integer `n` and print `n * n`.

Store a lambda named `square` in an `auto` variable and use it to compute the result.

**Input:** one integer `n` (between -40000 and 40000).
**Output:** `n * n` followed by a newline.

```cpp starter
#include <iostream>

int main() {
    int n;
    std::cin >> n;
    // auto square = ...
    std::cout << n << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int n;
    std::cin >> n;
    auto square = [](long long x) { return x * x; };
    std::cout << square(n) << '\n';
}
```

```hint
The shape is `auto square = [](int x) { return x * x; };` and then `square(n)`.
```

```stdin
7
```

```expected
49
```

```stdin
-12
```

```expected
144
```

```stdin
0
```

```expected hidden
0
```

```checks
must auto\s+square\s*=\s*\[ :: Store a lambda in a variable: auto square = [...](...) { ... };
must square\s*\( :: Call your lambda: square(n).
```
:::

:::exercise Grade with an IIFE
Read an integer score and print its letter grade, using a lambda that is **called immediately** to
initialize a `const char` variable.

Rules: `90` or more is `A`, `80`-`89` is `B`, `70`-`79` is `C`, `60`-`69` is `D`, anything lower is `F`.

**Input:** one integer score (may be negative or above 100).
**Output:** `Grade: X` followed by a newline, where `X` is the letter.

```cpp starter
#include <iostream>

int main() {
    int score;
    std::cin >> score;

    const char grade = 'F';   // replace with an immediately invoked lambda

    std::cout << "Grade: " << grade << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int score;
    std::cin >> score;

    const char grade = [](int s) {
        if (s >= 90) return 'A';
        if (s >= 80) return 'B';
        if (s >= 70) return 'C';
        if (s >= 60) return 'D';
        return 'F';
    }(score);

    std::cout << "Grade: " << grade << '\n';
}
```

```hint
Write the lambda, then call it right away: `const char grade = [](int s) { ... }(score);`
```

```hint
Every `return` must produce the same type. Return character literals like `'A'` from every branch.
```

```stdin
85
```

```expected
Grade: B
```

```stdin
90
```

```expected
Grade: A
```

```stdin
-5
```

```expected hidden
Grade: F
```

```stdin
60
```

```expected hidden
Grade: D
```

```checks
must \}\s*\(\s*\w*\s*\)\s*; :: Call the lambda immediately by writing (...) right after its closing brace.
mustnot \bif\s*\([^)]*\)\s*grade :: Compute grade inside the lambda, not with an if/else outside it.
```
:::

:::exercise Count with a predicate
Read `n` integers and print how many of them are **even** and how many are **greater than 10**,
using `std::count_if` with a lambda for each count.

**Input:** `n`, then `n` integers.
**Output:** two lines: `even: E` and `big: B`.

```cpp starter
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;

    std::cout << "even: " << 0 << '\n';
    std::cout << "big: " << 0 << '\n';
}
```

```cpp solution
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;

    auto even = std::count_if(v.begin(), v.end(), [](int x) { return x % 2 == 0; });
    auto big = std::count_if(v.begin(), v.end(), [](int x) { return x > 10; });

    std::cout << "even: " << even << '\n';
    std::cout << "big: " << big << '\n';
}
```

```hint
`std::count_if(v.begin(), v.end(), [](int x) { return /* condition */; })` returns how many
elements make the lambda return `true`.
```

```hint
Careful with negative numbers: `-3 % 2` is `-1`, not `1`. Test for evenness with `x % 2 == 0`.
```

```stdin
6
1 2 12 15 -4 -3
```

```expected
even: 3
big: 2
```

```stdin
0
```

```expected hidden
even: 0
big: 0
```

```checks
must count_if :: Use std::count_if.
must \[\s*\]\s*\( :: Pass a lambda as the predicate.
```
:::
