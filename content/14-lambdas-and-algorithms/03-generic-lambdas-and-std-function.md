---
title: Generic Lambdas, Functors & std::function
summary: Lambdas with auto parameters and template parameter lists, hand-written function objects, std::function for storing any callable, std::invoke, returning lambdas, and recursive lambdas.
---

## Generic lambdas: `auto` parameters

If a parameter is declared `auto`, the lambda works with **any type** that supports the operations
in its body. This is a **generic lambda** (C++14):

```cpp run
#include <iostream>
#include <string>

int main() {
    auto add = [](auto a, auto b) { return a + b; };

    std::cout << add(2, 3) << '\n';                            // int + int
    std::cout << add(1.5, 2.25) << '\n';                       // double + double
    std::cout << add(std::string("con"), "cat") << '\n';       // string + const char*

    auto print = [](const auto& x) { std::cout << "[" << x << "]\n"; };
    print(42);
    print("text");
}
```

```output
5
3.75
concat
[42]
[text]
```

Behind the scenes, the invented class gets a **template** `operator()`. Each different set of
argument types creates a separate instantiation, exactly like a function template.

Common forms:

| Parameter | Meaning |
| --- | --- |
| `auto x` | a copy of any type |
| `const auto& x` | read-only access to any type, no copy (the usual choice for big objects) |
| `auto& x` | modify the caller's object |
| `auto&& x` | a *forwarding reference*: binds to anything (advanced; used with `std::forward`) |

If the body doesn't work for a type, you get a compile error at the call:

```cpp compile-error
#include <string>

int main() {
    auto half = [](auto x) { return x / 2; };
    half(std::string("ten"));   // error: no match for 'operator/' (std::string / int)
}
```

## Template lambdas (C++20)

Sometimes `auto` isn't enough: you want to **name** the type, or force two parameters to have the
**same** type. C++20 lets you write a template parameter list right after the captures:

```cpp run
#include <iostream>
#include <vector>

int main() {
    // T is named, so we can use it inside: here to build a vector<T>
    auto pair_up = []<typename T>(T a, T b) { return std::vector<T>{a, b}; };

    // Accept only vectors, of any element type
    auto first = []<typename T>(const std::vector<T>& v) { return v.front(); };

    auto v = pair_up(3, 4);
    std::cout << v.size() << ' ' << first(v) << ' ' << first(std::vector<char>{'z'}) << '\n';
}
```

```output
2 3 z
```

With `auto a, auto b`, calling with `(3, 4.5)` would be fine. With `<typename T>(T a, T b)`, it's
an error, because `T` can't be both `int` and `double`:

```cpp compile-error
int main() {
    auto same = []<typename T>(T a, T b) { return a == b; };
    return same(3, 4.5);   // error: deduced conflicting types for parameter 'T' ('int' and 'double')
}
```

You can also constrain parameters with concepts: `[](std::integral auto x) { ... }`.

## Function objects (functors)

A **function object** (or *functor*) is any object of a class with an `operator()`. That's exactly
what a lambda is, but written by hand. Writing the class yourself is useful when the callable needs
a name, several member functions, or is reused in many places:

```cpp run
#include <algorithm>
#include <iostream>
#include <vector>

struct MultipleOf {
    int divisor;
    bool operator()(int x) const { return x % divisor == 0; }
};

struct Counter {
    int calls = 0;
    void operator()(int) { ++calls; }   // stateful: not const
};

int main() {
    std::vector<int> v{3, 6, 7, 9, 10, 12};

    MultipleOf by3{3};
    std::cout << by3(9) << ' ' << std::count_if(v.begin(), v.end(), by3) << '\n';

    Counter c = std::for_each(v.begin(), v.end(), Counter{});   // for_each returns the functor
    std::cout << c.calls << '\n';
}
```

```output
1 4
6
```

The standard library provides ready-made functors in `<functional>`, such as `std::plus<>`,
`std::minus<>`, `std::multiplies<>`, `std::less<>`, `std::greater<>`, and `std::equal_to<>`:

```cpp run
#include <algorithm>
#include <functional>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v{4, 1, 3};
    std::sort(v.begin(), v.end(), std::greater<>{});   // same as [](int a, int b) { return a > b; }
    std::cout << v[0] << v[1] << v[2] << ' ' << std::plus<>{}(2, 3) << '\n';
}
```

```output
431 5
```

## `std::function`: one type for any callable

Every lambda has its own type, so you can't put two different lambdas in one `std::vector` or
return different ones from the same function. **`std::function<R(Args...)>`** (from `<functional>`)
solves that: it can hold *any* callable that can be called with `Args...` and returns something
convertible to `R`, whether it's a lambda, a functor, or a plain function.

```cpp run
#include <functional>
#include <iostream>
#include <map>
#include <string>
#include <vector>

int subtract(int a, int b) { return a - b; }

struct Multiply {
    int operator()(int a, int b) const { return a * b; }
};

int main() {
    std::function<int(int, int)> op;           // empty: holds nothing yet
    std::cout << std::boolalpha << static_cast<bool>(op) << '\n';

    op = [](int a, int b) { return a + b; };   // a lambda
    std::cout << op(6, 3) << '\n';
    op = subtract;                              // a plain function
    std::cout << op(6, 3) << '\n';
    op = Multiply{};                            // a functor
    std::cout << op(6, 3) << '\n';

    // Different callables in one container:
    std::map<std::string, std::function<int(int, int)>> ops{
        {"max", [](int a, int b) { return a > b ? a : b; }},
        {"mod", [](int a, int b) { return a % b; }},
    };
    std::cout << ops["max"](6, 3) << ' ' << ops["mod"](6, 4) << '\n';

    std::vector<std::function<void()>> tasks;
    tasks.push_back([] { std::cout << "task 1\n"; });
    tasks.push_back([] { std::cout << "task 2\n"; });
    for (const auto& t : tasks) t();
}
```

```output
false
9
3
18
6 2
task 1
task 2
```

Calling an **empty** `std::function` throws `std::bad_function_call`. Check with `if (op)` first if
it might be empty.

### The cost of `std::function`

`std::function` uses **type erasure**: it hides the real type behind an internal pointer. That
flexibility costs something:

- It may **allocate on the heap** to store a large callable (one with big captures).
- Every call goes through an **indirect call** that the compiler usually can't inline.
- It's bigger than a plain lambda object.

So use it when you really need to store callables of **different types** (callback lists,
dispatch tables, member variables). For a function *parameter* that's just called right away,
prefer a template or `auto` parameter, which is faster:

```cpp
void run_now(auto f) { f(); }                     // good: no overhead, f's real type is known
void run_now2(const std::function<void()>& f) { f(); }   // works, but slower
```

## Plain function pointers

A lambda with an **empty capture list** can convert to an ordinary function pointer. That's how you
pass lambdas to C-style APIs. Lambdas that capture can't convert (they carry data a plain pointer has
no room for):

```cpp run
#include <iostream>

int apply(int (*fp)(int), int x) { return fp(x); }

int main() {
    int (*fp)(int) = [](int x) { return x + 1; };   // OK: no captures
    std::cout << fp(1) << ' ' << apply([](int x) { return x * x; }, 5) << '\n';
}
```

```output
2 25
```

```cpp compile-error
int main() {
    int k = 3;
    int (*fp)(int) = [k](int x) { return x + k; };   // error: cannot convert: the lambda captures
    return fp(1);
}
```

## `std::invoke`

`std::invoke(f, args...)` (from `<functional>`) calls *anything callable* with a uniform syntax,
including **pointers to member functions and data members**, which can't be called with plain `()`.
Library and template code uses it so it works with every kind of callable:

```cpp run
#include <functional>
#include <iostream>

struct Point {
    int x, y;
    int sum() const { return x + y; }
};

int main() {
    Point p{3, 4};
    std::cout << std::invoke([](int a) { return a * 2; }, 21) << ' '
              << std::invoke(&Point::sum, p) << ' '      // calls p.sum()
              << std::invoke(&Point::y, p) << '\n';      // reads p.y
}
```

```output
42 7 4
```

## Returning lambdas from functions

A function can build and return a lambda. With an `auto` return type there's no overhead. This is
a **function factory**:

```cpp run
#include <iostream>

auto make_adder(int n) {
    return [n](int x) { return x + n; };   // capture n BY VALUE: it must outlive the call
}

auto make_scaler(double factor) {
    return [factor](double x) { return x * factor; };
}

int main() {
    auto add5 = make_adder(5);
    auto add10 = make_adder(10);
    auto half = make_scaler(0.5);
    std::cout << add5(1) << ' ' << add10(1) << ' ' << half(9) << '\n';
}
```

```output
6 11 4.5
```

If different branches return **different** lambdas, `auto` can't deduce one type. Return a
`std::function` instead:

```cpp compile-error
auto pick(bool up) {
    if (up) return [](int x) { return x + 1; };
    return [](int x) { return x - 1; };   // error: inconsistent deduction for auto return type
}
int main() { return pick(true)(0); }
```

```cpp run
#include <functional>
#include <iostream>

std::function<int(int)> pick(bool up) {
    if (up) return [](int x) { return x + 1; };
    return [](int x) { return x - 1; };
}

int main() {
    std::cout << pick(true)(10) << ' ' << pick(false)(10) << '\n';
}
```

```output
11 9
```

## Recursive lambdas

A lambda has no name of its own, and an `auto` variable can't be used in its own initializer:

```cpp compile-error
int main() {
    auto fact = [&fact](int n) { return n <= 1 ? 1 : n * fact(n - 1); };
    // error: use of 'fact' before deduction of 'auto'
    return fact(5);
}
```

Two standard workarounds:

```cpp run
#include <functional>
#include <iostream>

int main() {
    // 1. std::function: its type is known up front, so the lambda can capture it by reference.
    std::function<long long(int)> fact = [&fact](int n) -> long long {
        return n <= 1 ? 1 : n * fact(n - 1);
    };

    // 2. Pass the lambda to itself (a generic parameter named 'self'). No std::function overhead.
    auto fib = [](auto self, int n) -> int {
        return n < 2 ? n : self(self, n - 1) + self(self, n - 2);
    };

    std::cout << fact(10) << ' ' << fib(fib, 10) << '\n';
}
```

```output
3628800 55
```

In the second version the explicit `-> int` is needed: the compiler must know the return type
before it sees the recursive calls. (C++23 adds "deducing `this`", which lets a lambda refer to
itself directly: `[](this auto self, int n) { ... }`.)

:::quiz
Which callables can a `std::function<int(int)>` hold? (select all that apply)

- [x] `[](int x) { return x * 2; }`
- [x] A pointer to `int twice(int);`
- [x] An object of a struct with `int operator()(int) const`
- [x] `[k](int x) { return x + k; }` (captures `k`)

`std::function` accepts **any** callable with a compatible signature, including capturing lambdas.
(Only *plain function pointers* refuse capturing lambdas.)
:::

:::quiz
Why prefer an `auto` (template) parameter over `const std::function<void()>&` for a function that
just calls its argument once?

- [ ] `std::function` can't hold lambdas
- [x] `std::function` adds type erasure: possible heap allocation and an indirect call that can't be inlined
- [ ] `auto` parameters work with more types of lambda captures
- [ ] There is no difference

`std::function` is for **storing** callables of different types. When you only need to call it,
a template keeps the real type and costs nothing extra.
:::

:::exercise Bigger of two {easy}
Write **one** generic lambda `bigger` that takes two values of the same type and returns the larger
one (the first, if they're equal). Use it on three pairs read from input: two integers, two decimals,
and two words (compared alphabetically with `<`).

**Input:** one line `a b` (integers), one line `x y` (decimals), one line `s t` (words).
**Output:** three lines: the bigger integer, the bigger decimal, the bigger word.

```cpp starter
#include <iostream>
#include <string>

int main() {
    int a, b;
    double x, y;
    std::string s, t;
    std::cin >> a >> b >> x >> y >> s >> t;

    auto bigger = [](int p, int q) { return p > q ? p : q; };

    std::cout << bigger(a, b) << '\n';
    std::cout << x << '\n';
    std::cout << s << '\n';
}
```

```cpp solution
#include <iostream>
#include <string>

int main() {
    int a, b;
    double x, y;
    std::string s, t;
    std::cin >> a >> b >> x >> y >> s >> t;

    auto bigger = [](const auto& p, const auto& q) { return p < q ? q : p; };

    std::cout << bigger(a, b) << '\n';
    std::cout << bigger(x, y) << '\n';
    std::cout << bigger(s, t) << '\n';
}
```

```hint
Change the parameter types to `auto` (or `const auto&`), so the same lambda works for `int`,
`double`, and `std::string`.
```

```hint
"The first if equal": return `q` only if `p < q`, otherwise `p`.
```

```stdin
3 9
1.25 2.5
apple pear
```

```expected
9
2.5
pear
```

```stdin
-4 -4
-0.5 0.5
cat cats
```

```expected hidden
-4
0.5
cats
```

```stdin
0 -1
2.5 2.5
B a
```

```expected hidden
0
2.5
a
```

```checks
must \(\s*(const\s+)?auto\s*&?\s*\w+\s*,\s*(const\s+)?auto|<\s*typename\s+\w+\s*> :: Make bigger generic with auto parameters (or a template lambda).
```
:::

:::exercise Operator table {medium}
Build a calculator from a table of operations: a
`std::map<char, std::function<long long(long long, long long)>>` that maps `+`, `-`, `*`, `/`, and
`%` to lambdas. Then read expressions until the end of input and evaluate each one.

**Input:** any number of lines `a op b` (integers `a`, `b` and a one-character operator, separated by
spaces).
**Output:** for each line, the result, or `unknown operator` if `op` is not in the table, or
`division by zero` if `op` is `/` or `%` and `b` is `0`.

```cpp starter
#include <functional>
#include <iostream>
#include <map>

int main() {
    std::map<char, std::function<long long(long long, long long)>> ops;
    ops['+'] = [](long long a, long long b) { return a + b; };

    long long a, b;
    char op;
    while (std::cin >> a >> op >> b) {
        std::cout << ops[op](a, b) << '\n';
    }
}
```

```cpp solution
#include <functional>
#include <iostream>
#include <map>

int main() {
    std::map<char, std::function<long long(long long, long long)>> ops{
        {'+', [](long long a, long long b) { return a + b; }},
        {'-', [](long long a, long long b) { return a - b; }},
        {'*', [](long long a, long long b) { return a * b; }},
        {'/', [](long long a, long long b) { return a / b; }},
        {'%', [](long long a, long long b) { return a % b; }},
    };

    long long a, b;
    char op;
    while (std::cin >> a >> op >> b) {
        auto it = ops.find(op);
        if (it == ops.end()) {
            std::cout << "unknown operator\n";
        } else if ((op == '/' || op == '%') && b == 0) {
            std::cout << "division by zero\n";
        } else {
            std::cout << it->second(a, b) << '\n';
        }
    }
}
```

```hint
Look the operator up with `ops.find(op)` and compare with `ops.end()`. Using `ops[op]` on a missing
key inserts an **empty** `std::function`, and calling that throws.
```

```hint
Check for a zero divisor before calling the `/` or `%` entry.
```

```stdin
7 + 5
7 - 10
6 * 7
17 / 5
17 % 5
```

```expected
12
-3
42
3
2
```

```stdin
1 ^ 2
5 / 0
5 % 0
1000000 * 1000000
```

```expected hidden
unknown operator
division by zero
division by zero
1000000000000
```

```stdin
-7 / 2
-7 % 3
3 - -4
```

```expected hidden
-3
-1
7
```

```checks
must std::function :: Store the operations in std::function objects.
must std::map :: Keep the operations in a std::map.
```
:::

:::exercise Recursive factorial {medium}
Compute `n!` (n factorial: `1 * 2 * ... * n`, and `0! = 1`) with a **recursive lambda** defined
inside `main`. Don't write any named function other than `main`, and don't use a loop.

**Input:** one integer `n` (0 to 20).
**Output:** `n! = R` followed by a newline, e.g. `5! = 120`.

```cpp starter
#include <iostream>

int main() {
    int n;
    std::cin >> n;
    long long result = 1;
    std::cout << n << "! = " << result << '\n';
}
```

```cpp solution
#include <functional>
#include <iostream>

int main() {
    int n;
    std::cin >> n;

    std::function<long long(int)> fact = [&fact](int k) -> long long {
        return k <= 1 ? 1 : k * fact(k - 1);
    };

    std::cout << n << "! = " << fact(n) << '\n';
}
```

```hint
A lambda in an `auto` variable can't refer to itself. Either declare it as
`std::function<long long(int)> fact = [&fact](int k) -> long long { ... };`
```

```hint
...or give it a parameter for itself: `auto fact = [](auto self, int k) -> long long { ... self(self, k - 1) ... };`
and call it as `fact(fact, n)`.
```

```stdin
5
```

```expected
5! = 120
```

```stdin
0
```

```expected
0! = 1
```

```stdin
20
```

```expected hidden
20! = 2432902008176640000
```

```stdin
13
```

```expected hidden
13! = 6227020800
```

```checks
must =\s*\[ :: Define the recursion as a lambda.
mustnot \b(for|while)\s*\( :: Use recursion, not a loop.
mustnot \bgoto\b :: Use recursion, not goto.
```
:::

:::exercise Function pipeline {hard}
Build a processing pipeline out of small functions at run time. The input first describes the steps,
one per line, until a line `run`:

| Step | Function applied to `x` |
| --- | --- |
| `add K` | `x + K` |
| `mul K` | `x * K` |
| `neg` | `-x` |
| `clamp LO HI` | `x` limited to `[LO, HI]` |
| `repeat N` | replaces the **last** step with that step applied `N` times in a row (`N >= 1`; ignored if there are no steps) |
| `undo` | removes the last step (ignored if there are none) |

Store the steps in a `std::vector<std::function<long long(long long)>>`, creating each one with a
lambda that captures its parameters **by value**. `repeat` must wrap the previous step in a new lambda
(it captures the old `std::function` and `N`), so that `undo` later removes the whole repeated step.

After `run` come `q` and then `q` numbers. Push each number through all the steps, in order.

**Output:** `steps: S` (the number of steps in the vector), then one result per number.

Example: `add 1`, `mul 3`, `repeat 2`, `run`, then `1` and `2`: the steps are "add 1" and "multiply by
3 twice", so `1` gives `(1 + 1) * 9 = 18` and `2` gives `27`.

All intermediate values fit in a `long long`.

```cpp starter
#include <functional>
#include <iostream>
#include <string>
#include <vector>

int main() {
    std::vector<std::function<long long(long long)>> steps;
    std::string cmd;
    while (std::cin >> cmd && cmd != "run") {
        // build the steps
    }
    int q;
    std::cin >> q;
    std::cout << "steps: " << steps.size() << '\n';
    for (int i = 0; i < q; ++i) {
        long long x;
        std::cin >> x;
        std::cout << x << '\n';
    }
}
```

```cpp solution
#include <algorithm>
#include <functional>
#include <iostream>
#include <string>
#include <utility>
#include <vector>

using Step = std::function<long long(long long)>;

int main() {
    std::vector<Step> steps;
    std::string cmd;
    while (std::cin >> cmd && cmd != "run") {
        if (cmd == "add") {
            long long k;
            std::cin >> k;
            steps.push_back([k](long long x) { return x + k; });
        } else if (cmd == "mul") {
            long long k;
            std::cin >> k;
            steps.push_back([k](long long x) { return x * k; });
        } else if (cmd == "neg") {
            steps.push_back([](long long x) { return -x; });
        } else if (cmd == "clamp") {
            long long lo, hi;
            std::cin >> lo >> hi;
            steps.push_back([lo, hi](long long x) { return std::clamp(x, lo, hi); });
        } else if (cmd == "repeat") {
            int n;
            std::cin >> n;
            if (steps.empty()) continue;
            Step last = std::move(steps.back());
            steps.back() = [last, n](long long x) {
                for (int i = 0; i < n; ++i) x = last(x);
                return x;
            };
        } else if (cmd == "undo") {
            if (!steps.empty()) steps.pop_back();
        }
    }

    int q;
    std::cin >> q;
    std::cout << "steps: " << steps.size() << '\n';
    for (int i = 0; i < q; ++i) {
        long long x;
        std::cin >> x;
        for (const auto& step : steps) x = step(x);
        std::cout << x << '\n';
    }
}
```

```hint
Every step is a different lambda type, but they all fit into `std::function<long long(long long)>`.
Capture the step's parameters by value: `[k](long long x) { return x + k; }`.
```

```hint
For `repeat`, take the old step out of the vector (`Step last = steps.back();`) and put a new lambda in
its place that captures `last` and `n` and calls `last` `n` times. Don't capture `steps.back()` by
reference: the vector may reallocate, and you are about to overwrite that element anyway.
```

```hint
`repeat` can be applied to a step that is itself a repeat: `mul 2`, `repeat 3`, `repeat 2` multiplies by
`2` six times.
```

```stdin
add 1
mul 3
repeat 2
run
2
1 2
```

```expected
steps: 2
18
27
```

```stdin
undo
repeat 5
run
3
0 -7 42
```

```expected
steps: 0
0
-7
42
```

```stdin
mul 2
repeat 3
repeat 2
add -100
clamp -10 10
neg
run
4
1 2 0 -1
```

```expected hidden
steps: 4
10
-10
10
10
```

```stdin
add 5
neg
undo
undo
undo
add 2
mul 10
undo
repeat 4
clamp 0 5
run
3
-20 1 100
```

```expected hidden
steps: 2
0
5
5
```

```checks
must std::function :: Store the steps as std::function objects.
must std::vector\s*<\s*(std::function|Step|\w+) :: Keep the steps in a std::vector.
must \[\s*\w+\s*,\s*\w+\s*\]|\[\s*=\s*\] :: Capture the old step (and N) by value for repeat.
```
:::
