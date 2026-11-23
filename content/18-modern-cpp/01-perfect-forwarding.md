---
title: Perfect Forwarding
summary: Value categories revisited, forwarding references (T&&), reference collapsing, std::forward, and how emplace_back and make_unique pass arguments through without extra copies.
---

## The problem

You often write a function whose only job is to **pass its arguments on** to something else: a
factory that constructs an object, a wrapper that logs and then calls a function, a container's
`emplace_back` that constructs an element in place. The wrapper should be invisible: if the caller
passes a temporary (which may be **moved** from), the final function should receive a temporary; if
the caller passes a named variable (which must be **copied**), it should receive that.

Passing arguments through while preserving whether they were lvalues or rvalues (and `const` or not)
is called **perfect forwarding**. To understand it we need three ingredients: value categories,
forwarding references, and reference collapsing.

## Value categories, revisited

Every **expression** in C++ has a type *and* a **value category**. You met lvalues and rvalues with move
semantics; the full picture has three basic categories:

| Category | What it is | Examples | Can you take its address? | Can it be moved from? |
| --- | --- | --- | --- | --- |
| **lvalue** | has a name/identity, persists | `x`, `v[0]`, `*p`, `s.name`, a function returning `T&` | yes | only if you `std::move` it |
| **prvalue** ("pure rvalue") | a temporary value being computed | `42`, `x + 1`, `std::string("hi")`, a function returning `T` | no | yes |
| **xvalue** ("expiring value") | an object that is about to be given up | `std::move(x)`, a function returning `T&&` | no | yes |

"rvalue" means prvalue **or** xvalue; "glvalue" means lvalue or xvalue. The crucial (and surprising)
rule:

> **A named variable is always an lvalue**, even if its type is an rvalue reference.

```cpp
void take(std::string&& s) {
    // s's TYPE is std::string&&, but the EXPRESSION `s` is an lvalue (it has a name)
    other(s);              // passes an lvalue
    other(std::move(s));   // passes an xvalue
}
```

You can ask the compiler for an expression's category with `decltype((expr))` (note the double
parentheses): it gives `T&` for an lvalue, `T&&` for an xvalue, and plain `T` for a prvalue.

```cpp run
#include <iostream>
#include <string>
#include <utility>

template <typename T> constexpr const char* category = "prvalue";
template <typename T> constexpr const char* category<T&> = "lvalue";
template <typename T> constexpr const char* category<T&&> = "xvalue";

#define CATEGORY(expr) category<decltype((expr))>

std::string makeName() { return "temp"; }

int main() {
    int x = 5;
    int&& r = 7;
    std::string s = "hi";
    std::cout << "x              " << CATEGORY(x) << '\n';
    std::cout << "x + 1          " << CATEGORY(x + 1) << '\n';
    std::cout << "42             " << CATEGORY(42) << '\n';
    std::cout << "std::move(x)   " << CATEGORY(std::move(x)) << '\n';
    std::cout << "r (int&&)      " << CATEGORY(r) << '\n';
    std::cout << "makeName()     " << CATEGORY(makeName()) << '\n';
    std::cout << "s[0]           " << CATEGORY(s[0]) << '\n';
    std::cout << "\"literal\"      " << CATEGORY("literal") << '\n';
}
```

```output
x              lvalue
x + 1          prvalue
42             prvalue
std::move(x)   xvalue
r (int&&)      lvalue
makeName()     prvalue
s[0]           lvalue
"literal"      lvalue
```

(String literals are lvalues: they're arrays that live for the whole program.)

## A wrapper that loses information

Let's watch the problem happen. `store` has two overloads: one copies, one moves.

```cpp run
#include <iostream>
#include <string>
#include <utility>

void store(const std::string& s) { std::cout << "copied \"" << s << "\"\n"; }
void store(std::string&& s)      { std::cout << "moved  \"" << s << "\"\n"; }

// Attempt 1: take by const reference. Everything becomes a copy.
void wrapConstRef(const std::string& s) { store(s); }

// Attempt 2: take by rvalue reference. Can't even accept lvalues!
void wrapRvalue(std::string&& s) { store(std::move(s)); }

int main() {
    std::string name = "Ada";
    wrapConstRef(name);                 // copied: correct
    wrapConstRef(std::string("Bob"));   // copied: wasteful, a temporary could have been moved
    wrapRvalue(std::string("Cy"));      // moved: correct
    // wrapRvalue(name);                // error: cannot bind rvalue reference to an lvalue
}
```

```output
copied "Ada"
copied "Bob"
moved  "Cy"
```

We'd need both overloads of every wrapper, and with three parameters that's 2^3 = 8 overloads. We need
a parameter that accepts **anything** and **remembers** what it got.

## Forwarding references

In a **function template**, a parameter of type `T&&` where `T` is **deduced** is special. It's not an
rvalue reference: it's a **forwarding reference** (Scott Meyers called them "universal references").
It binds to lvalues *and* rvalues, `const` or not, and the deduced `T` records what was passed:

| You pass | `T` is deduced as | Parameter type `T&&` becomes |
| --- | --- | --- |
| an lvalue `std::string` | `std::string&` | `std::string&` |
| a `const` lvalue `std::string` | `const std::string&` | `const std::string&` |
| an rvalue `std::string` | `std::string` | `std::string&&` |

```cpp run
#include <iostream>
#include <string>
#include <type_traits>
#include <utility>

template <typename T>
void inspect(T&& arg) {
    (void)arg;
    if constexpr (std::is_lvalue_reference_v<T>) {
        if constexpr (std::is_const_v<std::remove_reference_t<T>>)
            std::cout << "T = const std::string&  (const lvalue passed)\n";
        else
            std::cout << "T = std::string&        (lvalue passed)\n";
    } else {
        std::cout << "T = std::string         (rvalue passed)\n";
    }
}

int main() {
    std::string s = "x";
    const std::string cs = "y";
    inspect(s);
    inspect(cs);
    inspect(std::string("z"));
    inspect(std::move(s));
}
```

```output
T = std::string&        (lvalue passed)
T = const std::string&  (const lvalue passed)
T = std::string         (rvalue passed)
T = std::string         (rvalue passed)
```

`auto&&` is a forwarding reference too (`auto` is deduced just like `T`), which is why range-for loops
sometimes use `for (auto&& x : range)`.

### What is **not** a forwarding reference

Only the exact form `T&&` with `T` deduced **for that call** qualifies:

```cpp
template <typename T> void f(T&& x);                   // forwarding reference
void g(std::string&& x);                               // rvalue reference (no template)
template <typename T> void h(std::vector<T>&& v);      // rvalue reference (T&& is not the whole type)
template <typename T> void k(const T&& x);             // rvalue reference (const disqualifies it)

template <typename T>
class Box {
    void put(T&& x);                 // rvalue reference: T was fixed when Box<T> was created
    template <typename U>
    void emplace(U&& x);             // forwarding reference: U is deduced per call
};
auto&& r = something();              // forwarding reference
```

## Reference collapsing

How does `T&&` with `T = std::string&` become `std::string&`? You can't write a reference to a
reference yourself, but when one appears through templates or type aliases, the compiler **collapses**
it:

| Combination | Result |
| --- | --- |
| `&` + `&` | `&` |
| `&` + `&&` | `&` |
| `&&` + `&` | `&` |
| `&&` + `&&` | `&&` |

In words: **if either is an lvalue reference, the result is an lvalue reference**. Only `&&` + `&&`
stays `&&`.

```cpp run
#include <iostream>
#include <type_traits>

using LRef = int&;
using RRef = int&&;

static_assert(std::is_same_v<LRef&, int&>);
static_assert(std::is_same_v<LRef&&, int&>);    // & + && -> &
static_assert(std::is_same_v<RRef&, int&>);     // && + & -> &
static_assert(std::is_same_v<RRef&&, int&&>);   // && + && -> &&

int main() {
    std::cout << "all collapsing rules hold\n";
}
```

```output
all collapsing rules hold
```

## `std::forward`: restoring the category

Inside the template, the parameter has a **name**, so (rule above) it's an lvalue no matter what was
passed. Passing it on with `f(arg)` always selects the lvalue overload. `std::move(arg)` would always
select the rvalue overload, stealing from the caller's variables. `std::forward<T>(arg)` does the right
thing: it casts `arg` back to an rvalue **only if** an rvalue was originally passed (that is, only if
`T` is not an lvalue reference).

```cpp run
#include <iostream>
#include <string>
#include <utility>

void store(const std::string& s) { std::cout << "copied \"" << s << "\"\n"; }
void store(std::string&& s)      { std::cout << "moved  \"" << s << "\"\n"; }

template <typename T>
void noForward(T&& arg) { store(arg); }                     // always an lvalue -> always copies

template <typename T>
void alwaysMove(T&& arg) { store(std::move(arg)); }         // always an rvalue -> steals lvalues!

template <typename T>
void perfect(T&& arg) { store(std::forward<T>(arg)); }      // preserves the category

int main() {
    std::string name = "Ada";

    std::cout << "-- noForward\n";
    noForward(name);
    noForward(std::string("Bob"));

    std::cout << "-- alwaysMove (dangerous)\n";
    alwaysMove(std::string("Cy"));

    std::cout << "-- perfect\n";
    perfect(name);
    perfect(std::string("Dee"));
    perfect(std::move(name));
}
```

```output
-- noForward
copied "Ada"
copied "Bob"
-- alwaysMove (dangerous)
moved  "Cy"
-- perfect
copied "Ada"
moved  "Dee"
moved  "Ada"
```

`std::forward` is essentially `static_cast<T&&>(arg)`, and reference collapsing does the rest:

- `T = std::string&` → `static_cast<std::string& &&>` → `static_cast<std::string&>`: an lvalue.
- `T = std::string` → `static_cast<std::string&&>`: an rvalue, like `std::move`.

That's why you must write the template argument explicitly. Without it, `std::forward` can't know what
the caller passed:

```cpp compile-error
#include <utility>

void target(int) {}

template <typename T>
void wrapper(T&& arg) {
    target(std::forward(arg));   // error: couldn't deduce template parameter: use std::forward<T>(arg)
}

int main() { wrapper(1); }
```

The rule of thumb: **`std::move` for rvalue references, `std::forward<T>` for forwarding references.**

## Variadic forwarding: any number of arguments

Combine forwarding references with a parameter pack (templates module) and you can forward **any number**
of arguments of any types. The pattern `std::forward<Args>(args)...` expands to one `std::forward` per
argument:

```cpp
template <typename T, typename... Args>
std::unique_ptr<T> makeUnique(Args&&... args) {
    return std::unique_ptr<T>(new T(std::forward<Args>(args)...));
}
```

That's essentially how `std::make_unique` and `std::make_shared` are implemented.

### Real-world example: `emplace_back` vs `push_back`

`push_back(x)` takes an already-constructed element and copies or moves it into the vector.
`emplace_back(args...)` **forwards** its arguments to the element's constructor, building the element
directly inside the vector's storage. Let's count:

```cpp run
#include <iostream>
#include <string>
#include <utility>
#include <vector>

struct Tracker {
    std::string name;
    int level;
    static inline int copies = 0;
    static inline int moves = 0;

    Tracker(std::string n, int l) : name(std::move(n)), level(l) {}
    Tracker(const Tracker& o) : name(o.name), level(o.level) { ++copies; }
    Tracker(Tracker&& o) noexcept : name(std::move(o.name)), level(o.level) { ++moves; }
};

void report(const char* what) {
    std::cout << what << ": copies=" << Tracker::copies << " moves=" << Tracker::moves << '\n';
    Tracker::copies = Tracker::moves = 0;
}

int main() {
    std::vector<Tracker> v;
    v.reserve(10);                       // avoid reallocation so only our calls are counted

    Tracker t{"named", 1};
    v.push_back(t);                      report("push_back(lvalue)");
    v.push_back(Tracker{"temp", 2});     report("push_back(temporary)");
    v.push_back(std::move(t));           report("push_back(std::move)");
    v.emplace_back("built in place", 3); report("emplace_back(args)");
}
```

```output
push_back(lvalue): copies=1 moves=0
push_back(temporary): copies=0 moves=1
push_back(std::move): copies=0 moves=1
emplace_back(args): copies=0 moves=0
```

`emplace_back("built in place", 3)` forwards a `const char(&)[15]` and an `int` straight to
`Tracker`'s constructor, so no `Tracker` is ever copied or moved.

## Pitfalls

- **Forward only once.** After `std::forward<T>(arg)` hands an rvalue to someone, they may have moved
  from it. Using `arg` again afterwards reads a moved-from object.
- **Forwarding references are greedy.** A constructor `template <typename T> Person(T&& name)` is a
  better match than the copy constructor for a non-`const` `Person` lvalue, which causes baffling
  errors. Constrain such templates with a concept (e.g. `requires std::constructible_from<std::string, T>`).
- **Not every `&&` is forwarding.** `std::vector<T>&&` or `T&&` in a class template's member function are
  plain rvalue references (see the list above). Using `std::forward` on them is misleading; use `std::move`.
- **Braced lists can't be deduced.** `makeUnique<std::vector<int>>({1, 2, 3})` fails because a
  `{...}` list has no type for `Args` to deduce.

:::quiz
In `template <typename T> void f(T&& x);`, what is `T` when you call `f(n)` with `int n = 1;`?

- [ ] `int`
- [x] `int&`
- [ ] `int&&`
- [ ] `const int&`

Passing an lvalue to a forwarding reference deduces `T` as an lvalue reference (`int&`), and
`int& &&` collapses to `int&`.
:::

:::quiz
Which of these parameters is a **forwarding reference**?

- [ ] `void f(std::string&& s)`
- [ ] `template <typename T> void f(std::vector<T>&& v)`
- [x] `template <typename T> void f(T&& x)`
- [ ] `template <typename T> void f(const T&& x)`

Only a plain `T&&` (or `auto&&`) where `T` is deduced for this call is a forwarding reference.
:::

:::quiz
Inside `template <typename T> void w(T&& arg)`, why is `std::move(arg)` worse than `std::forward<T>(arg)`?

- [x] `std::move` turns lvalue arguments into rvalues too, so the callee may steal the caller's variable
- [ ] `std::move` doesn't compile on forwarding references
- [ ] `std::forward` is faster
- [ ] There is no difference

`std::move` casts unconditionally. `std::forward<T>` casts to an rvalue only when the original argument was an rvalue.
:::

:::exercise Relay the category {easy}
Three overloads of `describe` print the value category they receive. Write the function template
`relay(T&& x)` so that it **perfectly forwards** `x` to `describe`.

`main` (given) reads `n` and calls `relay` four times. The output must be:

```
lvalue <n>
const lvalue <2n>
rvalue <n+1>
rvalue <n>
```

```cpp starter
#include <iostream>
#include <utility>

void describe(int& x)       { std::cout << "lvalue " << x << '\n'; }
void describe(const int& x) { std::cout << "const lvalue " << x << '\n'; }
void describe(int&& x)      { std::cout << "rvalue " << x << '\n'; }

template <typename T>
void relay(T&& x) {
    describe(x);
}

int main() {
    int n;
    std::cin >> n;
    int a = n;
    const int c = n * 2;
    relay(a);
    relay(c);
    relay(n + 1);
    relay(std::move(a));
}
```

```cpp solution
#include <iostream>
#include <utility>

void describe(int& x)       { std::cout << "lvalue " << x << '\n'; }
void describe(const int& x) { std::cout << "const lvalue " << x << '\n'; }
void describe(int&& x)      { std::cout << "rvalue " << x << '\n'; }

template <typename T>
void relay(T&& x) {
    describe(std::forward<T>(x));
}

int main() {
    int n;
    std::cin >> n;
    int a = n;
    const int c = n * 2;
    relay(a);
    relay(c);
    relay(n + 1);
    relay(std::move(a));
}
```

```hint
Inside `relay`, `x` has a name, so it's an lvalue. `std::forward<T>(x)` restores the original category.
```

```stdin
5
```

```expected
lvalue 5
const lvalue 10
rvalue 6
rvalue 5
```

```stdin
-1
```

```expected hidden
lvalue -1
const lvalue -2
rvalue 0
rvalue -1
```

```checks
must std::forward\s*<\s*T\s*>\s*\(\s*x\s*\) :: Forward with std::forward<T>(x).
```
:::

:::exercise Build your own make_unique {medium}
Implement

```cpp
template <typename T, typename... Args>
std::unique_ptr<T> makeUnique(Args&&... args);
```

that creates a `T` with `new`, **perfectly forwarding** all arguments to `T`'s constructor (don't use
`std::make_unique`).

The `Tag` class counts whether its text was copied or moved in. `main` (given) creates three tags per
input word: from the word (an lvalue), from `word + "!"` (a temporary), and from `std::move(word)`. With
correct forwarding, each word causes **1 copy and 2 moves**. For input `hi yo`:

```
hi#1 hi!#2 hi#3
yo#1 yo!#2 yo#3
copies: 2, moves: 4
```

```cpp starter
#include <iostream>
#include <memory>
#include <string>
#include <utility>

struct Tag {
    std::string text;
    int id;
    static inline int copies = 0;
    static inline int moves = 0;
    Tag(const std::string& t, int i) : text(t), id(i) { ++copies; }
    Tag(std::string&& t, int i) : text(std::move(t)), id(i) { ++moves; }
};

template <typename T, typename... Args>
std::unique_ptr<T> makeUnique(Args&&... args) {
    return std::unique_ptr<T>(new T(args...));
}

int main() {
    std::string word;
    while (std::cin >> word) {
        auto a = makeUnique<Tag>(word, 1);
        auto b = makeUnique<Tag>(word + "!", 2);
        auto c = makeUnique<Tag>(std::move(word), 3);
        std::cout << a->text << '#' << a->id << ' ' << b->text << '#' << b->id << ' '
                  << c->text << '#' << c->id << '\n';
    }
    std::cout << "copies: " << Tag::copies << ", moves: " << Tag::moves << '\n';
}
```

```cpp solution
#include <iostream>
#include <memory>
#include <string>
#include <utility>

struct Tag {
    std::string text;
    int id;
    static inline int copies = 0;
    static inline int moves = 0;
    Tag(const std::string& t, int i) : text(t), id(i) { ++copies; }
    Tag(std::string&& t, int i) : text(std::move(t)), id(i) { ++moves; }
};

template <typename T, typename... Args>
std::unique_ptr<T> makeUnique(Args&&... args) {
    return std::unique_ptr<T>(new T(std::forward<Args>(args)...));
}

int main() {
    std::string word;
    while (std::cin >> word) {
        auto a = makeUnique<Tag>(word, 1);
        auto b = makeUnique<Tag>(word + "!", 2);
        auto c = makeUnique<Tag>(std::move(word), 3);
        std::cout << a->text << '#' << a->id << ' ' << b->text << '#' << b->id << ' '
                  << c->text << '#' << c->id << '\n';
    }
    std::cout << "copies: " << Tag::copies << ", moves: " << Tag::moves << '\n';
}
```

```hint
`args...` passes every argument as an lvalue (they all have names). Expand
`std::forward<Args>(args)...` instead.
```

```stdin
hi yo
```

```expected
hi#1 hi!#2 hi#3
yo#1 yo!#2 yo#3
copies: 2, moves: 4
```

```stdin
solo
```

```expected hidden
solo#1 solo!#2 solo#3
copies: 1, moves: 2
```

```stdin
a b c
```

```expected hidden
a#1 a!#2 a#3
b#1 b!#2 b#3
c#1 c!#2 c#3
copies: 3, moves: 6
```

```expected
copies: 0, moves: 0
```

```checks
must std::forward\s*<\s*Args\s*>\s*\(\s*args\s*\)\s*\.\.\. :: Expand std::forward<Args>(args)...
mustnot make_unique :: Implement it yourself instead of calling std::make_unique.
```
:::

:::exercise Count the copies {medium}
`Widget` counts its copies and moves. Implement the two helpers:

- `addItem(v, item)`: a function template taking a **forwarding reference** that forwards `item` to
  `v.push_back`, so lvalues are copied and rvalues moved.
- `addInPlace(v, args...)`: a variadic function template that forwards all its arguments to
  `v.emplace_back`, constructing the `Widget` in place (no copy, no move).

`main` (given) reads commands `copy <name>`, `move <name>`, `emplace <name>`. At the end it prints the
widget names and the counters. For input `copy a`, `move b`, `emplace c` the output is:

```
widgets: a b c
copies: 1, moves: 1
```

```cpp starter
#include <iostream>
#include <string>
#include <utility>
#include <vector>

struct Widget {
    std::string name;
    static inline int copies = 0;
    static inline int moves = 0;
    explicit Widget(std::string n) : name(std::move(n)) {}
    Widget(const Widget& o) : name(o.name) { ++copies; }
    Widget(Widget&& o) noexcept : name(std::move(o.name)) { ++moves; }
};

template <typename T>
void addItem(std::vector<Widget>& v, const T& item) {
    v.push_back(item);
}

template <typename... Args>
void addInPlace(std::vector<Widget>& v, Args... args) {
    v.push_back(Widget(args...));
}

int main() {
    std::vector<Widget> v;
    v.reserve(100);   // no reallocations, so only our operations are counted
    std::string cmd, name;
    while (std::cin >> cmd >> name) {
        if (cmd == "copy") {
            Widget w{name};
            addItem(v, w);
        } else if (cmd == "move") {
            Widget w{name};
            addItem(v, std::move(w));
        } else if (cmd == "emplace") {
            addInPlace(v, name);
        }
    }
    std::cout << "widgets:";
    for (const auto& w : v) std::cout << ' ' << w.name;
    std::cout << "\ncopies: " << Widget::copies << ", moves: " << Widget::moves << '\n';
}
```

```cpp solution
#include <iostream>
#include <string>
#include <utility>
#include <vector>

struct Widget {
    std::string name;
    static inline int copies = 0;
    static inline int moves = 0;
    explicit Widget(std::string n) : name(std::move(n)) {}
    Widget(const Widget& o) : name(o.name) { ++copies; }
    Widget(Widget&& o) noexcept : name(std::move(o.name)) { ++moves; }
};

template <typename T>
void addItem(std::vector<Widget>& v, T&& item) {
    v.push_back(std::forward<T>(item));
}

template <typename... Args>
void addInPlace(std::vector<Widget>& v, Args&&... args) {
    v.emplace_back(std::forward<Args>(args)...);
}

int main() {
    std::vector<Widget> v;
    v.reserve(100);   // no reallocations, so only our operations are counted
    std::string cmd, name;
    while (std::cin >> cmd >> name) {
        if (cmd == "copy") {
            Widget w{name};
            addItem(v, w);
        } else if (cmd == "move") {
            Widget w{name};
            addItem(v, std::move(w));
        } else if (cmd == "emplace") {
            addInPlace(v, name);
        }
    }
    std::cout << "widgets:";
    for (const auto& w : v) std::cout << ' ' << w.name;
    std::cout << "\ncopies: " << Widget::copies << ", moves: " << Widget::moves << '\n';
}
```

```hint
Change `const T& item` to `T&& item` and forward it. For the variadic one, take `Args&&... args` and call
`v.emplace_back(std::forward<Args>(args)...)`.
```

```stdin
copy a
move b
emplace c
```

```expected
widgets: a b c
copies: 1, moves: 1
```

```stdin
emplace x
emplace y
copy z
copy z
```

```expected hidden
widgets: x y z z
copies: 2, moves: 0
```

```stdin
move a
move b
copy c
emplace d
move e
```

```expected hidden
widgets: a b c d e
copies: 1, moves: 3
```

```stdin
move m
```

```expected
widgets: m
copies: 0, moves: 1
```

```checks
must T\s*&&\s*item :: addItem should take a forwarding reference T&& item.
must emplace_back\s*\(\s*std::forward\s*<\s*Args\s*>\s*\(\s*args\s*\)\s*\.\.\.\s*\) :: Forward the pack into emplace_back.
```
:::
