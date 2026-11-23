---
title: Lambda Captures
summary: Letting a lambda use local variables. Capture by value and by reference, default captures, this and *this, init-captures, mutable, and dangling references.
---

## The problem captures solve

A lambda's body can use its own parameters, global variables, and `static` variables. It **cannot**
see the local variables of the function it's written in, unless you list them in the **capture
list** `[...]`:

```cpp compile-error
int main() {
    int limit = 10;
    auto too_big = [](int x) { return x > limit; };   // error: 'limit' is not captured
    return too_big(3);
}
```

```cpp run
#include <iostream>

int main() {
    int limit = 10;
    auto too_big = [limit](int x) { return x > limit; };   // capture limit
    std::cout << std::boolalpha << too_big(3) << ' ' << too_big(30) << '\n';
}
```

```output
false true
```

Remember that a lambda is an object of an invented class. **Capturing a variable adds a data member
to that class.** Capturing by value stores a *copy*; capturing by reference stores a *reference*.

## Every capture form

| Capture | Meaning |
| --- | --- |
| `[]` | Capture nothing. |
| `[x]` | Capture `x` **by value** (a copy, made when the lambda is created). |
| `[&x]` | Capture `x` **by reference** (the lambda uses the original). |
| `[=]` | Capture **everything used** in the body by value. |
| `[&]` | Capture **everything used** in the body by reference. |
| `[=, &x]` | Everything by value, except `x` by reference. |
| `[&, x]` | Everything by reference, except `x` by value. |
| `[x, &y]` | List each one explicitly. |
| `[this]` | Capture the current object's pointer (inside member functions). |
| `[*this]` | Capture a **copy** of the current object (C++17). |
| `[y = expr]` | **Init-capture**: create a new member `y` initialized from any expression (C++14). |
| `[&r = x]` | Init-capture by reference: `r` refers to `x`. |

## By value: `[x]`

The copy is made **when the lambda is created**, not when it's called. Later changes to the
original don't affect the lambda:

```cpp run
#include <iostream>

int main() {
    int x = 1;
    auto show = [x] { std::cout << "captured x = " << x << '\n'; };
    x = 100;                // changes the original only
    show();
    std::cout << "real x = " << x << '\n';
}
```

```output
captured x = 1
real x = 100
```

By-value captures are **read-only** inside the lambda (its `operator()` is `const`):

```cpp compile-error
int main() {
    int count = 0;
    auto inc = [count] { ++count; };   // error: increment of read-only variable 'count'
    inc();
}
```

## By reference: `[&x]`

The lambda refers to the original variable, so it sees later changes and can modify it:

```cpp run
#include <iostream>

int main() {
    int x = 1;
    auto show = [&x] { std::cout << "x = " << x << '\n'; };
    x = 100;
    show();                 // sees the new value

    int total = 0;
    auto add = [&total](int n) { total += n; };
    add(5);
    add(7);
    std::cout << "total = " << total << '\n';
}
```

```output
x = 100
total = 12
```

Capture by reference when the lambda must **modify** a local, or when copying would be expensive
(a big vector or string) and the lambda won't outlive the variable.

## Default captures: `[=]` and `[&]`

Instead of listing variables one by one, a **capture default** captures whatever the body actually
uses. Only variables that appear in the body are captured, not every local in sight.

```cpp run
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v{3, 8, 1, 9, 4};
    int lo = 2;
    int hi = 8;

    // [=]: lo and hi are copied
    auto in_range = std::count_if(v.begin(), v.end(), [=](int x) { return x >= lo && x <= hi; });

    // [&]: sum and count are modified through references
    int sum = 0;
    int count = 0;
    std::for_each(v.begin(), v.end(), [&](int x) { sum += x; ++count; });

    std::cout << in_range << " in range, sum " << sum << " of " << count << '\n';
}
```

```output
3 in range, sum 25 of 5
```

## Mixing defaults and explicit captures

After a default, you can list exceptions. The default **must come first**:

```cpp run
#include <iostream>

int main() {
    int a = 1, b = 2, c = 0;

    auto f = [=, &c] { c = a + b; };   // a, b by value; c by reference
    f();

    auto g = [&, a] { b = a * 10; };   // everything by reference except a (by value)
    g();

    auto h = [a, &b] { return a + b; }; // fully explicit
    std::cout << a << ' ' << b << ' ' << c << ' ' << h() << '\n';
}
```

```output
1 10 3 11
```

The capture default must come **first**, and `this` can only be captured inside a member function:

```cpp compile-error
int main() {
    int x = 1;
    auto f = [&x, =] { return x; };   // error: the capture default must come first
    return f();
}
```

```cpp compile-error
int main() {
    int x = 1;
    auto f = [=, this] { return x; };  // error: invalid use of 'this' in non-member function
    return f();
}
```

Capturing the same name twice (`[x, x]`, `[x, &x]`) or repeating the default (`[&, &x]`,
`[=, x]`) is wrong too. The standard makes these errors; GCC is lenient and only warns.

> **Tip:** Prefer explicit captures (`[x, &total]`) in anything bigger than a one-liner. Readers can
> see exactly what the lambda depends on, and you won't accidentally capture something by reference
> that won't live long enough.

## What doesn't need capturing

Globals, `static` variables, and constants that are usable at compile time can be used without any
capture:

```cpp run
#include <iostream>

int global_count = 0;

int main() {
    static int calls = 0;
    const int factor = 3;           // a compile-time constant: no capture needed to read it
    auto f = [](int x) {
        ++global_count;
        ++calls;
        return x * factor;
    };
    std::cout << f(2) << ' ' << f(5) << ' ' << global_count << ' ' << calls << '\n';
}
```

```output
6 15 2 2
```

## `mutable`: modifying your own copy

By-value captures are `const` inside the body. Marking the lambda `mutable` lets the body modify its
**own copies**. The originals are never touched, but the lambda's copy remembers changes between
calls. That makes a stateful counter:

```cpp run
#include <iostream>

int main() {
    int start = 10;
    auto next = [start]() mutable { return start++; };

    std::cout << next() << ' ' << next() << ' ' << next() << '\n';
    std::cout << "start is still " << start << '\n';
}
```

```output
10 11 12
start is still 10
```

When `mutable` is present the `()` is required, even with no parameters (before C++23). Each copy
of a mutable lambda has its own state, so passing it **by value** to a function makes the function
work on a separate counter.

## Init-captures: `[name = expression]`

An init-capture creates a brand-new member and initializes it from any expression. Its type is
deduced, like `auto`:

```cpp run
#include <iostream>
#include <memory>
#include <string>
#include <utility>

int main() {
    int x = 4;

    auto f = [y = x + 1] { return y * 2; };              // y is a new member, initialized to 5
    auto counter = [n = 0]() mutable { return ++n; };      // private state, no outside variable
    auto g = [&r = x] { r = 99; };                         // r is a reference to x
    g();

    // Move-only types (like std::unique_ptr) can't be copied, so move them in:
    auto p = std::make_unique<std::string>("owned text");
    auto print = [q = std::move(p)] { std::cout << *q << '\n'; };

    std::cout << f() << ' ' << counter() << counter() << ' ' << x << '\n';
    print();
    std::cout << std::boolalpha << (p == nullptr) << '\n';   // p gave its object to the lambda
}
```

```output
10 12 99
owned text
true
```

Init-captures are how you **move** something into a lambda (`[v = std::move(v)]`), give it a
different name, or store a computed value once instead of recomputing it every call.

## `[this]` and `[*this]` in member functions

Inside a member function, a lambda that uses the object's members must capture `this`:

- `[this]` captures the **pointer**. The lambda reads and writes the real object.
- `[*this]` (C++17) captures a **copy** of the whole object. Safer if the lambda may outlive it.

```cpp run
#include <iostream>

class Counter {
public:
    void add_all(int times) {
        auto bump = [this] { ++value_; };        // modifies the real object
        for (int i = 0; i < times; ++i) bump();
    }

    auto snapshot() const {
        return [*this] { return value_; };       // the lambda keeps its own copy
    }

    int value() const { return value_; }

private:
    int value_ = 0;
};

int main() {
    Counter c;
    c.add_all(3);
    auto snap = c.snapshot();
    c.add_all(10);
    std::cout << c.value() << ' ' << snap() << '\n';
}
```

```output
13 3
```

`[=]` used to capture `this` implicitly. That's deprecated in C++20 (GCC warns), because it looks
like a copy but isn't. Write `[=, this]` or `[=, *this]` instead.

## Pitfall: dangling references

A reference capture is only valid while the original variable is alive. If the lambda outlives it,
calling the lambda reads destroyed memory: **undefined behavior**.

```cpp
#include <functional>

std::function<int()> make_counter() {
    int count = 0;
    return [&count] { return ++count; };   // BUG: count dies when make_counter returns
}

// auto c = make_counter();
// c();   // undefined behavior: count no longer exists
```

The fix is to capture by value (here with `mutable`, so the lambda owns its own counter):

```cpp run
#include <iostream>

auto make_counter() {
    return [count = 0]() mutable { return ++count; };   // the lambda owns count
}

int main() {
    auto a = make_counter();
    auto b = make_counter();
    a();
    a();
    std::cout << a() << ' ' << b() << '\n';
}
```

```output
3 1
```

> **Rule of thumb:** If a lambda is used *right away* (passed to an algorithm, called in the same
> scope), capturing by reference is fine. If it's **stored, returned, or run later** (in another
> thread, as a callback), capture by value.

:::quiz
What does this print?

```cpp
int x = 1;
auto a = [x] { return x; };
auto b = [&x] { return x; };
x = 5;
std::cout << a() << b();
```

- [ ] `11`
- [x] `15`
- [ ] `51`
- [ ] `55`

`a` copied `x` when it was created (value `1`). `b` refers to the original, which is `5` by the time it's called.
:::

:::quiz
Which capture list captures `total` by reference and **everything else** by value?

- [ ] `[&total]`
- [x] `[=, &total]`
- [ ] `[&, total]`
- [ ] `[total, =]`

A capture default comes first, then the exceptions. `[&, total]` is the opposite (everything by reference, `total` by value), and `[total, =]` is illegal.
:::

:::quiz
What does this print?

```cpp
int n = 0;
auto f = [n]() mutable { return ++n; };
f();
f();
std::cout << f() << n;
```

- [ ] `33`
- [x] `30`
- [ ] `10`
- [ ] It doesn't compile

`mutable` lets the lambda change its **own copy** of `n`, which persists between calls: `1`, `2`, `3`. The original `n` stays `0`.
:::

:::exercise Running total {easy}
Read `n` integers and print their sum. Do the summing with `std::for_each` and a lambda that
captures a `total` variable **by reference**.

**Input:** `n`, then `n` integers.
**Output:** `sum: S` followed by a newline.

```cpp starter
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;

    long long total = 0;
    std::for_each(v.begin(), v.end(), [](int x) {
        // add x to total
    });

    std::cout << "sum: " << total << '\n';
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

    long long total = 0;
    std::for_each(v.begin(), v.end(), [&total](int x) {
        total += x;
    });

    std::cout << "sum: " << total << '\n';
}
```

```hint
The lambda needs to *modify* `total`, so it must capture it by reference: `[&total]` (or `[&]`).
```

```stdin
4
1 2 3 4
```

```expected
sum: 10
```

```stdin
3
-5 5 -7
```

```expected
sum: -7
```

```stdin
0
```

```expected hidden
sum: 0
```

```stdin
3
2000000000 2000000000 -1
```

```expected hidden
sum: 3999999999
```

```checks
must for_each :: Use std::for_each.
must \[\s*&\s*(total)?\s*\] :: Capture total by reference with [&total] or [&].
```
:::

:::exercise Above the threshold {easy}
Read a threshold `t`, then `n` integers. Print how many of the integers are **strictly greater**
than `t`, using `std::count_if` with a lambda that captures `t`.

**Input:** `t` on the first line, then `n`, then `n` integers.
**Output:** the count followed by a newline.

```cpp starter
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    int t, n;
    std::cin >> t >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;

    auto count = std::count_if(v.begin(), v.end(), [](int x) { return x > 0; });
    std::cout << count << '\n';
}
```

```cpp solution
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    int t, n;
    std::cin >> t >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;

    auto count = std::count_if(v.begin(), v.end(), [t](int x) { return x > t; });
    std::cout << count << '\n';
}
```

```hint
Put `t` in the capture list: `[t](int x) { return x > t; }`.
```

```stdin
5
6
1 5 6 10 5 7
```

```expected
3
```

```stdin
-1
4
-3 -1 0 2
```

```expected
2
```

```stdin
100
3
1 2 3
```

```expected hidden
0
```

```stdin
3
3
3 3 3
```

```expected hidden
0
```

```checks
must count_if :: Use std::count_if.
must \[\s*(=|&|t|&t)\s*\] :: Capture t in the lambda.
```
:::

:::exercise Ticket dispenser {medium}
Write a lambda `next_ticket` that hands out ticket numbers. It starts at a number you read from
input and returns the next number each time it's called. Use an **init-capture** and `mutable`, so
the counter lives inside the lambda (no outside counter variable).

**Input:** the first ticket number `s`, then how many tickets `k` to hand out.
**Output:** the `k` ticket numbers separated by spaces, on one line, followed by a newline
(if `k` is `0`, print just an empty line).

```cpp starter
#include <iostream>

int main() {
    int s, k;
    std::cin >> s >> k;

    auto next_ticket = [] { return 0; };

    for (int i = 0; i < k; ++i) {
        if (i > 0) std::cout << ' ';
        std::cout << next_ticket();
    }
    std::cout << '\n';
}
```

```cpp solution
#include <iostream>

int main() {
    int s, k;
    std::cin >> s >> k;

    auto next_ticket = [n = s]() mutable { return n++; };

    for (int i = 0; i < k; ++i) {
        if (i > 0) std::cout << ' ';
        std::cout << next_ticket();
    }
    std::cout << '\n';
}
```

```hint
An init-capture creates a member with a new name: `[n = s]`.
```

```hint
To change `n` inside the body, mark the lambda `mutable`: `[n = s]() mutable { return n++; }`.
```

```stdin
100 3
```

```expected
100 101 102
```

```stdin
-1 4
```

```expected
-1 0 1 2
```

```stdin
5 0
```

```expected hidden

```

```checks
must \[\s*\w+\s*=[^\]]+\] :: Use an init-capture like [n = s].
must \bmutable\b :: The lambda must be mutable so it can update its own counter.
```
:::

:::exercise Hand over ownership {medium}
Read `n` integers into a `std::vector<int>`. Then **move** the vector into a lambda with an
init-capture (`[data = std::move(v)]`), so the lambda owns the numbers. The lambda takes an integer
`m` and returns how many of its numbers are divisible by `m`.

Then read `q` queries (each a non-zero integer `m`) and print the lambda's answer for each, one per
line. Finally print `v now has S elements` where `S` is `v.size()` after the move (a moved-from
`std::vector` is guaranteed to be empty).

**Input:** `n`, `n` integers, `q`, then `q` integers.
**Output:** one count per line, then the final `v now has S elements` line.

```cpp starter
#include <algorithm>
#include <iostream>
#include <utility>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;

    auto count_divisible = [v](int m) {
        return std::count_if(v.begin(), v.end(), [](int x) { return x % 2 == 0; });
    };

    int q;
    std::cin >> q;
    for (int i = 0; i < q; ++i) {
        int m;
        std::cin >> m;
        std::cout << count_divisible(m) << '\n';
    }
    std::cout << "v now has " << v.size() << " elements\n";
}
```

```cpp solution
#include <algorithm>
#include <iostream>
#include <utility>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> v(n);
    for (int& x : v) std::cin >> x;

    auto count_divisible = [data = std::move(v)](int m) {
        return std::count_if(data.begin(), data.end(), [m](int x) { return x % m == 0; });
    };

    int q;
    std::cin >> q;
    for (int i = 0; i < q; ++i) {
        int m;
        std::cin >> m;
        std::cout << count_divisible(m) << '\n';
    }
    std::cout << "v now has " << v.size() << " elements\n";
}
```

```hint
The outer lambda: `[data = std::move(v)](int m) { ... }`. Inside it, use `data`, not `v`.
```

```hint
The inner lambda (the predicate for `count_if`) needs `m`, so it must capture it: `[m](int x) { return x % m == 0; }`.
```

```stdin
6
2 3 4 6 9 10
3
2
3
7
```

```expected
4
3
0
v now has 0 elements
```

```stdin
3
-4 0 5
1
-2
```

```expected hidden
2
v now has 0 elements
```

```stdin
0
2
5
1
```

```expected hidden
0
0
v now has 0 elements
```

```checks
must \[\s*\w+\s*=\s*std::move\s*\(\s*v\s*\) :: Move the vector into the lambda with an init-capture: [data = std::move(v)].
```
:::

:::exercise Rate limiter {hard}
A web service allows each user at most `LIMIT` requests in any window of `W` time units. A request at
time `t` is **accepted** if the user had fewer than `LIMIT` accepted requests at times in
`(t - W, t]` (strictly after `t - W`); otherwise it's **rejected**, and a rejected request doesn't count.

Write a factory that returns a limiter as a **stateful lambda**:

```cpp
auto make_limiter(int limit, long long window) {
    return [/* captures */](long long t) mutable -> bool { ... };   // true = accepted
}
```

All of the limiter's state (the times of recently accepted requests, e.g. in a `std::deque<long long>`)
must live **inside** the lambda, created with init-captures. Each user gets their **own copy** of a
limiter, so their states are independent.

**Input:** `LIMIT W` on the first line, then lines `t user` with non-decreasing times, until the
input ends.
**Output:** one line per request: `t user ok` or `t user rejected`.

Example with `LIMIT = 2`, `W = 10`: `ann` at times `1`, `5`, `9`, `11` gives `ok`, `ok`, `rejected`,
`ok` (at time `11` the window is `(1, 11]`, which holds only the request at `5`).

```cpp starter
#include <deque>
#include <iostream>
#include <map>
#include <string>

int main() {
    int limit;
    long long window;
    std::cin >> limit >> window;
    long long t;
    std::string user;
    while (std::cin >> t >> user) {
        std::cout << t << ' ' << user << " ok\n";
    }
}
```

```cpp solution
#include <deque>
#include <iostream>
#include <map>
#include <string>

auto make_limiter(int limit, long long window) {
    return [limit, window, accepted = std::deque<long long>{}](long long t) mutable -> bool {
        while (!accepted.empty() && accepted.front() <= t - window) accepted.pop_front();
        if (static_cast<int>(accepted.size()) >= limit) return false;
        accepted.push_back(t);
        return true;
    };
}

int main() {
    int limit;
    long long window;
    std::cin >> limit >> window;

    using Limiter = decltype(make_limiter(limit, window));
    std::map<std::string, Limiter> limiters;

    long long t;
    std::string user;
    while (std::cin >> t >> user) {
        // A capturing lambda has no default constructor, so limiters[user] doesn't compile.
        auto it = limiters.find(user);
        if (it == limiters.end()) it = limiters.emplace(user, make_limiter(limit, window)).first;
        std::cout << t << ' ' << user << (it->second(t) ? " ok" : " rejected") << '\n';
    }
}
```

```hint
Capture the settings by value and create the deque with an init-capture:
`[limit, window, accepted = std::deque<long long>{}](long long t) mutable -> bool { ... }`.
Without `mutable` the lambda can't modify its own deque.
```

```hint
On each call, first drop old times from the front: while `accepted.front() <= t - window`, pop it.
Then accept only if fewer than `limit` remain.
```

```hint
To keep one limiter per user, store them in a `std::map<std::string, decltype(make_limiter(limit, window))>`.
`map[user]` needs a default constructor, which a capturing lambda doesn't have: use `find` and
`emplace` (or `try_emplace`) instead.
```

```stdin
2 10
1 ann
5 ann
9 ann
11 ann
```

```expected
1 ann ok
5 ann ok
9 ann rejected
11 ann ok
```

```stdin
1 5
0 ann
0 bob
3 ann
5 ann
5 bob
9 bob
```

```expected
0 ann ok
0 bob ok
3 ann rejected
5 ann ok
5 bob ok
9 bob rejected
```

```stdin
3 1
7 x
7 x
7 x
7 x
8 x
8 y
```

```expected hidden
7 x ok
7 x ok
7 x ok
7 x rejected
8 x ok
8 y ok
```

```stdin
2 100
-50 a
-50 a
49 a
50 a
51 a
150 a
151 a
```

```expected hidden
-50 a ok
-50 a ok
49 a rejected
50 a ok
51 a ok
150 a ok
151 a ok
```

```checks
must \bmutable\b :: The limiter lambda must be mutable so it can update its own state.
must \[[^\]]*\w+\s*=\s*std::(deque|queue|vector|list) :: Create the limiter's container with an init-capture.
```
:::
