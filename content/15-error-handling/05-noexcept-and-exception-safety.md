---
title: noexcept & Exception Safety
summary: Promising not to throw with noexcept, testing it with the noexcept operator, the three exception safety guarantees, how RAII makes code exception-safe, function-try-blocks, and why destructors must not throw.
---

## The `noexcept` specifier

Writing **`noexcept`** after a function's parameter list promises that the function **never lets an
exception escape**:

```cpp
int add(int a, int b) noexcept { return a + b; }    // promises never to throw
void log(const std::string& msg);                    // may throw (the default for most functions)
void f() noexcept(true);                             // same as noexcept
void g() noexcept(false);                            // same as writing nothing: may throw
```

The condition in `noexcept(condition)` must be a compile-time constant. It's mainly used in
templates, to say "this doesn't throw **if** the operations on `T` don't":

```cpp
template <typename T>
void my_swap(T& a, T& b) noexcept(std::is_nothrow_move_constructible_v<T> &&
                                  std::is_nothrow_move_assignable_v<T>);
```

`noexcept` is part of the function's **type**, but not of its overload signature: you can't overload
`f()` and `f() noexcept`.

### What if a `noexcept` function throws anyway?

The compiler doesn't stop you from writing a `throw` inside a `noexcept` function. But if an
exception tries to **leave** it, the program doesn't search for a handler: it calls
**`std::terminate()`** immediately, and the program dies.

```cpp
void promise_broken() noexcept {
    throw std::runtime_error("oops");   // GCC: warning: 'throw' will always call 'terminate'
}

int main() {
    try {
        promise_broken();
    } catch (...) {                     // never reached: std::terminate is called first
    }
}
```

So `noexcept` is a **hard promise**. Only use it when the function really can't fail (or when
failing should end the program). Throwing *inside* a `noexcept` function is fine as long as the
exception is caught inside it too.

## The `noexcept` operator

`noexcept(expression)` (the **operator**, used inside an expression) is a compile-time `bool`: `true`
if the expression is declared not to throw. Like `sizeof`, it does **not** evaluate the expression.

```cpp run
#include <iostream>
#include <string>
#include <type_traits>
#include <vector>

int add(int a, int b) noexcept { return a + b; }
int parse(const std::string& s) { return std::stoi(s); }

struct Widget {
    ~Widget() {}   // destructors are implicitly noexcept
};

int main() {
    std::vector<int> v{1, 2, 3};
    std::cout << std::boolalpha
              << noexcept(add(1, 2)) << ' '                    // declared noexcept
              << noexcept(parse("5")) << ' '                   // not declared noexcept
              << noexcept(1 + 2) << ' '                        // built-in arithmetic never throws
              << noexcept(v.size()) << ' '                     // size() is noexcept
              << noexcept(v.at(0)) << ' '                      // at() may throw
              << noexcept(v.push_back(4)) << '\n';             // may allocate, so may throw

    std::cout << std::is_nothrow_destructible_v<Widget> << ' '
              << std::is_nothrow_move_constructible_v<std::string> << '\n';
    std::cout << v.size() << '\n';   // still 3: noexcept(v.push_back(4)) didn't run push_back
}
```

```output
true false true true false false
true true
3
```

`noexcept` answers "is it **declared** non-throwing?", not "does it actually throw?". A function
without `noexcept` that never throws in practice still gives `false`.

## Why `noexcept` matters: move operations

`noexcept` isn't just documentation. Library code **checks** it and picks faster algorithms when it's
safe. The classic case: when a `std::vector` grows, it must transfer its elements to new memory. If
the element's move constructor is `noexcept`, the vector **moves** them. If not, it **copies** them,
because a move that throws halfway through would leave both the old and the new buffer half-moved,
and the vector couldn't undo it.

```cpp run
#include <iostream>
#include <vector>

struct Unmarked {
    Unmarked() = default;
    Unmarked(const Unmarked&) { std::cout << "  copy\n"; }
    Unmarked(Unmarked&&) { std::cout << "  move\n"; }            // not noexcept
};

struct Marked {
    Marked() = default;
    Marked(const Marked&) { std::cout << "  copy\n"; }
    Marked(Marked&&) noexcept { std::cout << "  move\n"; }       // noexcept
};

int main() {
    std::vector<Unmarked> a;
    a.reserve(1);
    a.emplace_back();
    std::cout << "growing vector<Unmarked>:\n";
    a.emplace_back();                 // reallocates: the old element is COPIED

    std::vector<Marked> b;
    b.reserve(1);
    b.emplace_back();
    std::cout << "growing vector<Marked>:\n";
    b.emplace_back();                 // reallocates: the old element is MOVED
}
```

```output
growing vector<Unmarked>:
  copy
growing vector<Marked>:
  move
```

**Rule:** mark your move constructors, move assignment operators and `swap` functions `noexcept`
(they usually just shuffle pointers, so they can't fail). Compiler-generated ones are `noexcept`
automatically when all members' are.

## Exception safety guarantees

When a function throws halfway through, what state is left behind? There are three levels of
promise (the "Abrahams guarantees"), from strongest to weakest:

| Guarantee | Promise if an exception is thrown |
| --- | --- |
| **No-throw** | It never throws (and is marked `noexcept`). Destructors, `swap`, moves. |
| **Strong** | "Commit or rollback": the operation either fully succeeds, or **nothing changed** at all. |
| **Basic** | No resources leak and all objects are still **valid** (usable, destructible), but their values may have changed. |
| *None* | Anything goes: leaks, broken objects. Unacceptable. |

Every function should give **at least the basic** guarantee. Standard containers do. For example,
`push_back` gives the strong guarantee: if it throws, the vector is unchanged.

### Basic vs. strong, in code

```cpp run
#include <iostream>
#include <stdexcept>
#include <utility>
#include <vector>

void check(int x) {
    if (x < 0) throw std::invalid_argument("negative");
}

// BASIC guarantee: v stays a valid vector, but may be half-updated
void add_all_basic(std::vector<int>& v, const std::vector<int>& items) {
    for (int x : items) {
        check(x);
        v.push_back(x);
    }
}

// STRONG guarantee: do all the risky work on a copy, then commit with a swap that can't throw
void add_all_strong(std::vector<int>& v, const std::vector<int>& items) {
    std::vector<int> tmp = v;          // may throw, but v is untouched
    for (int x : items) {
        check(x);
        tmp.push_back(x);              // may throw, but v is untouched
    }
    v.swap(tmp);                       // noexcept: the commit point
}

void print(const char* label, const std::vector<int>& v) {
    std::cout << label;
    for (int x : v) std::cout << ' ' << x;
    std::cout << '\n';
}

int main() {
    std::vector<int> a{1, 2}, b{1, 2};

    try { add_all_basic(a, {3, 4, -5, 6}); } catch (const std::exception&) {}
    try { add_all_strong(b, {3, 4, -5, 6}); } catch (const std::exception&) {}

    print("basic: ", a);
    print("strong:", b);
}
```

```output
basic:  1 2 3 4
strong: 1 2
```

This **copy-and-swap** pattern is the standard way to get the strong guarantee: do everything that
can fail on the side, then **commit** with operations that can't fail. It costs a copy, so use it
where all-or-nothing matters (transactions, settings, anything users would be confused to see
half-done).

## RAII makes code exception-safe

Stack unwinding destroys **objects**. So if every resource is owned by an object whose destructor
releases it (RAII: *Resource Acquisition Is Initialization*), nothing leaks, no matter where an
exception comes from. Manual cleanup code, on the other hand, is simply skipped:

```cpp run
#include <iostream>
#include <memory>
#include <stdexcept>

struct Resource {
    static inline int alive = 0;
    Resource() { ++alive; }
    ~Resource() { --alive; }
};

void manual(bool fail) {
    Resource* r = new Resource;
    if (fail) throw std::runtime_error("failed");
    delete r;                                  // skipped when we throw: LEAK
}

void raii(bool fail) {
    auto r = std::make_unique<Resource>();     // the unique_ptr owns it
    if (fail) throw std::runtime_error("failed");
}                                              // destroyed on normal return AND during unwinding

int main() {
    try { manual(true); } catch (const std::exception&) {}
    std::cout << "after manual: " << Resource::alive << " alive\n";

    try { raii(true); } catch (const std::exception&) {}
    std::cout << "after raii:   " << Resource::alive << " alive\n";
}
```

```output
after manual: 1 alive
after raii:   1 alive
```

The leaked object from `manual` stays alive forever (count `1`); the RAII version cleaned up after
itself (the count didn't grow). The same goes for every kind of resource: files (`std::fstream`),
locks (`std::lock_guard`), memory (`std::vector`, `std::unique_ptr`). **If you never write `delete`,
`fclose` or `unlock` by hand, you can't forget them on the error path.**

## Function-try-blocks

A **function-try-block** wraps an **entire function body**, including, for constructors, the
**member initializer list**. It's the only way to catch an exception thrown while initializing a
member or base class:

```cpp run
#include <iostream>
#include <stdexcept>

struct Connection {
    explicit Connection(int port) {
        if (port <= 0) throw std::invalid_argument("bad port");
        std::cout << "connected to " << port << '\n';
    }
};

class Client {
public:
    explicit Client(int port)
    try : conn_(port) {                                   // 'try' before the initializer list
        std::cout << "client ready\n";
    } catch (const std::exception& e) {
        std::cout << "Client could not start: " << e.what() << '\n';
        // For constructors, the exception is AUTOMATICALLY RETHROWN at the end of this handler:
        // the object was never completely built, so it can't be used.
    }

private:
    Connection conn_;
};

int main() {
    Client ok(8080);
    try {
        Client broken(-1);
    } catch (const std::invalid_argument& e) {
        std::cout << "main caught: " << e.what() << '\n';
    }
}
```

```output
connected to 8080
client ready
Client could not start: bad port
main caught: bad port
```

Use a constructor's function-try-block to **log or translate** an error (catch one type, `throw` a
different one). You can't "save" the object. For ordinary functions, the syntax works too
(`int f() try { ... } catch (...) { return -1; }`), but a normal `try` inside the body is clearer.

## Destructors must not throw

Destructors are implicitly **`noexcept`**. If an exception escapes one, `std::terminate` is called.
And even if you mark a destructor `noexcept(false)`, throwing from it **during stack unwinding**
(while another exception is already in flight) also calls `std::terminate`, because C++ can't handle
two exceptions at once.

```cpp
struct File {
    ~File() {
        if (!close_file()) throw std::runtime_error("close failed");   // BAD: terminate!
    }
};
```

What to do instead:

- **Swallow and log** errors inside the destructor (`try { ... } catch (...) { /* log */ }`).
- Offer an explicit `close()` member function that **can** throw, for callers who care about the
  error, and let the destructor only clean up silently if `close()` wasn't called.

The same "must not fail" rule applies to `swap`, move operations and memory deallocation: they're
the building blocks that make the strong guarantee possible.

:::quiz
What does this print?

```cpp
void f() noexcept;
void g();
std::cout << std::boolalpha << noexcept(f()) << ' ' << noexcept(g()) << ' ' << noexcept(2 * 21);
```

- [x] `true false true`
- [ ] `true true true`
- [ ] `true false false`
- [ ] It calls `f` and `g`, then prints

The `noexcept` operator checks declarations at compile time and doesn't evaluate anything. `g` isn't declared `noexcept`; arithmetic on `int`s never throws.
:::

:::quiz
A function makes a copy of the data, modifies the copy, and finally swaps it with the original using
a `noexcept` swap. Which guarantee does it provide?

- [ ] No-throw
- [x] Strong
- [ ] Basic
- [ ] None

Everything that can fail happens on the copy; the original is only touched by the non-throwing swap. So either everything changes or nothing does.
:::

:::quiz
What happens when an exception tries to leave a function declared `noexcept`?

- [ ] The exception is silently ignored
- [ ] It's converted to `std::bad_exception`
- [x] `std::terminate()` is called
- [ ] It propagates normally to the caller

`noexcept` is a hard promise: no handler is searched; the program is terminated.
:::

:::exercise Mark it noexcept
The program below has three functions. Two of them can never throw; one can. Add `noexcept` to the
two functions that can't fail, so that the program reports them correctly (it checks with the
`noexcept` operator). Don't change what the functions do.

**Input:** two integers `a` and `b`.
**Output:** four lines:

```
sum: A+B
quotient: A/B        (or "quotient: error" if b is 0)
swapped: B A
noexcept: add=yes checked_div=no swap_ints=yes
```

```cpp starter
#include <iostream>
#include <stdexcept>

int add(int a, int b) { return a + b; }

int checked_div(int a, int b) {
    if (b == 0) throw std::invalid_argument("division by zero");
    return a / b;
}

void swap_ints(int& a, int& b) {
    int t = a;
    a = b;
    b = t;
}

int main() {
    int a, b;
    std::cin >> a >> b;
    std::cout << "sum: " << add(a, b) << '\n';
    try {
        int q = checked_div(a, b);
        std::cout << "quotient: " << q << '\n';
    } catch (const std::invalid_argument&) {
        std::cout << "quotient: error\n";
    }
    swap_ints(a, b);
    std::cout << "swapped: " << a << ' ' << b << '\n';

    auto yn = [](bool x) { return x ? "yes" : "no"; };
    std::cout << "noexcept: add=" << yn(noexcept(add(a, b)))
              << " checked_div=" << yn(noexcept(checked_div(a, b)))
              << " swap_ints=" << yn(noexcept(swap_ints(a, b))) << '\n';
}
```

```cpp solution
#include <iostream>
#include <stdexcept>

int add(int a, int b) noexcept { return a + b; }

int checked_div(int a, int b) {
    if (b == 0) throw std::invalid_argument("division by zero");
    return a / b;
}

void swap_ints(int& a, int& b) noexcept {
    int t = a;
    a = b;
    b = t;
}

int main() {
    int a, b;
    std::cin >> a >> b;
    std::cout << "sum: " << add(a, b) << '\n';
    try {
        int q = checked_div(a, b);
        std::cout << "quotient: " << q << '\n';
    } catch (const std::invalid_argument&) {
        std::cout << "quotient: error\n";
    }
    swap_ints(a, b);
    std::cout << "swapped: " << a << ' ' << b << '\n';

    auto yn = [](bool x) { return x ? "yes" : "no"; };
    std::cout << "noexcept: add=" << yn(noexcept(add(a, b)))
              << " checked_div=" << yn(noexcept(checked_div(a, b)))
              << " swap_ints=" << yn(noexcept(swap_ints(a, b))) << '\n';
}
```

```hint
`noexcept` goes after the parameter list: `int add(int a, int b) noexcept { ... }`.
```

```hint
Don't mark `checked_div`: it throws, and an exception leaving a `noexcept` function terminates the
program.
```

```stdin
7 2
```

```expected
sum: 9
quotient: 3
swapped: 2 7
noexcept: add=yes checked_div=no swap_ints=yes
```

```stdin
5 0
```

```expected
sum: 5
quotient: error
swapped: 0 5
noexcept: add=yes checked_div=no swap_ints=yes
```

```checks
must add\s*\([^)]*\)\s*noexcept :: Mark add noexcept.
must swap_ints\s*\([^)]*\)\s*noexcept :: Mark swap_ints noexcept.
mustnot checked_div\s*\([^)]*\)\s*noexcept\s*\{ :: checked_div can throw, so it must not be noexcept.
```
:::

:::exercise Leak detector
`Tracker` objects count how many of them are alive. `process` creates two trackers with `new` and
deletes them at the end, but when it throws for a negative value, the `delete`s are skipped, so the
trackers leak.

Rewrite `process` so nothing leaks, using RAII: plain local objects or `std::unique_ptr`
(`std::make_unique`), and **no `new`**. Keep the output the same.

**Input:** any number of integers.
**Output:** for each value `v`, `processed R` (where `R` is `v + 2 * v`), or `error: negative value`
for negative `v`; finally `live objects: N`.

```cpp starter
#include <iostream>
#include <memory>
#include <stdexcept>

struct Tracker {
    static inline int live = 0;
    int value;
    explicit Tracker(int v) : value(v) { ++live; }
    ~Tracker() { --live; }
};

void process(int v) {
    Tracker* original = new Tracker(v);
    Tracker* doubled = new Tracker(v * 2);
    if (v < 0) throw std::invalid_argument("negative value");
    std::cout << "processed " << original->value + doubled->value << '\n';
    delete doubled;
    delete original;
}

int main() {
    int v;
    while (std::cin >> v) {
        try {
            process(v);
        } catch (const std::invalid_argument& e) {
            std::cout << "error: " << e.what() << '\n';
        }
    }
    std::cout << "live objects: " << Tracker::live << '\n';
}
```

```cpp solution
#include <iostream>
#include <memory>
#include <stdexcept>

struct Tracker {
    static inline int live = 0;
    int value;
    explicit Tracker(int v) : value(v) { ++live; }
    ~Tracker() { --live; }
};

void process(int v) {
    auto original = std::make_unique<Tracker>(v);
    auto doubled = std::make_unique<Tracker>(v * 2);
    if (v < 0) throw std::invalid_argument("negative value");
    std::cout << "processed " << original->value + doubled->value << '\n';
}

int main() {
    int v;
    while (std::cin >> v) {
        try {
            process(v);
        } catch (const std::invalid_argument& e) {
            std::cout << "error: " << e.what() << '\n';
        }
    }
    std::cout << "live objects: " << Tracker::live << '\n';
}
```

```hint
Replace `Tracker* original = new Tracker(v);` with `auto original = std::make_unique<Tracker>(v);`
and delete the manual `delete` lines.
```

```hint
Even simpler: `Tracker original(v);` as a plain local object. Locals are destroyed during stack unwinding.
```

```stdin
1
-2
3
```

```expected
processed 3
error: negative value
processed 9
live objects: 0
```

```stdin
-1
-1
```

```expected hidden
error: negative value
error: negative value
live objects: 0
```

```checks
mustnot \bnew\b :: Don't use new: let RAII objects own the trackers.
mustnot \bdelete\b :: No manual delete: RAII cleans up for you.
```
:::

:::exercise All or nothing
Accounts are stored in a `std::vector<long long>` of balances (account numbers are indexes). A
**batch** is a list of transfers `from to amount` that must be applied **all or nothing** (the strong
guarantee): if any transfer in the batch fails, the balances must be exactly as they were before
the batch.

`apply_batch` currently applies transfers directly to `balances`, so a failure leaves a batch
half-applied. Fix it with **copy-and-swap**: apply the transfers to a copy, and `swap` the copy in at
the end.

A transfer fails by throwing:

- `std::invalid_argument("bad account")` if `from` or `to` isn't a valid index;
- `std::runtime_error("insufficient funds")` if `from` has less than `amount` at that moment.

**Input:** `n`, then `n` starting balances, then `m` batches. Each batch is `k` followed by `k` lines
`from to amount`.
**Output:** for each batch, `batch I: ok` or `batch I: failed (MESSAGE)` (`I` starts at 1); finally all
balances separated by spaces.

```cpp starter
#include <iostream>
#include <stdexcept>
#include <utility>
#include <vector>

struct Transfer {
    long long from, to, amount;
};

void apply_batch(std::vector<long long>& balances, const std::vector<Transfer>& batch) {
    const auto n = static_cast<long long>(balances.size());
    for (const Transfer& t : batch) {
        if (t.from < 0 || t.from >= n || t.to < 0 || t.to >= n) throw std::invalid_argument("bad account");
        if (balances[t.from] < t.amount) throw std::runtime_error("insufficient funds");
        balances[t.from] -= t.amount;
        balances[t.to] += t.amount;
    }
}

int main() {
    int n;
    std::cin >> n;
    std::vector<long long> balances(n);
    for (auto& b : balances) std::cin >> b;

    int m;
    std::cin >> m;
    for (int i = 1; i <= m; ++i) {
        int k;
        std::cin >> k;
        std::vector<Transfer> batch(k);
        for (auto& t : batch) std::cin >> t.from >> t.to >> t.amount;
        try {
            apply_batch(balances, batch);
            std::cout << "batch " << i << ": ok\n";
        } catch (const std::exception& e) {
            std::cout << "batch " << i << ": failed (" << e.what() << ")\n";
        }
    }

    for (int i = 0; i < n; ++i) std::cout << (i ? " " : "") << balances[i];
    std::cout << '\n';
}
```

```cpp solution
#include <iostream>
#include <stdexcept>
#include <utility>
#include <vector>

struct Transfer {
    long long from, to, amount;
};

void apply_batch(std::vector<long long>& balances, const std::vector<Transfer>& batch) {
    std::vector<long long> work = balances;   // all risky work happens on the copy
    const auto n = static_cast<long long>(work.size());
    for (const Transfer& t : batch) {
        if (t.from < 0 || t.from >= n || t.to < 0 || t.to >= n) throw std::invalid_argument("bad account");
        if (work[t.from] < t.amount) throw std::runtime_error("insufficient funds");
        work[t.from] -= t.amount;
        work[t.to] += t.amount;
    }
    balances.swap(work);                      // commit: cannot throw
}

int main() {
    int n;
    std::cin >> n;
    std::vector<long long> balances(n);
    for (auto& b : balances) std::cin >> b;

    int m;
    std::cin >> m;
    for (int i = 1; i <= m; ++i) {
        int k;
        std::cin >> k;
        std::vector<Transfer> batch(k);
        for (auto& t : batch) std::cin >> t.from >> t.to >> t.amount;
        try {
            apply_batch(balances, batch);
            std::cout << "batch " << i << ": ok\n";
        } catch (const std::exception& e) {
            std::cout << "batch " << i << ": failed (" << e.what() << ")\n";
        }
    }

    for (int i = 0; i < n; ++i) std::cout << (i ? " " : "") << balances[i];
    std::cout << '\n';
}
```

```hint
Start `apply_batch` with `std::vector<long long> work = balances;` and use `work` everywhere in the loop.
```

```hint
At the very end, after every transfer succeeded: `balances.swap(work);` (or `std::swap(balances, work);`).
If anything throws before that line, `balances` was never touched.
```

```stdin
3
100 50 0
3
2
0 1 30
1 2 70
2
0 2 10
1 0 999
1
0 5 1
```

```expected
batch 1: ok
batch 2: failed (insufficient funds)
batch 3: failed (bad account)
70 10 70
```

```stdin
2
10 10
2
3
0 1 10
1 0 15
1 0 6
1
0 1 0
```

```expected hidden
batch 1: failed (insufficient funds)
batch 2: ok
10 10
```

```checks
must swap :: Commit the changes with swap.
must \btry\b :: Keep handling failed batches with try/catch.
```
:::
