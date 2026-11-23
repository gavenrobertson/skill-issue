---
title: Return Values
summary: The return statement, early returns, why every path must return, returning several values with structs, pairs and tuples, and the dangling-reference trap.
---

## The `return` statement

`return expression;` does two things at once: it **ends** the function immediately, and it hands
`expression` back to the caller. The value is converted to the function's return type if needed:

```cpp run
#include <iostream>

double half(int n) {
    return n / 2.0;          // a double, matches the return type
}

int truncatedHalf(double d) {
    return static_cast<int>(d / 2);   // explicit conversion to the return type
}

bool isEven(int n) {
    return n % 2 == 0;       // a comparison is already a bool, no if needed
}

int main() {
    std::cout << half(7) << ' ' << truncatedHalf(7.9) << ' ' << isEven(10) << '\n';
}
```

```output
3.5 3 1
```

(`bool` prints as `1`/`0` unless you use `std::boolalpha`.)

> **Tip:** `return n % 2 == 0;` is better than `if (n % 2 == 0) return true; else return false;`.
> The comparison already *is* the bool you want.

## Early returns

Since `return` leaves immediately, you can bail out as soon as you know the answer. This often
flattens nested `if`s into a list of simple checks, sometimes called **guard clauses**:

```cpp run
#include <iostream>

int daysInMonth(int month) {
    if (month < 1 || month > 12) {
        return 0;                          // invalid input: leave right away
    }
    if (month == 2) {
        return 28;
    }
    if (month == 4 || month == 6 || month == 9 || month == 11) {
        return 30;
    }
    return 31;
}

bool contains(int target, int a, int b, int c) {
    if (a == target) return true;          // found it, no need to look further
    if (b == target) return true;
    if (c == target) return true;
    return false;
}

int main() {
    std::cout << daysInMonth(2) << ' ' << daysInMonth(11) << ' ' << daysInMonth(13) << '\n';
    std::cout << contains(5, 1, 5, 9) << '\n';
}
```

```output
28 30 0
1
```

Early returns also work in `void` functions, as a bare `return;`.

## Every path must return a value

If a non-void function can reach its closing `}` without hitting a `return`, that's a bug. The
compiler warns:

```cpp run warns
#include <iostream>

int sign(int n) {
    if (n > 0) {
        return 1;
    } else if (n < 0) {
        return -1;
    }
    // forgot the n == 0 case!
}   // warning: control reaches end of non-void function [-Wreturn-type]

int main() {
    std::cout << sign(5) << '\n';
}
```

Falling off the end of a non-void function is **undefined behavior** when it actually happens
(here, calling `sign(0)`). The fix is to make sure every path ends in a `return`, usually with a
final `return` at the bottom. (`main` is the one exception: it returns 0 if you fall off its end.)

Returning nothing from a non-void function, or a value from a `void` one, is a hard error:

```cpp compile-error
int five() {
    return;            // error: return-statement with no value, in function returning 'int'
}

void nothing() {
    return 5;          // error: return-statement with a value, in function returning 'void'
}

int main() {}
```

## Returning more than one value

A function returns exactly **one** object. To hand back several values, bundle them into one object.

### A struct (clearest)

A `struct` groups named values. (Structs get a whole module later; this is all you need for now.)

```cpp run
#include <iostream>

struct MinMax {
    int min;
    int max;
};

MinMax findMinMax(int a, int b, int c) {
    MinMax result{a, a};
    if (b < result.min) result.min = b;
    if (c < result.min) result.min = c;
    if (b > result.max) result.max = b;
    if (c > result.max) result.max = c;
    return result;
}

int main() {
    MinMax mm = findMinMax(4, -2, 9);
    std::cout << mm.min << ' ' << mm.max << '\n';
}
```

```output
-2 9
```

### `std::pair` and `std::tuple`

For quick, throwaway groupings the standard library has `std::pair` (exactly two values, in
`<utility>`) and `std::tuple` (any number, in `<tuple>`). You can return them with braces:

```cpp run
#include <iostream>
#include <string>
#include <tuple>
#include <utility>

std::pair<int, int> divide(int a, int b) {
    return {a / b, a % b};                 // quotient and remainder
}

std::tuple<std::string, int, double> student() {
    return {"Ada", 36, 3.9};
}

int main() {
    std::pair<int, int> qr = divide(17, 5);
    std::cout << qr.first << " r " << qr.second << '\n';   // pair: .first / .second

    auto t = student();
    std::cout << std::get<0>(t) << ' ' << std::get<1>(t) << '\n';   // tuple: std::get<index>
}
```

```output
3 r 2
Ada 36
```

### Structured bindings (C++17)

`.first` and `std::get<1>` aren't very descriptive. **Structured bindings** unpack a pair, tuple or
struct into named variables in one line:

```cpp run
#include <iostream>
#include <string>
#include <tuple>
#include <utility>

struct Point {
    int x;
    int y;
};

std::pair<int, int> divide(int a, int b) { return {a / b, a % b}; }
std::tuple<std::string, int, double> student() { return {"Ada", 36, 3.9}; }
Point origin() { return {0, 0}; }

int main() {
    auto [quotient, remainder] = divide(17, 5);
    auto [name, age, gpa] = student();
    auto [x, y] = origin();

    std::cout << quotient << ' ' << remainder << '\n';
    std::cout << name << ' ' << age << ' ' << gpa << '\n';
    std::cout << x << ',' << y << '\n';
}
```

```output
3 2
Ada 36 3.9
0,0
```

The syntax is always `auto [name1, name2, ...] = expression;`, with exactly one name per element.

> **Tip:** Prefer a struct when the values have real meaning (`min`/`max`, `x`/`y`). A struct's
> member names document themselves; `pair.first` doesn't.

## Never return a reference to a local

A function can return a reference (`int&`), but **never** a reference to one of its own local
variables. Locals are destroyed when the function returns, so the caller gets a reference to
memory that no longer holds a valid object, a **dangling reference**:

```cpp
int& broken() {
    int local = 42;
    return local;    // warning: reference to local variable 'local' returned [-Wreturn-local-addr]
}
```

Using the result is undefined behavior: it may print 42, garbage, or crash. The fix is simple:
**return by value** (`int broken()`). Returning a local by value is cheap; compilers construct the
result directly in the caller's variable (this is called *return value optimization*, or RVO), so
don't be afraid to return big objects like strings and vectors by value.

Returning a reference is fine when the referenced object outlives the call, for example a
reference parameter that was passed in:

```cpp run
#include <iostream>

int& larger(int& a, int& b) {
    return (a > b) ? a : b;   // refers to one of the caller's variables: safe
}

int main() {
    int x = 3;
    int y = 8;
    larger(x, y) = 0;          // assigns to y through the returned reference
    std::cout << x << ' ' << y << '\n';
}
```

```output
3 0
```

:::quiz
What does `f(5)` return?

```cpp
int f(int n) {
    if (n > 3) return 1;
    if (n > 0) return 2;
    return 3;
}
```

- [x] `1`
- [ ] `2`
- [ ] `3`

`return` ends the function immediately, so once `n > 3` is true, the later lines never run.
:::

:::quiz
Which of these are safe? (select all that apply)

- [x] `std::string make() { std::string s = "hi"; return s; }`
- [ ] `std::string& make() { std::string s = "hi"; return s; }`
- [x] `int& first(int& a, int& b) { return a; }`

Returning a local by value is safe (and cheap). Returning a reference to a local dangles. Returning a
reference to something the caller owns is fine.
:::

:::exercise Grade letter
Write `char grade(int score)` using early returns: `90` or more is `A`, `80` or more is `B`, `70` or
more is `C`, `60` or more is `D`, anything else is `F`. Read scores until the end of input and
print each score's letter on its own line.

**Input:** zero or more integer scores.
**Output:** one letter per score, each on its own line.

```cpp starter
#include <iostream>

char grade(int score) {
    return 'F';
}

int main() {
    int score;
    while (std::cin >> score) {
        std::cout << grade(score) << '\n';
    }
}
```

```cpp solution
#include <iostream>

char grade(int score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
}

int main() {
    int score;
    while (std::cin >> score) {
        std::cout << grade(score) << '\n';
    }
}
```

```hint
Check from the highest grade down. Each `if` can `return` straight away.
```

```stdin
95 85 75 65 55
```

```expected
A
B
C
D
F
```

```stdin
90 89 60 59 100 0
```

```expected hidden
A
B
D
F
A
F
```

```checks
must char\s+grade\s*\(\s*int :: Keep the function char grade(int score).
```
:::

:::exercise Quotient and remainder
Write `std::pair<int, int> divmod(int a, int b)` that returns the quotient `a / b` and remainder
`a % b`. In `main`, read `a` and `b`, call it, unpack the result with a **structured binding**, and
print it.

**Input:** two integers `a` and `b` (`b` is never 0).
**Output:** `Q R` (quotient, a space, remainder), then a newline.

```cpp starter
#include <iostream>
#include <utility>

int main() {
    int a, b;
    std::cin >> a >> b;
}
```

```cpp solution
#include <iostream>
#include <utility>

std::pair<int, int> divmod(int a, int b) {
    return {a / b, a % b};
}

int main() {
    int a, b;
    std::cin >> a >> b;
    auto [q, r] = divmod(a, b);
    std::cout << q << ' ' << r << '\n';
}
```

```hint
Return both values with braces: `return {a / b, a % b};`
```

```hint
Unpack it with `auto [q, r] = divmod(a, b);`
```

```stdin
17 5
```

```expected
3 2
```

```stdin
-7 2
```

```expected hidden
-3 -1
```

```stdin
4 9
```

```expected hidden
0 4
```

```checks
must std::pair\s*<\s*int\s*,\s*int\s*>\s*divmod :: Define std::pair<int, int> divmod(int a, int b).
must auto\s*&?\s*\[ :: Unpack the result with a structured binding: auto [q, r] = ...
```
:::

:::exercise Statistics
Write a struct `Stats` with members `int min`, `int max` and `double average`, and a function
`Stats computeStats(int a, int b, int c, int d)`. Read four integers and print the results.

**Input:** four integers.
**Output:** three lines: `min: M`, `max: X`, `average: A` where the average is printed with
`std::cout`'s default formatting (so `2.5` prints as `2.5` and `3.0` prints as `3`).

```cpp starter
#include <iostream>

int main() {
    int a, b, c, d;
    std::cin >> a >> b >> c >> d;
}
```

```cpp solution
#include <iostream>

struct Stats {
    int min;
    int max;
    double average;
};

Stats computeStats(int a, int b, int c, int d) {
    Stats s{a, a, 0.0};
    int values[] = {b, c, d};
    for (int v : values) {
        if (v < s.min) s.min = v;
        if (v > s.max) s.max = v;
    }
    s.average = (a + b + c + d) / 4.0;
    return s;
}

int main() {
    int a, b, c, d;
    std::cin >> a >> b >> c >> d;
    Stats s = computeStats(a, b, c, d);
    std::cout << "min: " << s.min << '\n';
    std::cout << "max: " << s.max << '\n';
    std::cout << "average: " << s.average << '\n';
}
```

```hint
Divide by `4.0`, not `4`, so the average isn't truncated by integer division.
```

```stdin
1 2 3 4
```

```expected
min: 1
max: 4
average: 2.5
```

```stdin
-5 10 -5 12
```

```expected hidden
min: -5
max: 12
average: 3
```

```checks
must struct\s+Stats :: Define a struct named Stats.
must Stats\s+computeStats\s*\( :: Define Stats computeStats(...) that returns the struct.
```
:::
