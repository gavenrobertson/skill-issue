---
title: this, const & mutable
summary: The hidden this pointer, returning *this for method chaining, const member functions and const objects, mutable members, and overloading on const.
---

## The `this` pointer

How does a member function know *which* object it was called on? Every non-static member function
receives a hidden parameter: a pointer to the object, called **`this`**. When you write `count_` inside
a member function, the compiler really reads `this->count_`.

```cpp
c.increment();
// is conceptually compiled as
increment(&c);          // with   void increment(Counter* this) { ++this->count_; }
```

You can use `this` explicitly. Three common reasons:

1. **Disambiguation**, when a parameter has the same name as a member.
2. **Passing or returning the current object** (`*this` is the object itself).
3. **Comparing addresses**, to detect "is this the same object?".

```cpp run
#include <iostream>

class Box {
    int size_ = 0;
public:
    void setSize(int size_) {
        this->size_ = size_;        // this->size_ is the member, size_ is the parameter
    }
    bool isSameObject(const Box& other) const {
        return this == &other;      // compare addresses
    }
    int size() const { return size_; }
};

int main() {
    Box a, b;
    a.setSize(5);
    std::cout << a.size() << '\n';
    std::cout << std::boolalpha << a.isSameObject(a) << ' ' << a.isSameObject(b) << '\n';
}
```

```output
5
true false
```

> **Tip:** Rather than reusing member names for parameters and writing `this->` everywhere, give members
> a distinct style (`size_`). Then `this->` is only needed for the cases where it adds meaning.

The type of `this` is `Box*` in a normal member function and `const Box*` in a `const` member function
(more below). `this` is a prvalue: you can't assign to it.

## Returning `*this` for method chaining

If a member function returns a **reference to the object** (`ClassName&`) and ends with
`return *this;`, the caller can chain calls one after another. This is how `std::cout << a << b` works,
and it's the basis of the "builder" or "fluent interface" style.

```cpp run
#include <iostream>
#include <string>

class Pizza {
    std::string desc_ = "pizza";
public:
    Pizza& add(const std::string& topping) {
        desc_ += " + " + topping;
        return *this;                // return the object itself, by reference
    }
    Pizza& extraLarge() {
        desc_ = "XL " + desc_;
        return *this;
    }
    const std::string& describe() const { return desc_; }
};

int main() {
    Pizza p;
    p.add("cheese").add("olives").extraLarge();   // each call returns p itself
    std::cout << p.describe() << '\n';
}
```

```output
XL pizza + cheese + olives
```

**The reference is essential.** If the return type is `Pizza` (by value), each call returns a *copy*,
and later calls in the chain modify the copy, not `p`:

```cpp run
#include <iostream>

class Counter {
    int value_ = 0;
public:
    Counter add(int n) {          // BUG: returns a copy
        value_ += n;
        return *this;
    }
    int value() const { return value_; }
};

int main() {
    Counter c;
    c.add(1).add(10).add(100);    // only the first add touches c
    std::cout << c.value() << '\n';
}
```

```output
1
```

## `const` member functions

Putting `const` after a member function's parameter list promises that it **won't modify the object**.
Inside it, `this` is a pointer to const, so every member is read-only:

```cpp compile-error
class Account {
    int balance_ = 0;
public:
    int balance() const {
        balance_ = 0;        // error: assignment of member 'Account::balance_' in read-only object
        return balance_;
    }
};

int main() {}
```

The real payoff: **a `const` object (or a `const&` to one) can only call `const` member functions.**
And you pass objects by `const&` all the time to avoid copies:

```cpp compile-error
#include <iostream>
#include <string>

class Person {
    std::string name_ = "Ada";
public:
    const std::string& name() { return name_; }     // forgot const!
};

void greet(const Person& p) {
    std::cout << "Hi " << p.name() << '\n';
    // error: passing 'const Person' as 'this' argument discards qualifiers
}

int main() {
    Person p;
    greet(p);
}
```

The getter doesn't change anything, but without `const` the compiler can't know that. That error
message ("passing 'const X' as 'this' argument discards qualifiers") always means *you called a
non-const member function on a const object*.

**Rule (const-correctness):** mark every member function that doesn't modify the object as `const`.
It documents intent, lets the function be used on const objects, and lets the compiler catch accidental
modification.

```cpp run
#include <iostream>

class Circle {
    double r_;
public:
    explicit Circle(double r) : r_(r) {}
    double area() const { return 3.14159 * r_ * r_; }   // const: only reads
    void scale(double f) { r_ *= f; }                    // non-const: modifies
};

void report(const Circle& c) {
    std::cout << c.area() << '\n';      // OK: area() is const
    // c.scale(2);                      // would not compile: scale() is not const
}

int main() {
    Circle c(1.0);
    report(c);
    c.scale(2);                         // fine on a non-const object
    report(c);

    const Circle fixed(3.0);            // a const object
    std::cout << fixed.area() << '\n';  // only const members are callable
}
```

```output
3.14159
12.5664
28.2743
```

A non-const object can call both const and non-const members; a const object only const ones.

| | calling a `const` member | calling a non-`const` member |
| --- | --- | --- |
| non-const object | ✓ | ✓ |
| const object / `const&` / `const*` | ✓ | ✗ compile error |

> **Note:** When you define a const member function outside the class, repeat the `const`:
> `double Circle::area() const { ... }`. The `const` is part of the function's signature.

## `mutable` members

Sometimes a member changes for reasons that are **invisible to the user** of the class: a cache of an
expensive result, a counter of how often something was called, a mutex. Logically the object is
unchanged, so the function should still be `const`. Marking such a member **`mutable`** allows it to be
modified even inside const member functions:

```cpp run
#include <iostream>
#include <vector>

class Stats {
private:
    std::vector<int> values_;
    mutable bool cacheValid_ = false;   // cache bookkeeping: not part of the logical state
    mutable double cachedMean_ = 0.0;
    mutable int computations_ = 0;

public:
    void add(int v) {
        values_.push_back(v);
        cacheValid_ = false;            // data changed, cache is stale
    }

    double mean() const {               // const: callers see no change
        if (!cacheValid_) {
            double sum = 0;
            for (int v : values_) sum += v;
            cachedMean_ = values_.empty() ? 0.0 : sum / values_.size();
            cacheValid_ = true;
            ++computations_;
        }
        return cachedMean_;
    }

    int computations() const { return computations_; }
};

int main() {
    Stats s;
    s.add(2);
    s.add(4);
    std::cout << s.mean() << ' ' << s.mean() << '\n';   // computed once, then cached
    s.add(9);
    std::cout << s.mean() << '\n';                      // recomputed
    std::cout << "computed " << s.computations() << " times\n";
}
```

```output
3 3
5
computed 2 times
```

Use `mutable` sparingly, only for things that are truly not part of the object's observable value.
If you find yourself making "real" data mutable, the function shouldn't be `const`.

## Overloading on `const`

Because `const` is part of a member function's signature, you can have **two versions** of the same
function: one for non-const objects and one for const objects. The compiler picks the const one when
the object is const. This is how `std::vector::operator[]` returns a modifiable `int&` for a normal
vector but a `const int&` for a const one.

```cpp run
#include <iostream>

class Row {
    int cells_[3] = {1, 2, 3};
public:
    int& at(int i) {                    // non-const version: allows modification
        std::cout << "[non-const] ";
        return cells_[i];
    }
    const int& at(int i) const {        // const version: read-only access
        std::cout << "[const] ";
        return cells_[i];
    }
};

int main() {
    Row r;
    r.at(0) = 10;                       // picks the non-const version
    std::cout << r.at(0) << '\n';

    const Row& view = r;
    std::cout << view.at(0) << '\n';    // picks the const version
    // view.at(0) = 5;                  // error: assignment of read-only location
}
```

```output
[non-const] [non-const] 10
[const] 10
```

> **Note:** C++23 adds "deducing `this`" (`auto&& at(this auto&& self, int i)`), which lets you write
> one function instead of a const/non-const pair. Until then, the pair is the standard pattern.

:::quiz
Inside `int Widget::size() const`, what is the type of `this`?

- [ ] `Widget*`
- [x] `const Widget*`
- [ ] `Widget&`
- [ ] `const Widget&`

`this` is always a pointer. In a const member function it points to const, which is why members
can't be modified there (unless `mutable`).
:::

:::quiz
`void show(const Item& it) { it.print(); }` fails with "passing 'const Item' as 'this' argument discards qualifiers". What's the best fix?

- [ ] Remove the `const` from the parameter
- [x] Mark `print()` as a `const` member function
- [ ] Make all of `Item`'s members `mutable`
- [ ] Pass `Item` by value

`print` doesn't modify the object, so it should be `const`. That fixes it for every caller holding a
const reference, without weakening the function's promises.
:::

:::quiz
`Builder& setX(int)` returns `*this`. What happens with `b.setX(1).setY(2)` if `setX` is changed to return `Builder` by value?

- [ ] Nothing changes
- [x] `setY` modifies a temporary copy, so `b` doesn't get Y set
- [ ] It doesn't compile
- [ ] `b` gets both values, but more slowly

Returning by value makes a copy; the chained call acts on that copy, which is then thrown away.
:::

:::exercise Fluent calculator {easy}
Complete the `Calc` class so its operations can be **chained**. Each of `add`, `multiply`, and
`subtract` must modify the value and return a **reference** to the object (`return *this;`). `value()`
is a `const` getter. The value starts at 0.

**Input:** three integers `a b c`.
**Output:** the result of `Calc{}.add(a).multiply(b).subtract(c)`, i.e. `a * b - c`.

```cpp starter
#include <iostream>

class Calc {
    long long value_ = 0;
public:
    void add(long long n) { value_ += n; }
    // multiply, subtract, value()
};

int main() {
    long long a, b, c;
    std::cin >> a >> b >> c;
    Calc calc;
    calc.add(a);
    // make this work:  calc.add(a).multiply(b).subtract(c);
    std::cout << 0 << '\n';
}
```

```cpp solution
#include <iostream>

class Calc {
    long long value_ = 0;
public:
    Calc& add(long long n) {
        value_ += n;
        return *this;
    }
    Calc& multiply(long long n) {
        value_ *= n;
        return *this;
    }
    Calc& subtract(long long n) {
        value_ -= n;
        return *this;
    }
    long long value() const { return value_; }
};

int main() {
    long long a, b, c;
    std::cin >> a >> b >> c;
    Calc calc;
    calc.add(a).multiply(b).subtract(c);
    std::cout << calc.value() << '\n';
}
```

```hint
The return type must be `Calc&` and every operation ends with `return *this;`.
```

```stdin
3 4 5
```

```expected
7
```

```stdin
0 100 -1
```

```expected hidden
1
```

```stdin
-6 -7 0
```

```expected hidden
42
```

```checks
must Calc\s*&\s*multiply :: multiply must return Calc& so calls can chain.
must return\s*\*\s*this :: Return *this from the chainable functions.
must \.add\s*\([^)]*\)\s*\.multiply\s*\( :: Chain the calls: calc.add(a).multiply(b)...
must value\s*\(\s*\)\s*const :: value() should be a const member function.
```
:::

:::exercise Const-correct inventory {easy}
This program doesn't compile: `printReport` takes a `const Inventory&`, but the member functions it
calls aren't marked `const`. Fix the **class** (don't change `printReport`'s parameter) so it compiles
and prints the report.

**Input:** a count `n`, then `n` item quantities.
**Output:** `items: N` and `total: T` on two lines, where `N` is how many quantities there are and `T`
is their sum.

```cpp starter broken
#include <iostream>
#include <vector>

class Inventory {
    std::vector<int> quantities_;
public:
    void add(int q) { quantities_.push_back(q); }
    int count() { return static_cast<int>(quantities_.size()); }
    int total() {
        int sum = 0;
        for (int q : quantities_) sum += q;
        return sum;
    }
};

void printReport(const Inventory& inv) {
    std::cout << "items: " << inv.count() << '\n';
    std::cout << "total: " << inv.total() << '\n';
}

int main() {
    int n;
    std::cin >> n;
    Inventory inv;
    for (int i = 0; i < n; ++i) {
        int q;
        std::cin >> q;
        inv.add(q);
    }
    printReport(inv);
}
```

```cpp solution
#include <iostream>
#include <vector>

class Inventory {
    std::vector<int> quantities_;
public:
    void add(int q) { quantities_.push_back(q); }
    int count() const { return static_cast<int>(quantities_.size()); }
    int total() const {
        int sum = 0;
        for (int q : quantities_) sum += q;
        return sum;
    }
};

void printReport(const Inventory& inv) {
    std::cout << "items: " << inv.count() << '\n';
    std::cout << "total: " << inv.total() << '\n';
}

int main() {
    int n;
    std::cin >> n;
    Inventory inv;
    for (int i = 0; i < n; ++i) {
        int q;
        std::cin >> q;
        inv.add(q);
    }
    printReport(inv);
}
```

```hint
Read the error: "passing 'const Inventory' as 'this' argument discards qualifiers". Which functions are called on the const reference?
```

```hint
Add `const` after the parameter list of `count()` and `total()`. Not on `add()`, which really modifies.
```

```stdin
3
5 10 2
```

```expected
items: 3
total: 17
```

```stdin
0
```

```expected hidden
items: 0
total: 0
```

```checks
must const\s+Inventory\s*&\s*inv :: Keep printReport's const Inventory& parameter.
must count\s*\(\s*\)\s*const :: count() must be const.
must total\s*\(\s*\)\s*const :: total() must be const.
```
:::

:::exercise Cached maximum {medium}
Write a class `Tracker` that stores integers and reports their maximum. Computing the maximum scans
all values, so cache it:

- `void add(int v)`: stores `v` and marks the cache as stale.
- `int max() const`: if the cache is stale, scan the values, store the result in the cache, count one
  scan, and mark the cache fresh. Return the cached maximum. (It's only called when there is at least one value.)
- `int scans() const`: how many times `max()` actually scanned.

The cache members must be `mutable` so `max()` can stay `const`.

**Input:** commands until end of input: `add V` or `max`.
**Output:** for each `max`, print the maximum on its own line. At the end print `scans: S`.

```cpp starter
#include <iostream>
#include <string>
#include <vector>

class Tracker {
    std::vector<int> values_;
public:
    void add(int v) { values_.push_back(v); }
    int max() const {
        // TODO: use a cache
        return 0;
    }
    int scans() const { return 0; }
};

int main() {
    Tracker t;
    std::string cmd;
    while (std::cin >> cmd) {
        if (cmd == "add") {
            int v;
            std::cin >> v;
            t.add(v);
        } else if (cmd == "max") {
            std::cout << t.max() << '\n';
        }
    }
    std::cout << "scans: " << t.scans() << '\n';
}
```

```cpp solution
#include <iostream>
#include <string>
#include <vector>

class Tracker {
    std::vector<int> values_;
    mutable bool fresh_ = false;
    mutable int cachedMax_ = 0;
    mutable int scans_ = 0;
public:
    void add(int v) {
        values_.push_back(v);
        fresh_ = false;
    }
    int max() const {
        if (!fresh_) {
            cachedMax_ = values_[0];
            for (int v : values_)
                if (v > cachedMax_) cachedMax_ = v;
            ++scans_;
            fresh_ = true;
        }
        return cachedMax_;
    }
    int scans() const { return scans_; }
};

int main() {
    Tracker t;
    std::string cmd;
    while (std::cin >> cmd) {
        if (cmd == "add") {
            int v;
            std::cin >> v;
            t.add(v);
        } else if (cmd == "max") {
            std::cout << t.max() << '\n';
        }
    }
    std::cout << "scans: " << t.scans() << '\n';
}
```

```hint
Add `mutable bool fresh_ = false;`, `mutable int cachedMax_ = 0;` and `mutable int scans_ = 0;`.
```

```hint
In `max()`: `if (!fresh_) { /* scan, ++scans_, fresh_ = true; */ } return cachedMax_;`
```

```stdin
add 3
add 7
max
max
add 5
max
add 10
max
```

```expected
7
7
7
10
scans: 3
```

```stdin
add -4
max
max
max
```

```expected hidden
-4
-4
-4
scans: 1
```

```stdin
add 1
```

```expected hidden
scans: 0
```

```checks
must \bmutable\b :: Use mutable members for the cache.
must max\s*\(\s*\)\s*const :: max() must stay const.
```
:::

:::exercise Lazy leaderboard {hard}
Write a `Leaderboard` class for a game. Sorting is expensive, so the board keeps a **cached sorted
view** and re-sorts only when a query needs it *and* the scores changed since the last sort.

- `Leaderboard& set(const std::string& name, int score)` adds a player or replaces their score, marks
  the cache stale, and returns `*this` so calls can be chained (`board.set("ann", 5).set("bob", 7);`).
- The queries are **`const`** member functions (a const board can still be queried), so the cache and
  the sort counter must be `mutable`.
- Ranking order: higher score first; equal scores in alphabetical order of name.
- The cache starts out stale, so the very first query sorts (even on an empty board). Every `set` makes
  it stale again, even one that doesn't change the score.

**Input:** commands until end of input:

| Command | Output |
| --- | --- |
| `set NAME SCORE` | nothing |
| `top K` | the first `K` players (or all, if there are fewer), one per line as `R. NAME SCORE`; `(empty)` if the board has no players |
| `rank NAME` | `NAME is #R`, or `NAME not found` |

After the last command, print `sorts: S`: how many times the board actually sorted.

**Example:** `set ann 50`, `set bob 70`, `set cy 50`, `top 2`, `rank cy`, `set ann 90`, `rank ann`
prints `1. bob 70`, `2. ann 50`, `cy is #3`, `ann is #1`, `sorts: 2`.

```cpp starter
#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

class Leaderboard {
    // TODO
};

int main() {
    Leaderboard board;
    // read commands until end of input
    std::cout << "sorts: " << 0 << '\n';
}
```

```cpp solution
#include <algorithm>
#include <iostream>
#include <string>
#include <utility>
#include <vector>

class Leaderboard {
    std::vector<std::pair<std::string, int>> scores_;      // in insertion order
    mutable std::vector<std::pair<int, std::string>> sorted_;  // (-score, name): sorts in rank order
    mutable bool fresh_ = false;
    mutable int sorts_ = 0;

    void refresh() const {
        if (fresh_) return;
        sorted_.clear();
        for (const auto& [name, score] : scores_) sorted_.push_back({-score, name});
        std::sort(sorted_.begin(), sorted_.end());
        ++sorts_;
        fresh_ = true;
    }

public:
    Leaderboard& set(const std::string& name, int score) {
        fresh_ = false;
        for (auto& entry : scores_) {
            if (entry.first == name) {
                entry.second = score;
                return *this;
            }
        }
        scores_.push_back({name, score});
        return *this;
    }

    void printTop(int k) const {
        refresh();
        if (sorted_.empty()) {
            std::cout << "(empty)\n";
            return;
        }
        for (int i = 0; i < k && i < static_cast<int>(sorted_.size()); ++i)
            std::cout << i + 1 << ". " << sorted_[i].second << ' ' << -sorted_[i].first << '\n';
    }

    int rank(const std::string& name) const {      // 0 = not found
        refresh();
        for (std::size_t i = 0; i < sorted_.size(); ++i)
            if (sorted_[i].second == name) return static_cast<int>(i) + 1;
        return 0;
    }

    int sorts() const { return sorts_; }
};

int main() {
    Leaderboard board;
    std::string cmd;
    while (std::cin >> cmd) {
        if (cmd == "set") {
            std::string name;
            int score;
            std::cin >> name >> score;
            board.set(name, score);
        } else if (cmd == "top") {
            int k;
            std::cin >> k;
            board.printTop(k);
        } else if (cmd == "rank") {
            std::string name;
            std::cin >> name;
            int r = board.rank(name);
            if (r == 0) std::cout << name << " not found\n";
            else std::cout << name << " is #" << r << '\n';
        }
    }
    std::cout << "sorts: " << board.sorts() << '\n';
}
```

```hint
Keep the real data (names and scores) in one member, and the sorted copy plus a `fresh_` flag and a
counter in `mutable` members. A private `void refresh() const` that sorts only when `!fresh_` keeps
the queries short.
```

```hint
Sorting a `std::vector<std::pair<int, std::string>>` holding `(-score, name)` with plain `std::sort` gives
exactly the ranking order: pairs compare by `first`, then by `second`.
```

```stdin
set ann 50
set bob 70
set cy 50
top 2
rank cy
set ann 90
rank ann
```

```expected
1. bob 70
2. ann 50
cy is #3
ann is #1
sorts: 2
```

```stdin
top 3
rank ghost
set zed 10
set amy 10
set zed 11
top 5
top 1
rank amy
rank zed
```

```expected hidden
(empty)
ghost not found
1. zed 11
2. amy 10
1. zed 11
amy is #2
zed is #1
sorts: 2
```

```stdin
set a 1
set b 2
set c 3
set a 5
set b 5
```

```expected hidden
sorts: 0
```

```stdin
set solo -5
top 0
rank solo
set solo -5
top 1
```

```expected hidden
solo is #1
1. solo -5
sorts: 2
```

```checks
must Leaderboard\s*&\s*set\s*\( :: set must return Leaderboard& so calls can be chained.
must return\s*\*\s*this :: Return *this from set.
must \bmutable\b :: Keep the cache in mutable members.
```
:::
